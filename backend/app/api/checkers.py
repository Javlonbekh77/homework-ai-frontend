import json
import os
import tempfile
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .users import get_current_user
from ..services.firebase_service import get_db
from ..services.gemini_service import (
    evaluate_control_work,
    evaluate_diktant,
    extract_test_answers,
)

router = APIRouter()


class ManualTestCheckRequest(BaseModel):
    title: str = "Test"
    class_id: Optional[str] = None
    class_name: Optional[str] = None
    student_id: Optional[str] = None
    student_name: str
    subject: str = "Matematika"
    max_score: float = Field(default=20, gt=0)
    answer_key: Dict[str, str]
    student_answers: Dict[str, str]


ERROR_LABELS = {
    "spelling": "Imlo xatosi",
    "punctuation": "Tinish belgisi",
    "missing_word": "Tushib qolgan so'z",
    "extra_word": "Ortiqcha so'z",
    "wrong_word": "Noto'g'ri so'z",
    "capitalization": "Katta/kichik harf",
    "uncertain": "Aniq o'qilmadi",
}

CONTROL_STATUS_LABELS = {
    "correct": "To'g'ri",
    "partial": "Qisman",
    "incorrect": "Xato",
    "missing": "Tushib qolgan",
    "uncertain": "Aniq emas",
}


@router.post("/checkers/diktant")
async def check_diktant(
    original_text: str = Form(...),
    student_name: str = Form(...),
    class_name: Optional[str] = Form(None),
    student_id: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    title: str = Form("Diktant"),
    subject: str = Form("Ona tili"),
    max_score: float = Form(10),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _ensure_teacher(current_user)
    if len(original_text.strip()) < 5:
        raise HTTPException(status_code=400, detail="Original diktant matni juda qisqa")

    tmp_path = await _save_upload_temporarily(image)
    try:
        evaluation = await evaluate_diktant(tmp_path, original_text.strip())
        result = evaluation.model_dump()
        score = _score_from_percent(result.get("suggested_score_percent", 0), max_score)
        payload = {
            "score": score,
            "max": max_score,
            "max_score": max_score,
            "percentage": _percentage(score, max_score),
            "totalErrors": result.get("total_errors", len(result.get("errors", []))),
            "errors": _format_diktant_errors(result.get("errors", [])),
            "feedback": result.get("general_feedback", ""),
            "student_text": result.get("transcribed_student_text", ""),
            "raw_result": result,
        }
        result_id = _save_assessment_result(
            assessment_type="diktant",
            current_user=current_user,
            title=title,
            subject=subject,
            class_id=class_id,
            class_name=class_name,
            student_id=student_id,
            student_name=student_name,
            score=score,
            max_score=max_score,
            result=payload,
        )
        return {"id": result_id, **payload}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        _remove_temp_file(tmp_path)


@router.post("/checkers/tests/manual")
async def check_test_manual(
    req: ManualTestCheckRequest,
    current_user: dict = Depends(get_current_user),
):
    _ensure_teacher(current_user)
    result = _grade_test_answers(
        answer_key=req.answer_key,
        student_answers=req.student_answers,
        max_score=req.max_score,
    )
    result_id = _save_assessment_result(
        assessment_type="test",
        current_user=current_user,
        title=req.title,
        subject=req.subject,
        class_id=req.class_id,
        class_name=req.class_name,
        student_id=req.student_id,
        student_name=req.student_name,
        score=result["score"],
        max_score=req.max_score,
        result=result,
    )
    return {"id": result_id, **result}


@router.post("/checkers/tests/scan")
async def check_test_scan(
    answer_key_json: str = Form(...),
    student_name: str = Form(...),
    class_name: Optional[str] = Form(None),
    student_id: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    title: str = Form("Test"),
    subject: str = Form("Matematika"),
    max_score: float = Form(20),
    question_count: Optional[int] = Form(None),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _ensure_teacher(current_user)
    answer_key = _parse_answer_key(answer_key_json)
    expected_count = question_count or len(answer_key)
    if expected_count <= 0:
        raise HTTPException(status_code=400, detail="Savollar soni noto'g'ri")

    tmp_path = await _save_upload_temporarily(image)
    try:
        extraction = await extract_test_answers(tmp_path, expected_count)
        extracted = extraction.model_dump()
        student_answers = {
            item.get("question_number", ""): item.get("selected_answer", "")
            for item in extracted.get("answers", [])
            if item.get("question_number")
        }
        result = _grade_test_answers(
            answer_key=answer_key,
            student_answers=student_answers,
            max_score=max_score,
        )
        result["extracted_student_answers"] = student_answers
        result["extraction"] = extracted
        result_id = _save_assessment_result(
            assessment_type="test",
            current_user=current_user,
            title=title,
            subject=subject,
            class_id=class_id,
            class_name=class_name,
            student_id=student_id,
            student_name=student_name,
            score=result["score"],
            max_score=max_score,
            result=result,
        )
        return {"id": result_id, **result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        _remove_temp_file(tmp_path)


@router.post("/checkers/control-work")
async def check_control_work(
    title: str = Form(...),
    subject: str = Form("Matematika"),
    student_name: str = Form(...),
    class_name: Optional[str] = Form(None),
    student_id: Optional[str] = Form(None),
    class_id: Optional[str] = Form(None),
    max_score: float = Form(10),
    criteria_text: str = Form(""),
    answer_key_json: str = Form(""),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    _ensure_teacher(current_user)
    tmp_path = await _save_upload_temporarily(image)
    try:
        evaluation = await evaluate_control_work(
            tmp_path,
            title=title,
            subject=subject,
            criteria_text=criteria_text,
            answer_key_json=answer_key_json,
        )
        raw_result = evaluation.model_dump()
        score = _score_from_percent(raw_result.get("suggested_score_percent", 0), max_score)
        problems = _format_control_work_problems(raw_result.get("problems", []))
        result = {
            "score": score,
            "max": max_score,
            "max_score": max_score,
            "percentage": _percentage(score, max_score),
            "correct": raw_result.get("correct_count", 0),
            "partial": raw_result.get("partial_count", 0),
            "wrong": raw_result.get("incorrect_count", 0),
            "missing": raw_result.get("missing_count", 0),
            "uncertain": raw_result.get("uncertain_count", 0),
            "problems": problems,
            "feedback": raw_result.get("general_feedback", ""),
            "teacher_private_feedback": raw_result.get("teacher_private_feedback", ""),
            "raw_result": raw_result,
        }
        result_id = _save_assessment_result(
            assessment_type="control_work",
            current_user=current_user,
            title=title,
            subject=subject,
            class_id=class_id,
            class_name=class_name,
            student_id=student_id,
            student_name=student_name,
            score=score,
            max_score=max_score,
            result=result,
        )
        return {"id": result_id, **result}
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        _remove_temp_file(tmp_path)


def _ensure_teacher(current_user: dict) -> None:
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can use checkers")


async def _save_upload_temporarily(upload: UploadFile) -> str:
    suffix = os.path.splitext(upload.filename or "")[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await upload.read()
        if not content:
            raise HTTPException(status_code=400, detail="Yuklangan fayl bo'sh")
        tmp.write(content)
        return tmp.name


def _remove_temp_file(path: str) -> None:
    if path and os.path.exists(path):
        os.remove(path)


def _score_from_percent(percent: Any, max_score: float) -> float:
    try:
        safe_percent = max(0.0, min(100.0, float(percent)))
    except (TypeError, ValueError):
        safe_percent = 0.0
    return round((safe_percent / 100.0) * max_score, 1)


def _percentage(score: float, max_score: float) -> float:
    if max_score <= 0:
        return 0.0
    return round((score / max_score) * 100, 1)


def _format_diktant_errors(errors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    formatted = []
    for error in errors:
        error_type = error.get("error_type", "uncertain")
        formatted.append({
            "original": error.get("original_text", ""),
            "student": error.get("student_text", ""),
            "type": error.get("label") or ERROR_LABELS.get(error_type, "Xato"),
            "error_type": error_type,
            "explanation": error.get("explanation", ""),
            "suggestion": error.get("suggestion", ""),
            "severity": error.get("severity", "medium"),
        })
    return formatted


def _format_control_work_problems(problems: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    formatted = []
    for problem in problems:
        status = problem.get("status", "uncertain")
        number = problem.get("problem_number", "")
        feedback = problem.get("feedback", "")
        error_text = "; ".join(
            error.get("description", "")
            for error in problem.get("errors", [])
            if error.get("description")
        )
        desc_parts = [part for part in [number and f"{number}-misol", feedback, error_text] if part]
        formatted.append({
            "status": CONTROL_STATUS_LABELS.get(status, "Aniq emas"),
            "status_key": status,
            "desc": ": ".join(desc_parts) if desc_parts else "AI izoh topa olmadi.",
            "score_percent": problem.get("score_percent", 0),
            "expected_answer": problem.get("expected_answer", ""),
            "student_answer": problem.get("student_answer", ""),
            "confidence": problem.get("confidence", 0),
            "raw": problem,
        })
    return formatted


def _parse_answer_key(raw_answer_key: str) -> Dict[str, str]:
    try:
        payload = json.loads(raw_answer_key)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Javob kaliti JSON formatida emas") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Javob kaliti obyekt bo'lishi kerak")
    return {str(key): str(value) for key, value in payload.items()}


def _grade_test_answers(
    *,
    answer_key: Dict[str, str],
    student_answers: Dict[str, str],
    max_score: float,
) -> Dict[str, Any]:
    if not answer_key:
        raise HTTPException(status_code=400, detail="Javob kaliti bo'sh")

    normalized_key = {str(key): _normalize_answer(value) for key, value in answer_key.items()}
    normalized_student = {str(key): _normalize_answer(value) for key, value in student_answers.items()}
    details = []
    correct = 0
    wrong = 0
    blank = 0
    wrong_questions = []

    for question_number in sorted(normalized_key.keys(), key=_question_sort_key):
        expected = normalized_key[question_number]
        student = normalized_student.get(question_number, "")
        if not student:
            status = "blank"
            blank += 1
            wrong_questions.append(_question_number_for_ui(question_number))
        elif student == expected:
            status = "correct"
            correct += 1
        else:
            status = "wrong"
            wrong += 1
            wrong_questions.append(_question_number_for_ui(question_number))

        details.append({
            "question_number": question_number,
            "expected": expected,
            "student": student,
            "status": status,
        })

    total = len(normalized_key)
    score = round((correct / total) * max_score, 1) if total else 0.0
    percentage = _percentage(score, max_score)
    return {
        "score": score,
        "max": max_score,
        "max_score": max_score,
        "correct": correct,
        "wrong": wrong,
        "blank": blank,
        "total": total,
        "percentage": percentage,
        "wrongQs": wrong_questions,
        "wrong_questions": wrong_questions,
        "details": details,
    }


def _normalize_answer(value: Any) -> str:
    return str(value or "").strip().upper().replace(".", "")


def _question_sort_key(question_number: str) -> tuple[int, Any]:
    try:
        return (0, int(question_number))
    except (TypeError, ValueError):
        return (1, str(question_number))


def _question_number_for_ui(question_number: str) -> Any:
    try:
        return int(question_number)
    except (TypeError, ValueError):
        return question_number


def _save_assessment_result(
    *,
    assessment_type: str,
    current_user: dict,
    title: str,
    subject: str,
    class_id: Optional[str],
    class_name: Optional[str],
    student_id: Optional[str],
    student_name: str,
    score: float,
    max_score: float,
    result: Dict[str, Any],
) -> str:
    db = get_db()
    created_at = datetime.utcnow()
    percentage = _percentage(score, max_score)
    assessment = {
        "assessment_type": assessment_type,
        "teacher_id": current_user["id"],
        "title": title,
        "subject": subject,
        "class_id": class_id,
        "class_name": class_name,
        "student_id": student_id,
        "student_name": student_name,
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "result": result,
        "status": "checked",
        "created_at": created_at,
        "updated_at": created_at,
    }
    doc_ref = db.collection("assessment_results").document()
    doc_ref.set(assessment)

    journal_entry = {
        "source": "ai_checker",
        "source_result_id": doc_ref.id,
        "assessment_type": assessment_type,
        "teacher_id": current_user["id"],
        "class_id": class_id,
        "class_name": class_name,
        "student_id": student_id,
        "student_name": student_name,
        "subject": subject,
        "title": title,
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "status": "draft",
        "created_at": created_at,
    }
    db.collection("journal_entries").document().set(journal_entry)

    if student_id:
        db.collection("student_progress_events").document().set({
            "source": "ai_checker",
            "source_result_id": doc_ref.id,
            "student_id": student_id,
            "teacher_id": current_user["id"],
            "class_id": class_id,
            "subject": subject,
            "assessment_type": assessment_type,
            "title": title,
            "score": score,
            "max_score": max_score,
            "percentage": percentage,
            "created_at": created_at,
        })

    return doc_ref.id
