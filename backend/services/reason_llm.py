# services/reason_llm.py — 理由文生成（まずは定型文スタブ。A5で本物のLLMに差し替え）
def generate_reasons(diag):
    texts = []
    for it in diag["items"]:
        a = it["assignee"]
        if not a:
            texts.append("候補者がいないため要検討")
            continue
        texts.append(f"関与度{a['involvement_score']}、余力{a['remaining_capacity_hours']}hで"
                     f"工数{it['hours']:.0f}hを吸収できるため")
    return {"texts": texts, "model": "rule-based"}