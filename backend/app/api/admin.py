from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.deps import db_session, verify_admin
from app.models import Exam, Question
from app.schemas import AdminGenerateExamRequest, AdminGenerateExamResponse
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
