from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.config import get_settings
from app.deps import db_session, verify_admin
from app.models import Exam, ExamAttempt, Question
from app.schemas import (
    AdminGenerateExamRequest,
    AdminGenerateExamResponse,
    AttemptRow,
    CandidateAnalytics,
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

    exam = Exam(
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
    for a in rows:
        if a.candidate is None or a.exam is None:
            continue
        correct = sum(1 for ans in a.candidate_answers if ans.is_correct)
        attempts.append(
            AttemptRow(
                attempt_id=a.id,
                candidate_id=a.candidate.id,
                candidate_name=a.candidate.full_name,
                candidate_email=a.candidate.email,
                exam_id=a.exam.id,
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
