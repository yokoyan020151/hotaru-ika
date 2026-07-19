"use client";

import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
} from "chart.js";
import { riskColor } from "@/lib/theme";
import type { MemberSummary } from "@/lib/api";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

type Props = {
  members: MemberSummary[];
};

// メンバー別の業務棚卸進捗を棒グラフで表示。バーの色はリスクレベルに連動（高=赤/中=黄/低=緑）
export default function MemberRiskBarChart({ members }: Props) {
  const data = {
    labels: members.map((m) => m.name),
    datasets: [
      {
        label: "業務棚卸進捗（%）",
        data: members.map((m) => m.progress_rate),
        backgroundColor: members.map((m) => riskColor(m.risk_level)),
        borderRadius: 4,
        maxBarThickness: 32,
      },
    ],
  };

  const options = {
    indexAxis: "y" as const,
    scales: {
      x: { min: 0, max: 100, ticks: { stepSize: 20 } },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { raw: unknown }) => `棚卸進捗 ${ctx.raw}%`,
        },
      },
    },
  };

  return (
    <div style={{ height: Math.max(160, members.length * 44) }}>
      <Bar data={data} options={options} />
    </div>
  );
}
