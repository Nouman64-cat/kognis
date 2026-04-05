import Link from "next/link";
import { ClipboardList, Shield } from "lucide-react";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-zinc-50 to-zinc-100 text-zinc-900 dark:from-zinc-950 dark:to-black dark:text-zinc-50">
      <header className="border-b border-zinc-200/80 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">Kognis</span>
          <span className="text-sm text-zinc-500">MCQ evaluation</span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-12 max-w-xl">
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Employee skill checks, without the paperwork.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Register, take a timed-style MCQ exam, and see your score. Admins can
            generate new exams from a topic in one step.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/candidate"
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:border-emerald-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-emerald-700"
          >
            <ClipboardList
              className="mb-4 h-10 w-10 text-emerald-600 dark:text-emerald-400"
              strokeWidth={1.5}
            />
            <h2 className="text-xl font-semibold">Candidate</h2>
            <p className="mt-2 flex-1 text-zinc-600 dark:text-zinc-400">
              Use your invite link or browse exams after you register with your email.
            </p>
            <span className="mt-6 text-sm font-medium text-emerald-600 group-hover:underline dark:text-emerald-400">
              Start →
            </span>
          </Link>

          <Link
            href="/admin"
            className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-amber-700"
          >
            <Shield
              className="mb-4 h-10 w-10 text-amber-600 dark:text-amber-400"
              strokeWidth={1.5}
            />
            <h2 className="text-xl font-semibold">Admin</h2>
            <p className="mt-2 flex-1 text-zinc-600 dark:text-zinc-400">
              Generate a new exam with an LLM and publish it to the database.
            </p>
            <span className="mt-6 text-sm font-medium text-amber-600 group-hover:underline dark:text-amber-400">
              Open console →
            </span>
          </Link>
        </div>
      </main>

      <footer className="border-t border-zinc-200/80 px-6 py-6 text-center text-sm text-zinc-500 dark:border-zinc-800">
        Kognis · API at{" "}
        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-900">
          {process.env.NEXT_PUBLIC_API_URL ?? "configure NEXT_PUBLIC_API_URL"}
        </code>
      </footer>
    </div>
  );
}
