-- ======================================================
-- Takusu MVP DB スキーマ（SQLite）
-- ダミーデータ ver6 / RFP ver2 準拠
-- ======================================================
-- 実行順序：親テーブル → 子テーブル（外部キー制約のため）

PRAGMA foreign_keys = ON;

-- 既存テーブルを削除（再投入できるように）
DROP TABLE IF EXISTS task_involvement_scores;
DROP TABLE IF EXISTS google_calendar_attendees;
DROP TABLE IF EXISTS google_calendar_meetings;
DROP TABLE IF EXISTS slack_channel_memberships;
DROP TABLE IF EXISTS jobcan_working_hours;
DROP TABLE IF EXISTS kaonavi_skills;
DROP TABLE IF EXISTS kaonavi_qualifications;
DROP TABLE IF EXISTS kaonavi_project_experiences;
DROP TABLE IF EXISTS kaonavi_members;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS users;


-- ------------------------------------------------------
-- users：社員マスタ
-- ------------------------------------------------------
CREATE TABLE users (
    user_id              TEXT PRIMARY KEY,
    organization_id      TEXT NOT NULL,
    name                 TEXT NOT NULL,
    email                TEXT NOT NULL UNIQUE,
    kaonavi_member_code  TEXT UNIQUE,          -- kaonavi_* 系との結合キー
    slack_user_id        TEXT,
    notion_user_id       TEXT,
    jobcan_employee_code TEXT,
    employment_type      TEXT,                  -- 正社員 / 時短 など
    department           TEXT,
    job_rank             TEXT,                  -- 部長・課長・主任・担当（職位）
    job_type             TEXT,                  -- 役員秘書・総務・経理（職種）
    manager_id           TEXT,                  -- 上司の user_id（自己参照）
    is_on_leave          INTEGER NOT NULL DEFAULT 0,  -- 0=就業中 / 1=休業中
    created_at           TEXT,
    FOREIGN KEY (manager_id) REFERENCES users(user_id)
);


-- ------------------------------------------------------
-- tasks：業務マスタ
-- リスクスコア = impact_score × handover_difficulty_score（1〜25）
-- リスクband：1-7=低 / 8-15=中 / 16-25=高
-- ------------------------------------------------------
CREATE TABLE tasks (
    task_id                   TEXT PRIMARY KEY,
    task_name                 TEXT NOT NULL,
    task_category             TEXT,
    impact_score              REAL,   -- 影響度（1〜5）
    handover_difficulty_score REAL,   -- 引き継ぎ難易度（1〜5）
    risk_score                REAL,   -- 影響度 × 難易度
    risk_level                TEXT,   -- 高リスク：最優先 など
    primary_owner_user_id     TEXT,   -- 主担当
    required_job_type         TEXT,   -- 担当に必要な職種
    required_min_rank         TEXT,   -- 担当に必要な最低職位
    required_skill            TEXT,   -- 必要スキル（属人業務の判定に使用）
    estimated_monthly_hours   REAL,   -- 月間想定工数
    created_at                TEXT,
    FOREIGN KEY (primary_owner_user_id) REFERENCES users(user_id)
);


-- ------------------------------------------------------
-- task_involvement_scores：関与度スコア
-- calendar / slack / kaonavi の重なりから 0〜3 で算出
-- ------------------------------------------------------
CREATE TABLE task_involvement_scores (
    score_id          TEXT PRIMARY KEY,
    user_id           TEXT NOT NULL,
    task_id           TEXT NOT NULL,
    calendar_overlap  INTEGER,   -- 0 / 1
    slack_overlap     INTEGER,   -- 0 / 1
    kaonavi_overlap   INTEGER,   -- 0 / 1
    involvement_score REAL,      -- 上記3つの合計（0〜3）
    calculated_at     TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (task_id) REFERENCES tasks(task_id)
);


-- ------------------------------------------------------
-- google_calendar_meetings：会議情報
-- ------------------------------------------------------
CREATE TABLE google_calendar_meetings (
    meeting_id      TEXT PRIMARY KEY,
    google_event_id TEXT,
    title           TEXT,
    start_datetime  TEXT,
    end_datetime    TEXT,
    is_recurring    INTEGER,   -- 0 / 1
    organizer_email TEXT,
    task_tag_id     TEXT,      -- 紐づく task_id（NULL可）
    FOREIGN KEY (task_tag_id) REFERENCES tasks(task_id)
);


-- ------------------------------------------------------
-- google_calendar_attendees：会議参加者
-- ------------------------------------------------------
CREATE TABLE google_calendar_attendees (
    attendee_id    TEXT PRIMARY KEY,
    meeting_id     TEXT NOT NULL,
    attendee_email TEXT,
    rsvp_status    TEXT,       -- accepted / tentative / declined
    is_organizer   INTEGER,    -- 0 / 1
    is_optional    INTEGER,    -- 0 / 1
    FOREIGN KEY (meeting_id) REFERENCES google_calendar_meetings(meeting_id)
);


-- ------------------------------------------------------
-- slack_channel_memberships：Slackチャンネル参加状況
-- ------------------------------------------------------
CREATE TABLE slack_channel_memberships (
    membership_id   TEXT PRIMARY KEY,
    user_id         TEXT,
    slack_user_id   TEXT,
    channel_id      TEXT,
    channel_name    TEXT,
    is_private      INTEGER,   -- 0 / 1
    is_member       INTEGER,   -- 0 / 1
    last_message_at TEXT,
    task_tag_id     TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (task_tag_id) REFERENCES tasks(task_id)
);


-- ------------------------------------------------------
-- jobcan_working_hours：勤怠・稼働実績（月次）
-- available_capacity_hours = 所定 − 実労働（絶対余力時間）
-- ------------------------------------------------------
CREATE TABLE jobcan_working_hours (
    hours_id                 TEXT PRIMARY KEY,
    user_id                  TEXT NOT NULL,
    jobcan_employee_code     TEXT,
    year_month               TEXT,   -- 2025-07-01 形式
    scheduled_work_days      REAL,
    actual_work_days         REAL,
    paid_leave_days          REAL,
    special_leave_days       REAL,
    scheduled_work_hours     REAL,   -- 所定労働時間
    actual_work_hours        REAL,   -- 実労働時間
    overtime_hours           REAL,
    available_capacity_pct   REAL,   -- 余力（％）
    available_capacity_hours REAL,   -- 余力（絶対時間）※配置判断はこちらを使用
    fetched_at               TEXT,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);


-- ------------------------------------------------------
-- kaonavi_members：カオナビ社員情報
-- ------------------------------------------------------
CREATE TABLE kaonavi_members (
    member_id           TEXT PRIMARY KEY,
    kaonavi_member_code TEXT UNIQUE,
    employment_type     TEXT,
    department          TEXT
);


-- ------------------------------------------------------
-- kaonavi_skills：保有スキル
-- tasks.required_skill との突合で担当可否を判定
-- ------------------------------------------------------
CREATE TABLE kaonavi_skills (
    skill_id            TEXT PRIMARY KEY,
    kaonavi_member_code TEXT NOT NULL,
    skill_name          TEXT,
    skill_category      TEXT,
    proficiency_level   INTEGER,   -- 1〜5
    skill_description   TEXT,
    FOREIGN KEY (kaonavi_member_code) REFERENCES kaonavi_members(kaonavi_member_code)
);


-- ------------------------------------------------------
-- kaonavi_qualifications：保有資格
-- ------------------------------------------------------
CREATE TABLE kaonavi_qualifications (
    qualification_id    TEXT PRIMARY KEY,
    kaonavi_member_code TEXT NOT NULL,
    qualification_name  TEXT,
    acquired_date       TEXT,
    score               REAL,
    expiry_date         TEXT,
    last_updated_at     TEXT,
    FOREIGN KEY (kaonavi_member_code) REFERENCES kaonavi_members(kaonavi_member_code)
);


-- ------------------------------------------------------
-- kaonavi_project_experiences：プロジェクト経験
-- ------------------------------------------------------
CREATE TABLE kaonavi_project_experiences (
    experience_id       TEXT PRIMARY KEY,
    kaonavi_member_code TEXT NOT NULL,
    project_name        TEXT,
    role_in_project     TEXT,
    start_date          TEXT,
    end_date            TEXT,
    is_ongoing          INTEGER,   -- 0 / 1
    project_description TEXT,
    last_updated_at     TEXT,
    FOREIGN KEY (kaonavi_member_code) REFERENCES kaonavi_members(kaonavi_member_code)
);


-- ------------------------------------------------------
-- インデックス（APIの検索性能向上）
-- ------------------------------------------------------
CREATE INDEX idx_tasks_owner            ON tasks(primary_owner_user_id);
CREATE INDEX idx_tasks_job_type         ON tasks(required_job_type);
CREATE INDEX idx_involvement_user       ON task_involvement_scores(user_id);
CREATE INDEX idx_involvement_task       ON task_involvement_scores(task_id);
CREATE INDEX idx_jobcan_user_month      ON jobcan_working_hours(user_id, year_month);
CREATE INDEX idx_skills_member          ON kaonavi_skills(kaonavi_member_code);
CREATE INDEX idx_skills_name            ON kaonavi_skills(skill_name);
CREATE INDEX idx_attendees_meeting      ON google_calendar_attendees(meeting_id);
CREATE INDEX idx_slack_user             ON slack_channel_memberships(user_id);
CREATE INDEX idx_users_department       ON users(department);
