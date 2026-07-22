"use client";

import { useMemo, useState } from "react";
import type { TaskRow, Member, Proposal } from "@/lib/tasks-api";
import { diagnoseMember } from "@/lib/tasks-api";
import { theme, riskColor, riskLabel } from "@/lib/theme";
import DiagnoseModal from "./DiagnoseModal";

type Props = {
  tasks: TaskRow[];
  members: Member[];
};

// 属人業務の暫定判定（No.19の属人業務判定APIが完成するまでの代用ロジック）
// risk_level が high のタスクを「属人業務」として扱う
function isIsolated(task: TaskRow): boolean {
  return task.risk_level === "high";
}

export default function TaskListTable({ tasks, members }: Props) {
  const [ownerFilter, setOwnerFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [diagnosing, setDiagnosingUserId] = useState<string | null>(null);
  const [diagnoseError, setDiagnoseError] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<{
    proposal: Proposal;
    targetUserName: string;
  } | null>(null);

  const departments = useMemo(
    () => Array.from(new Set(tasks.map((t) => t.department).filter(Boolean))) as string[],
    [tasks]
  );

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const ownerMatch =
        ownerFilter === "" || t.primary_owner_name.includes(ownerFilter);
      const deptMatch = departmentFilter === "" || t.department === departmentFilter;
      return ownerMatch && deptMatch;
    });
  }, [tasks, ownerFilter, departmentFilter]);

  async function handleDiagnose(task: TaskRow) {
    setDiagnosingUserId(task.primary_owner_user_id);
    setDiagnoseError(null);
    try {
      const proposal = await diagnoseMember(task.primary_owner_user_id);
      setActiveProposal({ proposal, targetUserName: task.primary_owner_name });
    } catch (err) {
      setDiagnoseError(
        err instanceof Error ? err.message : "AI診断の実行に失敗しました"
      );
    } finally {
      setDiagnosingUserId(null);
    }
  }

  return (
    <div>
      {/* 検索・絞り込みUI（No.21） */}
      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          type="text"
          placeholder="担当者名で絞り込み"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
            width: 200,
          }}
        />
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          style={{
            padding: "8px 12px",
            fontSize: 13,
            borderRadius: 8,
            border: `1px solid ${theme.border}`,
          }}
        >
          <option value="">全部署</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {diagnoseError && (
        <div style={{ color: theme.red, fontSize: 13, marginBottom: 10 }}>
          {diagnoseError}
        </div>
      )}

      {/* 業務一覧テーブル */}
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 0 0.5px rgba(0,0,0,0.14), 0 1px 1px rgba(0,0,0,0.24)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 0.8fr",
            padding: "10px 18px",
            fontSize: 12,
            color: theme.textSecondary,
            borderBottom: `1px solid ${theme.border}`,
          }}
        >
          <div>業務名</div>
          <div>担当者</div>
          <div>部署</div>
          <div>リスク</div>
          <div></div>
        </div>

        {filteredTasks.map((task, i) => {
          const isolated = isIsolated(task);
          return (
            <div
              key={task.task_id}
              title={`リスクスコア ${task.risk_score} = 影響度 × 引き継ぎ難易度`}
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 1.2fr 1fr 0.8fr 0.8fr",
                alignItems: "center",
                padding: "12px 18px",
                background: isolated ? "#fce8e6" : "transparent",
                borderBottom:
                  i < filteredTasks.length - 1 ? `1px solid ${theme.border}` : "none",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                  {task.task_name}
                </div>
                {task.required_skill && (
                  <div style={{ fontSize: 11, color: theme.textSecondary }}>
                    必要スキル: {task.required_skill}
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: theme.textPrimary }}>
                {task.primary_owner_name}
              </div>
              <div style={{ fontSize: 13, color: theme.textSecondary }}>
                {task.department ?? "—"}
              </div>
              <div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 50,
                    padding: "3px 10px",
                    color: task.risk_level === "high" ? "#fff" : theme.textPrimary,
                    background: riskColor(task.risk_level),
                  }}
                >
                  {riskLabel(task.risk_level)}
                </span>
              </div>
              <div>
                {isolated && (
                  <button
                    onClick={() => handleDiagnose(task)}
                    disabled={diagnosing === task.primary_owner_user_id}
                    style={{
                      background: theme.greenAccent,
                      color: "#fff",
                      border: `1px solid ${theme.greenAccent}`,
                      borderRadius: 50,
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      opacity: diagnosing === task.primary_owner_user_id ? 0.6 : 1,
                    }}
                  >
                    {diagnosing === task.primary_owner_user_id ? "診断中…" : "AI診断"}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: theme.textSecondary }}>
            条件に一致する業務がありません
          </div>
        )}
      </div>

      {activeProposal && (
        <DiagnoseModal
          proposal={activeProposal.proposal}
          members={members}
          targetUserName={activeProposal.targetUserName}
          onClose={() => setActiveProposal(null)}
          onApproved={() => setActiveProposal(null)}
        />
      )}
    </div>
  );
}
