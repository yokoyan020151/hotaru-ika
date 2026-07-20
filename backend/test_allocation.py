# test_allocation.py — ルールエンジンの答え合わせ（ver6 READMEが答案用紙）
from sqlalchemy import text
from db import engine
from services.allocation import run_diagnosis

with engine.connect() as conn:
    # 佐藤さん（育休予定・フルタイム）のIDを取る
    sato = conn.execute(text("SELECT user_id FROM users WHERE name LIKE '佐藤%'")).scalar()
    result = run_diagnosis(conn, sato)

    print("■ AIコメント:", result["ai_comment"])
    print("■ 配置案:")
    for it in result["items"]:
        t = it["task"]
        a = it["assignee"]["name"] if it["assignee"] else "（候補なし）"
        train = " [要スキル移管]" if it["needs_training"] else ""
        print(f"  {t['task_name'][:18]:20s} {it['hours']:>4.0f}h → {a}{train}")
        for c in it["candidates"][:3]:
            print(f"      候補: {c['name']} 関与{c['involvement_score']} "
                  f"残余力{c['remaining_capacity_hours']}h R={c['sufficiency_ratio']} [{c['capacity_flag']}]")