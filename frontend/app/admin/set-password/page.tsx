"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminSetPassword } from "@/lib/api";

export default function AdminSetPasswordPage() {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) {
      setError("Passwords do not match.");
      return;
    }
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await adminSetPassword(otp, pw);
      router.replace("/admin/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-16 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto w-full max-w-sm">
        <Link href="/admin/login" className="text-sm text-amber-700 hover:underline dark:text-amber-400">
          ← Back to login
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Set admin password</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Run{" "}
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">
            python scripts/generate_admin_otp.py
          </code>{" "}
          on the server, paste the one-time password below, then choose your new password.
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
            <label htmlFor="otp" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              One-time password
            </label>
            <input
              id="otp"
              type="password"
              required
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div>
            <label htmlFor="npw" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New password
            </label>
            <input
              id="npw"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div>
            <label htmlFor="npw2" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirm new password
            </label>
            <input
              id="npw2"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save password"}
          </button>
        </form>
      </div>
    </div>
  );
}
