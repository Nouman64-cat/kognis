"""Add multi-select support for questions and answers.

Revision ID: 007_multi_select
Revises: 006_departments
Create Date: 2026-04-14
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_multi_select"
down_revision: Union[str, Sequence[str], None] = "006_departments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("question", sa.Column("correct_answers", sa.JSON(), nullable=True))
    op.add_column("candidate_answer", sa.Column("chosen_options", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("candidate_answer", "chosen_options")
    op.drop_column("question", "correct_answers")
