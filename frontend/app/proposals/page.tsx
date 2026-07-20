"use client";
import { useState } from "react";

const TARGET_ID = "038674dd-336a-4a6a-9068-b93dd2bfdfd2"; // 佐藤 美咲
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Proposals() {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);

  // 配置案を作る（診断）
  const diagnose = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/members/${TARGET_ID}/diagnose`, { method: "POST" });
      const data = await res.json();
      setProposal(data);
    } catch (e) {
      alert("診断に失敗しました。バックエンドが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  // 配置案を承認する
  const approve = async () => {
    if (!proposal) return;
    setApproving(true);
    try {
      const res = await fetch(`${API}/api/proposals/${proposal.proposal_id}/approve`, { method: "POST" });
      const data = await res.json();
      setProposal(data); // 承認後の応答（status=approved＋通知）で置き換え
    } catch (e) {
      alert("承認に失敗しました。");
    } finally {
      setApproving(false);
    }
  };

  return (
    <main style={{ padding: 40, maxWidth: 800 }}>
      <h1>Takusu 配置提案（F-03 / F-04）</h1>

      <button onClick={diagnose} disabled={loading} style={{ padding: "8px 16px", fontSize: 16 }}>
        {loading ? "診断中..." : "佐藤さんの配置案を作る"}
      </button>

      {proposal && (
        <section style={{ marginTop: 24 }}>
          <h2>{proposal.target_user_name}さんの不在プラン</h2>
          <p style={{ color: "#555" }}>{proposal.ai_comment}</p>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {proposal.items.map((item: any) => (
              <li key={item.item_id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <strong>{item.task_name}</strong>
                <div>担当 → {item.assignee_name}</div>
                <div style={{ color: "#555", fontSize: 14 }}>{item.reason}</div>
                {item.needs_training && (
                  <span style={{ color: "#b45309", fontSize: 13 }}>⚠️ スキル移管が必要</span>
                )}
              </li>
            ))}
          </ul>

          {proposal.status === "draft" ? (
            <button onClick={approve} disabled={approving}
              style={{ padding: "10px 20px", fontSize: 16, background: "#2563eb", color: "#fff", border: "none", borderRadius: 8 }}>
              {approving ? "承認中..." : "この配置案を承認する"}
            </button>
          ) : (
            <div style={{ padding: 12, background: "#dcfce7", borderRadius: 8, color: "#166534" }}>
              ✅ この配置案は承認済みです
            </div>
          )}

          {proposal.notifications && proposal.notifications.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <h3>送信された通知</h3>
              {proposal.notifications.map((n: any, i: number) => (
                <div key={i} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12, whiteSpace: "pre-wrap" }}>
                  <div><strong>宛先: {n.recipient_name}</strong></div>
                  <div>{n.body}</div>
                </div>
              ))}
            </section>
          )}
        </section>
      )}
    </main>
  );
}