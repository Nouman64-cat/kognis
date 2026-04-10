from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.config import get_settings
from app.deps import db_session, verify_admin
from app.models import CandidateAnswer, Department, Exam, ExamAttempt, Question
from app.schemas import (
    AdminCreateDepartmentRequest,
    AdminGenerateExamRequest,
    AdminGenerateExamResponse,
    ExamDetailResponse,
    ExamQuestionDetail,
    AttemptDetailResponse,
    AttemptQuestionDetail,
    AttemptRow,
    CandidateAnalytics,
    DepartmentPublic,
    GlobalAnalytics,
    ListAttemptsResponse,
    PaginatedQuestionsResponse,
    QuestionAdminView,
    parse_topic_mix_from_storage,
)
from app.services.llm import generate_mcq_payload
from sqlalchemy import func

router = APIRouter()


@router.post(
    "/exams/generate",
    response_model=AdminGenerateExamResponse,
    status_code=status.HTTP_201_CREATED,
)
async def generate_exam(
    body: AdminGenerateExamRequest,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> AdminGenerateExamResponse:
    settings = get_settings()
    # Exam "topics" for LLM + listing come from topic mix bucket names (order preserved, unique by validation)
    clean_topics = [e.name for e in body.topic_mix]
    primary_topic = clean_topics[0][:512]
    try:
        payload = await generate_mcq_payload(
            settings,
            topics=clean_topics,
            complexity=body.complexity.strip(),
            total_questions=body.total_questions,
            topic_mix=body.topic_mix,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    dep_res = await session.execute(select(Department).where(Department.id == body.department_id))
    department = dep_res.scalar_one_or_none()
    if department is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid department.")

    exam = Exam(
        department_id=body.department_id,
        topic=primary_topic,
        topics=clean_topics,
        title=body.title.strip() if body.title else None,
        complexity=body.complexity.strip(),
        total_questions=len(payload.questions),
        duration_minutes=body.duration_minutes,
        scheduled_for=body.scheduled_for,
        topic_mix=[e.model_dump() for e in body.topic_mix],
    )
    session.add(exam)
    await session.flush()

    for q in payload.questions:
        session.add(
            Question(
                exam_id=exam.id,
                text=q.text.strip(),
                options=list(q.options),
                correct_answer=q.correct_index,
                explanation=q.explanation,
                category=q.category,
            )
        )

    await session.commit()
    await session.refresh(exam)
    assert exam.id is not None

    return AdminGenerateExamResponse(
        exam_id=exam.id,
        department_id=exam.department_id,
        department_name=department.name,
        title=exam.title,
        topics=exam.topics or [exam.topic],
        complexity=exam.complexity,
        total_questions=exam.total_questions,
        duration_minutes=exam.duration_minutes,
        scheduled_for=exam.scheduled_for,
        created_at=exam.created_at,
        topic_mix=parse_topic_mix_from_storage(exam.topic_mix),
    )


@router.get(
    "/departments",
    response_model=list[DepartmentPublic],
)
async def list_departments_admin(
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> list[DepartmentPublic]:
    result = await session.execute(select(Department).order_by(Department.name.asc()))
    rows = result.scalars().all()
    out: list[DepartmentPublic] = []
    for d in rows:
        if d.id is None:
            continue
        out.append(DepartmentPublic(id=d.id, name=d.name))
    return out


@router.post(
    "/departments",
    response_model=DepartmentPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_department_admin(
    body: AdminCreateDepartmentRequest,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> DepartmentPublic:
    clean_name = body.name.strip()
    if not clean_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department name is required.")

    existing = await session.execute(select(Department).where(func.lower(Department.name) == clean_name.lower()))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Department already exists.")

    dep = Department(name=clean_name)
    session.add(dep)
    await session.commit()
    await session.refresh(dep)
    assert dep.id is not None
    return DepartmentPublic(id=dep.id, name=dep.name)


@router.get(
    "/attempts",
    response_model=ListAttemptsResponse,
)
async def list_attempts(
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> ListAttemptsResponse:
    """Return every exam attempt with candidate and exam details."""
    result = await session.execute(
        select(ExamAttempt)
        .options(
            selectinload(ExamAttempt.candidate),
            selectinload(ExamAttempt.exam),
            selectinload(ExamAttempt.candidate_answers),
        )
        .order_by(ExamAttempt.id.desc())
    )
    rows = result.scalars().all()

    attempts: list[AttemptRow] = []
    dep_name_by_id: dict[int, str] = {}

    async def resolve_dep_name(dep_id: int) -> str:
        if dep_id in dep_name_by_id:
            return dep_name_by_id[dep_id]
        dep_row = await session.execute(select(Department).where(Department.id == dep_id))
        dep = dep_row.scalar_one_or_none()
        name = dep.name if dep else "Unknown"
        dep_name_by_id[dep_id] = name
        return name

    for a in rows:
        if a.candidate is None or a.exam is None:
            continue
        correct = sum(1 for ans in a.candidate_answers if ans.is_correct)
        exam_dep_name = await resolve_dep_name(a.exam.department_id)
        candidate_dep_name = await resolve_dep_name(a.candidate.department_id)
        attempts.append(
            AttemptRow(
                attempt_id=a.id,
                candidate_id=a.candidate.id,
                candidate_name=a.candidate.full_name,
                candidate_email=a.candidate.email,
                exam_id=a.exam.id,
                exam_department_id=a.exam.department_id,
                exam_department_name=exam_dep_name,
                candidate_department_id=a.candidate.department_id,
                candidate_department_name=candidate_dep_name,
                exam_topic=a.exam.topic,
                exam_topics=a.exam.topics if a.exam.topics else [a.exam.topic],
                exam_title=a.exam.title,
                exam_complexity=a.exam.complexity,
                total_questions=a.exam.total_questions,
                score_percent=round(a.final_score, 1),
                correct_count=correct,
                duration_minutes=a.exam.duration_minutes,
                scheduled_for=a.exam.scheduled_for,
                created_at=a.created_at,
            )
        )
    PASS_THRESHOLD_PERCENT = 75.0

    global_stats = GlobalAnalytics(
        unique_candidates=len(set(a.candidate_email for a in attempts)),
        total_attempts=len(attempts),
        avg_score=sum(a.score_percent for a in attempts) / len(attempts) if attempts else 0.0,
        top_score=max((a.score_percent for a in attempts), default=0.0),
        pass_rate=(sum(1 for a in attempts if a.score_percent >= PASS_THRESHOLD_PERCENT) / len(attempts) * 100) if attempts else 0.0,
        score_distribution={
            "0–20": sum(1 for a in attempts if 0 <= a.score_percent <= 20),
            "21–40": sum(1 for a in attempts if 20 < a.score_percent <= 40),
            "41–60": sum(1 for a in attempts if 40 < a.score_percent <= 60),
            "61–80": sum(1 for a in attempts if 60 < a.score_percent <= 80),
            "81–100": sum(1 for a in attempts if 80 < a.score_percent <= 100),
        }
    )

    from collections import defaultdict
    by_candidate = defaultdict(list)
    for a in attempts:
        by_candidate[a.candidate_email].append(a)

    candidate_stats: dict[str, CandidateAnalytics] = {}
    for email, group in by_candidate.items():
        candidate_stats[email] = CandidateAnalytics(
            candidate_email=email,
            candidate_name=group[0].candidate_name,
            total_attempts=len(group),
            avg_score=sum(a.score_percent for a in group) / len(group) if group else 0.0,
            best_score=max((a.score_percent for a in group), default=0.0),
            pass_rate=(sum(1 for a in group if a.score_percent >= PASS_THRESHOLD_PERCENT) / len(group) * 100) if group else 0.0,
            passed_count=sum(1 for a in group if a.score_percent >= PASS_THRESHOLD_PERCENT),
            failed_count=sum(1 for a in group if a.score_percent < PASS_THRESHOLD_PERCENT),
        )

    return ListAttemptsResponse(
        attempts=attempts,
        global_stats=global_stats,
        candidate_stats=candidate_stats,
    )


@router.get(
    "/exams/{exam_id}",
    response_model=ExamDetailResponse,
)
async def get_exam_detail(
    exam_id: int,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> ExamDetailResponse:
    result = await session.execute(
        select(Exam)
        .where(Exam.id == exam_id)
        .options(selectinload(Exam.questions))
    )
    exam = result.scalar_one_or_none()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam {exam_id} not found.",
        )

    questions: list[ExamQuestionDetail] = []
    for q in sorted(exam.questions or [], key=lambda x: x.id or 0):
        if q.id is None:
            continue
        options = list(q.options) if q.options else []
        correct_idx = q.correct_answer
        correct_text = options[correct_idx] if 0 <= correct_idx < len(options) else "Unknown"
        questions.append(
            ExamQuestionDetail(
                question_id=q.id,
                text=q.text,
                options=options,
                correct_option_index=correct_idx,
                correct_option_text=correct_text,
                explanation=q.explanation,
                category=q.category,
            )
        )

    topics = exam.topics if exam.topics else [exam.topic]
    dep_res = await session.execute(select(Department).where(Department.id == exam.department_id))
    dep = dep_res.scalar_one_or_none()
    return ExamDetailResponse(
        exam_id=exam.id,
        department_id=exam.department_id,
        department_name=dep.name if dep else "Unknown",
        exam_title=exam.title,
        exam_topics=topics,
        exam_complexity=exam.complexity,
        total_questions=exam.total_questions,
        duration_minutes=exam.duration_minutes,
        scheduled_for=exam.scheduled_for,
        created_at=exam.created_at,
        questions=questions,
    )


@router.get(
    "/attempts/{attempt_id}",
    response_model=AttemptDetailResponse,
)
async def get_attempt_detail(
    attempt_id: int,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> AttemptDetailResponse:
    """Return one attempt with full question text, options, and correct vs chosen answers."""
    result = await session.execute(
        select(ExamAttempt)
        .where(ExamAttempt.id == attempt_id)
        .options(
            selectinload(ExamAttempt.candidate),
            selectinload(ExamAttempt.exam),
            selectinload(ExamAttempt.candidate_answers).selectinload(CandidateAnswer.question),
        )
    )
    att = result.scalar_one_or_none()
    if att is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found.",
        )
    if att.candidate is None or att.exam is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Attempt data is incomplete.",
        )

    items: list[AttemptQuestionDetail] = []
    for ca in sorted(att.candidate_answers or [], key=lambda x: x.question_id):
        q = ca.question
        if q is None or q.id is None:
            continue
        chosen = ca.chosen_option
        correct_idx = q.correct_answer
        opts = list(q.options) if q.options else []
        chosen_text = (
            opts[chosen]
            if 0 <= chosen < len(opts)
            else "Not answered"
        )
        correct_text = (
            opts[correct_idx]
            if 0 <= correct_idx < len(opts)
            else "Unknown"
        )
        items.append(
            AttemptQuestionDetail(
                question_id=q.id,
                text=q.text,
                options=opts,
                correct_option_index=correct_idx,
                chosen_option_index=chosen,
                chosen_option_text=chosen_text,
                correct_option_text=correct_text,
                is_correct=ca.is_correct,
                explanation=q.explanation,
            )
        )

    correct_count = sum(1 for x in items if x.is_correct)
    ex = att.exam
    topics = ex.topics if ex.topics else [ex.topic]

    return AttemptDetailResponse(
        attempt_id=att.id,
        candidate_id=att.candidate_id,
        candidate_name=att.candidate.full_name,
        candidate_email=att.candidate.email,
        exam_id=att.exam_id,
        exam_title=ex.title,
        exam_topics=topics,
        exam_complexity=ex.complexity,
        score_percent=round(att.final_score, 2),
        correct_count=correct_count,
        total_questions=len(items),
        created_at=att.created_at,
        questions=items,
    )


@router.get(
    "/questions",
    response_model=PaginatedQuestionsResponse,
)
async def list_questions(
    page: int = 1,
    page_size: int = 10,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> PaginatedQuestionsResponse:
    if page < 1:
        page = 1
    if page_size < 1 or page_size > 100:
        page_size = 10

    offset = (page - 1) * page_size

    # Get total count
    total_result = await session.execute(select(func.count(Question.id)))
    total = total_result.scalar() or 0

    # Get paginated items
    questions_stmt = (
        select(Question)
        .options(selectinload(Question.exam))
        .order_by(Question.id.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await session.execute(questions_stmt)
    questions = result.scalars().all()

    items: list[QuestionAdminView] = []
    for q in questions:
        exam_topic = "Unknown"
        if q.exam:
            exam_topic = q.exam.topic

        items.append(
            QuestionAdminView(
                id=q.id,
                exam_id=q.exam_id,
                text=q.text,
                options=q.options,
                correct_answer=q.correct_answer,
                explanation=q.explanation,
                category=q.category,
                exam_topic=exam_topic,
            )
        )

    total_pages = (total + page_size - 1) // page_size

    return PaginatedQuestionsResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.delete(
    "/exams/{exam_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_exam(
    exam_id: int,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> None:
    """Delete an exam from the library (cascades to questions/attempts/answers)."""
    result = await session.execute(select(Exam).where(Exam.id == exam_id))
    exam = result.scalar_one_or_none()
    if exam is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam {exam_id} not found.",
        )
    await session.delete(exam)
    await session.commit()


@router.delete(
    "/attempts/{attempt_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_attempt(
    attempt_id: int,
    _: None = Depends(verify_admin),
    session: AsyncSession = Depends(db_session),
) -> None:
    """Delete an exam attempt so the candidate can retake the exam.

    Cascade deletes all associated candidate_answer rows automatically.
    """
    result = await session.execute(
        select(ExamAttempt).where(ExamAttempt.id == attempt_id)
    )
    attempt = result.scalar_one_or_none()
    if attempt is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found.",
        )
    await session.delete(attempt)
    await session.commit()
