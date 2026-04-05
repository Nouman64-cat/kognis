"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Award,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Home,
  KeyRound,
  Layers,
  LayoutDashboard,
  Library,
  LogOut,
  Menu,
  Plus,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react";
import { clearAdminToken } from "@/lib/admin-token";
import { generateExamAdmin, listAttempts, listExams } from "@/lib/api";
import { candidateExamInviteUrl } from "@/lib/invite-link";
import type { AttemptRow, CandidateAnalytics, ExamSummary, GlobalAnalytics } from "@/lib/types";

function formatDate(isoStr: string) {
  const d = new Date(isoStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + 
         " • " + 
         d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

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
  // Create exam form state
  const [examTitle, setExamTitle] = useState("");
  const [complexity, setComplexity] = useState("intermediate");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [topicMixRows, setTopicMixRows] = useState<{ id: string; name: string; percent: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [copiedExamId, setCopiedExamId] = useState<number | null>(null);
  const [success, setSuccess] = useState<{
    exam_id: number;
    title: string | null;
    topics: string[];
    complexity: string;
    total_questions: number;
    duration_minutes: number | null;
  } | null>(null);
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalAnalytics | null>(null);
  const [candidateStats, setCandidateStats] = useState<Record<string, CandidateAnalytics>>({});
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [attemptsError, setAttemptsError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCandidateEmail, setSelectedCandidateEmail] = useState<string | null>(null);

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
      setGlobalStats(res.global_stats);
      setCandidateStats(res.candidate_stats);
    } catch (e) {
      setAttemptsError(e instanceof Error ? e.message : "Could not load attempts");
      setAttempts([]);
      setGlobalStats(null);
      setCandidateStats({});
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

  const topicMixSum = useMemo(
    () => topicMixRows.reduce((acc, r) => acc + (Number.isFinite(r.percent) ? r.percent : 0), 0),
    [topicMixRows],
  );
  const topicMixValid = useMemo(() => {
    if (topicMixRows.length === 0) return false;
    const names = topicMixRows.map((r) => r.name.trim()).filter(Boolean);
    if (names.length !== topicMixRows.length) return false;
    if (new Set(names).size !== names.length) return false;
    return Math.abs(topicMixSum - 100) < 0.51;
  }, [topicMixRows, topicMixSum]);

  const totalQuestionBank = useMemo(
    () => exams.reduce((acc, e) => acc + e.total_questions, 0),
    [exams],
  );

  const lastActiveMap = useMemo(() => {
    const map: Record<string, string> = {};
    attempts.forEach((a) => {
      if (!map[a.candidate_email] || new Date(a.created_at) > new Date(map[a.candidate_email])) {
        map[a.candidate_email] = a.created_at;
      }
    });
    return map;
  }, [attempts]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicMixValid) {
      setError(
        "Add at least one topic bucket with a name, ensure bucket names are unique, and set percentages to total 100%.",
      );
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await generateExamAdmin({
        title: examTitle.trim() || undefined,
        complexity: complexity.trim(),
        total_questions: totalQuestions,
        duration_minutes: durationMinutes !== "" ? durationMinutes : undefined,
        scheduled_for: scheduledTime ? new Date(scheduledTime).toISOString() : null,
        topic_mix: topicMixRows.map((r) => ({ name: r.name.trim(), percent: r.percent })),
      });
      setCopied(false);
      setSuccess(res);
      setExamTitle("");
      setTopicMixRows([]);
      setDurationMinutes("");
      setScheduledTime("");
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
                          Define your question topic mix (bucket names and percentages), then generate MCQs. You&apos;ll get a candidate invite link to share immediately.
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
                            {success.duration_minutes && (
                              <><span className="opacity-50">&bull;</span><span>{success.duration_minutes}min</span></>
                            )}
                            <span className="opacity-50">&bull;</span>
                            <span className="text-xs text-emerald-800/70 dark:text-emerald-300/70">Mix:</span>
                            {success.topics.map((t) => (
                              <span key={t} className="rounded-full bg-emerald-200/50 px-2 py-0.5 text-xs font-semibold dark:bg-emerald-800/50">{t}</span>
                            ))}
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
                    {/* Exam Title */}
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label htmlFor="exam-title" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Exam Title <span className="font-normal text-zinc-400">(optional)</span>
                      </label>
                      <input
                        id="exam-title"
                        value={examTitle}
                        onChange={(e) => setExamTitle(e.target.value)}
                        placeholder="e.g. JavaScript Fundamentals Assessment"
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                      />
                    </div>
                    {/* Question topic mix: user-defined bucket names + percentages (sum 100) */}
                    <div className="sm:col-span-2 lg:col-span-4 rounded-xl border border-zinc-200/80 bg-zinc-50/50 p-4 dark:border-zinc-700/80 dark:bg-zinc-900/40">
                      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Question topic mix</p>
                          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Add one row per theme (you name it). Percentages must total{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">100%</span>. Bucket names must be
                            unique.
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setTopicMixRows((rows) => [...rows, { id: crypto.randomUUID(), name: "", percent: 0 }])
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add bucket
                          </button>
                          <button
                            type="button"
                            onClick={() => setTopicMixRows([])}
                            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                          >
                            Clear all
                          </button>
                        </div>
                      </div>
                      {topicMixRows.length === 0 ? (
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">No buckets yet — click &quot;Add bucket&quot; to define your mix.</p>
                      ) : (
                        <ul className="space-y-2">
                          {topicMixRows.map((row) => (
                            <li
                              key={row.id}
                              className="flex flex-col gap-2 rounded-lg border border-zinc-200/90 bg-white/90 p-3 sm:flex-row sm:items-end sm:gap-3 dark:border-zinc-700 dark:bg-zinc-900/60"
                            >
                              <div className="min-w-0 flex-1">
                                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Bucket name</label>
                                <input
                                  type="text"
                                  value={row.name}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setTopicMixRows((rows) => rows.map((r) => (r.id === row.id ? { ...r, name: v } : r)));
                                  }}
                                  placeholder="e.g. Guess code output, RAG — naive, LangChain"
                                  className="w-full rounded-lg border-0 ring-1 ring-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 dark:ring-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                                />
                              </div>
                              <div className="flex items-end gap-2 sm:w-40">
                                <div className="min-w-0 flex-1">
                                  <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">%</label>
                                  <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={1}
                                    value={row.percent}
                                    onChange={(e) => {
                                      const v = Number(e.target.value);
                                      setTopicMixRows((rows) =>
                                        rows.map((r) => (r.id === row.id ? { ...r, percent: Number.isFinite(v) ? v : 0 } : r)),
                                      );
                                    }}
                                    className="w-full rounded-lg border-0 ring-1 ring-zinc-300 bg-white px-2 py-2 text-sm tabular-nums text-zinc-900 dark:ring-zinc-600 dark:bg-zinc-900 dark:text-zinc-50"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setTopicMixRows((rows) => rows.filter((r) => r.id !== row.id))}
                                  className="mb-0.5 rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                  aria-label="Remove bucket"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                      <p
                        className={`mt-3 text-xs font-medium ${topicMixValid ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
                      >
                        Total: {topicMixSum.toFixed(0)}%
                        {!topicMixValid && topicMixRows.length > 0
                          ? " — need non-empty unique names and total 100%."
                          : null}
                        {!topicMixValid && topicMixRows.length === 0 ? " — add at least one bucket." : null}
                      </p>
                    </div>
                    {/* Complexity */}
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
                    {/* Total Questions */}
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
                    {/* Duration */}
                    <div>
                      <label htmlFor="duration" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Duration <span className="font-normal text-zinc-400">(minutes, optional)</span>
                      </label>
                      <input
                        id="duration"
                        type="number"
                        min={1}
                        max={300}
                        value={durationMinutes}
                        onChange={(e) => setDurationMinutes(e.target.value === "" ? "" : Number(e.target.value))}
                        placeholder="No time limit"
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                      />
                    </div>
                    {/* Scheduled Time */}
                    <div>
                      <label htmlFor="scheduled" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Scheduled Time <span className="font-normal text-zinc-400">(optional)</span>
                      </label>
                      <input
                        id="scheduled"
                        type="datetime-local"
                        value={scheduledTime}
                        onChange={(e) => setScheduledTime(e.target.value)}
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                        style={{ colorScheme: "dark" }}
                      />
                    </div>
                    <div className="flex items-center justify-end pt-4 sm:col-span-2 lg:col-span-4 mt-2 border-t border-zinc-100/80 dark:border-zinc-800/60">
                      <button
                        type="submit"
                        disabled={loading || !topicMixValid}
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
                          <th className="hidden px-4 py-3 font-medium text-zinc-700 lg:table-cell dark:text-zinc-300">
                            Scheduled / Created
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
                                <span className="line-clamp-2">{exam.title ?? exam.topics.join(", ")}</span>
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
                              <td className="hidden px-4 py-3 whitespace-nowrap text-xs text-zinc-500 lg:table-cell dark:text-zinc-400">
                                {exam.scheduled_for ? (
                                  <span className="font-semibold text-amber-600 dark:text-amber-400">
                                    {formatDate(exam.scheduled_for)}
                                  </span>
                                ) : (
                                  formatDate(exam.created_at)
                                )}
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
              // Grouped candidates from stats
              const candidateList = Object.values(candidateStats).sort((a, b) => b.avg_score - a.avg_score);
              const filteredCandidates = candidateList.filter((c) => {
                const q = searchQuery.toLowerCase();
                return (
                  c.candidate_name.toLowerCase().includes(q) ||
                  c.candidate_email.toLowerCase().includes(q)
                );
              });

              const selectedCStats = selectedCandidateEmail ? candidateStats[selectedCandidateEmail] : null;
              const selectedCandidateAttempts = selectedCandidateEmail
                ? attempts.filter((a) => a.candidate_email === selectedCandidateEmail)
                : [];

              const Ring = ({ pct, size = 80, stroke = 7, label = "Avg" }: { pct: number; size?: number; stroke?: number; label?: string }) => {
                const r = (size - stroke) / 2;
                const circ = 2 * Math.PI * r;
                const offset = circ - (pct / 100) * circ;
                const colour = pct >= 90 ? "#10b981" : pct >= 75 ? "#f59e0b" : "#ef4444";
                return (
                  <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
                    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-zinc-100 dark:text-zinc-800" />
                      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
                        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                        className="transition-all duration-1000 ease-out" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-md font-black tabular-nums text-zinc-900 dark:text-zinc-50">{pct.toFixed(0)}%</span>
                      <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
                    </div>
                  </div>
                );
              };

              return (
              <section id="candidates" className="animate-in fade-in slide-in-from-bottom-4 duration-700" aria-labelledby="candidates-heading">
                
                {/* ── Dashboard Layout ─────────────────────────────────── */}
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start text-sm">
                  
                  {/* ── Left Sidebar: Candidate List ────────────────────── */}
                  <div className="w-full lg:w-72 shrink-0 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400">
                          <Users className="h-4 w-4" />
                        </div>
                        <h3 className="font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Candidates</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => void loadAttempts()}
                        disabled={attemptsLoading}
                        className="p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 rounded-lg transition-colors dark:hover:bg-zinc-800"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${attemptsLoading ? "animate-spin" : ""}`} />
                      </button>
                    </div>

                    <div className="relative group">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Check className="h-3.5 w-3.5 text-zinc-400 group-focus-within:text-violet-500 transition-colors" />
                      </div>
                      <input
                        type="search"
                        placeholder="Search…"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border-0 ring-1 ring-zinc-200 bg-white pl-9 pr-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-violet-500/50 dark:ring-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredCandidates.map((c, idx) => {
                        const isSelected = selectedCandidateEmail === c.candidate_email;
                        const lastActive = lastActiveMap[c.candidate_email];
                        return (
                          <button
                            key={c.candidate_email}
                            type="button"
                            onClick={() => setSelectedCandidateEmail(c.candidate_email)}
                            style={{ animationDelay: `${idx * 20}ms` }}
                            className={`group flex items-center gap-3 animate-in fade-in slide-in-from-left-2 rounded-xl p-3 text-left transition-all duration-200 ${
                              isSelected
                                ? "bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-lg shadow-violet-500/20"
                                : "bg-white hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 ring-1 ring-zinc-200 dark:ring-zinc-800"
                            }`}
                          >
                            <div className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-black ${
                              isSelected ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/50"
                            }`}>
                              {c.candidate_name.charAt(0).toUpperCase()}
                              {c.avg_score >= 85 && (
                                <span className="absolute -right-0.5 -top-0.5 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-xs font-bold ${isSelected ? "text-white" : "text-zinc-900 dark:text-zinc-100"}`}>
                                {c.candidate_name}
                              </p>
                              <div className="flex flex-col gap-0.5">
                                <p className={`truncate text-[10px] font-medium ${isSelected ? "text-white/70" : "text-zinc-400"}`}>
                                  {c.candidate_email}
                                </p>
                                {lastActive && (
                                  <p className={`truncate text-[9px] font-medium flex items-center gap-1 ${isSelected ? "text-white/50" : "text-zinc-400"}`}>
                                    <Clock className="h-2 w-2.5" />
                                    Active {formatDate(lastActive).split('•')[0]}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1">
                              <span className={`text-[10px] font-black tabular-nums ${
                                isSelected ? "text-white" : c.avg_score >= 75 ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"
                              }`}>
                                {c.avg_score.toFixed(0)}%
                              </span>
                              <div className={`h-1 w-8 overflow-hidden rounded-full ${isSelected ? "bg-white/10" : "bg-zinc-100 dark:bg-zinc-800"}`}>
                                <div className={`h-full transition-all duration-500 ${isSelected ? "bg-white" : c.avg_score >= 75 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${c.avg_score}%` }} />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                      {filteredCandidates.length === 0 && !attemptsLoading && (
                        <div className="py-12 text-center space-y-3">
                          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-50 dark:bg-zinc-800/50 text-zinc-300">
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="text-[11px] font-medium text-zinc-500">No candidates found</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Right Content: Detail or Global Stats ────────────── */}
                  <div className="flex-1 min-w-0">
                    {selectedCandidateEmail && selectedCStats ? (
                      <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                        {/* Detail Header */}
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-lg font-black text-white shadow-md overflow-hidden relative">
                              <div className="absolute inset-0 bg-white/20 blur-xl translate-y-8" />
                              {selectedCStats.candidate_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                  {selectedCStats.candidate_name}
                                </h2>
                                {selectedCStats.pass_rate === 100 && (
                                  <Trophy className="h-4 w-4 text-amber-500" />
                                )}
                              </div>
                              <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                <Target className="h-3 w-3 text-violet-500" />
                                {selectedCandidateEmail}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedCandidateEmail(null)}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/50 backdrop-blur-sm px-4 py-2 text-xs font-bold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-200"
                          >
                            <X className="h-3 w-3" />
                            Return
                          </button>
                        </div>

                        {/* Top Stats Cards */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          {[
                            { label: "Aggregate average", value: `${selectedCStats.avg_score.toFixed(1)}%`, sub: `${selectedCStats.total_attempts} Assessments`, color: "violet", icon: TrendingUp },
                            { label: "Personal Record", value: `${selectedCStats.best_score.toFixed(1)}%`, sub: "Peak Performance", color: "emerald", icon: Zap },
                            { label: "Success Quotient", value: `${selectedCStats.pass_rate.toFixed(0)}%`, sub: "Pass Rate", color: "amber", icon: Trophy },
                          ].map((card) => (
                            <div key={card.label} className="group relative rounded-2xl border border-zinc-200 bg-white/60 p-4 shadow-sm backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/60">
                              <div className="flex items-center justify-between mb-2">
                                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                  card.color === "violet" ? "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400" :
                                  card.color === "emerald" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                                  "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400"
                                }`}>
                                  <card.icon className="h-4 w-4" />
                                </div>
                              </div>
                              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{card.label}</p>
                              <p className={`mt-1 text-2xl font-black tabular-nums transition-transform group-hover:translate-x-1 ${
                                card.color === "violet" ? "text-violet-700 dark:text-violet-400" :
                                card.color === "emerald" ? "text-emerald-700 dark:text-emerald-400" :
                                "text-amber-700 dark:text-amber-400"
                              }`}>{card.value}</p>
                              <p className="text-[10px] font-bold text-zinc-500">{card.sub}</p>
                            </div>
                          ))}
                        </div>

                        {/* Score Summary Visualization */}
                        <div className="rounded-3xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                          <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
                            <div className="shrink-0 flex flex-col items-center gap-4">
                              <Ring pct={selectedCStats.avg_score} size={110} stroke={10} label="Overall" />
                              <div className="flex gap-2">
                                <div className="text-center px-3 py-1 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl ring-1 ring-emerald-500/10">
                                  <p className="text-[10px] font-black text-emerald-700 dark:text-emerald-400">{selectedCStats.passed_count} PASS</p>
                                </div>
                                <div className="text-center px-3 py-1 bg-red-50 dark:bg-red-500/10 rounded-xl ring-1 ring-red-500/10">
                                  <p className="text-[10px] font-black text-red-700 dark:text-red-400">{selectedCStats.failed_count} FAIL</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex-1 space-y-4">
                              <div className="space-y-1">
                                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">Detailed Analytics</h3>
                                <p className="text-xs font-medium text-zinc-500 leading-relaxed">
                                  Candidate has completed <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedCStats.total_attempts} exams</span>. Pattern indicates a <span className={`font-bold ${selectedCStats.pass_rate >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {selectedCStats.pass_rate >= 75 ? 'Strong Proficiency' : 'Developing Mastery'}
                                  </span>.
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-3">
                                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Recent Activity</p>
                                  <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
                                    {selectedCandidateAttempts[0] ? formatDate(selectedCandidateAttempts[0].created_at).split('•')[0] : 'None'}
                                  </p>
                                </div>
                                <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40">
                                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Top Subject</p>
                                  <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 truncate">
                                    {selectedCandidateAttempts[0]?.exam_topics[0] || 'N/A'}
                                  </p>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <div className="flex items-center justify-between text-[10px] font-bold">
                                  <span className="text-zinc-400 uppercase tracking-tighter">Success Trajectory</span>
                                  <span className="text-zinc-900 dark:text-zinc-50">{selectedCStats.pass_rate}% Accuracy</span>
                                </div>
                                <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                   <div className={`h-full transition-all duration-1000 ${selectedCStats.pass_rate >= 75 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${selectedCStats.pass_rate}%` }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Breakdown Table */}
                        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                          <div className="flex items-center justify-between bg-zinc-50/50 px-5 py-3 dark:bg-zinc-900/40 text-[11px] font-bold">
                             <h3 className="text-zinc-900 dark:text-zinc-50 font-black tracking-tight">Exam Narrative</h3>
                             <span className="text-zinc-400">{selectedCandidateAttempts.length} Records</span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 font-bold uppercase tracking-tighter">
                                  <th className="px-5 py-3">Assessment Context</th>
                                  <th className="px-5 py-3">Timeline</th>
                                  <th className="px-5 py-3 text-right">Result</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {selectedCandidateAttempts.map((a) => {
                                  const pct = a.score_percent;
                                  const passed = pct >= 75;
                                  return (
                                    <tr key={a.attempt_id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors">
                                      <td className="px-5 py-3">
                                        <div className="flex items-center gap-2">
                                           <div className={`h-1.5 w-1.5 rounded-full ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                           <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[160px]">
                                             {a.exam_title ?? a.exam_topics.join(", ")}
                                           </p>
                                        </div>
                                      </td>
                                      <td className="px-5 py-3 text-zinc-500 tabular-nums">
                                        {formatDate(a.created_at).split('•')[0]}
                                      </td>
                                      <td className="px-5 py-3 text-right">
                                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black ring-1 ring-inset ${
                                          passed ? "bg-emerald-50 text-emerald-600 ring-emerald-500/20" : "bg-red-50 text-red-600 ring-red-500/20"
                                        }`}>
                                          {pct.toFixed(0)}%
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="animate-in fade-in duration-1000 space-y-8">
                        {/* Global Platform State */}
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white shadow-md">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                              Platform Analytics
                            </h2>
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest leading-none mt-1">Global Candidate Diagnostics</p>
                          </div>
                        </div>

                        {!attemptsLoading && globalStats ? (
                          <>
                            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                              {[
                                { label: "Cohort", value: globalStats.unique_candidates, color: "violet", icon: Users },
                                { label: "Volume", value: globalStats.total_attempts, color: "blue", icon: Layers },
                                { label: "Mean Accuracy", value: `${globalStats.avg_score.toFixed(1)}%`, color: "indigo", icon: Target },
                                { label: "Peak Performance", value: `${globalStats.top_score.toFixed(1)}%`, color: "emerald", icon: Zap },
                                { label: "Pass Rate", value: `${globalStats.pass_rate.toFixed(0)}%`, color: "amber", icon: Trophy },
                              ].map((card) => (
                                <div key={card.label} className="group relative rounded-2xl border border-zinc-200 bg-white/50 p-4 shadow-sm backdrop-blur-sm transition-all hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50">
                                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">{card.label}</p>
                                  <p className="mt-1 text-xl font-black tabular-nums text-zinc-900 dark:text-zinc-50">{card.value}</p>
                                </div>
                              ))}
                            </div>

                            <div className="rounded-3xl border border-zinc-200 bg-white/50 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
                              <div className="flex items-center gap-2 mb-8">
                                <TrendingUp className="h-4 w-4 text-zinc-400" />
                                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Proficiency Distribution</h3>
                              </div>
                              <div className="flex items-end gap-3 h-32">
                                {[
                                  { label: "0–20", count: globalStats.score_distribution["0–20"] || 0, color: "bg-red-500" },
                                  { label: "21–40", count: globalStats.score_distribution["21–40"] || 0, color: "bg-orange-500" },
                                  { label: "41–60", count: globalStats.score_distribution["41–60"] || 0, color: "bg-amber-500" },
                                  { label: "61–80", count: globalStats.score_distribution["61–80"] || 0, color: "bg-teal-500" },
                                  { label: "81–100", count: globalStats.score_distribution["81–100"] || 0, color: "bg-emerald-500" },
                                ].map((b) => {
                                  const max = Math.max(...Object.values(globalStats.score_distribution), 1);
                                  const h = (b.count / max) * 100;
                                  return (
                                    <div key={b.label} className="flex-1 flex flex-col justify-end gap-2 group">
                                      {b.count > 0 && <span className="text-[9px] font-bold text-zinc-500 text-center">{b.count}</span>}
                                      <div className={`w-full rounded-lg min-h-[2px] transition-all duration-1000 ease-out group-hover:opacity-80 shadow-md ${b.color}`} style={{ height: `${h}%` }} />
                                      <span className="text-[9px] font-black text-zinc-400 text-center uppercase tracking-tighter">{b.label}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        ) : attemptsLoading ? (
                          <div className="py-20 text-center">
                            <RefreshCw className="h-8 w-8 animate-spin text-violet-500 mx-auto opacity-50 mb-3" />
                            <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Hydrating data nodes...</p>
                          </div>
                        ) : (
                          <div className="py-20 text-center rounded-3xl border-2 border-dashed border-zinc-100 dark:border-zinc-800">
                             <Users className="h-10 w-10 text-zinc-200 dark:text-zinc-800 mx-auto mb-3" />
                             <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest text-zinc-300">Awaiting assessment cycles</p>
                          </div>
                        )}
                        
                        {/* Empty selection helper with Glassmorphism */}
                        {!selectedCandidateEmail && !attemptsLoading && filteredCandidates.length > 0 && (
                          <div className="group relative overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-xl shadow-indigo-500/20">
                                <div className="relative flex items-start gap-4">
                                  <Sparkles className="h-6 w-6 mt-1 flex-shrink-0" />
                                  <div className="space-y-1">
                                    <h4 className="text-lg font-bold">Expand Your Intelligence</h4>
                                    <p className="text-xs font-medium text-indigo-100 leading-relaxed">
                                      Select any individual candidate from the control panel to access their deep-layer performance profile, milestone trends, and competency diagnostics.
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })()}
            </div>
        </main>
      </div>
    </div>
  );
}
