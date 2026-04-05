import { notFound } from "next/navigation";
import { CandidateFlow } from "@/components/CandidateFlow";

type Props = {
  params: Promise<{ examId: string }>;
};

export default async function CandidateInvitePage({ params }: Props) {
  const { examId: raw } = await params;
  const id = parseInt(raw, 10);
  if (!Number.isFinite(id) || id < 1) {
    notFound();
  }
  return <CandidateFlow presetExamId={id} />;
}
