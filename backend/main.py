# ======================================================
# backend/main.py — Takusu バックエンド API（起動確認用の最小構成）
# ======================================================
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# --- CORS設定：Next.js（localhost:3000）からのアクセスを許可 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- ヘルスチェック（稼働確認用）---
@app.get("/")
def read_root():
    return {"message": "Takusu API is running!", "version": "week9"}