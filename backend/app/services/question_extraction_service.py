import time
import logging
import asyncio
import mimetypes
import base64
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

from google import genai
from pydantic import ValidationError

from .firebase_service import get_db
from .gemini_service import get_client
from .schemas import AIExtractionResult

logger = logging.getLogger(__name__)

QUESTION_EXTRACTION_SYSTEM_PROMPT = """You are an expert mathematics teacher assistant preparing a Question Bank.
Your task is to analyze the teacher's mathematical material (which can be a text description or a photo of a textbook/worksheet) and extract all individual mathematical questions.

You are given:
1. Grade level.
2. Mathematics Topic name.
3. List of allowed Skills for this Topic.

For each question:
1. Extract the exact question. Transcribe and translate it into Uzbek if it's in another language. Keep the mathematical notation clean (e.g. x^2, √, fraction formatting).
2. Determine the question type:
   - "multiple_choice": multiple-choice question. You MUST fill "options" (list of choices) and "correct_option_index" (0-based integer index of correct option).
   - "numeric": requires a numeric answer. "correct_answer" must be a number (float/int representation as string, e.g. "5" or "1.5" or comma/semicolon-separated roots like "2,3").
   - "short_answer": requires a short text answer. You MUST fill "accepted_answers" with valid acceptable answer strings.
3. Map the question strictly to the relevant skills from the allowed skills list. Use the "slug" field of the skill. If the question doesn't map to any of the allowed skills, leave "skill_slugs" empty. Do NOT invent new skill slugs.
4. Provide a step-by-step solution explanation in Uzbek.
5. Estimate difficulty: 1 (easy), 2 (medium), 3 (hard).
6. Determine if the question can be generalized using controlled numeric variation (i.e. changing numbers retains the same complexity and targeted skills). If yes, set "variant_allowed" to true and provide the "variant" details:
   - "template_type": a slug representing the formula template (e.g. "ax_plus_b_equals_c", "quadratic_equation")
   - "parameters": key-value pairs of the constants in the equation (e.g. {"a": 2, "b": 7, "c": 19})
7. Assess confidence for this question (0.0 to 1.0).

Return data strictly matching the requested JSON schema.
"""

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

def _get_model_name() -> str:
    return os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip()

async def log_ai_request(
    teacher_id: str,
    model: str,
    latency: float,
    status: str,
    num_questions: int,
    error_msg: Optional[str] = None
):
    try:
        db = get_db()
        log_data = {
            "teacher_id": teacher_id,
            "request_type": "question_bank_extraction",
            "model": model,
            "latency": latency,
            "status": status,
            "number_of_questions_extracted": num_questions,
            "created_at": time.time(),
        }
        if error_msg:
            log_data["error"] = error_msg
        db.collection("ai_logs").add(log_data)
    except Exception as e:
        logger.error(f"Failed to save AI log to Firestore: {e}")

async def extract_questions_from_material(
    teacher_id: str,
    grade: int,
    topic_name: str,
    allowed_skills: List[Dict[str, Any]],
    image_path: Optional[str] = None,
    text_content: Optional[str] = None
) -> AIExtractionResult:
    start_time = time.time()
    model_name = _get_model_name()
    client = get_client()

    skills_desc = "\n".join([
        f"- Slug: {s['slug']} | Name: {s['name']} | Description: {s.get('description', '')}"
        for s in allowed_skills
    ])

    user_task = (
        f"Grade: {grade}\n"
        f"Topic: {topic_name}\n"
        f"Allowed Skills for this Topic:\n{skills_desc}\n\n"
    )

    if text_content:
        user_task += f"Teacher Material Text Content:\n{text_content}\n\n"
    else:
        user_task += "Teacher Material is provided in the uploaded image.\n\n"

    user_task += "Please analyze the material, extract all questions, solve them, and return the structured JSON result."

    contents = [user_task]
    if image_path:
        contents.append(_image_input(image_path))

    async def _request():
        return await client.aio.models.generate_content(
            model=model_name,
            contents=contents,
            config={
                "system_instruction": QUESTION_EXTRACTION_SYSTEM_PROMPT,
                "response_mime_type": "application/json",
                "response_schema": AIExtractionResult.model_json_schema(),
                "temperature": 0.1,
                "thinking_config": {"thinking_budget": 0}
            }
        )

    try:
        interaction = await asyncio.wait_for(_request(), timeout=70.0)
        output_text = ""
        try:
            output_text = interaction.text
        except Exception:
            if hasattr(interaction, "candidates") and interaction.candidates:
                output_text = interaction.candidates[0].content.parts[0].text

        if not output_text or not output_text.strip():
            raise RuntimeError("Gemini returned empty text")

        # Parse JSON
        import json
        from .gemini_service import _strip_json_fence
        clean_text = _strip_json_fence(output_text)
        payload = json.loads(clean_text)
        
        result = AIExtractionResult.model_validate(payload)
        
        # Log success
        latency = time.time() - start_time
        await log_ai_request(
            teacher_id=teacher_id,
            model=model_name,
            latency=latency,
            status="success",
            num_questions=len(result.questions)
        )
        return result

    except Exception as e:
        latency = time.time() - start_time
        await log_ai_request(
            teacher_id=teacher_id,
            model=model_name,
            latency=latency,
            status="error",
            num_questions=0,
            error_msg=str(e)
        )
        logger.error(f"Error extracting questions: {e}")
        raise e
    finally:
        client.close()
