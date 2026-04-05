export type ExamSummary = {
  id: number;
  topic: string;
  complexity: string;
  total_questions: number;
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
  topic: string;
  complexity: string;
  total_questions: number;
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
