"use client";
import { useEffect, useState } from "react";

const TARGET_ID = "038674dd-336a-4a6a-9068-b93dd2bfdfd2"; // 佐藤 美咲
const API = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Proposals() {
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [targetId, setTargetId] = useState(TARGET_ID);
  const [members, setMembers] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/members`)
      .then((res) => res.json())
      .then((data) => setMembers(data))
      .catch(() => {});
  }, []);

  const diagnose = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/members/${targetId}/diagnose`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.detail || "この人は診断できませんでした（担当業務が無いかもしれません）");
        return;
      }
      const data = await res.json();
      setProposal(data);
    } catch (e) {
      alert("診断に失敗しました。バックエンドが起動しているか確認してください。");
    } finally {
      setLoading(false);
    }
  };

  const resetDemo = async () => {
    setResetting(true);
    try {
      await fetch(`${API}/api/dev/reset`, { method: "POST" });
      setProposal(null);
      alert("デモデータを初期状態に戻しました");
    } catch (e) {
      alert("リセットに失敗しました");
    } finally {
      setResetting(false);
    }
  };

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
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-bold text-gray-900">Takusu 配置提案（F-03 / F-04）</h1>

      {/* ⚠️ デモ用の対象選択。本番では target_user_id は上流からURL経由で渡ってくる想定。
          結合時はホタルイカ班と受け渡し方法を要相談。 */}
      <div className="my-4 text-sm text-gray-700">
        対象メンバー：{" "}
        <select
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          className="rounded border border-gray-300 px-2 py-1"
        >
          {members.map((m) => (
            <option key={m.user_id} value={m.user_id}>{m.name}</option>
          ))}
        </select>
      </div>

      <div className="flex gap-3">
        <button onClick={diagnose} disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
          {loading ? "診断中..." : "配置案を作る"}
        </button>
        <button onClick={resetDemo} disabled={resetting}
          className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
          {resetting ? "リセット中..." : "デモをリセット"}
        </button>
      </div>

      {proposal && (
        <section className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900">{proposal.target_user_name}さんの不在プラン</h2>
          <p className="mt-1 text-gray-500">{proposal.ai_comment}</p>

          <ul className="mt-4 space-y-3">
            {proposal.items.map((item: any) => (
              <li key={item.item_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <strong className="text-gray-900">{item.task_name}</strong>
                  {item.needs_training && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">⚠️ スキル移管が必要</span>
                  )}
                </div>

                <div className="mt-2 text-sm text-gray-700">
                  担当 →{" "}
                  {proposal.status === "draft" ? (
                    <select
                      value={item.assignee_user_id}
                      onChange={(e) => changeAssignee(item.item_id, e.target.value)}
                      className="rounded border border-gray-300 px-2 py-1"
                    >
                      {members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium">{item.assignee_name}</span>
                  )}
                  {item.is_modified && <span className="ml-2 text-xs text-blue-600">（上司修正）</span>}
                </div>

                <p className="mt-2 text-sm text-gray-500">{item.reason}</p>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {proposal.status === "draft" ? (
              <button onClick={approve} disabled={approving}
                className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                {approving ? "承認中..." : "この配置案を承認する"}
              </button>
            ) : (
              <div className="rounded-lg bg-green-100 px-4 py-3 text-green-800">✅ この配置案は承認済みです</div>
            )}
          </div>

          {proposal.notifications && proposal.notifications.length > 0 && (
            <section className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900">送信された通知</h3>
              <div className="mt-3 space-y-3">
                {proposal.notifications.map((n: any, i: number) => (
                  <div key={i} className="whitespace-pre-wrap rounded-xl border border-gray-200 bg-white p-4">
                    <div className="font-semibold text-gray-900">宛先: {n.recipient_name}</div>
                    <div className="mt-1 text-sm text-gray-700">{n.body}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      )}
    </main>
  );
}