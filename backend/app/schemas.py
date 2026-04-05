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


class AdminGenerateExamRequest(BaseModel):
    topic: str = Field(min_length=1, max_length=512)
    complexity: str = Field(min_length=1, max_length=64)
    total_questions: int = Field(ge=1, le=100)


class AdminGenerateExamResponse(BaseModel):
    exam_id: int
    topic: str
    complexity: str
    total_questions: int


class CandidateRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=255)


class CandidatePublic(BaseModel):
    id: int
    email: str
    full_name: str


class ExamSummary(BaseModel):
    id: int
    topic: str
    complexity: str
    total_questions: int


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
    chosen_option_index: int = Field(ge=0, le=3)


class SubmitExamRequest(BaseModel):
    email: EmailStr
    answers: list[AnswerItem] = Field(min_length=1)


class PerQuestionResult(BaseModel):
    question_id: int
    chosen_option_index: int
    correct_option_index: int
    is_correct: bool


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
    exam_complexity: str
    total_questions: int
    score_percent: float
    correct_count: int


class ListAttemptsResponse(BaseModel):
    attempts: list[AttemptRow]
