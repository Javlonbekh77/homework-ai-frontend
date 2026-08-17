import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_TIMEOUT_SECONDS = 45
GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqAIError(RuntimeError):
    """Raised when Groq does not return a usable chat response."""


async def chat_completion(
    messages: List[Dict[str, str]],
    *,
    model: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 700,
) -> str:
    return await asyncio.to_thread(
        _chat_completion_sync,
        messages,
        model or _get_model_name(),
        temperature,
        max_tokens,
        _get_timeout_seconds(),
    )


def _chat_completion_sync(
    messages: List[Dict[str, str]],
    model: str,
    temperature: float,
    max_tokens: int,
    timeout_seconds: int,
) -> str:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise GroqAIError("GROQ_API_KEY environment variable is not set")

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    request = urllib.request.Request(
        GROQ_CHAT_COMPLETIONS_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=timeout_seconds) as response:
            raw_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        error_body = exc.read().decode("utf-8", errors="ignore")
        logger.error("Groq API HTTP error %s: %s", exc.code, error_body)
        raise GroqAIError(f"Groq API error {exc.code}: {_extract_error_message(error_body)}") from exc
    except urllib.error.URLError as exc:
        logger.error("Groq API connection error: %s", exc)
        raise GroqAIError("Groq API connection error") from exc

    try:
        payload = json.loads(raw_body)
        content = payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
        logger.error("Groq API returned unexpected payload: %s", raw_body[:500])
        raise GroqAIError("Groq returned an unexpected response") from exc

    if not isinstance(content, str) or not content.strip():
        raise GroqAIError("Groq returned an empty response")
    return content.strip()


def _get_model_name() -> str:
    configured_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
    return configured_model or DEFAULT_GROQ_MODEL


def _extract_error_message(raw_body: str) -> str:
    if not raw_body:
        return "empty error body"
    try:
        payload = json.loads(raw_body)
        error = payload.get("error", {})
        if isinstance(error, dict):
            return str(error.get("message") or error.get("code") or raw_body[:300])
        return str(error or raw_body[:300])
    except json.JSONDecodeError:
        return raw_body[:300]


def _get_timeout_seconds() -> int:
    raw_timeout = os.getenv("GROQ_TIMEOUT_SECONDS")
    if not raw_timeout:
        return DEFAULT_GROQ_TIMEOUT_SECONDS
    try:
        return max(5, int(raw_timeout))
    except ValueError:
        logger.warning("Invalid GROQ_TIMEOUT_SECONDS=%r; using default", raw_timeout)
        return DEFAULT_GROQ_TIMEOUT_SECONDS
