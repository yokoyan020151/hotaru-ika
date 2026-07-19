# services/reason_llm.py — Step3: LLMは配置の判断をせず、理由の説明だけを行う
import os, json
from openai import OpenAI

FORBIDDEN = ["残業", "時短", "育短", "勤怠", "雇用形態"]   # 禁則ワード（検品用）


def _fallback(diag):
    """LLMが使えない/失敗したときの定型文（スタブと同じ）"""
    texts = []
    for it in diag["items"]:
        a = it["assignee"]
        if not a:
            texts.append("候補者がいないため要検討")
        else:
            texts.append(f"関与度{a['involvement_score']}、余力{a['remaining_capacity_hours']}hで"
                         f"工数{it['hours']:.0f}hを吸収できるため")
    return {"texts": texts, "model": "rule-based-fallback"}


def generate_reasons(diag):
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        return _fallback(diag)

    # --- 匿名化: 氏名を記号に置換（社外AIに個人名を渡さない）---
    names = {}
    for it in diag["items"]:
        if it["assignee"]:
            names.setdefault(it["assignee"]["name"], f"M{len(names) + 1}")

    assigned = [it for it in diag["items"] if it["assignee"]]
    lines = []
    for i, it in enumerate(assigned):
        a = it["assignee"]
        lines.append(f"- 業務{i+1}「{it['task']['task_name']}」→ {names[a['name']]}へ。"
                     f"関与度{a['involvement_score']}/3、余力{a['remaining_capacity_hours']}h、"
                     f"工数{it['hours']:.0f}h、充足度{a['sufficiency_ratio']}")

    prompt = (
        "あなたは人事配置の説明担当です。以下の各配置について、なぜその人が適任かを1業務1文で日本語で説明してください。\n"
        "ルール: 配置の判断は変えない。渡した事実だけを使う。"
        "選ばれなかった人への言及、勤怠・雇用形態への言及はしない。\n\n"
        + "\n".join(lines) +
        '\n\n出力は {"reasons": ["理由1", "理由2", ...]} のJSONのみ。')

    try:
        client = OpenAI(api_key=api_key)
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            timeout=30,
            response_format={"type": "json_object"},
            messages=[{"role": "user", "content": prompt}],
        )
        texts = json.loads(res.choices[0].message.content)["reasons"]

        # --- 検品: 件数一致 & 禁則ワード ---
        if len(texts) != len(assigned):
            return _fallback(diag)
        if any(w in t for t in texts for w in FORBIDDEN):
            return _fallback(diag)

        # 割当なしの業務も含めて、順番通りに理由文を並べ直す
        it_texts = iter(texts)
        result = [next(it_texts) if it["assignee"] else "候補者がいないため要検討"
                  for it in diag["items"]]
        return {"texts": result, "model": "gpt-4o-mini"}
    except Exception:
        return _fallback(diag)     # 失敗しても診断は止めない