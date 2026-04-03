"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-04-01
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("login", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False, server_default="operator"),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "cameras",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("source_url", sa.String(500), nullable=True),
        sa.Column("status", sa.String(30), server_default="online"),
        sa.Column("polling_interval_sec", sa.Integer, server_default=sa.text("300")),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("site_id", sa.Integer, nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "sites",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("code", sa.String(50), unique=True, nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("address", sa.String(500), nullable=False),
        sa.Column("district", sa.String(100), nullable=True),
        sa.Column("lat", sa.Float, nullable=False),
        sa.Column("lon", sa.Float, nullable=False),
        sa.Column("type", sa.String(50), server_default="standard"),
        sa.Column("container_count", sa.Integer, server_default=sa.text("0")),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(30), server_default="normal"),
        sa.Column("fill_level", sa.Float, server_default=sa.text("0")),
        sa.Column("ai_confidence", sa.Float, server_default=sa.text("0")),
        sa.Column("has_overflow", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_litter_outside", sa.Boolean, server_default=sa.text("false")),
        sa.Column("camera_id", sa.Integer, nullable=True),
        sa.Column("last_capture_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_image_url", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "observations",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("site_id", sa.Integer, nullable=False, index=True),
        sa.Column("camera_id", sa.Integer, nullable=True),
        sa.Column("image_url", sa.String(500), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("fill_level", sa.Float, server_default=sa.text("0")),
        sa.Column("status", sa.String(30), server_default="normal"),
        sa.Column("ai_confidence", sa.Float, server_default=sa.text("0")),
        sa.Column("has_overflow", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_litter_outside", sa.Boolean, server_default=sa.text("false")),
        sa.Column("has_anomaly", sa.Boolean, server_default=sa.text("false")),
        sa.Column("raw_meta_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("site_id", sa.Integer, nullable=False, index=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("severity", sa.String(20), server_default="medium"),
        sa.Column("status", sa.String(20), server_default="new"),
        sa.Column("message", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("acknowledged_by", sa.Integer, nullable=True),
    )

    op.create_table(
        "platform_settings",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("key", sa.String(100), unique=True, nullable=False, index=True),
        sa.Column("value", sa.Text, nullable=True),
        sa.Column("value_type", sa.String(20), server_default="string"),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_by", sa.Integer, nullable=True),
    )

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer, primary_key=True, index=True),
        sa.Column("actor_user_id", sa.Integer, nullable=False, index=True),
        sa.Column("actor_role", sa.String(20), nullable=True),
        sa.Column("action", sa.String(100), nullable=False, index=True),
        sa.Column("entity_type", sa.String(50), nullable=True),
        sa.Column("entity_id", sa.Integer, nullable=True),
        sa.Column("payload_json", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("platform_settings")
    op.drop_table("alerts")
    op.drop_table("observations")
    op.drop_table("sites")
    op.drop_table("cameras")
    op.drop_table("users")
