"""Add title, topics, and duration_minutes to exam table.

Revision ID: 003_exam_title_topics_duration
Revises: 002_admin_auth_otp
Create Date: 2026-04-05

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_exam_title_topics_duration"
down_revision: Union[str, Sequence[str], None] = "002_admin"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add title column (nullable, existing rows get NULL = use topic as display)
    op.add_column(
        "exam",
        sa.Column("title", sa.String(length=512), nullable=True),
    )
    # Add topics as JSON array (nullable so migration is safe; app layer defaults to [topic])
    op.add_column(
        "exam",
        sa.Column("topics", sa.JSON(), nullable=True),
    )
    # Add duration_minutes (nullable = no time limit)
    op.add_column(
        "exam",
        sa.Column("duration_minutes", sa.Integer(), nullable=True),
    )

    # Back-fill topics from existing topic column so no data is lost
    op.execute("UPDATE exam SET topics = json_array(topic) WHERE topics IS NULL")


def downgrade() -> None:
    op.drop_column("exam", "duration_minutes")
    op.drop_column("exam", "topics")
    op.drop_column("exam", "title")
