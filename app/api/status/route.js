// app/api/status/route.js
import { NextResponse } from "next/server";

const API_BASE = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_BASE || "");

function normalizeBaseUrl(input) {
  if (!input) return "";
  const trimmed = String(input).trim();
  if (!trimmed) return "";
  const noSlash = trimmed.replace(/\/+$/, "");
  return noSlash.startsWith("http") ? noSlash : `https://${noSlash}`;
}

export async function GET() {
  if (!API_BASE) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_BASE is not set" }, { status: 500 });
  }

  const upstream = `${API_BASE}/status`;
  const res = await fetch(upstream, {
    headers: { "X-Client": "autospec-v2" },
    redirect: "manual",
  });

  // Pass through body + content-type
  const body = await res.text();
  const headers = new Headers(res.headers);
  const ct = headers.get("content-type") || "application/json; charset=utf-8";

  return new NextResponse(body, { status: res.status, headers: { "content-type": ct } });
}
