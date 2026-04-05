"""Initial Kognis schema.

Revision ID: 001_initial
Revises:
Create Date: 2026-04-05

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001_initial"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "candidate",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_candidate_full_name"), "candidate", ["full_name"], unique=False)
    op.create_index(op.f("ix_candidate_email"), "candidate", ["email"], unique=True)

    op.create_table(
        "exam",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("topic", sa.String(length=512), nullable=False),
        sa.Column("complexity", sa.String(length=64), nullable=False),
        sa.Column("total_questions", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_exam_topic"), "exam", ["topic"], unique=False)
    op.create_index(op.f("ix_exam_complexity"), "exam", ["complexity"], unique=False)

    op.create_table(
        "exam_attempt",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("candidate_id", sa.Integer(), nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("final_score", sa.Float(), nullable=False),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidate.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["exam_id"], ["exam.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("candidate_id", "exam_id", name="uq_candidate_exam_attempt"),
    )
    op.create_index(op.f("ix_exam_attempt_candidate_id"), "exam_attempt", ["candidate_id"], unique=False)
    op.create_index(op.f("ix_exam_attempt_exam_id"), "exam_attempt", ["exam_id"], unique=False)

    op.create_table(
        "question",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_id", sa.Integer(), nullable=False),
        sa.Column("text", sa.String(length=8192), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_answer", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["exam_id"], ["exam.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_question_exam_id"), "question", ["exam_id"], unique=False)

    op.create_table(
        "candidate_answer",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("exam_attempt_id", sa.Integer(), nullable=False),
        sa.Column("question_id", sa.Integer(), nullable=False),
        sa.Column("chosen_option", sa.Integer(), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["exam_attempt_id"], ["exam_attempt.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["question_id"], ["question.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("exam_attempt_id", "question_id", name="uq_attempt_question_answer"),
    )
    op.create_index(
        op.f("ix_candidate_answer_exam_attempt_id"),
        "candidate_answer",
        ["exam_attempt_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_candidate_answer_question_id"), "candidate_answer", ["question_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_candidate_answer_question_id"), table_name="candidate_answer")
    op.drop_index(op.f("ix_candidate_answer_exam_attempt_id"), table_name="candidate_answer")
    op.drop_table("candidate_answer")
    op.drop_index(op.f("ix_question_exam_id"), table_name="question")
    op.drop_table("question")
    op.drop_index(op.f("ix_exam_attempt_exam_id"), table_name="exam_attempt")
    op.drop_index(op.f("ix_exam_attempt_candidate_id"), table_name="exam_attempt")
    op.drop_table("exam_attempt")
    op.drop_index(op.f("ix_exam_complexity"), table_name="exam")
    op.drop_index(op.f("ix_exam_topic"), table_name="exam")
    op.drop_table("exam")
    op.drop_index(op.f("ix_candidate_email"), table_name="candidate")
    op.drop_index(op.f("ix_candidate_full_name"), table_name="candidate")
    op.drop_table("candidate")
