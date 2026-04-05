"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { clearAdminToken } from "@/lib/admin-token";
import { generateExamAdmin, listExams } from "@/lib/api";
import { candidateExamInviteUrl } from "@/lib/invite-link";
import type { ExamSummary } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [complexity, setComplexity] = useState("intermediate");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [copiedExamId, setCopiedExamId] = useState<number | null>(null);
  const [success, setSuccess] = useState<{
    exam_id: number;
    topic: string;
    complexity: string;
    total_questions: number;
  } | null>(null);

  const loadExams = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const rows = await listExams();
      setExams(rows);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Could not load exams");
      setExams([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExams();
  }, [loadExams]);

  const inviteUrl = useMemo(() => {
    if (!success) return "";
    return candidateExamInviteUrl(success.exam_id);
  }, [success]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await generateExamAdmin({
        topic: topic.trim(),
        complexity: complexity.trim(),
        total_questions: totalQuestions,
      });
      setCopied(false);
      setSuccess(res);
      setTopic("");
      void loadExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-10 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
          >
            ← Home
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin/set-password" className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200">
              Change password (OTP)
            </Link>
            <button
              type="button"
              onClick={() => {
                clearAdminToken();
                router.replace("/admin/login");
              }}
              className="font-medium text-amber-700 hover:underline dark:text-amber-400"
            >
              Log out
            </button>
          </div>
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          You are signed in. Generate exams below (API uses your session token). Existing quizzes load
          from the database.
        </p>

        <section className="mt-10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Your quizzes</h2>
            <button
              type="button"
              onClick={() => void loadExams()}
              disabled={listLoading}
              className="text-sm font-medium text-amber-700 hover:underline disabled:opacity-50 dark:text-amber-400"
            >
              {listLoading ? "Loading…" : "Refresh"}
            </button>
          </div>
          {listError && (
            <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
              {listError}{" "}
              <span className="text-red-600 dark:text-red-300">
                Is the backend running at{" "}
                <code className="rounded bg-red-100 px-1 text-xs dark:bg-red-900">
                  {process.env.NEXT_PUBLIC_API_URL ?? "—"}
                </code>
                ?
              </span>
            </p>
          )}
          {listLoading && exams.length === 0 && !listError && (
            <p className="mt-3 text-sm text-zinc-500">Loading quizzes…</p>
          )}
          {!listLoading && !listError && exams.length === 0 && (
            <p className="mt-3 rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
              No exams in the database yet. Generate one with the form below.
            </p>
          )}
          {exams.length > 0 && (
            <ul className="mt-4 space-y-3">
              {exams.map((exam) => {
                const url = candidateExamInviteUrl(exam.id);
                return (
                  <li
                    key={exam.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-zinc-900 dark:text-zinc-50">{exam.topic}</p>
                        <p className="text-sm text-zinc-500">
                          {exam.complexity} · {exam.total_questions} questions · ID {exam.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(url);
                            setCopiedExamId(exam.id);
                            setTimeout(() => setCopiedExamId(null), 2000);
                          } catch {
                            /* ignore */
                          }
                        }}
                        className="shrink-0 rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600"
                      >
                        {copiedExamId === exam.id ? "Copied link" : "Copy invite link"}
                      </button>
                    </div>
                    <code className="mt-2 block break-all rounded-lg bg-zinc-50 px-2 py-1.5 text-xs text-zinc-700 dark:bg-zinc-950 dark:text-zinc-300">
                      {url}
                    </code>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {error && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="mt-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            <p className="font-medium">Exam created</p>
            <p>
              ID <strong>{success.exam_id}</strong> · {success.total_questions} questions ·{" "}
              {success.topic} ({success.complexity})
            </p>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/90 dark:text-emerald-300/90">
                Candidate link
              </p>
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="block flex-1 break-all rounded-lg bg-white/80 px-2 py-1.5 text-xs text-emerald-950 dark:bg-zinc-950 dark:text-emerald-100">
                  {inviteUrl}
                </code>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(inviteUrl);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    } catch {
                      /* ignore */
                    }
                  }}
                  className="shrink-0 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="mt-2 text-xs text-emerald-800/80 dark:text-emerald-200/80">
                Send this URL to the candidate. It opens registration, then this exam only.
              </p>
            </div>
          </div>
        )}

        <form
          onSubmit={onSubmit}
          className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Topic
            </label>
            <input
              id="topic"
              required
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Python asyncio"
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <div>
            <label
              htmlFor="complexity"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Complexity
            </label>
            <select
              id="complexity"
              value={complexity}
              onChange={(e) => setComplexity(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="n"
              className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Number of questions
            </label>
            <input
              id="n"
              type="number"
              min={1}
              max={100}
              required
              value={totalQuestions}
              onChange={(e) => setTotalQuestions(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-amber-600 py-2.5 text-sm font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate exam"}
          </button>
        </form>
      </div>
    </div>
  );
}
