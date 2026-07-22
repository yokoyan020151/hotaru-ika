"use client";

import { useEffect, useState } from "react";
import type { Member, Proposal } from "@/lib/tasks-api";
import { updateProposalItem, approveProposal } from "@/lib/tasks-api";
import { theme } from "@/lib/theme";

type Props = {
  proposal: Proposal;
  members: Member[];
  targetUserName: string;
  onClose: () => void;
  onApproved: () => void;
};

export default function DiagnoseModal({
  proposal,
  members,
  targetUserName,
  onClose,
  onApproved,
}: Props) {
  const [items, setItems] = useState(proposal.items);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(proposal.items);
  }, [proposal]);

  async function handleAssigneeChange(itemId: string, newAssigneeId: string) {
    setSavingItemId(itemId);
    setError(null);
    try {
      await updateProposalItem(proposal.proposal_id, itemId, newAssigneeId);
      setItems((prev) =>
        prev.map((it) =>
          it.item_id === itemId
            ? { ...it, assignee_user_id: newAssigneeId, is_modified: true }
            : it
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "修正に失敗しました");
    } finally {
      setSavingItemId(null);
    }
  }

  async function handleApprove() {
    setApproving(true);
    setError(null);
    try {
      await approveProposal(proposal.proposal_id);
      onApproved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "承認に失敗しました");
    } finally {
      setApproving(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          width: 640,
          maxHeight: "80vh",
          overflowY: "auto",
          boxShadow: "0 4px 24px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 17, fontWeight: 600, color: theme.textPrimary }}>
          AI配置提案 / 修正
        </div>
        <div style={{ fontSize: 13, color: theme.textSecondary, marginTop: 2, marginBottom: 14 }}>
          {targetUserName}さん不在時のカバー案 — 担当者を変更できます
        </div>

        {proposal.ai_comment && (
          <div
            style={{
              background: theme.greenLight,
              border: `1px solid ${theme.greenLight}`,
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              color: "#04342c",
              marginBottom: 16,
            }}
          >
            <span style={{ fontWeight: 600 }}>AIのコメント：</span>
            {proposal.ai_comment}
          </div>
        )}

        <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, overflow: "hidden" }}>
          {items.map((item, i) => (
            <div
              key={item.item_id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderBottom: i < items.length - 1 ? `1px solid ${theme.border}` : "none",
                background: item.needs_training ? "#fce8e6" : "transparent",
              }}
            >
              <div style={{ flex: 1.4, fontSize: 13, color: theme.textPrimary }}>
                {item.task_id}
                {item.needs_training && (
                  <span
                    style={{
                      marginLeft: 8,
                      fontSize: 11,
                      fontWeight: 600,
                      color: theme.red,
                      border: `1px solid ${theme.red}`,
                      borderRadius: 50,
                      padding: "1px 8px",
                    }}
                  >
                    属人
                  </span>
                )}
              </div>
              <select
                value={item.assignee_user_id}
                disabled={savingItemId === item.item_id}
                onChange={(e) => handleAssigneeChange(item.item_id, e.target.value)}
                style={{
                  flex: 1,
                  fontSize: 13,
                  padding: "6px 8px",
                  borderRadius: 6,
                  border: `1px solid ${theme.border}`,
                }}
              >
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}
                  </option>
                ))}
              </select>
              <div style={{ flex: 1.6, fontSize: 12, color: theme.textSecondary }}>
                {item.reason ?? "—"}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: theme.red, fontSize: 13, marginTop: 10 }}>{error}</div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              color: theme.textPrimary,
              border: `1px solid rgba(0,0,0,0.3)`,
              borderRadius: 50,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            閉じる
          </button>
          <button
            onClick={handleApprove}
            disabled={approving}
            style={{
              background: theme.greenAccent,
              color: "#fff",
              border: `1px solid ${theme.greenAccent}`,
              borderRadius: 50,
              padding: "9px 18px",
              fontSize: 13,
              fontWeight: 600,
              opacity: approving ? 0.6 : 1,
            }}
          >
            {approving ? "承認中…" : "この配置案で承認する"}
          </button>
        </div>
      </div>
    </div>
  );
}
