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
    submitted = {a.question_id: sorted(set(a.chosen_option_indices)) for a in body.answers}
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

    for qid, chosen_indices in submitted.items():
        q = by_id[qid]
        if any(idx < 0 or idx >= len(q.options) for idx in chosen_indices):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid option index submitted for question {qid}.",
            )
        correct_indices = (
            sorted(set(q.correct_answers))
            if q.correct_answers
            else [q.correct_answer]
        )
        required_selection_count = len(correct_indices)
        if len(chosen_indices) > required_selection_count:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Question {qid} allows selecting at most {required_selection_count} option(s). "
                    "Deselect extra options and submit again."
                ),
            )
        is_ok = chosen_indices == correct_indices
        if is_ok:
            correct += 1
        chosen_for_legacy = chosen_indices[0] if chosen_indices else -1
        session.add(
            CandidateAnswer(
                exam_attempt_id=attempt.id,
                question_id=qid,
                chosen_option=chosen_for_legacy,
                chosen_options=chosen_indices,
                is_correct=is_ok,
            )
        )
        chosen_texts = [q.options[idx] for idx in chosen_indices if 0 <= idx < len(q.options)]
        correct_texts = [q.options[idx] for idx in correct_indices if 0 <= idx < len(q.options)]
        results.append(
            PerQuestionResult(
                question_id=qid,
                chosen_option_indices=chosen_indices,
                chosen_option_texts=chosen_texts,
                correct_option_indices=correct_indices,
                correct_option_texts=correct_texts,
                is_correct=is_ok,
                explanation=q.explanation,
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
