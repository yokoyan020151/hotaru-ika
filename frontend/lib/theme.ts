// Takusu ダッシュボード配色トークン（House Green ベース）
export const theme = {
  canvas: "#f2f0eb",
  houseGreen: "#1E3932",
  greenAccent: "#00754A",
  starbucksGreen: "#006241",
  greenLight: "#d4e9e2",
  greenUplift: "#2b5148",
  white: "#ffffff",
  border: "#edebe9",
  textPrimary: "rgba(0, 0, 0, 0.87)",
  textSecondary: "rgba(0, 0, 0, 0.58)",
  textOnDark: "#ffffff",
  textOnDarkSoft: "rgba(255, 255, 255, 0.7)",
  red: "#c82014",
  yellow: "#fbbc05",
} as const;

export type RiskLevel = "low" | "mid" | "high";

// リスクレベル -> 色のマッピング（棒グラフ・信号機共通）
export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return theme.red;
    case "mid":
      return theme.yellow;
    case "low":
    default:
      return theme.greenAccent;
  }
}

export function riskLabel(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "リスク高";
    case "mid":
      return "リスク中";
    case "low":
    default:
      return "リスク低";
  }
}
