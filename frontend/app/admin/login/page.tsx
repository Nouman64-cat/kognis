"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-gradient-to-br from-zinc-100 via-amber-50/40 to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <div className="absolute right-3 top-3 z-10 sm:right-4 sm:top-4">
        <ThemeSwitcher variant="compact" />
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] dark:opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 20%, rgba(245, 158, 11, 0.12), transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(16, 185, 129, 0.08), transparent 40%)`,
        }}
      />

      <div className="relative flex min-h-[100dvh] flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/15 shadow-inner ring-1 ring-amber-500/25 dark:bg-amber-400/10 dark:ring-amber-400/20">
              <Shield className="h-7 w-7 text-amber-700 dark:text-amber-400" strokeWidth={1.5} aria-hidden />
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800/80 dark:text-amber-300/90">
              Kognis
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Admin sign-in
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {hasPassword === false ? (
                <>
                  No password is set yet.{" "}
                  <Link
                    href="/admin/set-password"
                    className="font-medium text-amber-800 underline decoration-amber-500/40 underline-offset-2 hover:text-amber-900 dark:text-amber-400 dark:hover:text-amber-300"
                  >
                    Use your one-time password first
                  </Link>
                  .
                </>
              ) : (
                "Enter your admin password to open the console."
              )}
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-white/90 p-6 shadow-xl shadow-zinc-900/5 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80 dark:shadow-black/40">
            {error && (
              <div
                className="mb-5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800 dark:border-red-900/80 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="pw" className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Password
                </label>
                <input
                  id="pw"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/25 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-amber-900/15 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-amber-950/30"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
