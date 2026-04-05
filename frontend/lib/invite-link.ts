/**
 * Public URL for a candidate invite to one exam (browser or NEXT_PUBLIC_APP_URL).
 */
export function candidateExamInviteUrl(examId: number): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  if (!origin) {
    return `/candidate/exam/${examId}`;
  }
  return `${origin}/candidate/exam/${examId}`;
}
