import { theme, type RiskLevel } from "./theme";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

// ============================================================
// 業務一覧（No.10〜12・19が完成するまでのダミーデータ）
// tasks テーブル（schema.sql）に準拠
// TODO: No.19「属人業務判定API」完成後、is_isolated はAPIレスポンスの値に差し替える
// ============================================================
export type TaskRow = {
  task_id: string;
  task_name: string;
  task_category: string | null;
  primary_owner_user_id: string;
  primary_owner_name: string;
  department: string | null;
  risk_score: number; // impact_score × handover_difficulty_score（1〜25）
  risk_level: RiskLevel; // "high" | "mid" | "low"（schema上は日本語だがフロントではRiskLevelに統一）
  required_skill: string | null;
  estimated_monthly_hours: number | null;
};

const DUMMY_TASKS: TaskRow[] = [
  {
    task_id: "t1",
    task_name: "月次営業レポート作成",
    task_category: "レポーティング",
    primary_owner_user_id: "u1",
    primary_owner_name: "田中 花子",
    department: "営業部",
    risk_score: 20,
    risk_level: "high",
    required_skill: "Excel集計・レポーティング",
    estimated_monthly_hours: 8,
  },
  {
    task_id: "t2",
    task_name: "取引先A 交渉・窓口対応",
    task_category: "対外折衝",
    primary_owner_user_id: "u1",
    primary_owner_name: "田中 花子",
    department: "営業部",
    risk_score: 22,
    risk_level: "high",
    required_skill: "顧客折衝",
    estimated_monthly_hours: 12,
  },
  {
    task_id: "t3",
    task_name: "社内部門間調整業務",
    task_category: "社内調整",
    primary_owner_user_id: "u1",
    primary_owner_name: "田中 花子",
    department: "営業部",
    risk_score: 14,
    risk_level: "mid",
    required_skill: "他部署連携",
    estimated_monthly_hours: 6,
  },
  {
    task_id: "t4",
    task_name: "チーム定例ファシリ",
    task_category: "会議運営",
    primary_owner_user_id: "u2",
    primary_owner_name: "佐藤 健",
    department: "営業部",
    risk_score: 4,
    risk_level: "low",
    required_skill: null,
    estimated_monthly_hours: 3,
  },
  {
    task_id: "t5",
    task_name: "経費精算・管理",
    task_category: "経理",
    primary_owner_user_id: "u4",
    primary_owner_name: "中村 大輔",
    department: "SE部",
    risk_score: 3,
    risk_level: "low",
    required_skill: "会計ツール操作",
    estimated_monthly_hours: 2,
  },
];

export async function getTasks(): Promise<{ data: TaskRow[]; isFallback: boolean }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, { cache: "no-store" });
    if (!res.ok) throw new Error(`status ${res.status}`);
    const data = (await res.json()) as TaskRow[];
    return { data, isFallback: false };
  } catch (err) {
    console.warn("[Takusu] /api/tasks 未実装のため、ダミーデータで表示します。", err);
    return { data: DUMMY_TASKS, isFallback: true };
  }
}

// ============================================================
// メンバー一覧（実在API： GET /api/members）
// ============================================================
export type Member = {
  user_id: string;
  name: string;
};

export async function getMembers(): Promise<Member[]> {
  const res = await fetch(`${API_BASE_URL}/api/members`, { cache: "no-store" });
  if (!res.ok) throw new Error(`メンバー一覧の取得に失敗しました (${res.status})`);
  return res.json();
}

// ============================================================
// AI配置提案（実在API： POST /api/members/{user_id}/diagnose）
// レスポンス型はOpenAPI上未定義のため、schema.sqlのproposals/proposal_itemsから推測。
// 実際に叩いてみて形が違う場合は、この型定義だけ直せば良いようにしています。
// ============================================================
export type ProposalItem = {
  item_id: string;
  proposal_id: string;
  task_id: string;
  assignee_user_id: string;
  reason: string | null;
  is_modified: boolean;
  needs_training: boolean;
  involvement_score_snapshot: number | null;
  capacity_snapshot: number | null;
};

export type Proposal = {
  proposal_id: string;
  target_user_id: string;
  status: "draft" | "approved";
  ai_comment: string | null;
  ai_model: string | null;
  created_at: string | null;
  approved_at: string | null;
  items: ProposalItem[];
};

export async function diagnoseMember(userId: string): Promise<Proposal> {
  const res = await fetch(`${API_BASE_URL}/api/members/${userId}/diagnose`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`AI診断に失敗しました (${res.status})`);
  return res.json();
}

export async function updateProposalItem(
  proposalId: string,
  itemId: string,
  assigneeUserId: string
): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/proposals/${proposalId}/items/${itemId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignee_user_id: assigneeUserId }),
    }
  );
  if (!res.ok) throw new Error(`引き継ぎ先の修正に失敗しました (${res.status})`);
}

export async function approveProposal(proposalId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/proposals/${proposalId}/approve`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`承認に失敗しました (${res.status})`);
}

// tasks.risk_level ("高"/"中"/"低" 等バックエンドの表現に幅がある場合の変換ヘルパー
export function normalizeRiskLevel(raw: string): RiskLevel {
  if (raw === "high" || raw === "高" || raw === "高リスク") return "high";
  if (raw === "mid" || raw === "中" || raw === "中リスク") return "mid";
  return "low";
}

export { theme };
