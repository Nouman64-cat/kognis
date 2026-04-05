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
    try:
        payload = await generate_mcq_payload(
            settings,
            topic=body.topic.strip(),
            complexity=body.complexity.strip(),
            total_questions=body.total_questions,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    exam = Exam(
        topic=body.topic.strip(),
        complexity=body.complexity.strip(),
        total_questions=len(payload.questions),
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
        topic=exam.topic,
        complexity=exam.complexity,
        total_questions=exam.total_questions,
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
                exam_complexity=a.exam.complexity,
                total_questions=a.exam.total_questions,
                score_percent=round(a.final_score, 1),
                correct_count=correct,
            )
        )
    return ListAttemptsResponse(attempts=attempts)
