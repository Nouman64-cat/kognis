from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.deps import db_session
from app.models import Candidate, Department, Exam, ExamAttempt, Question
from app.schemas import (
    CandidatePublic,
    CandidateRegisterRequest,
    DepartmentPublic,
    ExamQuestionsResponse,
    ExamSummary,
    QuestionPublic,
    parse_topic_mix_from_storage,
)
from app.services.exam_attempt_result import build_submit_response_from_attempt

router = APIRouter()


@router.get("/departments", response_model=list[DepartmentPublic])
async def list_departments(session: AsyncSession = Depends(db_session)) -> list[DepartmentPublic]:
    res = await session.execute(select(Department).order_by(Department.name.asc()))
    rows = res.scalars().all()
    out: list[DepartmentPublic] = []
    for d in rows:
        if d.id is None:
            continue
        out.append(DepartmentPublic(id=d.id, name=d.name))
    return out


@router.get("/exams", response_model=list[ExamSummary])
async def list_exams(
    email: EmailStr | None = Query(default=None, description="Registered candidate email (optional, filters by candidate department)"),
    session: AsyncSession = Depends(db_session),
) -> list[ExamSummary]:
    stmt = select(Exam).order_by(Exam.id.desc())
    if email is not None:
        email_norm = email.lower().strip()
        cand_res = await session.execute(select(Candidate).where(Candidate.email == email_norm))
        candidate = cand_res.scalar_one_or_none()
        if candidate is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")
        stmt = stmt.where(Exam.department_id == candidate.department_id)
    res = await session.execute(stmt)
    rows = res.scalars().all()
    out: list[ExamSummary] = []
    for e in rows:
        if e.id is None:
            continue
        dept_res = await session.execute(select(Department).where(Department.id == e.department_id))
        dept = dept_res.scalar_one_or_none()
        out.append(
            ExamSummary(
                id=e.id,
                department_id=e.department_id,
                department_name=dept.name if dept else "Unknown",
                title=e.title,
                topics=e.topics if e.topics else [e.topic],
                complexity=e.complexity,
                total_questions=e.total_questions,
                duration_minutes=e.duration_minutes,
                scheduled_for=e.scheduled_for,
                created_at=e.created_at,
                topic_mix=parse_topic_mix_from_storage(e.topic_mix),
            )
        )
    return out


@router.post("/candidates/register", response_model=CandidatePublic, status_code=status.HTTP_201_CREATED)
async def register_candidate(
    body: CandidateRegisterRequest,
    session: AsyncSession = Depends(db_session),
) -> CandidatePublic:
    email_norm = body.email.lower().strip()
    existing = await session.execute(select(Candidate).where(Candidate.email == email_norm))
    row = existing.scalar_one_or_none()
    if row:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    dep_res = await session.execute(select(Department).where(Department.id == body.department_id))
    department = dep_res.scalar_one_or_none()
    if department is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department.")

    c = Candidate(email=email_norm, full_name=body.full_name.strip(), department_id=body.department_id)
    session.add(c)
    await session.commit()
    await session.refresh(c)
    assert c.id is not None
    return CandidatePublic(
        id=c.id,
        email=c.email,
        full_name=c.full_name,
        department_id=c.department_id,
        department_name=department.name,
    )


@router.get("/exams/{exam_id}/questions", response_model=ExamQuestionsResponse)
async def get_exam_questions(
    exam_id: int,
    email: EmailStr = Query(..., description="Registered candidate email"),
    session: AsyncSession = Depends(db_session),
) -> ExamQuestionsResponse:
    email_norm = email.lower().strip()
    cand_res = await session.execute(select(Candidate).where(Candidate.email == email_norm))
    candidate = cand_res.scalar_one_or_none()
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    exam_res = await session.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")
    dep_res = await session.execute(select(Department).where(Department.id == exam.department_id))
    dep = dep_res.scalar_one_or_none()
    dep_name = dep.name if dep else "Unknown"

    att_res = await session.execute(
        select(ExamAttempt).where(
            ExamAttempt.candidate_id == candidate.id,
            ExamAttempt.exam_id == exam_id,
        )
    )
    existing_attempt = att_res.scalar_one_or_none()
    if existing_attempt is not None:
        submit_resp = await build_submit_response_from_attempt(
            session,
            exam_id=exam_id,
            candidate_id=candidate.id,
            attempt=existing_attempt,
        )
        q_res = await session.execute(
            select(Question).where(Question.exam_id == exam_id).order_by(Question.id)
        )
        q_rows = q_res.scalars().all()
        exam_summary = ExamSummary(
            id=exam.id,
            department_id=exam.department_id,
            department_name=dep_name,
            title=exam.title,
            topics=exam.topics if exam.topics else [exam.topic],
            complexity=exam.complexity,
            total_questions=exam.total_questions,
            duration_minutes=exam.duration_minutes,
            scheduled_for=exam.scheduled_for,
            created_at=exam.created_at,
            topic_mix=parse_topic_mix_from_storage(exam.topic_mix),
        )
        questions_out = [
            QuestionPublic(
                id=q.id,
                text=q.text,
                options=list(q.options),
                required_selection_count=len(sorted(set(q.correct_answers or [q.correct_answer]))),
            )
            for q in q_rows
            if q.id is not None
        ]
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "already_submitted",
                "message": "You have already submitted this exam.",
                "result": submit_resp.model_dump(mode="json"),
                "exam": exam_summary.model_dump(mode="json"),
                "questions": [q.model_dump(mode="json") for q in questions_out],
            },
        )

    if exam.scheduled_for and exam.scheduled_for > datetime.now(timezone.utc):
        questions = []
    else:
        q_res = await session.execute(
            select(Question).where(Question.exam_id == exam_id).order_by(Question.id)
        )
        questions = q_res.scalars().all()

    return ExamQuestionsResponse(
        exam=ExamSummary(
            id=exam.id,
            department_id=exam.department_id,
            department_name=dep_name,
            title=exam.title,
            topics=exam.topics if exam.topics else [exam.topic],
            complexity=exam.complexity,
            total_questions=exam.total_questions,
            duration_minutes=exam.duration_minutes,
            scheduled_for=exam.scheduled_for,
            created_at=exam.created_at,
            topic_mix=parse_topic_mix_from_storage(exam.topic_mix),
        ),
        questions=[
            QuestionPublic(
                id=q.id,
                text=q.text,
                options=list(q.options),
                required_selection_count=len(sorted(set(q.correct_answers or [q.correct_answer]))),
            )
            for q in questions
        ],
    )
