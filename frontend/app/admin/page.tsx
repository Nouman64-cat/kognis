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
  // Create exam form state
  const [examTitle, setExamTitle] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [topicInput, setTopicInput] = useState("");
  const [complexity, setComplexity] = useState("intermediate");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [durationMinutes, setDurationMinutes] = useState<number | "">("");
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
    if (topics.length === 0) {
      setError("Add at least one topic.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await generateExamAdmin({
        title: examTitle.trim() || undefined,
        topics,
        complexity: complexity.trim(),
        total_questions: totalQuestions,
        duration_minutes: durationMinutes !== "" ? durationMinutes : undefined,
      });
      setCopied(false);
      setSuccess(res);
      setExamTitle("");
      setTopics([]);
      setTopicInput("");
      setDurationMinutes("");
      void loadExams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const addTopic = () => {
    const t = topicInput.trim();
    if (t && !topics.includes(t)) setTopics((prev) => [...prev, t]);
    setTopicInput("");
  };

  const removeTopic = (t: string) => setTopics((prev) => prev.filter((x) => x !== t));

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
                            {success.duration_minutes && (
                              <><span className="opacity-50">&bull;</span><span>{success.duration_minutes}min</span></>
                            )}
                            <span className="opacity-50">&bull;</span>
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
                    {/* Topics */}
                    <div className="sm:col-span-2 lg:col-span-4">
                      <label htmlFor="topic-input" className="mb-2.5 block text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        Topics <span className="font-normal text-zinc-400">(add one or more)</span>
                      </label>
                      {/* Tag display */}
                      {topics.length > 0 && (
                        <div className="mb-3 flex flex-wrap gap-2">
                          {topics.map((t) => (
                            <span key={t} className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-200">
                              {t}
                              <button type="button" onClick={() => removeTopic(t)} className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-amber-200 dark:hover:bg-amber-700/50">
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <input
                          id="topic-input"
                          value={topicInput}
                          onChange={(e) => setTopicInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTopic(); } }}
                          placeholder="e.g. React Hooks"
                          className="flex-1 rounded-xl border-0 ring-1 ring-zinc-300 bg-zinc-50 px-4 py-3.5 text-zinc-900 shadow-sm transition-all placeholder:text-zinc-400 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 dark:ring-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-600 dark:hover:bg-zinc-900 dark:focus:bg-zinc-900"
                        />
                        <button
                          type="button"
                          onClick={addTopic}
                          className="shrink-0 rounded-xl bg-amber-100 px-4 py-3.5 text-sm font-bold text-amber-800 transition hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:hover:bg-amber-500/30"
                        >
                          + Add
                        </button>
                      </div>
                      {topics.length === 0 && (
                        <p className="mt-2 text-xs text-zinc-400">Press Enter or click + Add after typing a topic.</p>
                      )}
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
                    <div className="sm:col-span-2">
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
                    <div className="flex items-center justify-end pt-4 sm:col-span-2 lg:col-span-4 mt-2 border-t border-zinc-100/80 dark:border-zinc-800/60">
                      <button
                        type="submit"
                        disabled={loading || topics.length === 0}
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
                  a.exam_topics.join(" ").toLowerCase().includes(q) || (a.exam_title ?? "").toLowerCase().includes(q)
                );
              });

              // Aggregate stats
              const uniqueEmails = [...new Set(attempts.map((a) => a.candidate_email))];
              const totalAttempts = attempts.length;
              const avgScore = totalAttempts ? attempts.reduce((s, a) => s + a.score_percent, 0) / totalAttempts : 0;
              const topScore = totalAttempts ? Math.max(...attempts.map((a) => a.score_percent)) : 0;
              const passCount = attempts.filter((a) => a.score_percent >= 60).length;
              const passRate = totalAttempts ? (passCount / totalAttempts) * 100 : 0;

              // Per-candidate panel data
              const candidateAttempts = selectedCandidateEmail
                ? attempts.filter((a) => a.candidate_email === selectedCandidateEmail)
                : [];
              const candidateName = candidateAttempts[0]?.candidate_name ?? "";
              const candidateAvg = candidateAttempts.length
                ? candidateAttempts.reduce((s, a) => s + a.score_percent, 0) / candidateAttempts.length
                : 0;
              const candidateBest = candidateAttempts.length
                ? Math.max(...candidateAttempts.map((a) => a.score_percent))
                : 0;
              const candidatePassRate = candidateAttempts.length
                ? (candidateAttempts.filter((a) => a.score_percent >= 60).length / candidateAttempts.length) * 100
                : 0;

              // SVG ring helper
              const Ring = ({ pct, size = 96, stroke = 8 }: { pct: number; size?: number; stroke?: number }) => {
                const r = (size - stroke) / 2;
                const circ = 2 * Math.PI * r;
                const offset = circ - (pct / 100) * circ;
                const colour = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
                return (
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-zinc-100 dark:text-zinc-800" />
                    <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
                      strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                      style={{ transition: "stroke-dashoffset 0.6s ease" }} />
                  </svg>
                );
              };

              return (
              <section id="candidates" className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative" aria-labelledby="candidates-heading">

                {/* ── Slide-over panel ─────────────────────────────────── */}
                {selectedCandidateEmail && (
                  <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedCandidateEmail(null)} />
                    {/* Panel */}
                    <div className="relative z-10 flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-zinc-950">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-800">
                        <div>
                          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{candidateName}</p>
                          <p className="text-sm text-zinc-500">{selectedCandidateEmail}</p>
                        </div>
                        <button type="button" onClick={() => setSelectedCandidateEmail(null)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700">
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="flex-1 space-y-8 px-6 py-6">

                        {/* Big number stat cards */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            { label: "Avg. Score", value: `${candidateAvg.toFixed(1)}%`, sub: `${candidateAttempts.length} exam${candidateAttempts.length !== 1 ? "s" : ""}`, colour: "violet" },
                            { label: "Best Score", value: `${candidateBest.toFixed(1)}%`, sub: "personal best", colour: "emerald" },
                            { label: "Pass Rate", value: `${candidatePassRate.toFixed(0)}%`, sub: "≥60% threshold", colour: "amber" },
                          ].map((card) => (
                            <div key={card.label} className="rounded-2xl border border-zinc-200/80 bg-zinc-50 p-4 dark:border-zinc-800/80 dark:bg-zinc-900/50">
                              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{card.label}</p>
                              <p className={`mt-1.5 text-2xl font-extrabold tabular-nums ${
                                card.colour === "violet" ? "text-violet-600 dark:text-violet-400" :
                                card.colour === "emerald" ? "text-emerald-600 dark:text-emerald-400" :
                                "text-amber-600 dark:text-amber-400"
                              }`}>{card.value}</p>
                              <p className="mt-0.5 text-xs text-zinc-400">{card.sub}</p>
                            </div>
                          ))}
                        </div>

                        {/* Score ring + avg spotlight */}
                        <div className="flex items-center gap-6 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                          <div className="relative shrink-0">
                            <Ring pct={candidateAvg} size={100} stroke={9} />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-lg font-black tabular-nums text-zinc-900 dark:text-zinc-50">{candidateAvg.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Overall Average</p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {candidateAttempts.filter(a => a.score_percent >= 60).length} passed&nbsp;·&nbsp;
                              {candidateAttempts.filter(a => a.score_percent < 60).length} failed
                            </p>
                            <div className="mt-3 h-2 w-48 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                              <div className={`h-full rounded-full transition-all ${
                                candidateAvg >= 80 ? "bg-emerald-500" : candidateAvg >= 60 ? "bg-amber-500" : "bg-red-500"
                              }`} style={{ width: `${candidateAvg}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* Bar chart of all exams */}
                        {candidateAttempts.length > 1 && (
                          <div className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
                            <p className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Score per Exam</p>
                            <div className="space-y-3">
                              {candidateAttempts.map((a, i) => {
                                const name = a.exam_title ?? a.exam_topics.join(", ");
                                const colour = a.score_percent >= 80 ? "bg-emerald-500" : a.score_percent >= 60 ? "bg-amber-500" : "bg-red-500";
                                return (
                                  <div key={a.attempt_id} className="flex items-center gap-3">
                                    <span className="w-4 shrink-0 text-right text-xs font-bold text-zinc-400">{i + 1}</span>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs text-zinc-600 dark:text-zinc-400">{name}</span>
                                        <span className={`shrink-0 text-xs font-bold tabular-nums ${
                                          a.score_percent >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                                          a.score_percent >= 60 ? "text-amber-600 dark:text-amber-400" :
                                          "text-red-600 dark:text-red-400"
                                        }`}>{a.score_percent.toFixed(1)}%</span>
                                      </div>
                                      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                                        <div className={`h-full rounded-full transition-all duration-700 ${colour}`}
                                          style={{ width: `${a.score_percent}%` }} />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {/* SVG mini bar chart */}
                            <div className="mt-5 overflow-hidden rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/60">
                              <svg viewBox={`0 0 ${candidateAttempts.length * 40} 80`} className="w-full" preserveAspectRatio="none" style={{ height: 80 }}>
                                {candidateAttempts.map((a, i) => {
                                  const h = (a.score_percent / 100) * 72;
                                  const y = 80 - h;
                                  const colour = a.score_percent >= 80 ? "#10b981" : a.score_percent >= 60 ? "#f59e0b" : "#ef4444";
                                  return (
                                    <g key={a.attempt_id}>
                                      <rect x={i * 40 + 6} y={y} width={28} height={h} rx={4} fill={colour} opacity={0.85} />
                                      <text x={i * 40 + 20} y={76} textAnchor="middle" fontSize={9} fill="#71717a">{i + 1}</text>
                                    </g>
                                  );
                                })}
                                {/* 60% line */}
                                <line x1={0} y1={80 - 0.6 * 72} x2={candidateAttempts.length * 40} y2={80 - 0.6 * 72}
                                  stroke="#f59e0b" strokeDasharray="4 3" strokeWidth={1} opacity={0.7} />
                                {/* 80% line */}
                                <line x1={0} y1={80 - 0.8 * 72} x2={candidateAttempts.length * 40} y2={80 - 0.8 * 72}
                                  stroke="#10b981" strokeDasharray="4 3" strokeWidth={1} opacity={0.7} />
                              </svg>
                              <div className="mt-2 flex gap-4 text-xs text-zinc-400">
                                <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-emerald-500" />≥80% pass</span>
                                <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-amber-400" />≥60% pass</span>
                                <span className="flex items-center gap-1"><span className="inline-block h-1.5 w-4 rounded-full bg-red-500" />&lt;60% fail</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Per-exam detail cards */}
                        <div>
                          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Exam Breakdown</p>
                          <div className="space-y-3">
                            {candidateAttempts.map((a) => {
                              const pct = a.score_percent;
                              const passed = pct >= 60;
                              return (
                                <div key={a.attempt_id}
                                  className={`rounded-xl border p-4 ${
                                    passed ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/50 dark:bg-emerald-950/20"
                                           : "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/20"
                                  }`}>
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate font-semibold text-zinc-900 dark:text-zinc-50">
                                        {a.exam_title ?? a.exam_topics.join(", ")}
                                      </p>
                                      <p className="mt-0.5 text-xs capitalize text-zinc-500">{a.exam_complexity}{a.duration_minutes ? ` · ${a.duration_minutes} min` : ""}</p>
                                    </div>
                                    <div className="flex shrink-0 flex-col items-end">
                                      <span className={`text-lg font-black tabular-nums ${
                                        pct >= 80 ? "text-emerald-600 dark:text-emerald-400" :
                                        pct >= 60 ? "text-amber-600 dark:text-amber-400" :
                                        "text-red-600 dark:text-red-400"
                                      }`}>{pct.toFixed(1)}%</span>
                                      <span className={`text-xs font-semibold ${
                                        passed ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                                      }`}>{passed ? "PASSED" : "FAILED"}</span>
                                    </div>
                                  </div>
                                  <div className="mt-3 flex items-center gap-3">
                                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                                      <div className={`h-full rounded-full ${
                                        pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"
                                      }`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="shrink-0 text-xs text-zinc-500">{a.correct_count}/{a.total_questions} correct</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                {/* ── Page header ──────────────────────────────────────── */}
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
                        Click any row to view a full performance breakdown.
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

                {/* ── Enhanced stat cards ───────────────────────────────── */}
                {!attemptsLoading && attempts.length > 0 && (
                  <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                      { label: "Candidates", value: uniqueEmails.length, suffix: "", colour: "violet", glow: "bg-violet-500/10" },
                      { label: "Total Attempts", value: totalAttempts, suffix: "", colour: "blue", glow: "bg-blue-500/10" },
                      { label: "Avg. Score", value: avgScore.toFixed(1), suffix: "%", colour: "indigo", glow: "bg-indigo-500/10" },
                      { label: "Top Score", value: topScore.toFixed(1), suffix: "%", colour: "emerald", glow: "bg-emerald-500/10" },
                      { label: "Pass Rate", value: passRate.toFixed(0), suffix: "%", colour: "amber", glow: "bg-amber-500/10" },
                    ].map((card) => (
                      <div key={card.label} className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm dark:border-zinc-800/80 dark:bg-zinc-900/50">
                        <div className={`absolute right-0 top-0 -mt-6 -mr-6 h-24 w-24 rounded-full ${card.glow} blur-2xl transition-transform duration-700 group-hover:scale-150`} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{card.label}</p>
                        <p className="mt-2 text-4xl font-extrabold tabular-nums text-zinc-900 dark:text-zinc-50">
                          {card.value}<span className="ml-1 text-2xl font-bold text-zinc-400">{card.suffix}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Score distribution mini-chart (global) ──────────── */}
                {!attemptsLoading && attempts.length > 1 && (() => {
                  const buckets = [
                    { label: "0–20", min: 0, max: 20 },
                    { label: "21–40", min: 21, max: 40 },
                    { label: "41–60", min: 41, max: 60 },
                    { label: "61–80", min: 61, max: 80 },
                    { label: "81–100", min: 81, max: 100 },
                  ].map((b) => ({ ...b, count: attempts.filter((a) => a.score_percent >= b.min && a.score_percent <= b.max).length }));
                  const maxCount = Math.max(...buckets.map((b) => b.count), 1);
                  return (
                    <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                      <p className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Score Distribution</p>
                      <div className="flex items-end gap-2" style={{ height: 80 }}>
                        {buckets.map((b) => {
                          const h = Math.round((b.count / maxCount) * 72);
                          const colour = b.min >= 81 ? "bg-emerald-500" : b.min >= 61 ? "bg-teal-500" : b.min >= 41 ? "bg-amber-500" : b.min >= 21 ? "bg-orange-500" : "bg-red-500";
                          return (
                            <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
                              {b.count > 0 && <span className="text-xs font-bold text-zinc-500">{b.count}</span>}
                              <div className={`w-full rounded-t-md transition-all ${colour}`} style={{ height: h || 4 }} />
                              <span className="text-xs text-zinc-400">{b.label}</span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">Number of attempts per score range</p>
                    </div>
                  );
                })()}

                {/* ── Search ───────────────────────────────────────────── */}
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

                {/* ── Attempts table ─────────────────────────────────── */}
                {filtered.length > 0 && (
                  <div className="overflow-x-auto rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-700">
                    <table className="w-full min-w-[700px] text-left text-sm">
                      <thead className="border-b border-zinc-200 bg-zinc-50/80 dark:border-zinc-700 dark:bg-zinc-800/50">
                        <tr>
                          <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Candidate</th>
                          <th className="hidden px-5 py-3.5 font-semibold text-zinc-700 sm:table-cell dark:text-zinc-300">Email</th>
                          <th className="px-5 py-3.5 font-semibold text-zinc-700 dark:text-zinc-300">Exam</th>
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
                            pct >= 60 ? "text-amber-600 dark:text-amber-400" :
                            "text-red-600 dark:text-red-400";
                          const barColor =
                            pct >= 80 ? "bg-emerald-500" :
                            pct >= 60 ? "bg-amber-500" :
                            "bg-red-500";
                          const isSelected = selectedCandidateEmail === a.candidate_email;
                          return (
                            <tr key={a.attempt_id}
                              onClick={() => setSelectedCandidateEmail(a.candidate_email)}
                              className={`cursor-pointer transition ${
                                isSelected
                                  ? "bg-violet-50 dark:bg-violet-950/30"
                                  : "bg-white hover:bg-zinc-50/80 dark:bg-zinc-900 dark:hover:bg-zinc-800/60"
                              }`}>
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
                                <span className="line-clamp-1 font-medium text-zinc-800 dark:text-zinc-200">{a.exam_title ?? a.exam_topics.join(", ")}</span>
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
