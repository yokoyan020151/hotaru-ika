# seed.py — ダミーDB ver6 をローカルDBに丸ごと投入する（何度でも実行可）
#
# 全11シートを投入し、ver6を忠実に再現する。
# ただしF-03/F-04が実際に読むのは以下5テーブルのみ:
#   users / tasks / task_involvement_scores / jobcan_working_hours / kaonavi_skills
# 他（calendar/slack/project_experiences/qualifications等）は involvement_score の
# 計算元で、集計済みスコアを読むため生データは参照しない（ホタルイカのバッチ領域）。
# → 使わないが「本番DBと手元を一致させる」ため投入しておく。

import pandas as pd
from db import engine, Base
import models.proposal  # 3テーブルの定義を読み込ませる（無いとテーブルが作られない）

XLSX = "data/ver6.xlsx"
SHEETS = ["users", "tasks", "task_involvement_scores",
          "google_calendar_meetings", "google_calendar_attendees",
          "slack_channel_memberships", "jobcan_working_hours",
          "kaonavi_members", "kaonavi_skills",
          "kaonavi_qualifications", "kaonavi_project_experiences"]

for sheet in SHEETS:
    df = pd.read_excel(XLSX, sheet_name=sheet)
    df = df.dropna(how="all")                      # 空行を除去
    for col in df.columns:                         # "TRUE"/"FALSE" を 1/0 に正規化
        if df[col].dtype == object:
            df[col] = df[col].replace({"TRUE": 1, "FALSE": 0, True: 1, False: 0})
    df.to_sql(sheet, engine, if_exists="replace", index=False)
    print(f"  {sheet}: {len(df)}件")

Base.metadata.create_all(engine)                   # proposals系3テーブルを作成
print("投入完了")