from typing import TYPE_CHECKING

from sqlalchemy import Column, UniqueConstraint
from sqlalchemy.types import JSON
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    pass


class Candidate(SQLModel, table=True):
    __tablename__ = "candidate"

    id: int | None = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=255, index=True)
    email: str = Field(max_length=320, unique=True, index=True)

    exam_attempts: list["ExamAttempt"] = Relationship(back_populates="candidate")


class Exam(SQLModel, table=True):
    __tablename__ = "exam"

    id: int | None = Field(default=None, primary_key=True)
    topic: str = Field(max_length=512, index=True)
    complexity: str = Field(max_length=64, index=True)
    total_questions: int = Field(ge=0)

    questions: list["Question"] = Relationship(back_populates="exam", cascade_delete=True)
    attempts: list["ExamAttempt"] = Relationship(back_populates="exam", cascade_delete=True)


class Question(SQLModel, table=True):
    __tablename__ = "question"

    id: int | None = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="exam.id", index=True)
    text: str = Field(max_length=8192)
    options: list[str] = Field(sa_column=Column(JSON, nullable=False))
    correct_answer: int = Field(ge=0, le=3, description="Index 0-3 into options")

    exam: Exam | None = Relationship(back_populates="questions")
    answers: list["CandidateAnswer"] = Relationship(back_populates="question", cascade_delete=True)


class ExamAttempt(SQLModel, table=True):
    __tablename__ = "exam_attempt"
    __table_args__ = (UniqueConstraint("candidate_id", "exam_id", name="uq_candidate_exam_attempt"),)

    id: int | None = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    exam_id: int = Field(foreign_key="exam.id", index=True)
    final_score: float = Field(ge=0.0, le=100.0, description="Percentage correct")

    candidate: Candidate | None = Relationship(back_populates="exam_attempts")
    exam: Exam | None = Relationship(back_populates="attempts")
    candidate_answers: list["CandidateAnswer"] = Relationship(
        back_populates="exam_attempt", cascade_delete=True
    )


class CandidateAnswer(SQLModel, table=True):
    __tablename__ = "candidate_answer"
    __table_args__ = (UniqueConstraint("exam_attempt_id", "question_id", name="uq_attempt_question_answer"),)

    id: int | None = Field(default=None, primary_key=True)
    exam_attempt_id: int = Field(foreign_key="exam_attempt.id", index=True)
    question_id: int = Field(foreign_key="question.id", index=True)
    chosen_option: int = Field(ge=0, le=3)
    is_correct: bool = Field(default=False)

    exam_attempt: ExamAttempt | None = Relationship(back_populates="candidate_answers")
    question: Question | None = Relationship(back_populates="answers")
