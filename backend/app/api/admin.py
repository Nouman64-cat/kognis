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
    ListAttemptsResponse,
)
from app.services.llm import generate_mcq_payload

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
    # Normalise and deduplicate topics
    clean_topics = list(dict.fromkeys(t.strip() for t in body.topics if t.strip()))
    if not clean_topics:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="At least one non-empty topic is required.")

    # Use first topic as legacy `topic` field for backwards compat
    primary_topic = clean_topics[0]

    try:
        payload = await generate_mcq_payload(
            settings,
            topics=clean_topics,
            complexity=body.complexity.strip(),
            total_questions=body.total_questions,
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
            )
        )
    return ListAttemptsResponse(attempts=attempts)
