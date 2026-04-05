"""Widen question.category for user-defined mix labels.

Revision ID: 005_widen_q_cat
Revises: 004_topic_mix
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_widen_q_cat"
down_revision: Union[str, Sequence[str], None] = "004_topic_mix"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "question",
        "category",
        existing_type=sa.String(length=32),
        type_=sa.String(length=128),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "question",
        "category",
        existing_type=sa.String(length=128),
        type_=sa.String(length=32),
        existing_nullable=True,
    )
