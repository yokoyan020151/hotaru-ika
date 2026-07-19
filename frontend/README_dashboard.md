# Takusu ダッシュボード実装（No.13〜15）

## 含まれるファイル
- `app/dashboard/page.tsx` … No.13 レイアウト＋No.15 API接続
- `components/CoverageDonutChart.tsx` … No.14 カバー率ドーナツチャート
- `components/MemberRiskBarChart.tsx` … No.14 メンバー別リスク棒グラフ（高=赤/中=黄/低=緑）
- `components/MemberTable.tsx` … メンバー別状況テーブル（固定順・信号機表示）
- `lib/api.ts` … バックエンドAPI接続層（失敗時はダミーデータにフォールバック）
- `lib/theme.ts` … House Green配色トークン、リスクレベル→色のマッピング
- `styles/dashboard.module.css` … レイアウト・カード・レスポンシブ

## 導入手順
1. 実際のリポジトリ構成（`repo/frontend/app`, `repo/backend`のsrcなし構成）に合わせて、
   `frontend/`直下に以下のとおり配置してください（`app/page.tsx`はFastAPI疎通確認用の
   既存ファイルなので上書きしないよう注意）
   - `frontend/app/dashboard/page.tsx`（新規追加）
   - `frontend/components/CoverageDonutChart.tsx`
   - `frontend/components/MemberRiskBarChart.tsx`
   - `frontend/components/MemberTable.tsx`
   - `frontend/lib/api.ts`
   - `frontend/lib/theme.ts`
   - `frontend/styles/dashboard.module.css`

   コード内の`@/lib`・`@/components`・`@/styles`のimportは変更不要です。
   `tsconfig.json`の`"paths": { "@/*": ["./*"] }`が`frontend`直下を指しているため、
   このまま解決されます。

2. 依存パッケージを追加（`frontend/`ディレクトリで実行）
   ```
   npm install chart.js react-chartjs-2
   ```
   ※`package.json`ではReact 19.2.4を使用しています。`react-chartjs-2`は
   バージョンによってはpeerDependencyの警告が出ることがありますが、
   動作自体には問題ありません（`--legacy-peer-deps`が必要な場合のみ付与してください）。

3. `.env.local`（`frontend/`直下）にバックエンドAPIのURLを設定（No.2で構築したFastAPIのURL）
   ```
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```
   既存の`app/page.tsx`（FastAPI疎通確認ページ）と同じ環境変数名なので、
   すでに`.env.local`が設定済みであれば追加作業は不要です。
   ※本番デプロイ時（No.33）はAzure Functionsの本番URLに差し替え

4. 動作確認
   ```
   npm run dev
   ```
   `http://localhost:3000/dashboard` にアクセス。

## 補足：Next.js / Reactのバージョンについて
`package.json`はNext.js 16.2.10・React 19.2.4と、かなり新しいバージョンです。
`AGENTS.md`に「学習データと構成が異なる場合がある」旨の注意書きがあるとおり、
App Routerの基本的な使い方（`page.tsx`でのコンポーネント定義、`"use client"`指定）は
今回のコードでも変わらず動く前提で作成していますが、ビルド時にエラーが出た場合は
`node_modules/next/dist/docs/`配下のドキュメントを確認してください。
   バックエンドAPI（No.10〜12）が未実装の間は、自動的にダミーデータで表示され、
   画面上部に「バックエンドAPIに接続できなかったため、確認用のダミーデータを表示しています」
   と表示されます。No.10〜12が完成したら、このメッセージが消えれば接続成功です。

## 期待するAPIレスポンス形式（No.6で確定した仕様に対応）

### GET /api/dashboard/coverage
```json
{
  "coverage_rate": 72,
  "risk_level": "mid",
  "risk_label": "注意",
  "flagged_member_count": 2
}
```

### GET /api/dashboard/members
```json
{
  "members": [
    {
      "member_id": "m1",
      "name": "佐藤 未来",
      "status": "育休予定 9月〜",
      "progress_rate": 35,
      "risk_level": "high"
    }
  ]
}
```
`risk_level` は `"high" | "mid" | "low"` の3値。バックエンド側（No.10, No.12）の
レスポンス形式をこれに合わせてもらえると、フロント側の修正が不要になります。

## 次のタスクとの接続
- No.16/17（単体テスト）: このページとダミーデータ表示を使ってテスト可能
- No.29（F-01＋F-02結合）: `/dashboard` から `/tasks` への画面遷移を追加する際、
  共通ヘッダーをこのファイルから切り出すと統一しやすい
