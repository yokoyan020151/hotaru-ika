# Takusu 業務リスト画面実装（No.21・22）

## 含まれるファイル
- `app_tasks_page.tsx` → 配置先: `frontend/app/tasks/page.tsx`（新規フォルダ`tasks`を作成）
- `components/TaskListTable.tsx` → `frontend/components/TaskListTable.tsx`
- `components/DiagnoseModal.tsx` → `frontend/components/DiagnoseModal.tsx`
- `lib/tasks-api.ts` → `frontend/lib/tasks-api.ts`

`frontend/lib/theme.ts` と `frontend/styles/dashboard.module.css`（No.13〜15で作成済み）をそのまま再利用しています。

## 現時点の実装方針

### 実データで動く部分
- `GET /api/members`（メンバー一覧）
- `POST /api/members/{user_id}/diagnose`（AI診断・配置案生成）
- `PUT /api/proposals/{proposal_id}/items/{item_id}`（引き継ぎ先の手修正）
- `POST /api/proposals/{proposal_id}/approve`（承認）

これらは実際にマージ済みのAPIに接続しています。

### ダミーデータの部分
- 業務一覧そのもの（`GET /api/tasks`）は、こーちゃんがNo.10〜12を実装中のため、
  現時点ではダミーデータ（`lib/tasks-api.ts`内の`DUMMY_TASKS`）で表示しています。
- 属人業務の判定（`is_isolated`相当）も、No.19が未着手のため
  `risk_level === "high"`を暫定ロジックとして使っています
  （`components/TaskListTable.tsx`の`isIsolated()`関数）。

## No.10〜12・19 完成後にやること

1. `lib/tasks-api.ts`の`getTasks()`が呼んでいる`GET /api/tasks`が、
   実際のエンドポイント名・レスポンス項目と一致しているか確認してください。
   一致していれば、フォールバック（ダミーデータ表示）は自動的に使われなくなり、
   何もコード修正は不要です。
2. エンドポイント名やレスポンスの項目名（`task_name`, `primary_owner_name`など）が
   実際のAPIと異なる場合は、`TaskRow`型定義とfetch先URLだけ直せばOKです。
3. No.19（属人業務判定API）が完成したら、`TaskListTable.tsx`の`isIsolated()`関数を
   実際のレスポンスの`is_isolated`（あるいは相当するフィールド）を見る形に差し替えてください。

## 診断結果の表示について
今回は「同じ画面にモーダルで配置案を表示」する形で実装しました
（AI診断ボタン押下 → `DiagnoseModal`が開き、引き継ぎ先の変更・承認がその場でできます）。
別の見せ方（以前作成した「AI配置提案/修正」専用ページへの遷移など）が良ければ教えてください。

## 未確定な部分（要確認）
`POST /api/members/{user_id}/diagnose`のレスポンス形式は、OpenAPI上「型未定義」に
なっていたため、`schema.sql`の`proposals`/`proposal_items`テーブル構造から推測して
実装しています（`lib/tasks-api.ts`の`Proposal`/`ProposalItem`型）。
実際にボタンを押してみて、レスポンスの形が違う場合はコンソールログを見ながら型定義を
調整してください。
