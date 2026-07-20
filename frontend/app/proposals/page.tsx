"use client";
import { useEffect, useState } from "react";  // ★ useEffect を追加

const TARGET_ID = "038674dd-336a-4a6a-9068-b93dd2bfdfd2"; // 佐藤 美咲
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Proposals() {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);  // ★ メンバー一覧の箱

  // ★ 追加①：ページを開いた時、メンバー一覧を取ってくる
  useEffect(() => {
    fetch(`${API}/api/members`)
      .then((res) => res.json())
      .then((data) => setMembers(data))
      .catch(() => {});
  }, []);

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
  // デモ用：データを初期状態に戻す
  const resetDemo = async () => {
    setResetting(true);
    try {
      await fetch(`${API}/api/dev/reset`, { method: "POST" });
      setProposal(null);   // 画面をまっさらに戻す
      alert("デモデータを初期状態に戻しました");
    } catch (e) {
      alert("リセットに失敗しました");
    } finally {
      setResetting(false);
    }
  };

  // ★ 追加②：上司が担当を変える（手修正）
  const changeAssignee = async (itemId: string, newUserId: string) => {
    if (!proposal) return;
    const res = await fetch(`${API}/api/proposals/${proposal.proposal_id}/items/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_user_id: newUserId }),
    });
    const data = await res.json();
    setProposal(data);
  };

  const approve = async () => {
    if (!proposal) return;
    setApproving(true);
    try {
      const res = await fetch(`${API}/api/proposals/${proposal.proposal_id}/approve`, { method: "POST" });
      const data = await res.json();
      setProposal(data);
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
      
      <button onClick={resetDemo} disabled={resetting}
        style={{ marginLeft: 12, padding: "8px 16px", fontSize: 14 }}>
        {resetting ? "リセット中..." : "デモをリセット"}
      </button>

      {proposal && (
        <section style={{ marginTop: 24 }}>
          <h2>{proposal.target_user_name}さんの不在プラン</h2>
          <p style={{ color: "#555" }}>{proposal.ai_comment}</p>

          <ul style={{ listStyle: "none", padding: 0 }}>
            {proposal.items.map((item: any) => (
              <li key={item.item_id} style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <strong>{item.task_name}</strong>

                {/* ★ 追加③：担当をドロップダウンに（承認前だけ変更可） */}
                <div style={{ marginTop: 8 }}>
                  担当 →{" "}
                  {proposal.status === "draft" ? (
                    <select
                      value={item.assignee_user_id}
                      onChange={(e) => changeAssignee(item.item_id, e.target.value)}
                    >
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    item.assignee_name
                  )}
                  {item.is_modified && (
                    <span style={{ color: "#2563eb", fontSize: 13, marginLeft: 8 }}>（上司修正）</span>
                  )}
                </div>

                <div style={{ color: "#555", fontSize: 14, marginTop: 4 }}>{item.reason}</div>
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