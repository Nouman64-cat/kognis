"""Rebuild SubmitExamResponse from a persisted exam attempt (read-only)."""

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models import CandidateAnswer, ExamAttempt, Question
from app.schemas import PerQuestionResult, SubmitExamResponse


async def build_submit_response_from_attempt(
    session: AsyncSession,
    *,
    exam_id: int,
    candidate_id: int,
    attempt: ExamAttempt,
) -> SubmitExamResponse:
    assert attempt.id is not None

    q_res = await session.execute(
        select(Question).where(Question.exam_id == exam_id).order_by(Question.id)
    )
    questions = list(q_res.scalars().all())

    a_res = await session.execute(
        select(CandidateAnswer).where(CandidateAnswer.exam_attempt_id == attempt.id)
    )
    by_question = {a.question_id: a for a in a_res.scalars().all()}

    results: list[PerQuestionResult] = []
    correct = 0
    for q in questions:
        if q.id is None:
            continue
        ca = by_question.get(q.id)
        if ca is None:
            chosen_indices: list[int] = []
            is_ok = False
            chosen_texts: list[str] = []
        else:
            chosen_indices = sorted(set(ca.chosen_options or ([ca.chosen_option] if ca.chosen_option >= 0 else [])))
            is_ok = ca.is_correct
            opts = list(q.options)
            chosen_texts = [opts[idx] for idx in chosen_indices if 0 <= idx < len(opts)]
        if is_ok:
            correct += 1
        correct_indices = sorted(set(q.correct_answers or [q.correct_answer]))
        opts = list(q.options)
        results.append(
            PerQuestionResult(
                question_id=q.id,
                chosen_option_indices=chosen_indices,
                chosen_option_texts=chosen_texts,
                correct_option_indices=correct_indices,
                correct_option_texts=[opts[idx] for idx in correct_indices if 0 <= idx < len(opts)],
                is_correct=is_ok,
                explanation=q.explanation,
            )
        )

    results.sort(key=lambda r: r.question_id)
    total = len(results)
    return SubmitExamResponse(
        exam_id=exam_id,
        candidate_id=candidate_id,
        attempt_id=attempt.id,
        score_percent=round(attempt.final_score, 2),
        correct_count=correct,
        total_questions=total,
        results=results,
    )
