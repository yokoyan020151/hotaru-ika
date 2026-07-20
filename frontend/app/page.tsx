"use client";
import { useEffect, useState } from "react";

export default function Home() {
  const [msg, setMsg] = useState("接続確認中...");

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/`)
      .then((res) => res.json())
      .then((data) => setMsg(`FastAPI応答: ${data.message}（${data.version}）`))
      .catch(() => setMsg("FastAPIに接続できませんでした"));
  }, []);

  return <main style={{ padding: 40, fontSize: 20 }}>{msg}</main>;
}
