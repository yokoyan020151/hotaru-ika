import { theme, riskColor, riskLabel } from "@/lib/theme";
import type { MemberSummary } from "@/lib/api";
import styles from "@/styles/dashboard.module.css";

type Props = {
  members: MemberSummary[]; // 固定順（並び替えなし）で渡すこと
};

export default function MemberTable({ members }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.cardTitleGreen}>メンバー別状況</div>
      <div>
        {members.map((m, i) => (
          <div
            key={m.member_id}
            className={styles.memberRow}
            style={{
              borderBottom: i < members.length - 1 ? `1px solid ${theme.border}` : "none",
            }}
          >
            <div className={styles.avatar}>{m.name.charAt(0)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: theme.textPrimary }}>
                {m.name}
              </div>
              <div style={{ fontSize: 12, color: theme.textSecondary }}>{m.status}</div>
            </div>
            <div style={{ width: 120, flexShrink: 0 }}>
              <div className={styles.progressTrack}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${m.progress_rate}%`, background: riskColor(m.risk_level) }}
                />
              </div>
              <div style={{ fontSize: 11, color: theme.textSecondary, marginTop: 4 }}>
                棚卸進捗 {m.progress_rate}%
              </div>
            </div>
            <div
              title={riskLabel(m.risk_level)}
              style={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                background: riskColor(m.risk_level),
                flexShrink: 0,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
