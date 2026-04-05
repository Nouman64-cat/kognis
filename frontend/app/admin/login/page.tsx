"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminAuthStatus, adminLogin } from "@/lib/api";
import { getAdminToken, setAdminToken } from "@/lib/admin-token";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasPassword, setHasPassword] = useState<boolean | null>(null);

  useEffect(() => {
    if (getAdminToken()) {
      router.replace("/admin");
      return;
    }
    adminAuthStatus()
      .then((s) => setHasPassword(s.has_password))
      .catch(() => setHasPassword(true));
  }, [router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await adminLogin(password);
      setAdminToken(res.access_token);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-16 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/" className="text-sm text-amber-700 hover:underline dark:text-amber-400">
          ← Home
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Admin login</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          {hasPassword === false ? (
            <>
              No password is set yet.{" "}
              <Link href="/admin/set-password" className="font-medium text-amber-700 underline dark:text-amber-400">
                Use your one-time password first
              </Link>
              .
            </>
          ) : (
            "Sign in with your admin password."
          )}
        </p>

        {error && (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <label htmlFor="pw" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Password
            </label>
            <input
              id="pw"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
