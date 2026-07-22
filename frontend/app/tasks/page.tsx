"use client";

import { useEffect, useState } from "react";
import { getTasks, getMembers } from "@/lib/tasks-api";
import type { TaskRow, Member } from "@/lib/tasks-api";
import { theme } from "@/lib/theme";
import TaskListTable from "@/components/TaskListTable";
import styles from "@/styles/dashboard.module.css"; // No.13で作成済みの共通スタイルを流用

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [tasksRes, membersData] = await Promise.all([getTasks(), getMembers()]);
        if (cancelled) return;
        setTasks(tasksRes.data);
        setIsFallback(tasksRes.isFallback);
        setMembers(membersData);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "メンバー一覧の取得に失敗しました。バックエンドが起動しているか確認してください。"
          );
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

  if (error || !tasks) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>{error ?? "データを表示できませんでした。"}</div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.heroTitle}>業務リスト</div>
        <div className={styles.heroSubtitle}>
          担当者別の業務一覧です。赤背景の業務は属人化リスクが高く、AI診断が行えます
        </div>
      </div>

      {isFallback && (
        <div className={styles.fallbackNotice}>
          業務一覧APIにまだ接続できないため、確認用のダミーデータを表示しています
          （No.10〜12完成後、自動的に実データに切り替わります）。
        </div>
      )}

      <div style={{ fontSize: 15, fontWeight: 600, color: theme.starbucksGreen, marginBottom: 12 }}>
        担当者別業務一覧
      </div>
      <TaskListTable tasks={tasks} members={members} />
    </div>
  );
}
