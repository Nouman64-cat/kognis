export type ExamSummary = {
  id: number;
  title: string | null;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
};

export type CandidatePublic = {
  id: number;
  email: string;
  full_name: string;
};

export type QuestionPublic = {
  id: number;
  text: string;
  options: string[];
};

export type ExamQuestionsResponse = {
  exam: ExamSummary;
  questions: QuestionPublic[];
};

export type AdminGenerateResponse = {
  exam_id: number;
  title: string | null;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
};

export type SubmitExamResponse = {
  exam_id: number;
  candidate_id: number;
  attempt_id: number;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  results: {
    question_id: number;
    chosen_option_index: number;
    correct_option_index: number;
    is_correct: boolean;
  }[];
};

export type ApiErrorBody = { detail?: string | unknown };

export type AttemptRow = {
  attempt_id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  exam_id: number;
  exam_topic: string;
  exam_topics: string[];
  exam_title: string | null;
  exam_complexity: string;
  total_questions: number;
  score_percent: number;
  correct_count: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
};

export type GlobalAnalytics = {
  unique_candidates: number;
  total_attempts: number;
  avg_score: number;
  top_score: number;
  pass_rate: number;
  score_distribution: Record<string, number>;
};

export type CandidateAnalytics = {
  candidate_email: string;
  candidate_name: string;
  total_attempts: number;
  avg_score: number;
  best_score: number;
  pass_rate: number;
  passed_count: number;
  failed_count: number;
};

export type ListAttemptsResponse = {
  attempts: AttemptRow[];
  global_stats: GlobalAnalytics;
  candidate_stats: Record<string, CandidateAnalytics>;
};
