"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Check,
  ChevronDown,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { clearAdminToken } from "@/lib/admin-token";
import { generateExamAdmin, listAttempts, listExams } from "@/lib/api";
import { candidateExamInviteUrl } from "@/lib/invite-link";
import type { AttemptRow, ExamSummary } from "@/lib/types";

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
  const [activeTab, setActiveTab] = useState<"overview" | "create" | "library" | "candidates">("overview");
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
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  /** In-page nav */
  const goToSection = useCallback((id: string) => {
    setSidebarOpen(false);
    setActiveTab(id as any);
    window.history.replaceState(null, "", `#${id}`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const hash = window.location.hash.replace(/^#/, "");
    if (hash && ["overview", "create", "library", "candidates"].includes(hash)) {
      setActiveTab(hash as any);
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

  const loadAttempts = useCallback(async () => {
    setAttemptsLoading(true);
    setAttemptsError(null);
    try {
      const res = await listAttempts();
      setAttempts(res.attempts);
    } catch (e) {
      setAttemptsError(e instanceof Error ? e.message : "Could not load attempts");
      setAttempts([]);
    } finally {
      setAttemptsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "candidates" && attempts.length === 0 && !attemptsLoading) {
      void loadAttempts();
    }
  }, [activeTab, attempts.length, attemptsLoading, loadAttempts]);

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
          <SidebarSectionButton sectionId="candidates" icon={Users} label="Candidates" onGoTo={goToSection} />

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
            {activeTab === "overview" && (
            <section id="overview" className="animate-in fade-in slide-in-from-bottom-4 duration-500" aria-labelledby="overview-heading">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-500/20 shadow-sm dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/30">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h2 id="overview-heading" className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                    Platform Overview
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Aggregated intelligence on exams generated and question banks. Observe your platform growth and active API status.
                  </p>
                </div>
              </div>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/50">
                  <div className="absolute right-0 top-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-blue-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400">
                        <LayoutDashboard className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">Total Exams Created</p>
                    </div>
                    <p className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {listLoading ? "—" : exams.length}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/50">
                  <div className="absolute right-0 top-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-amber-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
                        <Award className="h-5 w-5" />
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">Questions in Library</p>
                    </div>
                    <p className="text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {listLoading ? "—" : totalQuestionBank}
                    </p>
                  </div>
                </div>
                <div className="group relative overflow-hidden rounded-3xl border border-zinc-200/80 bg-white p-6 shadow-sm transition-all hover:shadow-xl dark:border-zinc-800/80 dark:bg-zinc-900/50">
                  <div className="absolute right-0 top-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                  <div className="relative">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
                        <RefreshCw className={`h-5 w-5 ${listLoading ? 'animate-spin' : ''}`} />
                      </div>
                      <p className="text-sm font-semibold tracking-wide text-zinc-600 dark:text-zinc-400">API Connection</p>
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {listError ? (
                          <span className="inline-flex items-center gap-2 text-red-600 dark:text-red-400">
                            <span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span> Disconnected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span></span> Active
                          </span>
                        )}
                      </p>
                      <p className="mt-2 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500" title={apiUrl}>{apiUrl}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Create exam */}
            {activeTab === "create" && (
            <section
              id="create"
              className="group relative animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/50 p-1.5 shadow-sm backdrop-blur-xl transition-all hover:shadow-xl hover:shadow-amber-500/5 dark:border-zinc-800/80 dark:bg-zinc-900/50"
              aria-labelledby="create-heading"
            >
              <div className="absolute inset-0 z-0 bg-gradient-to-br from-amber-500/10 via-amber-500/0 to-amber-500/5 opacity-0 transition-opacity duration-700 ease-out group-hover:opacity-100" />
              <div className="relative z-10 rounded-[1.3rem] bg-white shadow-sm ring-1 ring-zinc-900/5 dark:bg-zinc-950 overflow-hidden">
                <div className="relative border-b border-zinc-100/80 dark:border-zinc-800/60 overflow-hidden">
                  <div className="absolute right-0 top-0 -mt-16 -mr-16 h-48 w-48 rounded-full bg-amber-500/5 blur-3xl" />
                  <div className="absolute left-0 bottom-0 -mb-16 -ml-16 h-48 w-48 rounded-full bg-indigo-500/5 blur-3xl" />
                  <div className="relative px-6 py-6 sm:px-8">
                    <div className="flex items-start gap-4">
                      <div className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-100 to-amber-50 p-3 shadow-sm ring-1 ring-amber-500/20 dark:from-amber-500/20 dark:to-amber-500/5 dark:ring-amber-500/30">
                        <Sparkles className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="pt-0.5">
                        <h2 id="create-heading" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                          Create AI Exam
                        </h2>
                        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                          Instantly generate dynamic, customized MCQs powered by AI. We&apos;ll create a unique candidate invite link ready to be shared immediately.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative p-6 sm:p-8">
                  {error && (
                    <div
                      className="animate-in fade-in slide-in-from-top-2 mb-8 flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/80 p-4 text-sm font-medium text-red-800 shadow-sm backdrop-blur-sm dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
                      role="alert"
                    >
                      <div className="flex shrink-0 items-center justify-center rounded-full bg-red-100 p-1.5 dark:bg-red-900/50">
                        <X className="h-4 w-4 text-red-600 dark:text-red-400" />
                      </div>
                      {error}
                    </div>
                  )}

                  {success && (
                    <div
                      className="animate-in fade-in slide-in-from-top-4 mb-8 overflow-hidden rounded-2xl border border-emerald-200/80 bg-emerald-50/50 shadow-sm transition-all dark:border-emerald-900/40 dark:bg-emerald-950/20"
                      role="status"
                    >
                      <div className="flex gap-4 border-b border-emerald-100/60 p-5 backdrop-blur-sm dark:border-emerald-900/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/20 dark:bg-emerald-600">
                          <Check className="h-5 w-5" />
                        </div>
                        <div className="pt-1.5">
                          <p className="font-bold text-emerald-950 dark:text-emerald-50">Exam successfully generated!</p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-emerald-800/90 dark:text-emerald-200/80">
                            <span className="flex items-center gap-1 rounded-md bg-emerald-100/80 px-2 py-0.5 font-mono dark:bg-emerald-900/50">
                              #{success.exam_id}
                            </span>
                            <span className="opacity-50">&bull;</span>
                            <span>{success.total_questions} questions</span>
                            <span className="opacity-50">&bull;</span>
                            <span className="font-medium">{success.topic}</span>
                            <span className="rounded-full bg-emerald-200/50 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider dark:bg-emerald-800/50">{success.complexity}</span>
                          </div>
                        </div>
                      </div>
                      <div className="bg-emerald-100/30 p-5 dark:bg-emerald-900/10">
                        <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-900/70 dark:text-emerald-400/80">
                          Candidate invite link
                        </label>
                        <div className="group/link flex flex-col gap-3 sm:flex-row sm:items-center">
                          <div className="relative flex-1">
                            <code className="block w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-emerald-200/80 bg-white px-4 py-3 text-sm font-medium text-emerald-950 shadow-inner transition-colors group-hover/link:border-emerald-300 dark:border-emerald-800/60 dark:bg-zinc-950 dark:text-emerald-100">
                              {inviteUrl}
                            </code>
                          </div>
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
                            className="group/btn relative flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 hover:shadow-md hover:shadow-emerald-500/20 active:scale-[0.98]"
                          >
                            <span className="relative z-10 flex items-center gap-2">
                              {copied ? (
                                <>
                                  <Check className="h-4 w-4" />
                                  Copied!
                                </>
                              ) : (
                                "Copy link"
                              )}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="grid relative z-10 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="topic" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Primary Topic
                      </label>
                      <input
                        id="topic"
                        required
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. React performance, Python async"
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="complexity"
                        className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200"
                      >
                        Complexity Level
                      </label>
                      <div className="relative group/select">
                        <select
                          id="complexity"
                          value={complexity}
                          onChange={(e) => setComplexity(e.target.value)}
                          className="w-full appearance-none rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 pr-10 text-zinc-900 shadow-sm transition-all hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900 leading-tight"
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-zinc-400 transition-colors group-hover/select:text-zinc-600 dark:group-hover/select:text-zinc-300">
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="n" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Total Questions
                      </label>
                      <input
                        id="n"
                        type="number"
                        min={1}
                        max={100}
                        required
                        value={totalQuestions}
                        onChange={(e) => setTotalQuestions(Number(e.target.value))}
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                      />
                    </div>
                    <div className="flex items-center justify-end pt-4 sm:col-span-2 lg:col-span-4 mt-2 border-t border-zinc-100/80 dark:border-zinc-800/60">
                      <button
                        type="submit"
                        disabled={loading}
                        className="group relative mt-6 inline-flex w-full min-w-[220px] items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-amber-500 px-6 py-3.5 text-sm font-bold text-amber-950 shadow-md shadow-amber-500/20 transition-all hover:bg-amber-400 hover:shadow-lg hover:shadow-amber-500/30 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-amber-500 dark:hover:bg-amber-400 sm:w-auto"
                      >
                        <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-120%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(120%)]">
                          <div className="relative h-full w-8 bg-white/20" />
                        </div>
                        {loading ? (
                          <>
                            <RefreshCw className="h-5 w-5 animate-spin text-amber-900/70" />
                            <span>Crafting Exam...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-5 w-5 transition-transform group-hover:scale-110 text-amber-900/70" />
                            <span>Generate Exam Magic</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </section>
            )}

            {/* Exam library */}
            {activeTab === "library" && (
            <section
              id="library"
              className="animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
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
            )}

            {/* Candidates / Attempts */}
            {activeTab === "candidates" && (() => {
              const filtered = attempts.filter((a) => {
                const q = searchQuery.toLowerCase();
                return (
                  a.candidate_name.toLowerCase().includes(q) ||
                  a.candidate_email.toLowerCase().includes(q) ||
                  a.exam_topic.toLowerCase().includes(q)
                );
              });
              return (
              <section id="candidates" className="animate-in fade-in slide-in-from-bottom-4 duration-500" aria-labelledby="candidates-heading">
                <div className="mb-8 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 ring-1 ring-violet-500/20 shadow-sm dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/30">
                      <Users className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 id="candidates-heading" className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                        Candidates &amp; Results
                      </h2>
                      <p className="mt-1 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                        All exam attempts — see who attempted which exam and their scores.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void loadAttempts()}
                    disabled={attemptsLoading}
                    className="shrink-0 inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <RefreshCw className={`h-4 w-4 ${attemptsLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {/* Stats row */}
                {!attemptsLoading && attempts.length > 0 && (() => {
                  const unique = new Set(attempts.map((a) => a.candidate_email)).size;
                  const avg = attempts.reduce((s, a) => s + a.score_percent, 0) / attempts.length;
                  const top = Math.max(...attempts.map((a) => a.score_percent));
                  return (
                    <div className="mb-8 grid gap-4 sm:grid-cols-3">
                      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
                        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Unique Candidates</p>
                        <p className="mt-2 text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">{unique}</p>
                      </div>
                      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
                        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Avg. Score</p>
                        <p className="mt-2 text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">{avg.toFixed(1)}<span className="ml-1 text-2xl font-bold text-zinc-400">%</span></p>
                      </div>
                      <div className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
                        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-24 w-24 rounded-full bg-amber-500/10 blur-2xl transition-transform duration-700 group-hover:scale-150" />
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Top Score</p>
                        <p className="mt-2 text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">{top.toFixed(1)}<span className="ml-1 text-2xl font-bold text-zinc-400">%</span></p>
                      </div>
                    </div>
                  );
                })()}

                {/* Search */}
                {attempts.length > 0 && (
                  <div className="mb-4">
                    <input
                      type="search"
                      placeholder="Search by name, email or topic…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3 text-zinc-900 shadow-sm transition placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:focus:bg-zinc-900 sm:w-80"
                    />
                  </div>
                )}

                {attemptsError && (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    {attemptsError}
                  </p>
                )}

                {attemptsLoading && (
                  <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Loading attempts…
                  </div>
                )}

                {!attemptsLoading && !attemptsError && attempts.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 py-16 text-center dark:border-zinc-700 dark:bg-zinc-800/30">
                    <Users className="h-12 w-12 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-base font-semibold text-zinc-600 dark:text-zinc-400">No attempts yet</p>
                    <p className="max-w-xs text-sm text-zinc-500">Once candidates complete exams, their results will appear here.</p>
                  </div>
                )}

                {filtered.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-700">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Candidate</th>
                          <th className="hidden px-5 py-3.5 font-semibold text-zinc-700 sm:table-cell dark:text-zinc-300">Email</th>
                          <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Exam Topic</th>
                          <th className="hidden px-5 py-3.5 font-semibold text-zinc-700 md:table-cell dark:text-zinc-300">Level</th>
                          <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Score</th>
                          <th className="hidden px-5 py-3.5 font-semibold text-zinc-700 lg:table-cell dark:text-zinc-300">Correct / Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filtered.map((a) => {
                          const pct = a.score_percent;
                          const scoreColor =
                            pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                            pct >= 50 ? "text-amber-600 dark:text-amber-400" :
                            "text-red-600 dark:text-red-400";
                          const barColor =
                            pct >= 80 ? "bg-emerald-500" :
                            pct >= 50 ? "bg-amber-500" :
                            "bg-red-500";
                          return (
                            <tr key={a.attempt_id} className="bg-white transition hover:bg-zinc-50/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/60">
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                                    {a.candidate_name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{a.candidate_name}</span>
                                </div>
                              </td>
                              <td className="hidden px-5 py-4 text-zinc-500 sm:table-cell dark:text-zinc-400">{a.candidate_email}</td>
                              <td className="max-w-[180px] px-5 py-4">
                                <span className="line-clamp-1 font-medium text-zinc-800 dark:text-zinc-200">{a.exam_topic}</span>
                              </td>
                              <td className="hidden px-5 py-4 capitalize text-zinc-500 md:table-cell dark:text-zinc-400">{a.exam_complexity}</td>
                              <td className="px-5 py-4">
                                <div className="flex flex-col gap-1.5">
                                  <span className={`text-base font-extrabold tabular-nums ${scoreColor}`}>{pct.toFixed(1)}%</span>
                                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                    <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="hidden px-5 py-4 tabular-nums text-zinc-500 lg:table-cell dark:text-zinc-400">{a.correct_count} / {a.total_questions}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {!attemptsLoading && filtered.length === 0 && attempts.length > 0 && (
                  <p className="mt-4 text-sm text-zinc-500">No results match your search.</p>
                )}
              </section>
              );
            })()}
          </div>
        </main>
      </div>
    </div>
  );
}
