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
  /** When set, skip the exam list and open this exam after registration (invite link). */
  presetExamId?: number;
};

/** Format seconds as MM:SS */
function fmtTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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

  // ─── Timer state ──────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef<(() => void) | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(
    (seconds: number) => {
      stopTimer();
      setTimeLeft(seconds);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev === null || prev <= 1) {
            stopTimer();
            // Auto-submit when hitting zero
            autoSubmitRef.current?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [stopTimer],
  );

  // Cleanup on unmount
  useEffect(() => () => stopTimer(), [stopTimer]);

  // ─── Derived timer colours ─────────────────────────────────────────────────
  const timerColour =
    timeLeft === null
      ? ""
      : bundle?.exam.duration_minutes
        ? timeLeft / (bundle.exam.duration_minutes * 60) < 0.1
          ? "text-red-600 dark:text-red-400 animate-pulse"
          : timeLeft / (bundle.exam.duration_minutes * 60) < 0.2
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-700 dark:text-zinc-200"
        : "";

  // ─── Restore email ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setEmail(saved);
    } catch {
      /* ignore */
    }
  }, []);

  // ─── Navigate helpers ─────────────────────────────────────────────────────
  const goExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listExams();
      setExams(list);
      setStep("exams");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  }, []);

  const startExamById = useCallback(
    async (examId: number) => {
      setLoading(true);
      setError(null);
      try {
        const data = await getExamQuestions(examId, email.trim().toLowerCase());
        setBundle(data);
        setSelectedExam({
          id: data.exam.id,
          title: data.exam.title,
          topics: data.exam.topics,
          complexity: data.exam.complexity,
          total_questions: data.exam.total_questions,
          duration_minutes: data.exam.duration_minutes,
        });
        setChoices({});
        setStep("take");
        if (data.exam.duration_minutes) {
          startTimer(data.exam.duration_minutes * 60);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load questions");
        setSelectedExam(null);
        setBundle(null);
      } finally {
        setLoading(false);
      }
    },
    [email, startTimer],
  );

  const startExam = async (exam: ExamSummary) => {
    setLoading(true);
    setError(null);
    setSelectedExam(exam);
    try {
      const data = await getExamQuestions(exam.id, email.trim().toLowerCase());
      setBundle(data);
      setChoices({});
      setStep("take");
      if (data.exam.duration_minutes) {
        startTimer(data.exam.duration_minutes * 60);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load questions");
      setSelectedExam(null);
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit helpers ───────────────────────────────────────────────────────
  const doSubmit = useCallback(
    async (currentChoices: Record<number, number>, currentBundle: ExamQuestionsResponse) => {
      stopTimer();
      setLoading(true);
      setError(null);
      try {
        const ids = currentBundle.questions.map((q) => q.id);
        const answers = ids.map((question_id) => ({
          question_id,
          chosen_option_index: currentChoices[question_id] ?? 0,
        }));
        const res = await submitExam(
          currentBundle.exam.id,
          email.trim().toLowerCase(),
          answers,
        );
        setResult(res);
        setStep("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed");
      } finally {
        setLoading(false);
      }
    },
    [email, stopTimer],
  );

  // Keep autoSubmitRef up-to-date with the latest choices + bundle for timer callback
  useEffect(() => {
    if (bundle) {
      autoSubmitRef.current = () => void doSubmit(choices, bundle);
    }
  }, [choices, bundle, doSubmit]);

  const onRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const emailNorm = email.trim().toLowerCase();

    try {
      await registerCandidate(email, fullName);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      const already =
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("409");
      if (!already) {
        setError(msg || "Registration failed");
        setLoading(false);
        return;
      }
      if (presetExamId == null) {
        setError(msg);
        setLoading(false);
        return;
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, emailNorm);
    } catch {
      /* ignore */
    }

    if (presetExamId != null) {
      await startExamById(presetExamId);
    } else {
      await goExams();
    }
    setLoading(false);
  };

  const onSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bundle) return;
    const ids = bundle.questions.map((q) => q.id);
    for (const id of ids) {
      if (choices[id] === undefined) {
        setError("Answer every question before submitting.");
        return;
      }
    }
    await doSubmit(choices, bundle);
  };

  const inviteMode = presetExamId != null;

  // ─── Display name for exam ────────────────────────────────────────────────
  const examDisplayName = (exam: ExamSummary) =>
    exam.title ?? exam.topics.join(", ");

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-10 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-2xl">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
          >
            ← Home
          </Link>
          <div className="flex items-center gap-4">
            {/* Timer chip */}
            {step === "take" && timeLeft !== null && (
              <div
                className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold tabular-nums shadow-sm dark:bg-zinc-900 dark:border-zinc-700 ${timerColour}`}
                aria-live="polite"
                aria-label={`Time remaining: ${fmtTime(timeLeft)}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {fmtTime(timeLeft)}
              </div>
            )}
            {step !== "register" && (
              <button
                type="button"
                onClick={() => {
                  stopTimer();
                  setStep("register");
                  setBundle(null);
                  setSelectedExam(null);
                  setResult(null);
                  setError(null);
                  setTimeLeft(null);
                }}
                className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              >
                Reset flow
              </button>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">Candidate</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          {inviteMode
            ? "You were invited to one exam. Register to begin."
            : "Register once per email, then choose an exam."}
        </p>

        {error && (
          <div
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* ── Register ── */}
        {step === "register" && (
          <form
            onSubmit={onRegister}
            className="mt-8 space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Work email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Full name
              </label>
              <input
                id="name"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Working…" : inviteMode ? "Register & start exam" : "Register & continue"}
            </button>
          </form>
        )}

        {/* ── Exam List ── */}
        {step === "exams" && (
          <div className="mt-8 space-y-3">
            {exams.length === 0 ? (
              <p className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                No exams yet. Ask an admin to generate one.
              </p>
            ) : (
              exams.map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => startExam(exam)}
                  disabled={loading}
                  className="flex w-full flex-col rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 hover:shadow disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-600"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-50">{examDisplayName(exam)}</span>
                  <span className="text-sm text-zinc-500">
                    {exam.complexity} · {exam.total_questions} questions
                    {exam.duration_minutes ? ` · ${exam.duration_minutes} min` : ""}
                    {" "}· #{exam.id}
                  </span>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Take Exam ── */}
        {step === "take" && bundle && (
          <form onSubmit={onSubmitExam} className="mt-8 space-y-8">
            {/* Exam header */}
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                {examDisplayName(bundle.exam)}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {bundle.exam.complexity}
                {bundle.exam.duration_minutes ? ` · ${bundle.exam.duration_minutes} min` : ""}
                {" "}· {bundle.questions.length} questions
              </p>
              {bundle.exam.topics.length > 1 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {bundle.exam.topics.map((t) => (
                    <span key={t} className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {bundle.questions.map((q, i) => (
              <fieldset
                key={q.id}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <legend className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Question {i + 1}
                </legend>
                <p className="mt-2 text-zinc-900 dark:text-zinc-100">{q.text}</p>
                <div className="mt-4 space-y-2">
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent px-2 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800/80"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        className="mt-1 border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                        checked={choices[q.id] === idx}
                        onChange={() =>
                          setChoices((c) => ({ ...c, [q.id]: idx }))
                        }
                      />
                      <span className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
                        {opt}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-50"
            >
              {loading ? "Submitting…" : "Submit answers"}
            </button>
          </form>
        )}

        {/* ── Results ── */}
        {step === "results" && result && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-900 dark:bg-emerald-950/40">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">Your score</p>
              <p className="mt-2 text-4xl font-semibold tabular-nums text-emerald-900 dark:text-emerald-100">
                {result.score_percent}%
              </p>
              <p className="mt-1 text-sm text-emerald-800/80 dark:text-emerald-200/90">
                {result.correct_count} of {result.total_questions} correct
              </p>
            </div>
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Review</h2>
              {result.results.map((r) => (
                <div
                  key={r.question_id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    r.is_correct
                      ? "border-emerald-200 bg-white dark:border-emerald-900 dark:bg-zinc-900"
                      : "border-amber-200 bg-amber-50/80 dark:border-amber-900 dark:bg-amber-950/30"
                  }`}
                >
                  <span className="font-medium">
                    Q{r.question_id}
                    {r.is_correct ? " ✓" : " ✗"}
                  </span>
                  <span className="ml-2 text-zinc-600 dark:text-zinc-400">
                    You: {String.fromCharCode(65 + r.chosen_option_index)} · Correct:{" "}
                    {String.fromCharCode(65 + r.correct_option_index)}
                  </span>
                </div>
              ))}
            </div>
            {inviteMode ? (
              <Link
                href="/"
                className="inline-block text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Back to home
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setStep("exams");
                  setBundle(null);
                  setResult(null);
                  setChoices({});
                  void goExams();
                }}
                className="text-sm font-medium text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Back to exam list
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
