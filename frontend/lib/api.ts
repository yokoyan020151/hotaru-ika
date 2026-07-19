import type { RiskLevel } from "./theme";

// バックエンドAPIのベースURL（.env.local の NEXT_PUBLIC_API_BASE_URL を参照）
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export type CoverageResponse = {
  coverage_rate: number; // 0-100
  risk_level: RiskLevel;
  risk_label: string; // 例: "注意"
  flagged_member_count: number;
};

export type MemberSummary = {
  member_id: string;
  name: string;
  status: string; // 例: "育休予定 9月〜" / "時短勤務中" / "通常勤務"
  progress_rate: number; // 業務棚卸進捗 0-100
  risk_level: RiskLevel;
};

export type MembersResponse = {
  members: MemberSummary[];
};

// バックエンド未接続時に画面確認するためのダミーデータ（No.13の「ダミーデータで見た目を確認」に対応）
const DUMMY_COVERAGE: CoverageResponse = {
  coverage_rate: 72,
  risk_level: "mid",
  risk_label: "注意",
  flagged_member_count: 2,
};

const DUMMY_MEMBERS: MembersResponse = {
  members: [
    { member_id: "m1", name: "佐藤 未来", status: "育休予定 9月〜", progress_rate: 35, risk_level: "high" },
    { member_id: "m2", name: "鈴木 大輔", status: "時短勤務中", progress_rate: 80, risk_level: "mid" },
    { member_id: "m3", name: "高橋 綾", status: "通常勤務", progress_rate: 95, risk_level: "low" },
    { member_id: "m4", name: "山本 蓮", status: "通常勤務", progress_rate: 60, risk_level: "mid" },
  ],
};

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    // ダッシュボードは頻繁に変わるため毎回最新を取得
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`API request failed: ${path} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// GET /api/dashboard/coverage （No.11 カバー率集計API に対応）
export async function getCoverage(): Promise<{ data: CoverageResponse; isFallback: boolean }> {
  try {
    const data = await fetchJson<CoverageResponse>("/api/dashboard/coverage");
    return { data, isFallback: false };
  } catch (err) {
    console.warn("[Takusu] coverage API取得に失敗。ダミーデータで表示します。", err);
    return { data: DUMMY_COVERAGE, isFallback: true };
  }
}

// GET /api/dashboard/members （No.12 メンバー別リスク可視化API に対応）
export async function getMembers(): Promise<{ data: MembersResponse; isFallback: boolean }> {
  try {
    const data = await fetchJson<MembersResponse>("/api/dashboard/members");
    return { data, isFallback: false };
  } catch (err) {
    console.warn("[Takusu] members API取得に失敗。ダミーデータで表示します。", err);
    return { data: DUMMY_MEMBERS, isFallback: true };
  }
}
