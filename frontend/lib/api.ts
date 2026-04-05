import { getAdminToken } from "./admin-token";
import type {
  AdminGenerateResponse,
  CandidatePublic,
  ExamQuestionsResponse,
  ExamSummary,
  ListAttemptsResponse,
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

export async function adminAuthStatus(): Promise<{ has_password: boolean }> {
  const res = await fetch(`${base()}/api/v1/admin/auth/status`, { cache: "no-store" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ has_password: boolean }>;
}

export async function adminLogin(password: string): Promise<{ access_token: string }> {
  const res = await fetch(`${base()}/api/v1/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<{ access_token: string }>;
}

export async function adminSetPassword(otp: string, newPassword: string): Promise<void> {
  const res = await fetch(`${base()}/api/v1/admin/auth/set-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ otp: otp.trim(), new_password: newPassword }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function generateExamAdmin(body: {
  title?: string;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes?: number;
  scheduled_for?: string | null;
}): Promise<AdminGenerateResponse> {
  const token = getAdminToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch("/api/admin/exams/generate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await parseError(res);
    throw new Error(err);
  }
  return res.json() as Promise<AdminGenerateResponse>;
}

export async function listAttempts(): Promise<ListAttemptsResponse> {
  const token = getAdminToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${base()}/api/v1/admin/attempts`, {
    cache: "no-store",
    headers,
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json() as Promise<ListAttemptsResponse>;
}
