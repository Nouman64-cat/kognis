import { NextResponse } from "next/server";

function backendBase(): string {
  const b = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!b) throw new Error("BACKEND_URL or NEXT_PUBLIC_API_URL must be set");
  return b.replace(/\/$/, "");
}

export async function POST(req: Request) {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey) {
    return NextResponse.json(
      { detail: "ADMIN_API_KEY is not set on the Next.js server." },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  try {
    const r = await fetch(`${backendBase()}/api/v1/admin/exams/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Key": adminKey,
      },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    const ct = r.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return NextResponse.json(JSON.parse(text) as object, { status: r.status });
    }
    return new NextResponse(text, { status: r.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream error";
    return NextResponse.json({ detail: msg }, { status: 502 });
  }
}
