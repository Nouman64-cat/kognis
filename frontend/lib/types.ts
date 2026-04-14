/** One bucket you name yourself; percents across all rows must sum to 100. */
export type TopicMixEntry = { name: string; percent: number };

export type ExamTopicMix = TopicMixEntry[];

export type ExamSummary = {
  id: number;
  department_id: number;
  department_name: string;
  title: string | null;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
  /** Present when the exam was generated with a custom mix */
  topic_mix?: ExamTopicMix | null;
};

export type CandidatePublic = {
  id: number;
  email: string;
  full_name: string;
  department_id: number;
  department_name: string;
};

export type Department = {
  id: number;
  name: string;
};

export type QuestionPublic = {
  id: number;
  text: string;
  options: string[];
  required_selection_count: number;
};

export type ExamQuestionsResponse = {
  exam: ExamSummary;
  questions: QuestionPublic[];
};

export type AdminGenerateResponse = {
  exam_id: number;
  department_id: number;
  department_name: string;
  title: string | null;
  topics: string[];
  complexity: string;
  total_questions: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
  topic_mix?: ExamTopicMix | null;
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
    chosen_option_indices: number[];
    chosen_option_texts: string[];
    correct_option_indices: number[];
    correct_option_texts: string[];
    is_correct: boolean;
    explanation: string | null;
  }[];
};

export type ApiErrorBody = { detail?: string | unknown };

export type AttemptRow = {
  attempt_id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  exam_id: number;
  exam_department_id: number;
  exam_department_name: string;
  candidate_department_id: number;
  candidate_department_name: string;
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

export type AttemptQuestionDetail = {
  question_id: number;
  text: string;
  options: string[];
  correct_option_indices: number[];
  chosen_option_indices: number[];
  chosen_option_texts: string[];
  correct_option_texts: string[];
  is_correct: boolean;
  explanation: string | null;
};

export type AttemptDetailResponse = {
  attempt_id: number;
  candidate_id: number;
  candidate_name: string;
  candidate_email: string;
  exam_id: number;
  exam_title: string | null;
  exam_topics: string[];
  exam_complexity: string;
  score_percent: number;
  correct_count: number;
  total_questions: number;
  created_at: string;
  questions: AttemptQuestionDetail[];
};

export type ExamQuestionDetail = {
  question_id: number;
  text: string;
  options: string[];
  correct_option_indices: number[];
  correct_option_texts: string[];
  explanation: string | null;
  category: string | null;
};

export type ExamDetailResponse = {
  exam_id: number;
  department_id: number;
  department_name: string;
  exam_title: string | null;
  exam_topics: string[];
  exam_complexity: string;
  total_questions: number;
  duration_minutes: number | null;
  scheduled_for: string | null;
  created_at: string;
  questions: ExamQuestionDetail[];
};

export type QuestionAdminView = {
  id: number;
  exam_id: number;
  text: string;
  options: string[];
  correct_answers: number[];
  required_selection_count: number;
  explanation: string | null;
  category: string | null;
  exam_topic: string;
};

export type PaginatedQuestionsResponse = {
  items: QuestionAdminView[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
};
