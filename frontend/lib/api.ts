import type {
  AdminGenerateResponse,
  CandidatePublic,
  ExamQuestionsResponse,
  ExamSummary,
  SubmitExamResponse,
} from "./types";

const base = () => {
  const u = process.env.NEXT_PUBLIC_API_URL;
  if (!u) throw new Error("NEXT_PUBLIC_API_URL is not set");
  return u.replace(/\/$/, "");
};

async function parseError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { detail?: unknown };
    if (typeof j.detail === "string") return j.detail;
    return res.statusText || "Request failed";
  } catch {
    return res.statusText || "Request failed";
  }
}

export async function listExams(): Promise<ExamSummary[]> {
  const res = await fetch(`${base()}/api/v1/exams`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<ExamSummary[]>;
}

export async function registerCandidate(
  email: string,
  fullName: string,
): Promise<CandidatePublic> {
  const res = await fetch(`${base()}/api/v1/candidates/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, full_name: fullName }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<CandidatePublic>;
}

export async function getExamQuestions(
  examId: number,
  email: string,
): Promise<ExamQuestionsResponse> {
  const q = new URLSearchParams({ email });
  const res = await fetch(
    `${base()}/api/v1/exams/${examId}/questions?${q.toString()}`,
    { cache: "no-store" },
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<ExamQuestionsResponse>;
}

export async function submitExam(
  examId: number,
  email: string,
  answers: { question_id: number; chosen_option_index: number }[],
): Promise<SubmitExamResponse> {
  const res = await fetch(`${base()}/api/v1/exams/${examId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, answers }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<SubmitExamResponse>;
}

export async function generateExamAdmin(body: {
  topic: string;
  complexity: string;
  total_questions: number;
}): Promise<AdminGenerateResponse> {
  const res = await fetch("/api/admin/exams/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(err);
  }
  return res.json() as Promise<AdminGenerateResponse>;
}
