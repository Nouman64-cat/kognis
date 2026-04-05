"""Add exam.topic_mix and question.category for LLM mix tracking.

Revision ID: 004_topic_mix
Revises: 20ddbe7eb01a
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_topic_mix"
down_revision: Union[str, Sequence[str], None] = "20ddbe7eb01a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exam", sa.Column("topic_mix", sa.JSON(), nullable=True))
    op.add_column("question", sa.Column("category", sa.String(length=32), nullable=True))


def downgrade() -> None:
    op.drop_column("question", "category")
    op.drop_column("exam", "topic_mix")
