# routers/proposals.py — F-03/F-04 のAPI窓口
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from db import get_db
from models.proposal import Proposal, ProposalItem, Notification
from services.allocation import run_diagnosis
from services.reason_llm import generate_reasons

router = APIRouter()


def build_response(db: Session, proposal_id: str) -> dict:
    """DBに保存済みの配置案を、APIレスポンスの形に組み立てて返す"""
    p = db.get(Proposal, proposal_id)
    if not p:
        raise HTTPException(404, "配置案が見つかりません")
    q = lambda sql, **kw: db.execute(text(sql), kw).mappings().all()
    users = {u["user_id"]: u["name"] for u in q("SELECT user_id, name FROM users")}
    tasks = {t["task_id"]: t for t in q("SELECT * FROM tasks")}
    items = db.query(ProposalItem).filter_by(proposal_id=proposal_id).all()

    # 候補・負荷サマリーは診断を再実行して復元（MVPは都度計算でシンプルに）
    diag = run_diagnosis(db.connection(), p.target_user_id)
    cand_map = {it["task"]["task_id"]: it["candidates"] for it in diag["items"]}

    return {
        "proposal_id": p.proposal_id,
        "status": p.status,
        "target_user_name": users.get(p.target_user_id, "不明"),
        "ai_comment": p.ai_comment,
        "items": [{
            "item_id": it.item_id,
            "task_id": it.task_id,
            "task_name": tasks[it.task_id]["task_name"],
            "estimated_monthly_hours": tasks[it.task_id]["estimated_monthly_hours"],
            "risk_level": tasks[it.task_id]["risk_level"],
            "needs_training": it.needs_training,
            "assignee_user_id": it.assignee_user_id,
            "assignee_name": users.get(it.assignee_user_id, "未定"),
            "reason": it.reason,
            "is_modified": it.is_modified,
            "candidates": cand_map.get(it.task_id, []),
        } for it in items],
        "load_summary": diag["load_summary"],
        "notifications": [{"recipient_name": users.get(n.recipient_user_id, "不明"), "body": n.body}
                          for n in db.query(Notification).filter_by(proposal_id=proposal_id)],
    }


@router.post("/api/members/{user_id}/diagnose")
def diagnose(user_id: str, db: Session = Depends(get_db)):
    """AI診断を実行して配置案を作り、DBに下書き保存して返す"""
    diag = run_diagnosis(db.connection(), user_id)
    reasons = generate_reasons(diag)

    # ① 配置案ヘッダを保存
    p = Proposal(target_user_id=user_id, ai_comment=diag["ai_comment"],
                 ai_model=reasons["model"])
    db.add(p)
    db.flush()   # ここでp.proposal_idが確定する

    # ② 業務ごとの明細を保存
    for it, reason in zip(diag["items"], reasons["texts"]):
        if not it["assignee"]:
            continue
        db.add(ProposalItem(
            proposal_id=p.proposal_id,
            task_id=it["task"]["task_id"],
            assignee_user_id=it["assignee"]["user_id"],
            reason=reason,
            needs_training=it["needs_training"],
            involvement_score_snapshot=it["assignee"]["involvement_score"],
            capacity_snapshot=it["assignee"]["sufficiency_ratio"],
        ))
    db.commit()
    return build_response(db, p.proposal_id)