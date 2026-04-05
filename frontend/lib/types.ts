export type ExamSummary = {
  id: number;
  title: string | null;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes: number | null;
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
};

export type ListAttemptsResponse = {
  attempts: AttemptRow[];
};
