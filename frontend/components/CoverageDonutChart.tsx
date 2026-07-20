"use client";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { theme } from "@/lib/theme";

ChartJS.register(ArcElement, Tooltip, Legend);

type Props = {
  coverageRate: number; // 0-100
};

// チーム全体の業務カバー率をドーナツチャートで表示
export default function CoverageDonutChart({ coverageRate }: Props) {
  const data = {
    labels: ["カバー済み", "未カバー"],
    datasets: [
      {
        data: [coverageRate, 100 - coverageRate],
        backgroundColor: [theme.greenAccent, theme.border],
        borderWidth: 0,
      },
    ],
  };

  const options = {
    cutout: "72%",
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: { label: string; raw: unknown }) => `${ctx.label}: ${ctx.raw}%`,
        },
      },
    },
  };

  return (
    <div style={{ position: "relative", width: 140, height: 140 }}>
      <Doughnut data={data} options={options} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 600, color: theme.starbucksGreen }}>
          {coverageRate}%
        </div>
        <div style={{ fontSize: 11, color: theme.textSecondary }}>カバー率</div>
      </div>
    </div>
  );
}
