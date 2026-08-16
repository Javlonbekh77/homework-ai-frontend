import asyncio
import base64
import json
import logging
import mimetypes
import os
from pathlib import Path
from typing import Type, TypeVar

from google import genai
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
LEGACY_MODELS = {
    "gemini-1.5-flash",
    "gemini-1.5-pro",
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-2.0-flash-lite",
    "gemini-2.0-flash-lite-001",
    "gemini-2.5-flash",
}

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
    model_name = _get_model_name()

    async def _request():
        return await client.aio.models.generate_content(
            model=model_name,
            contents=[
                user_task,
                _image_input(image_path)
            ],
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json",
                "response_schema": schema.model_json_schema(),
                "temperature": 0.1,
                "thinking_config": {"thinking_budget": 0}
            }
        )

    try:
        interaction = await asyncio.wait_for(_request(), timeout=timeout_seconds + 5)
    except asyncio.TimeoutError as exc:
        raise GeminiAnalysisError("Gemini request timed out") from exc
    except Exception as exc:
        logging.error(f"Gemini generation error: {exc}")
        raise GeminiAnalysisError(f"Gemini API error: {exc}") from exc
    finally:
        client.close()

    logging.info("Gemini request completed")
    
    output_text = ""
    try:
        output_text = interaction.text
    except Exception:
        if hasattr(interaction, "candidates") and interaction.candidates:
            output_text = interaction.candidates[0].content.parts[0].text
            
    return _parse_structured_response(output_text, schema)


def _get_timeout_seconds() -> int:
    raw_timeout = os.getenv("GEMINI_TIMEOUT_SECONDS")
    if not raw_timeout:
        return DEFAULT_TIMEOUT_SECONDS
    try:
        return max(5, int(raw_timeout))
    except ValueError:
        logging.warning("Invalid GEMINI_TIMEOUT_SECONDS=%r; using default", raw_timeout)
        return DEFAULT_TIMEOUT_SECONDS


def _get_model_name() -> str:
    raw_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()
    if not raw_model:
        return DEFAULT_MODEL

    normalized_model = raw_model.removeprefix("models/")
    if normalized_model in LEGACY_MODELS:
        logging.warning("Configured Gemini model %s is legacy; using %s", raw_model, DEFAULT_MODEL)
        return DEFAULT_MODEL

    return normalized_model


def _image_input(image_path: str) -> dict:
    path = Path(image_path)
    mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    image_b64 = base64.b64encode(path.read_bytes()).decode("utf-8")
    return {
        "inline_data": {
            "mime_type": mime_type,
            "data": image_b64
        }
    }


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
