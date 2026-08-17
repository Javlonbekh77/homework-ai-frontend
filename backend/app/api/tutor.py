from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from .users import get_current_user
from ..services.firebase_service import get_db
from ..services.groq_service import GroqAIError, chat_completion

router = APIRouter()


class TutorHistoryMessage(BaseModel):
    sender: Literal["user", "ai"]
    text: str


class StudentTutorChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1200)
    homework_id: Optional[str] = None
    history: List[TutorHistoryMessage] = Field(default_factory=list)


@router.post("/student/tutor/chat")
async def student_tutor_chat(
    req: StudentTutorChatRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can use AI tutor")

    db = get_db()
    mistake_context = _load_homework_mistake_context(
        db=db,
        student_id=current_user["id"],
        homework_id=req.homework_id,
    )
    if not mistake_context:
        answer = (
            "Hozircha tekshirilgan uy vazifangizdan aniq xato topilmadi. "
            "Men faqat uy vazifadagi xatolarni tushuntirish uchun ishlayman."
        )
        message_id = _save_tutor_message(
            db=db,
            student_id=current_user["id"],
            request_text=req.message,
            response_text=answer,
            context=[],
            model="local_no_context",
        )
        return {"id": message_id, "answer": answer, "context": []}

    messages = _build_tutor_messages(
        student_name=current_user.get("full_name", "O'quvchi"),
        student_question=req.message,
        mistake_context=mistake_context,
        history=req.history[-6:],
    )

    try:
        answer = await chat_completion(messages)
    except GroqAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    message_id = _save_tutor_message(
        db=db,
        student_id=current_user["id"],
        request_text=req.message,
        response_text=answer,
        context=mistake_context,
        model="groq",
    )
    return {"id": message_id, "answer": answer, "context": mistake_context}


def _load_homework_mistake_context(
    *,
    db: Any,
    student_id: str,
    homework_id: Optional[str] = None,
) -> List[Dict[str, Any]]:
    query = db.collection("submissions").where("student_id", "==", student_id)
    if homework_id:
        query = query.where("homework_id", "==", homework_id)
    docs = list(query.stream())
    submissions = [{"id": doc.id, **doc.to_dict()} for doc in docs]
    submissions.sort(key=lambda item: str(item.get("submitted_at") or ""), reverse=True)

    context: List[Dict[str, Any]] = []
    for submission in submissions[:8]:
        grading = submission.get("grading_result") or {}
        homework_title = _get_homework_title(db, submission.get("homework_id"))
        for problem in grading.get("problems", []):
            if problem.get("status") == "correct":
                continue
            errors = problem.get("errors", [])
            first_error = errors[0] if errors else {}
            label = first_error.get("description") or problem.get("feedback") or "Uy vazifadagi xato"
            suggestion = first_error.get("suggestion") or problem.get("feedback") or ""
            context.append({
                "submission_id": submission.get("id"),
                "homework_id": submission.get("homework_id"),
                "homework_title": homework_title,
                "problem_number": problem.get("problem_number", ""),
                "status": problem.get("status", ""),
                "expected_answer": problem.get("expected_answer", ""),
                "student_answer": problem.get("student_answer", ""),
                "student_steps": problem.get("student_steps", []),
                "label": label,
                "suggestion": suggestion,
                "feedback": problem.get("feedback", ""),
            })
            if len(context) >= 6:
                return context
    return context


def _get_homework_title(db: Any, homework_id: Optional[str]) -> str:
    if not homework_id:
        return "Uy vazifa"
    doc = db.collection("homeworks").document(homework_id).get()
    if not doc.exists:
        return "Uy vazifa"
    return doc.to_dict().get("title") or "Uy vazifa"


def _build_tutor_messages(
    *,
    student_name: str,
    student_question: str,
    mistake_context: List[Dict[str, Any]],
    history: List[TutorHistoryMessage],
) -> List[Dict[str, str]]:
    context_text = "\n".join(
        (
            f"- Vazifa: {item.get('homework_title')}; "
            f"Masala: {item.get('problem_number') or 'nomalum'}; "
            f"Holat: {item.get('status')}; "
            f"O'quvchi javobi: {item.get('student_answer') or 'korinmadi'}; "
            f"To'g'ri javob: {item.get('expected_answer') or 'berilmagan'}; "
            f"Xato: {item.get('label')}; "
            f"Tavsiya: {item.get('suggestion') or item.get('feedback')}"
        )
        for item in mistake_context
    )
    messages: List[Dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "Siz Uzbek tilida gapiradigan AI tutor ekansiz. "
                "Faqat o'quvchining tekshirilgan uy vazifasida topilgan xatolarini tushuntiring. "
                "Agar savol shu xatolar kontekstidan tashqarida bo'lsa, muloyimlik bilan uy vazifadagi xatoga qaytaring. "
                "Javobni qisqa, bosqichma-bosqich va ruhlantiruvchi qiling. "
                "Yangi mustaqil masalalarni yechib bermang, faqat xato sababini va tuzatish usulini tushuntiring."
            ),
        },
        {
            "role": "user",
            "content": (
                f"O'quvchi: {student_name}\n\n"
                "UY VAZIFA XATOLARI KONTEKSTI:\n"
                f"{context_text}\n\n"
                "Shu kontekstdan chiqmasdan javob bering."
            ),
        },
    ]
    for item in history:
        messages.append({
            "role": "assistant" if item.sender == "ai" else "user",
            "content": item.text[:1200],
        })
    messages.append({"role": "user", "content": student_question})
    return messages


def _save_tutor_message(
    *,
    db: Any,
    student_id: str,
    request_text: str,
    response_text: str,
    context: List[Dict[str, Any]],
    model: str,
) -> str:
    created_at = datetime.utcnow()
    doc_ref = db.collection("ai_tutor_messages").document()
    doc_ref.set({
        "student_id": student_id,
        "request_text": request_text,
        "response_text": response_text,
        "context": context,
        "model": model,
        "created_at": created_at,
    })
    db.collection("ai_logs").document().set({
        "user_id": student_id,
        "request_type": "student_tutor_chat",
        "model": model,
        "status": "success",
        "context_items": len(context),
        "created_at": created_at,
    })
    return doc_ref.id
