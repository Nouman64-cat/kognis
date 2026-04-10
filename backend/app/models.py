from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Column, DateTime, UniqueConstraint, func
from sqlalchemy.types import JSON
from sqlmodel import Field, Relationship, SQLModel

if TYPE_CHECKING:
    pass


class AdminAuth(SQLModel, table=True):
    """Singleton admin account (id must be 1)."""

    __tablename__ = "admin_auth"

    id: int = Field(default=1, primary_key=True)
    password_hash: str | None = Field(default=None, max_length=255)


class AdminOtp(SQLModel, table=True):
    """One-time password for first-time or recovery setup."""

    __tablename__ = "admin_otp"

    id: int | None = Field(default=None, primary_key=True)
    token_hash: str = Field(max_length=255)
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    used_at: datetime | None = Field(default=None, sa_column=Column(DateTime(timezone=True), nullable=True))


class Candidate(SQLModel, table=True):
    __tablename__ = "candidate"

    id: int | None = Field(default=None, primary_key=True)
    full_name: str = Field(max_length=255, index=True)
    email: str = Field(max_length=320, unique=True, index=True)
    department_id: int = Field(foreign_key="department.id", index=True)

    department: Optional["Department"] = Relationship(back_populates="candidates")
    exam_attempts: list["ExamAttempt"] = Relationship(back_populates="candidate")


class Department(SQLModel, table=True):
    __tablename__ = "department"

    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=128, unique=True, index=True)

    candidates: list["Candidate"] = Relationship(back_populates="department")
    exams: list["Exam"] = Relationship(back_populates="department")


class Exam(SQLModel, table=True):
    __tablename__ = "exam"

    id: int | None = Field(default=None, primary_key=True)
    department_id: int = Field(foreign_key="department.id", index=True)
    topic: str = Field(max_length=512, index=True)  # legacy single-topic kept for compatibility
    topics: list[str] | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    title: str | None = Field(default=None, max_length=512)
    complexity: str = Field(max_length=64, index=True)
    total_questions: int = Field(ge=0)
    duration_minutes: int | None = Field(default=None, nullable=True)
    scheduled_for: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    topic_mix: dict | None = Field(default=None, sa_column=Column(JSON, nullable=True))
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )

    questions: list["Question"] = Relationship(back_populates="exam", cascade_delete=True)
    attempts: list["ExamAttempt"] = Relationship(back_populates="exam", cascade_delete=True)
    department: Optional["Department"] = Relationship(back_populates="exams")


class Question(SQLModel, table=True):
    __tablename__ = "question"

    id: int | None = Field(default=None, primary_key=True)
    exam_id: int = Field(foreign_key="exam.id", index=True)
    text: str = Field(max_length=8192)
    options: list[str] = Field(sa_column=Column(JSON, nullable=False))
    correct_answer: int = Field(ge=0, le=3, description="Index 0-3 into options")
    explanation: str | None = Field(default=None, max_length=1024)
    category: str | None = Field(default=None, max_length=128, description="User-defined mix bucket label")

    exam: Exam | None = Relationship(back_populates="questions")
    answers: list["CandidateAnswer"] = Relationship(back_populates="question", cascade_delete=True)


class ExamAttempt(SQLModel, table=True):
    __tablename__ = "exam_attempt"
    __table_args__ = (UniqueConstraint("candidate_id", "exam_id", name="uq_candidate_exam_attempt"),)

    id: int | None = Field(default=None, primary_key=True)
    candidate_id: int = Field(foreign_key="candidate.id", index=True)
    exam_id: int = Field(foreign_key="exam.id", index=True)
    final_score: float = Field(ge=0.0, le=100.0, description="Percentage correct")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        sa_column=Column(DateTime(timezone=True), server_default=func.now(), nullable=False),
    )

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
