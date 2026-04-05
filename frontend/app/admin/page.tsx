"use client";

import Link from "next/link";
import { useState } from "react";
import { generateExamAdmin } from "@/lib/api";

export default function AdminPage() {
  const [topic, setTopic] = useState("");
  const [complexity, setComplexity] = useState("intermediate");
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    exam_id: number;
    topic: string;
    complexity: string;
    total_questions: number;
  } | null>(null);

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
      setSuccess(res);
      setTopic("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-b from-zinc-50 to-zinc-100 px-4 py-10 dark:from-zinc-950 dark:to-black">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="text-sm font-medium text-amber-600 hover:underline dark:text-amber-400"
        >
          ← Home
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-zinc-600 dark:text-zinc-400">
          Creates an exam via the API using your server-side{" "}
          <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-800">ADMIN_API_KEY</code>.
        </p>

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
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100"
            role="status"
          >
            <p className="font-medium">Exam created</p>
            <p className="mt-1">
              ID <strong>{success.exam_id}</strong> · {success.total_questions} questions ·{" "}
              {success.topic} ({success.complexity})
            </p>
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
