# services/allocation.py — AI配置提案のルールエンジン（Step1フィルタ + Step2順位付け）
# ロジック根拠: RFP ver3「AI配置ロジック仕様」+ 5-3合意（標準稼働時間・R値・逐次消費）
from sqlalchemy import text

# --- 設定値（変えたければここだけ触る）---
RANK_ORDER = {"担当": 1, "主任": 2, "係長": 3, "課長": 4, "部長": 5}
FULLTIME_EXTRA_HOURS = 40          # フルタイムの標準稼働時間 = 所定 + 40h（FB合意値）
OVERTIME_LIMIT = 45                # 月45h超で候補除外（法令ライン）
DIFFICULTY_TO_HOURS = {1: 8, 2: 16, 3: 24, 4: 32, 5: 40}  # 工数NULL時のフォールバック


def run_diagnosis(conn, target_user_id: str) -> dict:
    q = lambda sql, **kw: conn.execute(text(sql), kw).mappings().all()

    # --- ① 材料集め ---
    users = q("SELECT * FROM users")
    target = next(u for u in users if u["user_id"] == target_user_id)
    tasks = q("""SELECT * FROM tasks WHERE primary_owner_user_id = :uid
                 ORDER BY risk_score DESC""", uid=target_user_id)
    if not tasks:
        raise ValueError("対象メンバーに担当業務がありません")
    
    # 直近月の勤怠（1人1行）
    latest = {}
    for u in users:
        rows = q("""SELECT * FROM jobcan_working_hours
                    WHERE jobcan_employee_code = :c
                    ORDER BY year_month DESC LIMIT 1""", c=u["jobcan_employee_code"])
        if rows:
            latest[u["user_id"]] = rows[0]

    # 関与度スコア {(user_id, task_id): score}
    inv = {(r["user_id"], r["task_id"]): int(r["involvement_score"])
           for r in q("SELECT user_id, task_id, involvement_score FROM task_involvement_scores")}

    # スキル保有 {user_id: 持っているスキル名の集合}
    member_code = {u["kaonavi_member_code"]: u["user_id"] for u in users}
    skills = {}
    for r in q("SELECT kaonavi_member_code, skill_name FROM kaonavi_skills"):
        uid = member_code.get(r["kaonavi_member_code"])
        if uid:
            skills.setdefault(uid, set()).add(r["skill_name"])

    # --- ② 各メンバーの「標準稼働時間」と「残余力」を初期化 ---
    remaining, standard, load_base = {}, {}, {}
    for u in users:
        jc = latest.get(u["user_id"])
        if not jc:
            continue
        sched = float(jc["scheduled_work_hours"])
        actual = float(jc["actual_work_hours"])
        extra = 0 if u["employment_type"] in ("時短", "育短") else FULLTIME_EXTRA_HOURS
        standard[u["user_id"]] = sched + extra              # 標準稼働時間 = 所定 + 残業許容
        remaining[u["user_id"]] = sched + extra - actual    # 残余力 = 標準 - 実労働
        load_base[u["user_id"]] = actual


    # --- Step1: 固定フィルタ（この条件に合わない人は候補から除外）---
    def passes_step1(u, task):
        if u["user_id"] == target_user_id:
            return False                                    # 抜ける本人は候補外
        if int(latest[u["user_id"]]["overtime_hours"] or 0) > OVERTIME_LIMIT:
            return False                                    # 残業45h超は除外
        if u["is_on_leave"] in (1, "1", True):
            return False                                    # 育休中は除外
        rjt = task["required_job_type"]
        if rjt and rjt != "不問" and u["job_type"] != rjt:
            return False                                    # 職種が合わなければ除外
        rmr = task["required_min_rank"]
        if rmr and RANK_ORDER.get(u["job_rank"], 0) < RANK_ORDER.get(rmr, 0):
            return False                                    # 職位が足りなければ除外
        return True                                         # 全部くぐり抜けたら候補OK
    

    # --- ③ 業務ごとに候補づけ → 割当（リスクの高い業務から順に）---
    items, added = [], {u["user_id"]: 0.0 for u in users}
    for task in tasks:
        hours = task["estimated_monthly_hours"]
        hours = float(hours) if hours else DIFFICULTY_TO_HOURS.get(int(task["handover_difficulty_score"]), 16)

        # Step1を通った人だけを候補にする
        cands = []
        for u in users:
            if u["user_id"] not in remaining or not passes_step1(u, task):
                continue
            r = remaining[u["user_id"]] / hours
            cands.append({
                "user_id": u["user_id"], "name": u["name"],
                "involvement_score": inv.get((u["user_id"], task["task_id"]), 0),
                "remaining_capacity_hours": round(remaining[u["user_id"]], 1),
                "sufficiency_ratio": round(r, 2),
                "capacity_flag": "ok" if r >= 1.2 else ("warning" if r >= 1.0 else "over"),
            })

        # Step2: 関与度の高い順 → 同点なら残余力の多い順
        cands.sort(key=lambda c: (-c["involvement_score"], -c["remaining_capacity_hours"]))

        # 割当（候補の先頭＝1位を採用）
        if not cands:
            items.append({"task": task, "hours": hours, "assignee": None,
                          "candidates": [], "needs_training": True})
            continue
        pick = cands[0]
        req_skill = task["required_skill"]
        needs_training = bool(req_skill) and req_skill not in skills.get(pick["user_id"], set())
        items.append({"task": task, "hours": hours, "assignee": pick,
                      "candidates": cands[:5], "needs_training": needs_training})
        remaining[pick["user_id"]] -= hours       # ★逐次消費：割り当てた分、余力を減らす
        added[pick["user_id"]] += hours


    # --- ④ 結果を返す ---
    # 表示用の負荷サマリー（配置後、誰が何時間になるか）
    load_summary = []
    for uid in standard:
        if uid == target_user_id:
            continue
        name = next(u["name"] for u in users if u["user_id"] == uid)
        load_summary.append({
            "user_id": uid, "name": name,
            "standard_hours": round(standard[uid], 1),
            "current_hours": round(load_base[uid], 1),
            "added_hours": round(added[uid], 1),
            "total_hours": round(load_base[uid] + added[uid], 1),
            "over_capacity": load_base[uid] + added[uid] > standard[uid],
        })

    solo_count = sum(1 for it in items if it["needs_training"])
    return {
        "target": target,
        "items": items,
        "load_summary": load_summary,
        "ai_comment": f"{target['name']}さんの担当{len(items)}件のうち、"
                      f"スキル移管が必要な業務が{solo_count}件あります。",
    }