"""LLM MCQ generation using native SDK structured outputs (no LangChain)."""

from __future__ import annotations

from collections import Counter
from typing import Annotated, Any

import anthropic
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, create_model, field_validator

from app.config import LLMProvider, Settings
from app.schemas import TopicMixEntry
from app.topic_mix import allocate_question_counts

# Anthropic Haiku/Sonnet often cap output at 8192; large exams can truncate mid-JSON → too few questions.
_ANTHROPIC_MAX_OUT: int = 8192
# OpenAI: leave headroom so long stems/code don’t cut the array short.
_OPENAI_MAX_COMPLETION_TOKENS: int = 16384
_MAX_GENERATION_ATTEMPTS: int = 4


class _LLMQuestion(BaseModel):
    text: str = Field(
        min_length=1,
        max_length=8192,
        description=(
            "Question stem in GitHub-flavored Markdown. Any source code MUST be inside fenced blocks "
            "like ```python ... ```, never as loose plain text."
        ),
    )
    options: list[str] = Field(
        min_length=4,
        max_length=4,
        description="Four options; use ``` fences for any option that contains code.",
    )
    correct_index: int = Field(ge=0, le=3)
    explanation: str = Field(min_length=1, max_length=1024, description="Short reason explaining why the correct answer is right.")
    category: str = Field(
        min_length=1,
        max_length=128,
        description='Must match the "category" string for this question from the user prompt (exact string).',
    )

    @field_validator("options")
    @classmethod
    def non_empty_options(cls, v: list[str]) -> list[str]:
        for o in v:
            if not o.strip():
                raise ValueError("options must be non-empty strings")
        return v


class _LLMExamPayload(BaseModel):
    questions: list[_LLMQuestion] = Field(min_length=1, max_length=100)


def _split_counts_into_batches(full_counts: dict[str, int], max_batch: int) -> list[dict[str, int]]:
    """Split global per-category counts into batches of at most `max_batch` questions, preserving totals."""
    if max_batch < 1:
        raise ValueError("max_batch must be at least 1")
    slots: list[str] = []
    for name, cnt in full_counts.items():
        slots.extend([name] * cnt)
    if not slots:
        return []
    batches: list[dict[str, int]] = []
    for i in range(0, len(slots), max_batch):
        chunk = slots[i : i + max_batch]
        batches.append(dict(Counter(chunk)))
    return batches


def _build_user_prompt(
    topics: list[str],
    complexity: str,
    total_questions: int,
    expected_counts: dict[str, int],
    *,
    batch_index: int | None = None,
    num_batches: int | None = None,
) -> str:
    prefix = ""
    if num_batches is not None and num_batches > 1 and batch_index is not None:
        prefix = (
            f"This is batch {batch_index + 1} of {num_batches} for the SAME exam. "
            f"Generate exactly {total_questions} questions in THIS batch only; other batches cover the remainder. "
            "Use distinct stems so this batch does not overlap conceptually with what other batches would contain.\n\n"
        )

    topics_str = ", ".join(repr(t) for t in topics)
    topic_clause = (
        f"covering the topic: {topics_str}" if len(topics) == 1
        else f"covering ALL of the following topics (distribute questions across them): {topics_str}"
    )

    mix_lines: list[str] = []
    for name, n in expected_counts.items():
        if n <= 0:
            continue
        mix_lines.append(
            f"- Exactly {n} question(s) with field category exactly equal to this string (copy verbatim, character-for-character): {name!r}. "
            "Questions in this bucket should test skills and knowledge suggested by that label, in the context of the exam topics above."
        )

    mix_section = "\n".join(mix_lines) if mix_lines else "(No category breakdown — use general mix.)"

    return (
        prefix
        + f"Generate exactly {total_questions} distinct multiple-choice questions {topic_clause}. "
        f"Target difficulty/complexity: {complexity!r}. "
        "Each question must have exactly four options as plain strings, one correct answer identified by "
        "correct_index 0-3 matching the position in options, a concise 1-sentence explanation, "
        "and a category field set EXACTLY as specified below (copy the category string character-for-character). "
        "Do not include numbering prefixes in the question text. "
        "QUESTION MIX (mandatory counts per category — your output must satisfy these exactly):\n"
        f"{mix_section}\n"
        "CRITICAL — Markdown code blocks: If the stem or any option contains ANY programming code, shell "
        "commands, SQL, JSON, or multi-line snippets, you MUST wrap EVERY such snippet in a fenced block "
        "with a language tag (```python, ```javascript, ```sql, ```text, etc.). Put normal English sentences "
        "outside fences. Never paste code as a single unbroken line of prose without fences. "
        "BAD example (forbidden — no fences, code runs into prose): "
        '"What prints?\\ndef foo(): return 1\\nprint(foo())" '
        "GOOD example: prose line, then ```python\\ndef foo():\\n    return 1\\nprint(foo())\\n``` "
        "Use separate fenced blocks if there are multiple distinct snippets. "
        "Format code inside options the same way when an option contains code. "
        "Vary scenarios and avoid duplicate stems. "
        f"OUTPUT SIZE: The questions array MUST contain exactly {total_questions} items — not {total_questions - 1}, not {total_questions + 1}. "
        "If space is tight, shorten stems and keep code samples minimal while still fair. "
        "Count the array length before finishing."
    )


def _validate_category_counts(payload: _LLMExamPayload, expected: dict[str, int]) -> None:
    c = Counter(q.category for q in payload.questions)
    for key, exp in expected.items():
        got = c.get(key, 0)
        if exp != got:
            raise RuntimeError(f"Expected {exp} questions with category {key!r}, got {got}")
    for key, got in c.items():
        if key not in expected:
            raise RuntimeError(f"Unexpected category {key!r} (not in the requested mix)")


async def _generate_mcq_payload_attempt(
    settings: Settings,
    *,
    topics: list[str],
    complexity: str,
    expected_counts: dict[str, int],
    batch_index: int | None,
    num_batches: int | None,
) -> _LLMExamPayload:
    total_questions = sum(expected_counts.values())
    if total_questions < 1:
        raise RuntimeError("batch has no questions")
    allowed = [k for k, v in expected_counts.items() if v > 0]

    base_prompt = _build_user_prompt(
        topics,
        complexity,
        total_questions,
        expected_counts,
        batch_index=batch_index,
        num_batches=num_batches,
    )

    correction: str | None = None
    last_err: str | None = None

    for attempt in range(_MAX_GENERATION_ATTEMPTS):
        extra = ""
        if correction:
            extra = (
                "\n\n---\nCORRECTION REQUIRED:\n"
                f"{correction}\n"
                f"Reply with a complete exam only: the questions array MUST have exactly {total_questions} elements."
            )
        prompt = base_prompt + extra

        try:
            if settings.llm_provider == LLMProvider.OPENAI:
                payload = await _generate_openai(settings, prompt, total_questions)
            elif settings.llm_provider == LLMProvider.ANTHROPIC:
                payload = await _generate_anthropic(settings, prompt, total_questions, allowed)
            else:
                raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")

            _validate_category_counts(payload, expected_counts)
            return payload
        except RuntimeError as e:
            last_err = str(e)
            recoverable = "Expected" in last_err and ("questions" in last_err or "category" in last_err)
            if not recoverable:
                raise
            if attempt >= _MAX_GENERATION_ATTEMPTS - 1:
                raise
            correction = last_err

    raise RuntimeError(last_err or "MCQ generation failed")


async def generate_mcq_payload(
    settings: Settings,
    *,
    topics: list[str],
    complexity: str,
    total_questions: int,
    topic_mix: list[TopicMixEntry],
) -> _LLMExamPayload:
    full_expected = allocate_question_counts(topic_mix, total_questions)
    max_batch = max(1, settings.mcq_max_questions_per_batch)
    batch_specs = _split_counts_into_batches(full_expected, max_batch)

    merged: list[_LLMQuestion] = []
    num_batches = len(batch_specs)
    for bi, batch_counts in enumerate(batch_specs):
        batch_index = bi if num_batches > 1 else None
        nb = num_batches if num_batches > 1 else None
        part = await _generate_mcq_payload_attempt(
            settings,
            topics=topics,
            complexity=complexity,
            expected_counts=batch_counts,
            batch_index=batch_index,
            num_batches=nb,
        )
        merged.extend(part.questions)

    if len(merged) != total_questions:
        raise RuntimeError(f"Internal merge error: expected {total_questions} questions, got {len(merged)}")

    out = _LLMExamPayload(questions=merged)
    _validate_category_counts(out, full_expected)
    return out


def _dynamic_exam_payload_model(total_questions: int) -> type[BaseModel]:
    """Exact array length helps OpenAI structured output match the requested count."""

    n = total_questions
    return create_model(
        "_LLMExamPayloadDynamic",
        __base__=BaseModel,
        questions=(
            Annotated[list[_LLMQuestion], Field(min_length=n, max_length=n)],
            ...,
        ),
    )


async def _generate_openai(settings: Settings, prompt: str, total_questions: int) -> _LLMExamPayload:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    DynamicPayload = _dynamic_exam_payload_model(total_questions)
    client = AsyncOpenAI(api_key=settings.openai_api_key)
    completion = await client.chat.completions.parse(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You write high-quality employment screening MCQs. Output only via the required schema. "
                    "In question text and options, always put programming code in markdown fenced blocks "
                    "(```python etc.), never as unstructured plain text. "
                    "Every question MUST set category to exactly one of the strings given in the user message."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format=DynamicPayload,
        temperature=0.4,
        max_completion_tokens=min(_OPENAI_MAX_COMPLETION_TOKENS, 2000 + total_questions * 1800),
    )
    msg = completion.choices[0].message
    if msg.refusal:
        raise RuntimeError(f"Model refused: {msg.refusal}")
    parsed = msg.parsed
    if parsed is None:
        raise RuntimeError("OpenAI returned no parsed payload")
    out = _LLMExamPayload.model_validate(parsed.model_dump())
    _validate_count(out, total_questions)
    return out


def _anthropic_tool_def(allowed_categories: list[str], total_questions: int) -> dict[str, Any]:
    if not allowed_categories:
        raise ValueError("Anthropic tool requires at least one category")
    cat_enum: dict[str, Any] = {
        "type": "string",
        "enum": allowed_categories,
        "description": "Must match one of the category strings from the user message exactly.",
    }
    return {
        "name": "emit_exam_questions",
        "description": f"Return the generated MCQ exam as structured JSON. The questions array MUST contain exactly {total_questions} items.",
        "input_schema": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
                    "minItems": total_questions,
                    "maxItems": total_questions,
                    "items": {
                        "type": "object",
                        "properties": {
                            "text": {
                                "type": "string",
                                "description": "GFM markdown; all code in ```language fences, never loose plain text.",
                            },
                            "options": {
                                "type": "array",
                                "items": {
                                    "type": "string",
                                    "description": "Use ``` fences when the option contains code.",
                                },
                                "minItems": 4,
                                "maxItems": 4,
                            },
                            "correct_index": {"type": "integer", "minimum": 0, "maximum": 3},
                            "explanation": {
                                "type": "string",
                                "description": "Short 1-sentence reason why the correct answer is correct",
                            },
                            "category": cat_enum,
                        },
                        "required": ["text", "options", "correct_index", "explanation", "category"],
                    },
                }
            },
            "required": ["questions"],
        },
    }


async def _generate_anthropic(
    settings: Settings,
    prompt: str,
    total_questions: int,
    allowed_categories: list[str],
) -> _LLMExamPayload:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    tool = _anthropic_tool_def(allowed_categories, total_questions)
    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=_ANTHROPIC_MAX_OUT,
        system=(
            "You write high-quality employment screening MCQs. Use the provided tool exactly once. "
            "In question text and options, always put programming code in markdown fenced blocks "
            "(```python etc.), never as unstructured plain text. "
            "Every question MUST set category to one of the allowed enum values exactly."
        ),
        messages=[{"role": "user", "content": prompt}],
        tools=[tool],
        tool_choice={"type": "tool", "name": tool["name"]},
        temperature=0.4,
    )
    for block in message.content:
        if block.type == "tool_use" and block.name == tool["name"]:
            raw: dict[str, Any] = block.input  # type: ignore[assignment]
            payload = _LLMExamPayload.model_validate(raw)
            _validate_count(payload, total_questions)
            return payload
    raise RuntimeError("Anthropic response contained no tool output")


def _validate_count(payload: _LLMExamPayload, total_questions: int) -> None:
    if len(payload.questions) != total_questions:
        raise RuntimeError(
            f"Expected {total_questions} questions from the model, got {len(payload.questions)}"
        )
