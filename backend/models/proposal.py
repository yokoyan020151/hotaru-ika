# models/proposal.py — 配置案・通知テーブル

import uuid
from sqlalchemy import Column, String, Text, DateTime, Boolean, Integer , Float , func
from db import Base

def gen_uuid():
    return str(uuid.uuid4())

class Proposal(Base):
    __tablename__ = "proposals"
    proposal_id = Column(String(36), primary_key=True, default=gen_uuid)
    target_user_id = Column(String(36), nullable=False)
    status = Column(String(20), nullable=False, default="draft")  # draft/approved
    ai_comment = Column(Text)
    ai_model = Column(String(100))
    created_at = Column(DateTime, server_default=func.now())
    approved_at = Column(DateTime)

class ProposalItem(Base):
    __tablename__ = "proposal_items"
    item_id = Column(String(36), primary_key=True, default=gen_uuid)
    proposal_id = Column(String(36), nullable=False)
    task_id = Column(String(36), nullable=False)
    assignee_user_id = Column(String(36), nullable=False)
    reason = Column(Text)
    is_modified = Column(Boolean, default=False)
    needs_training = Column(Boolean, default=False)
    involvement_score_snapshot = Column(Integer)
    capacity_snapshot = Column(Float)

class Notification(Base):
    __tablename__ = "notifications"
    notification_id = Column(String(36), primary_key=True, default=gen_uuid)
    proposal_id = Column(String(36), nullable=False)
    recipient_user_id = Column(String(36), nullable=False)
    body = Column(Text, nullable=False)
    sent_at = Column(DateTime, server_default=func.now())
