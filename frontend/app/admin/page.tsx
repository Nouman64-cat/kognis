"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  RefreshCw,
  Sparkles,
  X,
} from "lucide-react";
import { clearAdminToken } from "@/lib/admin-token";
import { generateExamAdmin, listExams } from "@/lib/api";
import { candidateExamInviteUrl } from "@/lib/invite-link";
import type { ExamSummary } from "@/lib/types";

function scrollPageToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 16;
  window.scrollTo({ top, behavior: "smooth" });
  window.history.replaceState(null, "", `#${id}`);
}

function SidebarSectionButton({
  sectionId,
  icon: Icon,
  label,
  onGoTo,
}: {
  sectionId: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onGoTo: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onGoTo(sectionId)}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
    >
      <Icon className="h-4 w-4 shrink-0 opacity-80" />
      {label}
    </button>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  /** In-page nav: Next.js + flex layouts often break raw #hash scrolling. */
  const goToSection = useCallback((id: string) => {
    setSidebarOpen(false);
    window.setTimeout(() => scrollPageToSection(id), 160);
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && ["overview", "create", "library"].includes(hash)) {
      requestAnimationFrame(() => scrollPageToSection(hash));
    }
  }, []);

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

  const totalQuestionBank = useMemo(
    () => exams.reduce((acc, e) => acc + e.total_questions, 0),
    [exams],
  );

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

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "—";

  return (
    <div className="flex min-h-screen bg-zinc-100 dark:bg-zinc-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 transition-transform duration-200 ease-out lg:static lg:z-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-zinc-800 px-4">
          <Link
            href="/admin"
            className="flex min-w-0 items-center gap-2 text-white"
            onClick={closeSidebar}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
              <LayoutDashboard className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">Kognis</p>
              <p className="truncate text-xs text-zinc-500">Admin</p>
            </div>
          </Link>
          <button
            type="button"
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white lg:hidden"
            onClick={closeSidebar}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            On this page
          </p>
          <SidebarSectionButton sectionId="overview" icon={Layers} label="Overview" onGoTo={goToSection} />
          <SidebarSectionButton sectionId="create" icon={Sparkles} label="Create exam" onGoTo={goToSection} />
          <SidebarSectionButton sectionId="library" icon={Library} label="Exam library" onGoTo={goToSection} />

          <div className="my-3 border-t border-zinc-800" />

          <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
            Navigate
          </p>
          <Link
            href="/"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <Home className="h-4 w-4 shrink-0 opacity-80" />
            Home
          </Link>
          <Link
            href="/admin/set-password"
            onClick={closeSidebar}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            <KeyRound className="h-4 w-4 shrink-0 opacity-80" />
            Password (OTP)
          </Link>
        </nav>

        <div className="border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={() => {
              closeSidebar();
              clearAdminToken();
              router.replace("/admin/login");
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-amber-300/90 hover:bg-zinc-800 hover:text-amber-200"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white px-4 dark:border-zinc-800 dark:bg-zinc-900 lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-50">Dashboard</p>
            <p className="truncate text-xs text-zinc-500">Kognis admin</p>
          </div>
        </header>

        <main className="scroll-smooth">
          <div className="mx-auto max-w-5xl space-y-8 p-4 pb-12 sm:p-6 lg:p-8">
            {/* Page title — desktop */}
            <div className="hidden border-b border-zinc-200 pb-6 dark:border-zinc-800 lg:block">
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                Dashboard
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Overview, create exams, and manage invite links.
              </p>
            </div>

            {/* Overview */}
            <section id="overview" className="scroll-mt-24 lg:scroll-mt-8" aria-labelledby="overview-heading">
              <div className="mb-4 flex items-center gap-2">
                <Layers className="h-5 w-5 text-zinc-400" />
                <h2 id="overview-heading" className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
                  Overview
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Total exams</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {listLoading ? "—" : exams.length}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Questions in library</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
                    {listLoading ? "—" : totalQuestionBank}
                  </p>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">API</p>
                  <p className="mt-1 truncate font-mono text-sm text-zinc-700 dark:text-zinc-300" title={apiUrl}>
                    {listError ? (
                      <span className="text-red-600 dark:text-red-400">Unreachable</span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400">Connected</span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">{apiUrl}</p>
                </div>
              </div>
            </section>

            {/* Create exam */}
            <section
              id="create"
              className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white shadow-sm lg:scroll-mt-8 dark:border-zinc-800 dark:bg-zinc-900"
              aria-labelledby="create-heading"
            >
              <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  <div>
                    <h2 id="create-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Create exam
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      LLM-generated MCQs saved to your database. You’ll get a candidate invite link after creation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5">
                {error && (
                  <div
                    className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {success && (
                  <div
                    className="mb-6 space-y-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100"
                    role="status"
                  >
                    <p className="font-medium">Exam created</p>
                    <p>
                      ID <strong>{success.exam_id}</strong> · {success.total_questions} questions ·{" "}
                      {success.topic} ({success.complexity})
                    </p>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-800/90 dark:text-emerald-300/90">
                        Candidate invite link
                      </p>
                      <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                        <code className="block flex-1 break-all rounded-lg bg-white/90 px-2 py-1.5 text-xs dark:bg-zinc-950">
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
                          {copied ? "Copied" : "Copy link"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="sm:col-span-2 lg:col-span-1">
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
                    <label htmlFor="n" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Questions
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
                  <div className="flex justify-end border-t border-zinc-100 pt-4 sm:col-span-2 lg:col-span-3 dark:border-zinc-800">
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 disabled:opacity-50"
                    >
                      <Sparkles className="h-4 w-4" />
                      {loading ? "Generating…" : "Generate exam"}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Exam library */}
            <section
              id="library"
              className="scroll-mt-24 rounded-2xl border border-zinc-200 bg-white shadow-sm lg:scroll-mt-8 dark:border-zinc-800 dark:bg-zinc-900"
              aria-labelledby="library-heading"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <Library className="h-5 w-5 text-zinc-400" />
                  <div>
                    <h2 id="library-heading" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                      Exam library
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      All exams in the database — copy invite links for candidates.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void loadExams()}
                  disabled={listLoading}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                >
                  <RefreshCw className={`h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>

              <div className="p-5">
                {listError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    {listError}{" "}
                    <span className="text-red-600 dark:text-red-300">
                      Is the backend running at{" "}
                      <code className="rounded bg-red-100 px-1 text-xs dark:bg-red-900">{apiUrl}</code>?
                    </span>
                  </p>
                )}

                {listLoading && exams.length === 0 && !listError && (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-zinc-500">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Loading exams…
                  </div>
                )}

                {!listLoading && !listError && exams.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 py-12 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                    <BookOpen className="h-10 w-10 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">No exams yet</p>
                    <p className="max-w-sm text-xs text-zinc-500">
                      Create one in the section above. Exams appear here with invite links.
                    </p>
                  </div>
                )}

                {exams.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <tr>
                          <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Topic</th>
                          <th className="hidden px-4 py-3 font-medium text-zinc-700 sm:table-cell dark:text-zinc-300">
                            Level
                          </th>
                          <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Qs</th>
                          <th className="hidden px-4 py-3 font-medium text-zinc-700 md:table-cell dark:text-zinc-300">
                            ID
                          </th>
                          <th className="px-4 py-3 font-medium text-zinc-700 dark:text-zinc-300">Invite</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {exams.map((exam) => {
                          const url = candidateExamInviteUrl(exam.id);
                          return (
                            <tr key={exam.id} className="bg-white dark:bg-zinc-900">
                              <td className="max-w-[200px] px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                                <span className="line-clamp-2">{exam.topic}</span>
                              </td>
                              <td className="hidden px-4 py-3 capitalize text-zinc-600 sm:table-cell dark:text-zinc-400">
                                {exam.complexity}
                              </td>
                              <td className="px-4 py-3 tabular-nums text-zinc-600 dark:text-zinc-400">
                                {exam.total_questions}
                              </td>
                              <td className="hidden px-4 py-3 font-mono text-xs text-zinc-500 md:table-cell">
                                {exam.id}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-col gap-1 sm:flex-row sm:items-center">
                                  <code className="max-w-[180px] truncate rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                                    {url}
                                  </code>
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
                                    className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-700"
                                  >
                                    {copiedExamId === exam.id ? "Copied" : "Copy"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
