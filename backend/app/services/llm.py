"""LLM MCQ generation using native SDK structured outputs (no LangChain)."""

from __future__ import annotations

from typing import Any

import anthropic
from openai import AsyncOpenAI
from pydantic import BaseModel, Field, field_validator

from app.config import LLMProvider, Settings


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

    @field_validator("options")
    @classmethod
    def non_empty_options(cls, v: list[str]) -> list[str]:
        for o in v:
            if not o.strip():
                raise ValueError("options must be non-empty strings")
        return v


class _LLMExamPayload(BaseModel):
    questions: list[_LLMQuestion] = Field(min_length=1, max_length=100)


def _build_user_prompt(topics: list[str], complexity: str, total_questions: int) -> str:
    topics_str = ", ".join(repr(t) for t in topics)
    topic_clause = (
        f"covering the topic: {topics_str}" if len(topics) == 1
        else f"covering ALL of the following topics (distribute questions across them): {topics_str}"
    )
    return (
        f"Generate exactly {total_questions} distinct multiple-choice questions {topic_clause}. "
        f"Target difficulty/complexity: {complexity!r}. "
        "Each question must have exactly four options as plain strings, one correct answer identified by "
        "correct_index 0-3 matching the position in options, and a concise 1-sentence explanation "
        "of why the correct answer is correct. "
        "Do not include numbering prefixes in the question text. "
        "CRITICAL — Markdown code blocks: If the stem or any option contains ANY programming code, shell "
        "commands, SQL, JSON, or multi-line snippets, you MUST wrap EVERY such snippet in a fenced block "
        "with a language tag (```python, ```javascript, ```sql, ```text, etc.). Put normal English sentences "
        "outside fences. Never paste code as a single unbroken line of prose without fences. "
        "BAD example (forbidden — no fences, code runs into prose): "
        '"What prints?\\ndef foo(): return 1\\nprint(foo())" '
        "GOOD example: prose line, then ```python\\ndef foo():\\n    return 1\\nprint(foo())\\n``` "
        "Use separate fenced blocks if there are multiple distinct snippets. "
        "Format code inside options the same way when an option contains code. "
        "Vary scenarios and avoid duplicate stems."
    )


async def generate_mcq_payload(
    settings: Settings,
    *,
    topics: list[str],
    complexity: str,
    total_questions: int,
) -> _LLMExamPayload:
    prompt = _build_user_prompt(topics, complexity, total_questions)

    if settings.llm_provider == LLMProvider.OPENAI:
        return await _generate_openai(settings, prompt, total_questions)
    if settings.llm_provider == LLMProvider.ANTHROPIC:
        return await _generate_anthropic(settings, prompt, total_questions)
    raise ValueError(f"Unsupported LLM provider: {settings.llm_provider}")


async def _generate_openai(settings: Settings, prompt: str, total_questions: int) -> _LLMExamPayload:
    if not settings.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY is not set")

    client = AsyncOpenAI(api_key=settings.openai_api_key)
    # Native structured parsing (JSON schema enforced by the API)
    completion = await client.chat.completions.parse(
        model=settings.openai_model,
        messages=[
            {
                "role": "system",
                "content": (
                    "You write high-quality employment screening MCQs. Output only via the required schema. "
                    "In question text and options, always put programming code in markdown fenced blocks "
                    "(```python etc.), never as unstructured plain text."
                ),
            },
            {"role": "user", "content": prompt},
        ],
        response_format=_LLMExamPayload,
        temperature=0.4,
    )
    msg = completion.choices[0].message
    if msg.refusal:
        raise RuntimeError(f"Model refused: {msg.refusal}")
    parsed = msg.parsed
    if parsed is None:
        raise RuntimeError("OpenAI returned no parsed payload")
    _validate_count(parsed, total_questions)
    return parsed


def _anthropic_tool_def() -> dict[str, Any]:
    return {
        "name": "emit_exam_questions",
        "description": "Return the generated MCQ exam as structured JSON.",
        "input_schema": {
            "type": "object",
            "properties": {
                "questions": {
                    "type": "array",
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
                                "description": "Short 1-sentence reason why the correct answer is correct"
                            },
                        },
                        "required": ["text", "options", "correct_index", "explanation"],
                    },
                }
            },
            "required": ["questions"],
        },
    }


async def _generate_anthropic(settings: Settings, prompt: str, total_questions: int) -> _LLMExamPayload:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
    tool = _anthropic_tool_def()
    message = await client.messages.create(
        model=settings.anthropic_model,
        max_tokens=8192,
        system=(
            "You write high-quality employment screening MCQs. Use the provided tool exactly once. "
            "In question text and options, always put programming code in markdown fenced blocks "
            "(```python etc.), never as unstructured plain text."
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
