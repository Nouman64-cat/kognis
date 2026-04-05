from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.deps import db_session
from app.models import Candidate, Exam, Question
from app.schemas import CandidatePublic, CandidateRegisterRequest, ExamQuestionsResponse, ExamSummary, QuestionPublic

router = APIRouter()


@router.get("/exams", response_model=list[ExamSummary])
async def list_exams(session: AsyncSession = Depends(db_session)) -> list[ExamSummary]:
    res = await session.execute(select(Exam).order_by(Exam.id.desc()))
    rows = res.scalars().all()
    out: list[ExamSummary] = []
    for e in rows:
        if e.id is None:
            continue
        out.append(
            ExamSummary(
                id=e.id,
                topic=e.topic,
                complexity=e.complexity,
                total_questions=e.total_questions,
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

    c = Candidate(email=email_norm, full_name=body.full_name.strip())
    session.add(c)
    await session.commit()
    await session.refresh(c)
    assert c.id is not None
    return CandidatePublic(id=c.id, email=c.email, full_name=c.full_name)


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

    q_res = await session.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.id)
    )
    questions = q_res.scalars().all()

    return ExamQuestionsResponse(
        exam=ExamSummary(
            id=exam.id,
            topic=exam.topic,
            complexity=exam.complexity,
            total_questions=exam.total_questions,
        ),
        questions=[
            QuestionPublic(id=q.id, text=q.text, options=list(q.options)) for q in questions
        ],
    )
