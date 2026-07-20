# Takusu F-03 / F-04 セットアップ手順（受注班）

F-03（AI配置提案・修正）と F-04（承認・メンバー通達）を動かす手順です。

## 前提
- Python 3.12
- Node.js（Next.js 16 が動くバージョン）
- リポジトリをクローンし、ブランチ `feature/f03-f04-backend` に切り替え済み

## 1. バックエンド（FastAPI / ポート8000）

```bash
cd backend

# 仮想環境を作って有効化
python3.12 -m venv venv
source venv/bin/activate        # Windowsは venv\Scripts\activate

# 依存パッケージをインストール
pip install -r requirements.txt

# 環境変数ファイルを用意（テンプレをコピーして値を入れる）
cp .env.example .env
#   DATABASE_URL はそのままでOK
#   OPENAI_API_KEY は各自で設定（未設定でも動作。理由文は簡易版になる）

# ダミーデータをDBに投入（ver6.xlsx → SQLite）
python seed.py

# サーバー起動
uvicorn main:app --reload --port 8000
```

起動後、http://localhost:8000 で `{"message": "..."}` が出ればOK。
API一覧は http://localhost:8000/docs 。

## 2. フロントエンド（Next.js / ポート3000）

別のターミナルで：

```bash
cd frontend

npm install

# 環境変数ファイルを用意
cp .env.local.example .env.local
#   NEXT_PUBLIC_API_BASE_URL はそのままでOK（http://localhost:8000）

npm run dev
```

起動後、http://localhost:3000/proposals を開く。

## 3. 動作確認の流れ

1. 「配置案を作る」→ 対象メンバー（初期値：佐藤 美咲）の不在プランをAI診断で作成
2. 各業務の担当をドロップダウンで手修正できる（「（上司修正）」が付く）
3. 「この配置案を承認する」→ 担当が確定し、通知が生成・表示される
4. 「デモをリセット」→ データを初期状態に戻す

## 注意・申し送り

- **`backend/main.py` に2行追加しています**（ルーター登録）。両班が触る共有ファイルのため要確認：
```python
  from routers.proposals import router as proposals_router
  app.include_router(proposals_router)
```
- `.env` / `.env.local` / `takusu_local.db` はコミットしていません（各自で用意）。
- F-03画面上部の「対象メンバー選択」は**デモ用**です。本番では target_user_id を上流（メンバー一覧等）からURL経由で受け取る想定。結合方法は要相談。