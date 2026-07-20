# routers/proposals.py — F-03/F-04 のAPI窓口
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session
from db import get_db
from models.proposal import Proposal, ProposalItem, Notification
from services.allocation import run_diagnosis
from services.reason_llm import generate_reasons
from pydantic import BaseModel

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

    # 候補・負荷サマリーは診断を再実行して復元（承認前の下書き画面用）。
    # 承認後は対象者の担当が0件になり診断できないので、その場合は空にする。
    try:
        diag = run_diagnosis(db.connection(), p.target_user_id)
        cand_map = {it["task"]["task_id"]: it["candidates"] for it in diag["items"]}
        load_summary = diag["load_summary"]
    except ValueError:
        cand_map = {}
        load_summary = []

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
        "load_summary": load_summary,
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


@router.post("/api/proposals/{proposal_id}/approve")
def approve(proposal_id: str, db: Session = Depends(get_db)):
    """配置案を承認：確定・担当書き換え・通知作成を1トランザクションで実行"""
    p = db.get(Proposal, proposal_id)
    if not p:
        raise HTTPException(404, "配置案が見つかりません")
    if p.status != "draft":
        raise HTTPException(409, "この配置案はすでに承認済みです")

    try:
        from datetime import datetime
        users = {u["user_id"]: u["name"]
                 for u in db.execute(text("SELECT user_id, name FROM users")).mappings()}
        items = db.query(ProposalItem).filter_by(proposal_id=proposal_id).all()

        # ① 配置案を承認済みに
        p.status = "approved"
        p.approved_at = datetime.now()

        # ② 各業務の担当者を書き換え＋通知の宛先ごとに業務をまとめる
        by_assignee = {}
        for it in items:
            db.execute(text("UPDATE tasks SET primary_owner_user_id = :a WHERE task_id = :t"),
                       {"a": it.assignee_user_id, "t": it.task_id})
            task_name = db.execute(text("SELECT task_name FROM tasks WHERE task_id = :t"),
                                   {"t": it.task_id}).scalar()
            by_assignee.setdefault(it.assignee_user_id, []).append(task_name)

        # ③ 通知を作成（引き継ぎ先メンバーごとに1通）
        for uid, task_names in by_assignee.items():
            db.add(Notification(
                proposal_id=proposal_id,
                recipient_user_id=uid,
                body=(f"【Takusu】業務担当変更のお知らせ\n"
                      f"{users[p.target_user_id]}さんの育児休業に伴い、"
                      f"{users[uid]}さんの新しい担当業務が確定しました：\n"
                      f"{'、'.join(task_names)}"),
            ))

        db.commit()   # ①②③を、ここでまとめて確定
    except HTTPException:
        raise
    except Exception:
        db.rollback()   # 途中で失敗したら、全部なかったことに
        raise HTTPException(500, "承認処理に失敗しました（変更は取り消されました）")

    return build_response(db, proposal_id)

@router.get("/api/members")
def list_members(db: Session = Depends(get_db)):
    """メンバー一覧（ドロップダウン用）。user_idと名前だけ返す"""
    rows = db.execute(text("SELECT user_id, name FROM users")).mappings().all()
    return [{"user_id": r["user_id"], "name": r["name"]} for r in rows]

class ItemUpdate(BaseModel):
    assignee_user_id: str   # フロントから届く「新しい担当のuser_id」


@router.put("/api/proposals/{proposal_id}/items/{item_id}")
def update_item(proposal_id: str, item_id: str, payload: ItemUpdate,
                db: Session = Depends(get_db)):
    """配置案の1業務の引き継ぎ先を、上司が手修正する"""
    p = db.get(Proposal, proposal_id)
    if not p:
        raise HTTPException(404, "配置案が見つかりません")
    if p.status != "draft":
        raise HTTPException(409, "承認済みの配置案は修正できません")

    item = db.get(ProposalItem, item_id)
    if not item or item.proposal_id != proposal_id:
        raise HTTPException(404, "明細が見つかりません")

    item.assignee_user_id = payload.assignee_user_id
    item.is_modified = True
    item.reason = "上司の判断による変更"   # ★禁則：選ばれなかった人の事情は書かない
    db.commit()

    return build_response(db, proposal_id)