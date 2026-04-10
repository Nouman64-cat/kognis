from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class AdminLoginRequest(BaseModel):
    password: str = Field(min_length=1, max_length=512)


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminSetPasswordRequest(BaseModel):
    otp: str = Field(min_length=1, max_length=512)
    new_password: str = Field(min_length=8, max_length=512)


class AdminAuthStatusResponse(BaseModel):
    has_password: bool


class TopicMixEntry(BaseModel):
    """One row in the exam question mix: a label you choose plus its share of questions (percent)."""

    name: str = Field(min_length=1, max_length=128, description="Bucket label; must be unique in the mix.")
    percent: float = Field(ge=0, le=100)


def parse_topic_mix_from_storage(raw: object | None) -> list[TopicMixEntry] | None:
    """Load topic mix from JSON (new list format or legacy dict of name -> percent)."""
    if raw is None:
        return None
    if isinstance(raw, list):
        out: list[TopicMixEntry] = []
        for item in raw:
            if isinstance(item, dict) and "name" in item and "percent" in item:
                out.append(TopicMixEntry.model_validate(item))
        return out if out else None
    if isinstance(raw, dict):
        return [TopicMixEntry(name=str(k), percent=float(v)) for k, v in raw.items()]
    return None


class AdminGenerateExamRequest(BaseModel):
    title: str | None = Field(default=None, max_length=512)
    complexity: str = Field(min_length=1, max_length=64)
    total_questions: int = Field(ge=1, le=100)
    duration_minutes: int | None = Field(default=None, ge=1, le=300)
    scheduled_for: datetime | None = Field(default=None)
    topic_mix: list[TopicMixEntry] = Field(
        min_length=1,
        max_length=32,
        description="Your question buckets: each has a name and percent; percents must sum to 100.",
    )

    @field_validator("topic_mix")
    @classmethod
    def validate_topic_mix(cls, v: list[TopicMixEntry]) -> list[TopicMixEntry]:
        stripped = [TopicMixEntry(name=e.name.strip(), percent=e.percent) for e in v]
        names = [e.name for e in stripped]
        if len(set(names)) != len(names):
            raise ValueError("topic mix bucket names must be unique")
        s = sum(e.percent for e in stripped)
        if abs(s - 100.0) > 0.51:
            raise ValueError("topic mix percentages must sum to 100")
        return stripped


class AdminGenerateExamResponse(BaseModel):
    exam_id: int
    title: str | None
    topics: list[str]
    complexity: str
    total_questions: int
    duration_minutes: int | None
    scheduled_for: datetime | None
    created_at: datetime
    topic_mix: list[TopicMixEntry] | None = None


class CandidateRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class CandidatePublic(BaseModel):
    id: int
    email: str
    full_name: str


class ExamSummary(BaseModel):
    id: int
    title: str | None
    topics: list[str]
    complexity: str
    total_questions: int
    duration_minutes: int | None
    scheduled_for: datetime | None
    created_at: datetime
    topic_mix: list[TopicMixEntry] | None = None


class QuestionPublic(BaseModel):
    id: int
    text: str
    options: list[str]

    @field_validator("options")
    @classmethod
    def four_options(cls, v: list[str]) -> list[str]:
        if len(v) != 4:
            raise ValueError("each question must have exactly four options")
        return v


class ExamQuestionsResponse(BaseModel):
    exam: ExamSummary
    questions: list[QuestionPublic]


class AnswerItem(BaseModel):
    question_id: int = Field(gt=0)
    chosen_option_index: int = Field(ge=-1, le=3, description="-1 means unanswered")


class SubmitExamRequest(BaseModel):
    email: EmailStr
    answers: list[AnswerItem] = Field(min_length=1)


class PerQuestionResult(BaseModel):
    question_id: int
    chosen_option_index: int = Field(description="-1 means unanswered")
    chosen_option_text: str
    correct_option_index: int
    correct_option_text: str
    is_correct: bool
    explanation: str | None


class SubmitExamResponse(BaseModel):
    exam_id: int
    candidate_id: int
    attempt_id: int
    score_percent: float
    correct_count: int
    total_questions: int
    results: list[PerQuestionResult]


class AttemptRow(BaseModel):
    attempt_id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    exam_id: int
    exam_topic: str
    exam_topics: list[str]
    exam_title: str | None
    exam_complexity: str
    total_questions: int
    score_percent: float
    correct_count: int
    duration_minutes: int | None
    scheduled_for: datetime | None
    created_at: datetime


class GlobalAnalytics(BaseModel):
    unique_candidates: int
    total_attempts: int
    avg_score: float
    top_score: float
    pass_rate: float
    score_distribution: dict[str, int]


class CandidateAnalytics(BaseModel):
    candidate_email: str
    candidate_name: str
    total_attempts: int
    avg_score: float
    best_score: float
    pass_rate: float
    passed_count: int
    failed_count: int


class ListAttemptsResponse(BaseModel):
    attempts: list[AttemptRow]
    global_stats: GlobalAnalytics
    candidate_stats: dict[str, CandidateAnalytics]


class AttemptQuestionDetail(BaseModel):
    question_id: int
    text: str
    options: list[str]
    correct_option_index: int
    chosen_option_index: int
    chosen_option_text: str
    correct_option_text: str
    is_correct: bool
    explanation: str | None


class AttemptDetailResponse(BaseModel):
    attempt_id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    exam_id: int
    exam_title: str | None
    exam_topics: list[str]
    exam_complexity: str
    score_percent: float
    correct_count: int
    total_questions: int
    created_at: datetime
    questions: list[AttemptQuestionDetail]


class ExamQuestionDetail(BaseModel):
    question_id: int
    text: str
    options: list[str]
    correct_option_index: int
    correct_option_text: str
    explanation: str | None
    category: str | None


class ExamDetailResponse(BaseModel):
    exam_id: int
    exam_title: str | None
    exam_topics: list[str]
    exam_complexity: str
    total_questions: int
    duration_minutes: int | None
    scheduled_for: datetime | None
    created_at: datetime
    questions: list[ExamQuestionDetail]


class QuestionAdminView(BaseModel):
    id: int
    exam_id: int
    text: str
    options: list[str]
    correct_answer: int
    explanation: str | None
    category: str | None
    exam_topic: str


class PaginatedQuestionsResponse(BaseModel):
    items: list[QuestionAdminView]
    total: int
    page: int
    page_size: int
    total_pages: int
