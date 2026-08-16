import asyncio
import json
import logging
import mimetypes
import os
from pathlib import Path
from typing import Type, TypeVar

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError

from .prompts import (
    BOOK_EXTRACTION_PROMPT,
    HOMEWORK_EVALUATION_PROMPT,
    build_book_extraction_task,
    build_homework_evaluation_task,
)
from .schemas import BookExtractionResult, HomeworkEvaluationResult

DEFAULT_MODEL = "gemini-3.6-flash"
DEFAULT_TIMEOUT_SECONDS = 60
MODEL_REPLACEMENTS = {
    "gemini-2.5-flash": "gemini-3.6-flash",
    "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
}
FALLBACK_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash-lite", "gemini-3.5-flash"]

SchemaT = TypeVar("SchemaT", bound=BaseModel)


class GeminiAnalysisError(RuntimeError):
    """Raised when Gemini does not return a usable structured analysis."""


def get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is not set")
    return genai.Client(api_key=api_key)


def init_gemini() -> None:
    client = get_client()
    client.close()


async def extract_book_problems(image_path: str, user_instruction: str) -> BookExtractionResult:
    logging.info("Gemini book extraction started")
    task = build_book_extraction_task(user_instruction)
    return await _call_gemini_json(
        image_path=image_path,
        system_instruction=BOOK_EXTRACTION_PROMPT,
        user_task=task,
        schema=BookExtractionResult,
    )


async def evaluate_homework(
    image_path: str,
    answer_key_json: str,
    manual_edits: str = "",
) -> HomeworkEvaluationResult:
    logging.info("Gemini homework evaluation started")
    task = build_homework_evaluation_task(answer_key_json, manual_edits)
    return await _call_gemini_json(
        image_path=image_path,
        system_instruction=HOMEWORK_EVALUATION_PROMPT,
        user_task=task,
        schema=HomeworkEvaluationResult,
    )


async def _call_gemini_json(
    *,
    image_path: str,
    system_instruction: str,
    user_task: str,
    schema: Type[SchemaT],
) -> SchemaT:
    client = get_client()
    timeout_seconds = _get_timeout_seconds()
    image_part = _image_input(image_path)
    last_error: Exception | None = None

    attempts = (
        ("pydantic_schema", _build_config(system_instruction, schema=schema)),
        ("json_schema", _build_config(system_instruction, response_json_schema=schema.model_json_schema())),
        ("json_only", _build_config(system_instruction)),
    )

    try:
        for model_name in _get_model_names():
            for attempt_name, config in attempts:
                request_task = _with_schema_instruction(user_task, schema) if attempt_name == "json_only" else user_task
                try:
                    logging.info("Gemini request using model=%s attempt=%s", model_name, attempt_name)
                    interaction = await asyncio.wait_for(
                        client.aio.models.generate_content(
                            model=model_name,
                            contents=[image_part, request_task],
                            config=config,
                        ),
                        timeout=timeout_seconds + 5,
                    )
                    logging.info("Gemini request completed")
                    return _parse_structured_response(_extract_text(interaction), schema)
                except asyncio.TimeoutError as exc:
                    raise GeminiAnalysisError("Gemini request timed out") from exc
                except GeminiAnalysisError:
                    raise
                except Exception as exc:
                    last_error = exc
                    logging.warning(
                        "Gemini generation attempt failed model=%s attempt=%s error=%s",
                        model_name,
                        attempt_name,
                        exc,
                    )
    except asyncio.TimeoutError as exc:
        raise GeminiAnalysisError("Gemini request timed out") from exc
    finally:
        client.close()

    raise GeminiAnalysisError(f"Gemini API error: {last_error}") from last_error


def _get_timeout_seconds() -> int:
    raw_timeout = os.getenv("GEMINI_TIMEOUT_SECONDS")
    if not raw_timeout:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        return max(5, int(raw_timeout))
    except ValueError:
        logging.warning("Invalid GEMINI_TIMEOUT_SECONDS=%r; using default", raw_timeout)
        return DEFAULT_TIMEOUT_SECONDS


def _get_model_names() -> list[str]:
    raw_model = os.getenv("GEMINI_MODEL", DEFAULT_MODEL).strip()
    configured_model = raw_model.removeprefix("models/") if raw_model else DEFAULT_MODEL
    configured_model = MODEL_REPLACEMENTS.get(configured_model, configured_model)

    model_names = [configured_model, *FALLBACK_MODELS]
    model_names = list(dict.fromkeys(model_names))
    return model_names


def _build_config(
    system_instruction: str,
    *,
    schema: Type[SchemaT] | None = None,
    response_json_schema: dict | None = None,
) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        system_instruction=system_instruction,
        response_mime_type="application/json",
        response_schema=schema,
        response_json_schema=response_json_schema,
    )


def _image_input(image_path: str) -> types.Part:
    path = Path(image_path)
    mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    return types.Part.from_bytes(data=path.read_bytes(), mime_type=mime_type)


def _with_schema_instruction(user_task: str, schema: Type[SchemaT]) -> str:
    return (
        f"{user_task}\n\n"
        "Return ONLY valid JSON matching this JSON Schema. Do not wrap it in markdown.\n"
        f"{json.dumps(schema.model_json_schema(), ensure_ascii=False)}"
    )


def _extract_text(interaction) -> str:
    try:
        return interaction.text
    except Exception:
        if hasattr(interaction, "candidates") and interaction.candidates:
            return interaction.candidates[0].content.parts[0].text
    return ""


def _parse_structured_response(raw_text: str, schema: Type[SchemaT]) -> SchemaT:
    if not raw_text or not raw_text.strip():
        raise GeminiAnalysisError("Gemini returned an empty response")

    clean_text = _strip_json_fence(raw_text)
    try:
        payload = json.loads(clean_text)
    except json.JSONDecodeError as exc:
        raise GeminiAnalysisError("Gemini returned invalid JSON") from exc

    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        raise GeminiAnalysisError("Gemini response did not match the expected schema") from exc


def _strip_json_fence(text: str) -> str:
    stripped = text.strip()
    if not stripped.startswith("```"):
        return stripped

    lines = stripped.splitlines()
    if lines and lines[0].strip().startswith("```"):
        lines = lines[1:]
    if lines and lines[-1].strip() == "```":
        lines = lines[:-1]
    return "\n".join(lines).strip()
