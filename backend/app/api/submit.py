from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.deps import db_session
from app.models import Candidate, CandidateAnswer, Exam, ExamAttempt, Question
from app.schemas import PerQuestionResult, SubmitExamRequest, SubmitExamResponse

router = APIRouter()


@router.post("/exams/{exam_id}/submit", response_model=SubmitExamResponse)
async def submit_exam(
    exam_id: int,
    body: SubmitExamRequest,
    session: AsyncSession = Depends(db_session),
) -> SubmitExamResponse:
    email_norm = body.email.lower().strip()

    cand_res = await session.execute(select(Candidate).where(Candidate.email == email_norm))
    candidate = cand_res.scalar_one_or_none()
    if candidate is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Candidate not found.")

    exam_res = await session.execute(select(Exam).where(Exam.id == exam_id))
    exam = exam_res.scalar_one_or_none()
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found.")

    att_res = await session.execute(
        select(ExamAttempt).where(
            ExamAttempt.candidate_id == candidate.id,
            ExamAttempt.exam_id == exam_id,
        )
    )
    if att_res.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This exam has already been submitted for this candidate.",
        )

    q_res = await session.execute(select(Question).where(Question.exam_id == exam_id))
    questions = q_res.scalars().all()
    by_id = {q.id: q for q in questions if q.id is not None}
    expected_ids = set(by_id.keys())
    submitted = {a.question_id: a.chosen_option_index for a in body.answers}
    if set(submitted.keys()) != expected_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit exactly one answer per question for this exam.",
        )
    if len(submitted) != len(body.answers):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate question_id in submission.",
        )

    correct = 0
    results: list[PerQuestionResult] = []
    attempt = ExamAttempt(
        candidate_id=candidate.id,
        exam_id=exam_id,
        final_score=0.0,
    )
    session.add(attempt)
    await session.flush()

    for qid, chosen in submitted.items():
        q = by_id[qid]
        is_ok = chosen == q.correct_answer
        if is_ok:
            correct += 1
        session.add(
            CandidateAnswer(
                exam_attempt_id=attempt.id,
                question_id=qid,
                chosen_option=chosen,
                is_correct=is_ok,
            )
        )
        results.append(
            PerQuestionResult(
                question_id=qid,
                chosen_option_index=chosen,
                correct_option_index=q.correct_answer,
                is_correct=is_ok,
            )
        )

    total = len(expected_ids)
    score = (100.0 * correct / total) if total else 0.0
    attempt.final_score = score

    await session.commit()
    await session.refresh(attempt)
    assert attempt.id is not None and candidate.id is not None

    results.sort(key=lambda r: r.question_id)

    return SubmitExamResponse(
        exam_id=exam_id,
        candidate_id=candidate.id,
        attempt_id=attempt.id,
        score_percent=round(score, 2),
        correct_count=correct,
        total_questions=total,
        results=results,
    )
