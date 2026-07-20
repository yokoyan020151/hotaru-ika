"use client";

import { useEffect, useState } from "react";
import { getCoverage, getMembers } from "@/lib/api";
import type { CoverageResponse, MembersResponse } from "@/lib/api";
import { theme, riskColor } from "@/lib/theme";
import CoverageDonutChart from "@/components/CoverageDonutChart";
import MemberRiskBarChart from "@/components/MemberRiskBarChart";
import MemberTable from "@/components/MemberTable";
import styles from "@/styles/dashboard.module.css";

export default function DashboardPage() {
  const [coverage, setCoverage] = useState<CoverageResponse | null>(null);
  const [members, setMembers] = useState<MembersResponse | null>(null);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [coverageRes, membersRes] = await Promise.all([getCoverage(), getMembers()]);
        if (cancelled) return;
        setCoverage(coverageRes.data);
        setMembers(membersRes.data);
        setIsFallback(coverageRes.isFallback || membersRes.isFallback);
      } catch (err) {
        if (!cancelled) {
          setError("データの取得に失敗しました。時間をおいて再度お試しください。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>読み込み中です…</div>
      </div>
    );
  }

  if (error || !coverage || !members) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>{error ?? "データを表示できませんでした。"}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTitle}>こんにちは、田中さん</div>
        <div className={styles.heroSubtitle}>チームの引き継ぎ状況を確認しましょう</div>
      </div>

      {isFallback && (
        <div className={styles.fallbackNotice}>
          バックエンドAPIに接続できなかったため、確認用のダミーデータを表示しています。
        </div>
      )}

      <div className={styles.summaryGrid}>
        <div className={styles.card} style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <CoverageDonutChart coverageRate={coverage.coverage_rate} />
          <div>
            <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 4 }}>
              チーム全体の業務カバー率
            </div>
            <div style={{ fontSize: 12, color: theme.textSecondary }}>
              バックアップ体制ありの業務比率
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 8 }}>
            チームリスクスコア
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: riskColor(coverage.risk_level),
              }}
            />
            <div style={{ fontSize: 22, fontWeight: 600, color: theme.textPrimary }}>
              {coverage.risk_label}
            </div>
          </div>
          <div style={{ fontSize: 12, color: theme.textSecondary, marginTop: 8 }}>
            {coverage.flagged_member_count}名の業務に偏りがあります
          </div>
        </div>
      </div>

      <div className={styles.card} style={{ marginBottom: 24 }}>
        <div className={styles.cardTitleGreen}>業務棚卸の進捗（メンバー別）</div>
        <MemberRiskBarChart members={members.members} />
      </div>

      <MemberTable members={members.members} />
    </div>
  );
}
