import { NextResponse } from "next/server";

/** If anything still proxies through here, allow long exam generation (many LLM batches). */
export const maxDuration = 800;

function backendBase(): string {
  const b = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!b) throw new Error("BACKEND_URL or NEXT_PUBLIC_API_URL must be set");
  return b.replace(/\/$/, "");
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON" }, { status: 400 });
  }

  const auth = req.headers.get("authorization");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (auth?.startsWith("Bearer ")) {
    headers.Authorization = auth;
  } else if (process.env.ADMIN_API_KEY) {
    headers["X-Admin-Key"] = process.env.ADMIN_API_KEY;
  } else {
    return NextResponse.json(
      { detail: "Sign in on the admin page or configure ADMIN_API_KEY for legacy access." },
      { status: 401 },
    );
  }

  try {
    const r = await fetch(`${backendBase()}/api/v1/admin/exams/generate`, {
      method: "POST",
      headers,
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
