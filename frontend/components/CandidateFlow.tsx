"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { MarkdownBlock } from "@/components/MarkdownBlock";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import {
  AlreadySubmittedError,
  getExamQuestions,
  listExams,
  registerCandidate,
  submitExam,
  submitExamKeepalive,
} from "@/lib/api";
import type { ExamQuestionsResponse, ExamSummary, QuestionPublic, SubmitExamResponse } from "@/lib/types";

function ResultsReview({
  result,
  bundle,
  reviewQIdx,
  setReviewQIdx,
  inviteMode,
  onAnotherExam,
  onInviteDone,
  prefaceNotice,
}: {
  result: SubmitExamResponse;
  bundle: ExamQuestionsResponse | null;
  reviewQIdx: number;
  setReviewQIdx: React.Dispatch<React.SetStateAction<number>>;
  inviteMode: boolean;
  onAnotherExam: () => void;
  onInviteDone: () => void;
  prefaceNotice?: string | null;
}) {
  const total = result.results.length;
  if (total === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-zinc-600 dark:text-zinc-400">No question results to review.</p>
      </div>
    );
  }
  const safeIdx = Math.min(Math.max(0, reviewQIdx), total - 1);
  const r = result.results[safeIdx];
  const q = bundle?.questions.find((x) => x.id === r.question_id);
  const pct = result.score_percent;
  const passed = pct >= 75;
  const gradeLabel = pct >= 90 ? "Excellent" : pct >= 75 ? "Passed" : "Below pass";

  const reviewProgressPct = total > 0 ? ((safeIdx + 1) / total) * 100 : 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      <header className="z-20 shrink-0 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3 gap-y-2">
            <div
              className={`rounded-xl px-4 py-3 text-white shadow-sm ${passed ? "bg-emerald-600" : "bg-red-600"}`}
            >
              <p className="text-xs font-medium text-white/80">{gradeLabel}</p>
              <p className="text-3xl font-black tabular-nums">{pct}%</p>
              <p className="text-xs text-white/80">
                {result.correct_count} / {result.total_questions} correct
              </p>
            </div>
            <div className="shrink-0 scale-[0.92] origin-top-right sm:scale-100">
              <ThemeSwitcher variant="compact" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${reviewProgressPct}%` }}
              />
            </div>
            <span className="shrink-0 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Q {safeIdx + 1} / {total}
            </span>
          </div>
        </div>
      </header>

      <nav
        className="md:hidden shrink-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
        aria-label="Question navigation"
      >
        <ReviewQuestionNav
          results={result.results}
          currentQIdx={safeIdx}
          onSelect={setReviewQIdx}
          variant="strip"
        />
      </nav>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden min-h-0 w-[11.5rem] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/40 md:flex lg:w-52">
          <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Questions</p>
          </div>
          <nav className="min-h-0 flex-1 overflow-y-auto px-1 py-2" aria-label="Question navigation">
            <ReviewQuestionNav
              results={result.results}
              currentQIdx={safeIdx}
              onSelect={setReviewQIdx}
              variant="sidebar"
            />
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          {prefaceNotice ? (
            <div
              className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
              role="status"
            >
              {prefaceNotice}
            </div>
          ) : null}
          <div
            className={`rounded-2xl border bg-white shadow-sm dark:bg-zinc-900 ${
              r.is_correct ? "border-emerald-200 dark:border-emerald-800" : "border-red-200 dark:border-red-900"
            }`}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Question {safeIdx + 1} of {total}
              </span>
              <span
                className={`text-sm font-bold ${r.is_correct ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {r.is_correct ? "Correct" : "Incorrect"}
              </span>
            </div>

            {q ? (
              <div className="border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Prompt</p>
                <MarkdownBlock content={q.text} className="text-base text-zinc-900 dark:text-zinc-50" />
              </div>
            ) : (
              <div className="border-b border-zinc-100 px-5 py-4 text-sm text-zinc-500 dark:border-zinc-800">
                Question ID {r.question_id}
              </div>
            )}

            <div className="space-y-4 px-5 py-5">
              {q && q.options.length > 0 ? (
                <div>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">Options</p>
                  <div className="space-y-2">
                    {q.options.map((opt, idx) => {
                      const letter = String.fromCharCode(65 + idx);
                      const isCorrectOpt = idx === r.correct_option_index;
                      const isChosen = idx === r.chosen_option_index;
                      
                      const borderCorrect = "border-emerald-500 bg-emerald-50/80 shadow-sm dark:border-emerald-500 dark:bg-emerald-950/35";
                      const borderWrongChosen = "border-red-500 bg-red-50/80 shadow-sm dark:border-red-500 dark:bg-red-950/30";
                      const borderNeutral = "border-zinc-200 bg-zinc-50/40 dark:border-zinc-700 dark:bg-zinc-800/25";

                      let rowClass = borderNeutral;
                      if (isCorrectOpt) rowClass = borderCorrect;
                      else if (isChosen && !isCorrectOpt) rowClass = borderWrongChosen;

                      return (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 rounded-xl border-2 px-4 py-3.5 transition-colors ${rowClass}`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${
                              isCorrectOpt
                                ? "bg-emerald-600 text-white"
                                : isChosen
                                  ? "bg-red-600 text-white"
                                  : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                                <MarkdownBlock content={opt} className="prose-sm" />
                              </div>
                              <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                                {isCorrectOpt && (
                                  <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    {isChosen ? "Correct — your answer" : "Correct answer"}
                                  </span>
                                )}
                                {isChosen && !isCorrectOpt && (
                                  <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                    Your answer
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-dashed border-zinc-200 p-4 dark:border-zinc-800">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Your answer</p>
                    <div className="mt-2 text-sm text-zinc-500 italic">
                      {r.chosen_option_index === -1 ? "Not answered" : r.chosen_option_text}
                    </div>
                  </div>
                  {!r.is_correct && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-500">
                        Correct answer
                      </p>
                      <MarkdownBlock content={r.correct_option_text} className="prose-sm mt-2" />
                    </div>
                  )}
                </>
              )}
              {r.explanation ? (
                <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                  <p className="text-xs font-semibold uppercase tracking-wide text-zinc-600 dark:text-zinc-400">
                    Explanation
                  </p>
                  <MarkdownBlock content={r.explanation} className="prose-sm mt-2" />
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setReviewQIdx((i) => Math.max(0, i - 1))}
              disabled={safeIdx === 0}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            {safeIdx < total - 1 ? (
              <button
                type="button"
                onClick={() => setReviewQIdx((i) => Math.min(total - 1, i + 1))}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : inviteMode ? (
              <button
                type="button"
                onClick={onInviteDone}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700"
              >
                Done
              </button>
            ) : (
              <button
                type="button"
                onClick={onAnotherExam}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-emerald-700"
              >
                Done — Another exam
              </button>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}

const STORAGE_KEY = "kognis_candidate_email";
const EXAM_SESSION_KEY = "kognis_exam_session_v1";
/** Set before keyboard reload so pagehide does not treat refresh like tab-close. */
const SKIP_UNLOAD_SUBMIT_KEY = "kognis_skip_unload_submit";

type ExamSessionSnapshotV1 = {
  v: 1;
  examId: number;
  email: string;
  fullName: string;
  choices: Record<number, number>;
  currentQIdx: number;
  /** Epoch ms when the timed exam reaches zero (used to restore remaining time after refresh). */
  timerDeadline: number | null;
};

function clearExamSession() {
  try {
    sessionStorage.removeItem(EXAM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function parseChoices(raw: unknown): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== "object") return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v)) out[Number(k)] = v;
  }
  return out;
}

type Step = "register" | "exams" | "waiting" | "guidelines" | "take" | "results";

export type CandidateFlowProps = {
  presetExamId?: number;
};

function fmtWaitTime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) {
    return `${d}d ${String(h).padStart(2, "0")}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  }
  return h > 0
    ? `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

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

function ExamQuestionNav({
  questions,
  choices,
  currentQIdx,
  onSelect,
  variant,
}: {
  questions: QuestionPublic[];
  choices: Record<number, number>;
  currentQIdx: number;
  onSelect: (index: number) => void;
  variant: "sidebar" | "strip";
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (variant !== "sidebar") return;
    btnRefs.current[currentQIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentQIdx, variant]);

  const sizeClass = variant === "sidebar" ? "h-8 w-8" : "h-7 w-7 shrink-0";

  const buttons = questions.map((q, i) => {
    const isAnswered = choices[q.id] !== undefined;
    const isCurrent = i === currentQIdx;
    return (
      <button
        key={q.id}
        type="button"
        ref={variant === "sidebar" ? (el) => { btnRefs.current[i] = el; } : undefined}
        onClick={() => onSelect(i)}
        title={`Question ${i + 1}${isAnswered ? " (answered)" : ""}`}
        className={`flex ${sizeClass} items-center justify-center rounded-lg text-xs font-bold transition-all
          ${isCurrent
            ? "scale-110 bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
            : isAnswered
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400"
          }`}
      >
        {i + 1}
      </button>
    );
  });

  if (variant === "strip") {
    return <div className="flex w-max gap-1.5">{buttons}</div>;
  }

  return <div className="grid grid-cols-5 gap-1.5">{buttons}</div>;
}

function ReviewQuestionNav({
  results,
  currentQIdx,
  onSelect,
  variant,
}: {
  results: SubmitExamResponse["results"];
  currentQIdx: number;
  onSelect: (index: number) => void;
  variant: "sidebar" | "strip";
}) {
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (variant !== "sidebar") return;
    btnRefs.current[currentQIdx]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentQIdx, variant]);

  const sizeClass = variant === "sidebar" ? "h-8 w-8" : "h-7 w-7 shrink-0";

  const buttons = results.map((res, i) => {
    const isCurrent = i === currentQIdx;
    const ok = res.is_correct;
    return (
      <button
        key={res.question_id}
        type="button"
        ref={variant === "sidebar" ? (el) => { btnRefs.current[i] = el; } : undefined}
        onClick={() => onSelect(i)}
        title={`Question ${i + 1}${ok ? " (correct)" : " (incorrect)"}`}
        className={`flex ${sizeClass} items-center justify-center rounded-lg text-xs font-bold transition-all ${
          isCurrent
            ? "scale-110 bg-emerald-600 text-white shadow-md shadow-emerald-500/30"
            : ok
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
        }`}
      >
        {i + 1}
      </button>
    );
  });

  if (variant === "strip") {
    return <div className="flex w-max gap-1.5">{buttons}</div>;
  }

  return <div className="grid grid-cols-5 gap-1.5">{buttons}</div>;
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
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [sessionRestoring, setSessionRestoring] = useState(false);

  // Current question index for one-at-a-time navigation
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [reviewQIdx, setReviewQIdx] = useState(0);
  /** Shown above results when user hits already-submitted on load (vs fresh submit). */
  const [resultsPrefaceNotice, setResultsPrefaceNotice] = useState<string | null>(null);

  // ─── Timer ────────────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);
  /** Latest exam state for unload handlers (refs avoid stale closures on pagehide). */
  const takeExamRef = useRef<{
    step: Step;
    bundle: ExamQuestionsResponse | null;
    choices: Record<number, number>;
    email: string;
  }>({
    step: "register",
    bundle: null,
    choices: {},
    email: "",
  });
  /** Prevents double submit between visibility timer and pagehide beacon. */
  const leaveSubmitSentRef = useRef(false);

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

  useEffect(() => {
    takeExamRef.current = {
      step,
      bundle,
      choices,
      email: email.trim().toLowerCase(),
    };
  }, [step, bundle, choices, email]);

  useEffect(() => {
    leaveSubmitSentRef.current = false;
  }, [bundle?.exam.id]);

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

  const applyAlreadySubmitted = useCallback((e: AlreadySubmittedError) => {
    clearExamSession();
    setResult(e.result);
    setBundle(e.bundle);
    setSelectedExam({
      id: e.bundle.exam.id,
      title: e.bundle.exam.title,
      topics: e.bundle.exam.topics,
      complexity: e.bundle.exam.complexity,
      total_questions: e.bundle.exam.total_questions,
      duration_minutes: e.bundle.exam.duration_minutes,
      scheduled_for: e.bundle.exam.scheduled_for,
      created_at: e.bundle.exam.created_at,
    });
    setReviewQIdx(0);
    setResultsPrefaceNotice(
      "You have already submitted this exam. Your score and answers are shown below. If you need a retake, contact your administrator.",
    );
    setStep("results");
    setError(null);
  }, []);

  const loadExam = useCallback(async (examId: number, emailVal: string) => {
    setLoading(true); setError(null);
    try {
      const data = await getExamQuestions(examId, emailVal.trim().toLowerCase());
      setResultsPrefaceNotice(null);
      setBundle(data);
      setSelectedExam({ id: data.exam.id, title: data.exam.title, topics: data.exam.topics, complexity: data.exam.complexity, total_questions: data.exam.total_questions, duration_minutes: data.exam.duration_minutes, scheduled_for: data.exam.scheduled_for, created_at: data.exam.created_at });
      
      const isFuture = data.exam.scheduled_for && new Date(data.exam.scheduled_for).getTime() > Date.now();
      if (isFuture) {
        setStep("waiting");
      } else {
        setStep("guidelines");
      }
    } catch (e) {
      if (e instanceof AlreadySubmittedError) {
        applyAlreadySubmitted(e);
        return;
      }
      setError(e instanceof Error ? e.message : "Could not load questions");
      setSelectedExam(null); setBundle(null);
    } finally { setLoading(false); }
  }, [applyAlreadySubmitted]);

  const startExam = useCallback(() => {
    setChoices({});
    setCurrentQIdx(0);
    setStep("take");
    if (bundle?.exam.duration_minutes) startTimer(bundle.exam.duration_minutes * 60);
  }, [bundle, startTimer]);

  // ─── Restore in-progress exam after refresh (same tab / sessionStorage) ──
  useLayoutEffect(() => {
    let cancelled = false;
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(EXAM_SESSION_KEY);
    } catch {
      raw = null;
    }
    if (!raw) return;

    setSessionRestoring(true);

    void (async () => {
      try {
        const snap = JSON.parse(raw) as ExamSessionSnapshotV1;
        if (snap.v !== 1 || typeof snap.examId !== "number") {
          clearExamSession();
          return;
        }
        const emailNorm = (snap.email || "").trim().toLowerCase();
        if (!emailNorm) {
          clearExamSession();
          return;
        }

        let data: ExamQuestionsResponse;
        try {
          data = await getExamQuestions(snap.examId, emailNorm);
        } catch (err) {
          if (err instanceof AlreadySubmittedError) {
            if (!cancelled) applyAlreadySubmitted(err);
            return;
          }
          throw err;
        }
        if (cancelled) return;

        const choicesParsed = parseChoices(snap.choices);
        const maxIdx = Math.max(0, data.questions.length - 1);
        const qIdx = Math.min(Math.max(0, snap.currentQIdx ?? 0), maxIdx);

        setEmail(emailNorm);
        try {
          localStorage.setItem(STORAGE_KEY, emailNorm);
        } catch {
          /* ignore */
        }
        setFullName(typeof snap.fullName === "string" ? snap.fullName : "");
        setBundle(data);
        setSelectedExam({
          id: data.exam.id,
          title: data.exam.title,
          topics: data.exam.topics,
          complexity: data.exam.complexity,
          total_questions: data.exam.total_questions,
          duration_minutes: data.exam.duration_minutes,
          scheduled_for: data.exam.scheduled_for,
          created_at: data.exam.created_at,
        });
        setChoices(choicesParsed);
        setCurrentQIdx(qIdx);

        const durationSec = data.exam.duration_minutes ? data.exam.duration_minutes * 60 : null;

        if (durationSec != null && durationSec > 0 && snap.timerDeadline != null) {
          const rem = Math.floor((snap.timerDeadline - Date.now()) / 1000);
          if (rem <= 0) {
            stopTimer();
            setLoading(true);
            setError(null);
            try {
              const answers = data.questions.map((q) => ({
                question_id: q.id,
                chosen_option_index: choicesParsed[q.id] ?? -1,
              }));
              const res = await submitExam(data.exam.id, emailNorm, answers);
              if (cancelled) return;
              clearExamSession();
              setResult(res);
              setReviewQIdx(0);
              setStep("results");
            } catch (err) {
              clearExamSession();
              setError(err instanceof Error ? err.message : "Submit failed");
              setBundle(null);
              setSelectedExam(null);
              setStep("register");
            } finally {
              setLoading(false);
            }
            return;
          }
          startTimer(rem);
        } else {
          stopTimer();
          setTimeLeft(null);
        }

        setStep("take");
      } catch {
        clearExamSession();
      } finally {
        if (!cancelled) setSessionRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; applyAlreadySubmitted/startTimer/stopTimer are stable
  }, []);

  // ─── Persist exam session while taking (survives refresh in this tab) ────
  useEffect(() => {
    if (sessionRestoring) return;
    if (step !== "take" || !bundle) {
      if (step !== "take") clearExamSession();
      return;
    }
    const deadline =
      timeLeft !== null && bundle.exam.duration_minutes
        ? Date.now() + timeLeft * 1000
        : null;
    const snap: ExamSessionSnapshotV1 = {
      v: 1,
      examId: bundle.exam.id,
      email: email.trim().toLowerCase(),
      fullName,
      choices,
      currentQIdx,
      timerDeadline: deadline,
    };
    try {
      sessionStorage.setItem(EXAM_SESSION_KEY, JSON.stringify(snap));
    } catch {
      /* quota / private mode */
    }
  }, [sessionRestoring, step, bundle, choices, currentQIdx, timeLeft, email, fullName]);

  // ─── Anti-cheat: switch away from tab (delayed so F5 refresh can cancel timer) ─
  useEffect(() => {
    if (step !== "take") return;

    let leaveTimer: ReturnType<typeof setTimeout> | null = null;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        leaveTimer = setTimeout(() => {
          if (document.hidden && !leaveSubmitSentRef.current) {
            setError("Exam automatically submitted: You changed tabs or left the exam window.");
            leaveSubmitSentRef.current = true;
            autoSubmitRef.current?.();
          }
        }, 450);
      } else if (leaveTimer) {
        clearTimeout(leaveTimer);
        leaveTimer = null;
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (leaveTimer) clearTimeout(leaveTimer);
    };
  }, [step]);

  // ─── Tab/window close: submit with keepalive (DB only records attempts on submit) ─
  useEffect(() => {
    if (step !== "take") return;

    const markRefresh = (e: KeyboardEvent) => {
      const isRefresh =
        e.key === "F5" ||
        ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      if (isRefresh) {
        try {
          sessionStorage.setItem(SKIP_UNLOAD_SUBMIT_KEY, "1");
        } catch {
          /* ignore */
        }
      }
    };

    const onPageHide = (e: PageTransitionEvent) => {
      if (e.persisted) return;
      const snap = takeExamRef.current;
      if (snap.step !== "take" || !snap.bundle) return;
      try {
        if (sessionStorage.getItem(SKIP_UNLOAD_SUBMIT_KEY)) {
          sessionStorage.removeItem(SKIP_UNLOAD_SUBMIT_KEY);
          return;
        }
      } catch {
        /* ignore */
      }
      if (leaveSubmitSentRef.current) return;
      leaveSubmitSentRef.current = true;
      const answers = snap.bundle.questions.map((q) => ({
        question_id: q.id,
        chosen_option_index: snap.choices[q.id] ?? -1,
      }));
      submitExamKeepalive(snap.bundle.exam.id, snap.email, answers);
      clearExamSession();
    };

    window.addEventListener("keydown", markRefresh, true);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("keydown", markRefresh, true);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [step]);

  // ─── Submit ───────────────────────────────────────────────────────────────
  const doSubmit = useCallback(async (currentChoices: Record<number, number>, currentBundle: ExamQuestionsResponse) => {
    leaveSubmitSentRef.current = true;
    stopTimer(); setLoading(true); setError(null);
    try {
      const answers = currentBundle.questions.map((q) => ({
        question_id: q.id,
        chosen_option_index: currentChoices[q.id] ?? -1,
      }));
      const res = await submitExam(currentBundle.exam.id, email.trim().toLowerCase(), answers);
      clearExamSession();
      setResultsPrefaceNotice(null);
      setResult(res); setReviewQIdx(0); setStep("results");
    } catch (err) {
      leaveSubmitSentRef.current = false;
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

  const requestSubmitExam = useCallback(() => {
    if (!bundle) return;
    const unanswered = bundle.questions.filter((q) => choices[q.id] === undefined);
    if (unanswered.length > 0) {
      setSubmitModalOpen(true);
    } else {
      void doSubmit(choices, bundle);
    }
  }, [bundle, choices, doSubmit]);

  const confirmSubmitExam = useCallback(() => {
    setSubmitModalOpen(false);
    if (!bundle) return;
    void doSubmit(choices, bundle);
  }, [bundle, choices, doSubmit]);

  useEffect(() => {
    if (!submitModalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSubmitModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [submitModalOpen]);

  useEffect(() => {
    if (step !== "take") setSubmitModalOpen(false);
  }, [step]);

  const inviteMode = presetExamId != null;
  const examDisplayName = (exam: ExamSummary) => exam.title ?? exam.topics.join(", ");

  // ─── Derived exam progress ─────────────────────────────────────────────────
  const totalQ = bundle?.questions.length ?? 0;
  const answeredCount = Object.keys(choices).length;
  const progressPct = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;
  const currentQ = bundle?.questions[currentQIdx];

  if (sessionRestoring) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
        <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Restoring your exam…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-zinc-50 via-white to-zinc-100 dark:from-zinc-950 dark:via-zinc-900 dark:to-black">
      {/* Theme toggle: fixed only on pre-exam steps (in-exam uses header row to avoid overlapping timer) */}
      {(step === "register" ||
        step === "exams" ||
        step === "guidelines" ||
        step === "waiting") && (
        <div className="fixed right-3 top-3 z-50 sm:right-4 sm:top-4">
          <ThemeSwitcher variant="compact" />
        </div>
      )}

      {/* ── EXAM MODE: full-screen layout ── */}
      {step === "take" && bundle && currentQ ? (
        <div className="flex h-screen flex-col overflow-hidden">

          {/* ── Sticky header bar (no question grid — nav is sidebar / mobile strip) ── */}
          <header className="z-20 shrink-0 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
            <div className="flex flex-col gap-3 px-4 py-3 sm:px-6">

              {/* Row 1: Exam name + timer */}
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {examDisplayName(bundle.exam)}
                  </p>
                  <p className="text-xs text-zinc-400 capitalize dark:text-zinc-500">
                    {bundle.exam.complexity}
                    {bundle.exam.duration_minutes ? ` · ${bundle.exam.duration_minutes} min` : ""}
                  </p>
                </div>

                <div className="flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <div className="shrink-0 scale-[0.92] origin-right sm:scale-100">
                    <ThemeSwitcher variant="compact" />
                  </div>
                  {/* Answered counter */}
                  <div className="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold dark:border-zinc-700 dark:bg-zinc-900 sm:flex">
                    <span className="text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
                    <span className="text-zinc-400">/</span>
                    <span className="text-zinc-600 dark:text-zinc-300">{totalQ} answered</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => void requestSubmitExam()}
                    disabled={loading}
                    className="shrink-0 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Submit exam
                  </button>

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
            </div>
          </header>

          {/* Mobile: horizontal scroll strip for question numbers */}
          <nav
            className="md:hidden shrink-0 overflow-x-auto border-b border-zinc-200 bg-zinc-50/80 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/50"
            aria-label="Question navigation"
          >
            <ExamQuestionNav
              questions={bundle.questions}
              choices={choices}
              currentQIdx={currentQIdx}
              onSelect={setCurrentQIdx}
              variant="strip"
            />
          </nav>

          <div className="flex min-h-0 flex-1">
            {/* Desktop: left sidebar with scrollable question grid */}
            <aside className="hidden min-h-0 w-[11.5rem] shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/40 md:flex lg:w-52">
              <div className="shrink-0 border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Questions</p>
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto px-1 py-2" aria-label="Question navigation">
                <ExamQuestionNav
                  questions={bundle.questions}
                  choices={choices}
                  currentQIdx={currentQIdx}
                  onSelect={setCurrentQIdx}
                  variant="sidebar"
                />
              </nav>
            </aside>

            {/* ── Scrollable question area ────────────────────────────────── */}
            <main className="min-w-0 flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">

              {error && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200" role="alert">
                  <p>{error}</p>
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
                  <MarkdownBlock content={currentQ.text} className="text-base text-zinc-900 dark:text-zinc-50" />
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
                            : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 hover:bg-zinc-100/70 dark:border-zinc-700 dark:bg-zinc-800/30 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/50"
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
                        <div className="min-w-0 flex-1 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                          <MarkdownBlock content={opt} className="prose-sm" />
                        </div>
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
                    onClick={() => void requestSubmitExam()}
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

          {submitModalOpen && bundle && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
              role="presentation"
              onClick={() => !loading && setSubmitModalOpen(false)}
            >
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="submit-exam-title"
                className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 id="submit-exam-title" className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Submit exam?
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {answeredCount === 0 ? (
                    <>
                      You have not answered any questions. If you submit now, every question will be marked as unanswered and your score will reflect that.
                    </>
                  ) : (
                    <>
                      You have{" "}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {totalQ - answeredCount} unanswered question{totalQ - answeredCount !== 1 ? "s" : ""}
                      </span>
                      . Are you sure you want to submit? You will not be able to change your answers afterward.
                    </>
                  )}
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setSubmitModalOpen(false)}
                    disabled={loading}
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  >
                    Keep working
                  </button>
                  <button
                    type="button"
                    onClick={() => void confirmSubmitExam()}
                    disabled={loading}
                    className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {loading ? "Submitting…" : "Submit exam"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

      ) : step === "results" && result ? (
        <ResultsReview
          result={result}
          bundle={bundle}
          reviewQIdx={reviewQIdx}
          setReviewQIdx={setReviewQIdx}
          inviteMode={inviteMode}
          prefaceNotice={resultsPrefaceNotice}
          onAnotherExam={() => {
            stopTimer();
            setResultsPrefaceNotice(null);
            setStep("exams");
            setBundle(null);
            setResult(null);
            setChoices({});
            void goExams();
          }}
          onInviteDone={() => {
            stopTimer();
            setResultsPrefaceNotice(null);
            setStep("register");
            setSelectedExam(null);
            setBundle(null);
            setResult(null);
            setChoices({});
            setError(null);
            setTimeLeft(null);
            setReviewQIdx(0);
            setCurrentQIdx(0);
          }}
        />
      ) : (
        /* ── NON‑EXAM STEPS: centred layout ─────────────────────────────── */
        <div className="px-4 py-10">
          <div className="mx-auto max-w-2xl">

            {/* Top bar */}
            {step !== "register" && (
              <div className="mb-8 flex justify-end">
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
              </div>
            )}

            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Your exam</h1>
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

            {/* ── Guidelines ── */}
            {step === "guidelines" && selectedExam && (
              <div className="mx-auto mt-12 max-w-2xl px-6">
                <div className="mb-6 flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Exam Guidelines</h2>
                    <p className="text-zinc-500 dark:text-zinc-400">{selectedExam.title ?? selectedExam.topics.join(", ")}</p>
                  </div>
                </div>

                <div className="space-y-4 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <p className="text-zinc-700 dark:text-zinc-300">
                      <strong>Passing Criteria:</strong> You must score at least <strong>75%</strong> to pass this assessment.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-amber-500">•</span>
                    <p className="text-zinc-700 dark:text-zinc-300">
                      <strong>Time Limit:</strong> You have {selectedExam.duration_minutes ? `${selectedExam.duration_minutes} minutes` : "unlimited time"} to complete {selectedExam.total_questions} questions.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-red-500">•</span>
                    <p className="text-zinc-700 dark:text-zinc-300">
                      <strong>Anti-Cheat Active:</strong> Switching to another tab submits the exam after a short delay. <strong>Closing the tab</strong> submits immediately so your attempt is saved. Use the keyboard (<kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">F5</kbd> or <kbd className="rounded border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:border-zinc-600 dark:bg-zinc-800">Ctrl/Cmd+R</kbd>) to refresh in the same tab without closing—your progress is restored from this tab’s session.
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex justify-end">
                  <button onClick={startExam} className="rounded-xl bg-emerald-600 px-8 py-3.5 font-bold text-white shadow-md shadow-emerald-600/20 transition-all hover:bg-emerald-500 hover:-translate-y-0.5 focus:ring-4 focus:ring-emerald-500/30">
                    I understand, Start Exam
                  </button>
                </div>
              </div>
            )}

            {/* ── Waiting Room ── */}
            {step === "waiting" && selectedExam && (
              <WaitingRoom
                exam={selectedExam}
                onEnter={() => void loadExam(selectedExam.id, email)}
              />
            )}

          </div>
        </div>
      )}
    </div>
  );
}

function WaitingRoom({ exam, onEnter }: { exam: ExamSummary, onEnter: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    if (!exam.scheduled_for) return;
    const target = new Date(exam.scheduled_for).getTime();
    
    const update = () => {
      const diff = Math.floor((target - Date.now()) / 1000);
      if (diff <= 0) {
        setTimeLeft(0);
        onEnter();
      } else {
        setTimeLeft(diff);
      }
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [exam.scheduled_for, onEnter]);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center mt-8 space-y-6">
      <div className="flex justify-center">
        <div className="rounded-full bg-amber-100 p-4 dark:bg-amber-900/40">
          <ClockIcon className="h-8 w-8 text-amber-600 dark:text-amber-400" />
        </div>
      </div>
      <div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Exam begins soon</h2>
        <p className="text-zinc-500 dark:text-zinc-400">{exam.title ?? exam.topics.join(", ")}</p>
      </div>
      
      <div className="mx-auto mt-6 rounded-3xl border border-zinc-200 bg-white px-10 py-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 inline-block">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-400">Starting in</p>
        <p className="font-mono text-4xl sm:text-5xl font-black tabular-nums text-amber-500 drop-shadow-sm transition-all dark:text-amber-400">
          {fmtWaitTime(timeLeft)}
        </p>
      </div>
      <p className="mx-auto mt-8 max-w-md text-sm leading-relaxed text-zinc-400">
        Please do not refresh this page. You will be automatically redirected into the exam room the moment the countdown hits zero.
      </p>
    </div>
  );
}
