"""Add departments and link candidates/exams.

Revision ID: 006_departments
Revises: 005_widen_q_cat
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "006_departments"
down_revision: Union[str, Sequence[str], None] = "005_widen_q_cat"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "department",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_department_name"), "department", ["name"], unique=True)

    op.add_column("candidate", sa.Column("department_id", sa.Integer(), nullable=True))
    op.add_column("exam", sa.Column("department_id", sa.Integer(), nullable=True))

    op.create_index(op.f("ix_candidate_department_id"), "candidate", ["department_id"], unique=False)
    op.create_index(op.f("ix_exam_department_id"), "exam", ["department_id"], unique=False)

    op.create_foreign_key(
        "fk_candidate_department_id_department",
        "candidate",
        "department",
        ["department_id"],
        ["id"],
        ondelete="RESTRICT",
    )
    op.create_foreign_key(
        "fk_exam_department_id_department",
        "exam",
        "department",
        ["department_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.execute("INSERT INTO department (name) VALUES ('General')")
    op.execute("UPDATE candidate SET department_id = 1 WHERE department_id IS NULL")
    op.execute("UPDATE exam SET department_id = 1 WHERE department_id IS NULL")

    op.alter_column("candidate", "department_id", nullable=False)
    op.alter_column("exam", "department_id", nullable=False)


def downgrade() -> None:
    op.drop_constraint("fk_exam_department_id_department", "exam", type_="foreignkey")
    op.drop_constraint("fk_candidate_department_id_department", "candidate", type_="foreignkey")
    op.drop_index(op.f("ix_exam_department_id"), table_name="exam")
    op.drop_index(op.f("ix_candidate_department_id"), table_name="candidate")
    op.drop_column("exam", "department_id")
    op.drop_column("candidate", "department_id")
    op.drop_index(op.f("ix_department_name"), table_name="department")
    op.drop_table("department")
