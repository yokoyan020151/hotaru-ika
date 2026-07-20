# check_seed.py — 投入結果がver6 READMEの「答え」と一致するか確認
from sqlalchemy import text
from db import engine

with engine.connect() as conn:
    q = lambda sql: conn.execute(text(sql)).fetchall()
    print("users:", q("SELECT COUNT(*) FROM users")[0][0], "(期待: 8)")
    print("tasks:", q("SELECT COUNT(*) FROM tasks")[0][0], "(期待: 20)")
    print("involvement:", q("SELECT COUNT(*) FROM task_involvement_scores")[0][0], "(期待: 160)")
    r = q("""SELECT scheduled_work_hours, actual_work_hours, available_capacity_hours
             FROM jobcan_working_hours
             WHERE jobcan_employee_code='J0003' ORDER BY year_month DESC LIMIT 1""")[0]
    print(f"鈴木さん直近月: 所定{r[0]} 実働{r[1]} 余力{r[2]} (期待: 直近月2026-07は余力21。月により17〜21で変動)")