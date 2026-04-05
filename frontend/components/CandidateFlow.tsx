"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getExamQuestions,
  listExams,
  registerCandidate,
  submitExam,
} from "@/lib/api";
import type { ExamQuestionsResponse, ExamSummary, SubmitExamResponse } from "@/lib/types";

const STORAGE_KEY = "kognis_candidate_email";

type Step = "register" | "exams" | "take" | "results";

export type CandidateFlowProps = {
  presetExamId?: number;
};

/** Format seconds as MM:SS */
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Clock icon inline SVG */
function ClockIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ChevronLeft({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ChevronRight({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export function CandidateFlow({ presetExamId }: CandidateFlowProps) {
  const [step, setStep] = useState<Step>("register");
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [selectedExam, setSelectedExam] = useState<ExamSummary | null>(null);
  const [bundle, setBundle] = useState<ExamQuestionsResponse | null>(null);
  const [choices, setChoices] = useState<Record<number, number>>({});
  const [result, setResult] = useState<SubmitExamResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Current question index for one-at-a-time navigation
  const [currentQIdx, setCurrentQIdx] = useState(0);

  // ─── Timer ────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const startTimer = useCallback((seconds: number) => {
    stopTimer();
    setTimeLeft(seconds);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          stopTimer();
          autoSubmitRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  // Timer urgency colours
  const timerRatio = (timeLeft !== null && bundle?.exam.duration_minutes)
    ? timeLeft / (bundle.exam.duration_minutes * 60)
    : null;

  const timerUrgency =
    timerRatio === null ? "normal"
    : timerRatio < 0.1 ? "critical"
    : timerRatio < 0.2 ? "warning"
    : "normal";

  const timerBg =
    timerUrgency === "critical" ? "bg-red-500 text-white animate-pulse border-red-500"
    : timerUrgency === "warning" ? "bg-amber-100 text-amber-900 border-amber-400 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-600"
    : "bg-white text-zinc-800 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:border-zinc-700";

  // ─── Restore email ────────────────────────────────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) setEmail(s); } catch { /* */ }
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const goExams = useCallback(async () => {
    setLoading(true); setError(null);
    try { setExams(await listExams()); setStep("exams"); }
    catch (e) { setError(e instanceof Error ? e.message : "Failed to load exams"); }
    finally { setLoading(false); }
  }, []);

  const loadExam = useCallback(async (examId: number, emailVal: string) => {
    setLoading(true); setError(null);
    try {
      const data = await getExamQuestions(examId, emailVal.trim().toLowerCase());
      setBundle(data);
      setSelectedExam({ id: data.exam.id, title: data.exam.title, topics: data.exam.topics, complexity: data.exam.complexity, total_questions: data.exam.total_questions, duration_minutes: data.exam.duration_minutes });
      setChoices({});
      setCurrentQIdx(0);
      setStep("take");
      if (data.exam.duration_minutes) startTimer(data.exam.duration_minutes * 60);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions");
      setSelectedExam(null); setBundle(null);
    } finally { setLoading(false); }
  }, [startTimer]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const doSubmit = useCallback(async (currentChoices: Record<number, number>, currentBundle: ExamQuestionsResponse) => {
    stopTimer(); setLoading(true); setError(null);
    try {
      const answers = currentBundle.questions.map((q) => ({
        question_id: q.id,
        chosen_option_index: currentChoices[q.id] ?? 0,
      }));
      const res = await submitExam(currentBundle.exam.id, email.trim().toLowerCase(), answers);
      setResult(res); setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed");
    } finally { setLoading(false); }
  }, [email, stopTimer]);

  useEffect(() => {
    if (bundle) autoSubmitRef.current = () => void doSubmit(choices, bundle);
  }, [choices, bundle, doSubmit]);

  // ─── Register ─────────────────────────────────────────────────────────────
  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError(null);
    const emailNorm = email.trim().toLowerCase();
    try { await registerCandidate(email, fullName); }
    catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const already = msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("409");
      if (!already) { setError(msg || "Registration failed"); setLoading(false); return; }
      if (presetExamId == null) { setError(msg); setLoading(false); return; }
    }
    try { localStorage.setItem(STORAGE_KEY, emailNorm); } catch { /* */ }
    if (presetExamId != null) { await loadExam(presetExamId, emailNorm); }
    else { await goExams(); }
    setLoading(false);
  };

  const onSubmitExam = async () => {
    if (!bundle) return;
    const unanswered = bundle.questions.filter((q) => choices[q.id] === undefined);
    if (unanswered.length > 0) {
      setError(`${unanswered.length} question${unanswered.length > 1 ? "s" : ""} unanswered. Navigate using the dots above to answer them.`);
      return;
    }
    setError(null);
    await doSubmit(choices, bundle);
  };

  const inviteMode = presetExamId != null;
  const examDisplayName = (exam: ExamSummary) => exam.title ?? exam.topics.join(", ");

  // ─── Derived exam progress ─────────────────────────────────────────────────
  const totalQ = bundle?.questions.length ?? 0;
  const answeredCount = Object.keys(choices).length;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
  const currentQ = bundle?.questions[currentQIdx];

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">

      {/* ── EXAM MODE: full-screen layout ── */}
      {step === "take" && bundle && currentQ ? (
        <div className="flex h-screen flex-col overflow-hidden">

          {/* ── Sticky header bar ─────────────────────────────────────────── */}
          <header className="z-20 shrink-0 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6">

              {/* Row 1: Exam name + timer */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {examDisplayName(bundle.exam)}
                  </p>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 capitalize">
                    {bundle.exam.complexity}
                    {bundle.exam.duration_minutes ? ` · ${bundle.exam.duration_minutes} min` : ""}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  {/* Answered counter */}
                  <div className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-900 sm:flex">
                    <span className="text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
                    <span className="text-zinc-400">/</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{totalQ} answered</span>
                  </div>

                  {/* Timer */}
                  {timeLeft !== null && (
                    <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold tabular-nums transition-colors ${timerBg}`}
                      aria-live="polite" aria-label={`Time remaining: ${fmtTime(timeLeft)}`}>
                      <ClockIcon className="h-3.5 w-3.5 shrink-0" />
                      {fmtTime(timeLeft)}
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: Progress bar + question count */}
              <div className="flex items-center gap-3">
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Q {currentQIdx + 1} / {totalQ}
                </span>
              </div>

              {/* Row 3: Question dot navigator */}
              <div className="flex flex-wrap gap-1.5">
                {bundle.questions.map((q, i) => {
                  const isAnswered = choices[q.id] !== undefined;
                  const isCurrent = i === currentQIdx;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQIdx(i)}
                      title={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all
                        ${isCurrent
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/30 scale-110"
                          : isAnswered
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
                            : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
                        }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          </header>

          {/* ── Scrollable question area ────────────────────────────────── */}
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

              {error && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
                  {error}
                </div>
              )}

              {/* Question card */}
              <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                {/* Question header */}
                <div className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {currentQIdx + 1}
                  </span>
                  <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Question {currentQIdx + 1} of {totalQ}
                    {choices[currentQ.id] !== undefined
                      ? <span className="ml-2 text-emerald-600 dark:text-emerald-400">✓ Answered</span>
                      : <span className="ml-2 text-zinc-400">Not answered yet</span>
                    }
                  </span>
                </div>

                {/* Question text */}
                <div className="px-6 py-5">
                  <p className="text-lg leading-relaxed text-zinc-900 dark:text-zinc-50">
                    {currentQ.text}
                  </p>
                </div>

                {/* Options */}
                <div className="space-y-2 px-6 pb-6">
                  {currentQ.options.map((opt, idx) => {
                    const isSelected = choices[currentQ.id] === idx;
                    const letter = String.fromCharCode(65 + idx); // A, B, C, D
                    return (
                      <label
                        key={idx}
                        className={`flex cursor-pointer items-start gap-4 rounded-xl border-2 px-4 py-3.5 transition-all
                          ${isSelected
                            ? "border-emerald-500 bg-emerald-50 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/30"
                            : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-zinc-600"
                          }`}
                      >
                        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold transition-colors
                          ${isSelected
                            ? "bg-emerald-600 text-white"
                            : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                          }`}>
                          {letter}
                        </span>
                        <input
                          type="radio"
                          name={`q-${currentQ.id}`}
                          className="sr-only"
                          checked={isSelected}
                          onChange={() => {
                            setChoices((c) => ({ ...c, [currentQ.id]: idx }));
                            setError(null);
                          }}
                        />
                        <span className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                          {opt}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Navigation row ────────────────────────────────────────── */}
              <div className="mt-6 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentQIdx((i) => Math.max(0, i - 1))}
                  disabled={currentQIdx === 0}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-zinc-600"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                {/* Centre: unanswered badge */}
                <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium dark:bg-zinc-800">
                    {totalQ - answeredCount} unanswered
                  </span>
                </div>

                {currentQIdx < totalQ - 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentQIdx((i) => Math.min(totalQ - 1, i + 1))}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void onSubmitExam()}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? "Submitting…" : answeredCount < totalQ ? `Submit (${totalQ - answeredCount} unanswered)` : "Submit Exam"}
                    {!loading && <ChevronRight className="h-4 w-4" />}
                  </button>
                )}
              </div>
            </div>
          </main>
        </div>

      ) : (
        /* ── NON‑EXAM STEPS: centred layout ─────────────────────────────── */
        <div className="px-4 py-10">
          <div className="mx-auto max-w-2xl">

            {/* Top bar */}
            <div className="mb-8 flex items-center justify-between">
              <Link href="/" className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                ← Home
              </Link>
              {step !== "register" && (
                <button
                  type="button"
                  onClick={() => {
                    stopTimer(); setStep("register"); setBundle(null);
                    setSelectedExam(null); setResult(null); setError(null); setTimeLeft(null);
                  }}
                  className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                >
                  Reset
                </button>
              )}
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              {step === "results" ? "Exam Results" : "Candidate Portal"}
            </h1>
            <p className="mt-1 text-zinc-500 dark:text-zinc-400">
              {step === "register"
                ? inviteMode ? "You were invited to an exam. Register to begin." : "Register once per email, then choose an exam."
                : step === "exams" ? "Choose an exam to begin."
                : ""}
            </p>

            {error && (
              <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200" role="alert">
                {error}
              </div>
            )}

            {/* ── Register ── */}
            {step === "register" && (
              <form onSubmit={onRegister} className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Work email</label>
                  <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50" />
                </div>
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Full name</label>
                  <input id="name" type="text" required autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? "Working…" : inviteMode ? "Register & start exam" : "Register & continue"}
                </button>
              </form>
            )}

            {/* ── Exam List ── */}
            {step === "exams" && (
              <div className="mt-8 space-y-3">
                {exams.length === 0 ? (
                  <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                    No exams available yet.
                  </p>
                ) : exams.map((exam) => (
                  <button key={exam.id} type="button" disabled={loading}
                    onClick={() => void loadExam(exam.id, email)}
                    className="group flex w-full items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow-md disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600">
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-50">{examDisplayName(exam)}</p>
                      <p className="mt-0.5 text-sm text-zinc-500">
                        {exam.complexity} · {exam.total_questions} questions
                        {exam.duration_minutes ? ` · ${exam.duration_minutes} min` : " · No time limit"}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-300 transition group-hover:text-emerald-500 dark:text-zinc-600" />
                  </button>
                ))}
              </div>
            )}

            {/* ── Results ── */}
            {step === "results" && result && (() => {
              const pct = result.score_percent;
              const grade = pct >= 80 ? { label: "Excellent", colour: "emerald" } : pct >= 60 ? { label: "Good", colour: "amber" } : { label: "Needs work", colour: "red" };
              return (
                <div className="mt-8 space-y-6">
                  {/* Score card */}
                  <div className={`relative overflow-hidden rounded-2xl p-6 ${pct >= 80 ? "bg-emerald-600" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}>
                    <div className="absolute right-0 top-0 -mr-10 -mt-10 h-40 w-40 rounded-full bg-white/10" />
                    <p className="text-sm font-semibold text-white/80">{grade.label}</p>
                    <p className="mt-1 text-6xl font-black tabular-nums text-white">{pct}%</p>
                    <p className="mt-2 text-sm text-white/75">
                      {result.correct_count} correct out of {result.total_questions} questions
                    </p>
                  </div>

                  {/* Review */}
                  <div>
                    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Answer Review</h2>
                    <div className="space-y-2">
                      {result.results.map((r, i) => (
                        <div key={r.question_id}
                          className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm ${r.is_correct ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/30" : "border-red-200 bg-red-50/60 dark:border-red-900/50 dark:bg-red-950/30"}`}>
                          <span className="font-medium text-zinc-800 dark:text-zinc-200">
                            Q{i + 1} {r.is_correct ? "✓" : "✗"}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400">
                            You: <strong>{String.fromCharCode(65 + r.chosen_option_index)}</strong>
                            {!r.is_correct && <> · Correct: <strong className="text-emerald-600 dark:text-emerald-400">{String.fromCharCode(65 + r.correct_option_index)}</strong></>}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {inviteMode ? (
                    <Link href="/" className="inline-block text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">← Back to home</Link>
                  ) : (
                    <button type="button" onClick={() => { setStep("exams"); setBundle(null); setResult(null); setChoices({}); void goExams(); }}
                      className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                      ← Take another exam
                    </button>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
