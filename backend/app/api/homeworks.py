from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
import tempfile
import os
import json

from ..services.firebase_service import get_db
from ..services.gemini_service import extract_book_problems, evaluate_homework
from ..models.api_schemas import (
    HomeworkBankAssignRequest,
    HomeworkDraftRequest,
    HomeworkApproveKeyRequest,
    HomeworkPublishRequest,
    HomeworkUpdateRequest,
)
from .users import get_current_user

router = APIRouter()


def _as_float(value, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def _average(values) -> float:
    clean_values = [_as_float(value) for value in values if value is not None]
    return round(sum(clean_values) / len(clean_values), 1) if clean_values else 0.0


def _percent(part: int, total: int) -> float:
    return round((part / total) * 100, 1) if total else 0.0


def _date_key(value) -> float:
    if hasattr(value, "timestamp"):
        return float(value.timestamp())
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp()
        except ValueError:
            return 0.0
    return 0.0


def _latest_attempts(rows):
    latest = {}
    for row in rows:
        homework_id = row.get("homework_id")
        student_id = row.get("student_id")
        if not homework_id or not student_id:
            continue

        key = (homework_id, student_id)
        current_rank = (_date_key(row.get("submitted_at")), _as_float(row.get("attempt_number")))
        previous = latest.get(key)
        previous_rank = (
            _date_key(previous.get("submitted_at")),
            _as_float(previous.get("attempt_number")),
        ) if previous else (-1.0, -1.0)

        if current_rank >= previous_rank:
            latest[key] = row

    return list(latest.values())


def _score_values(rows, key: str):
    return [row.get(key) for row in rows if isinstance(row.get(key), (int, float))]


def _latest_at(rows):
    if not rows:
        return None
    return max((row.get("submitted_at") for row in rows), key=_date_key)


# ----------------- TEACHER ENDPOINTS -----------------

def _verify_teacher_class(db, class_id: str, teacher_id: str):
    cls = db.collection("classes").document(class_id).get()
    if not cls.exists or cls.to_dict().get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="You do not own this class")
    return cls.to_dict()


def _homework_response(doc_id: str, data: dict) -> dict:
    return {"id": doc_id, **data}


def _bank_response(doc_id: str, data: dict) -> dict:
    return {"id": doc_id, **data}


def _build_bank_item_from_draft(req: HomeworkDraftRequest, current_user: dict, subject: str) -> dict:
    created_at = datetime.utcnow()
    return {
        "teacher_id": current_user["id"],
        "title": req.title,
        "description": req.description,
        "subject": subject,
        "status": "draft",
        "workflow_status": "draft_created",
        "selected_problem_range": None,
        "ai_generated_answer_key": None,
        "approved_answer_key": None,
        "answer_key_approved": False,
        "created_at": created_at,
        "updated_at": created_at,
    }


def _build_assignment_from_bank(bank_item_id: str, bank_item: dict, class_id: Optional[str], class_data: Optional[dict], publish: bool = False) -> dict:
    now = datetime.utcnow()
    answer_key_approved = bool(bank_item.get("answer_key_approved"))
    status = "published" if publish and answer_key_approved and class_id else "draft"
    workflow_status = "published" if status == "published" else (bank_item.get("workflow_status") or "draft_created")
    return {
        "bank_item_id": bank_item_id,
        "class_id": class_id if status == "published" else class_id,
        "target_class_id": class_id,
        "target_class_name": class_data.get("name") if class_data else None,
        "teacher_id": bank_item["teacher_id"],
        "title": bank_item.get("title") or "Nomsiz vazifa",
        "description": bank_item.get("description"),
        "subject": (class_data.get("subject") if class_data else None) or bank_item.get("subject") or "Matematika",
        "status": status,
        "workflow_status": workflow_status,
        "selected_problem_range": bank_item.get("selected_problem_range"),
        "ai_generated_answer_key": bank_item.get("ai_generated_answer_key"),
        "approved_answer_key": bank_item.get("approved_answer_key"),
        "answer_key_approved": answer_key_approved,
        "created_at": now,
        "updated_at": now,
        "published_at": now if status == "published" else None,
        "max_score": 10,
        "allow_resubmission": True,
    }


def _sync_bank_item(db, homework: dict, updates: dict) -> None:
    bank_item_id = homework.get("bank_item_id")
    if not bank_item_id:
        return
    bank_ref = db.collection("homework_bank").document(bank_item_id)
    bank_doc = bank_ref.get()
    if not bank_doc.exists or bank_doc.to_dict().get("teacher_id") != homework.get("teacher_id"):
        return
    bank_updates = {
        key: value
        for key, value in updates.items()
        if key in {
            "title",
            "description",
            "subject",
            "selected_problem_range",
            "ai_generated_answer_key",
            "approved_answer_key",
            "answer_key_approved",
            "workflow_status",
        }
    }
    if bank_updates:
        bank_updates["updated_at"] = datetime.utcnow()
        bank_ref.update(bank_updates)
        assignment_docs = db.collection("homeworks").where("bank_item_id", "==", bank_item_id).stream()
        for assignment_doc in assignment_docs:
            assignment = assignment_doc.to_dict()
            if assignment.get("teacher_id") == homework.get("teacher_id"):
                assignment_doc.reference.update(bank_updates)


@router.post("/homeworks")
async def create_homework_draft(req: HomeworkDraftRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create homeworks")

    db = get_db()
    target_class = None
    if req.class_id:
        target_class = _verify_teacher_class(db, req.class_id, current_user["id"])
    subject = target_class.get("subject") if target_class else req.subject

    bank_ref = db.collection("homework_bank").document()
    bank_item = _build_bank_item_from_draft(req, current_user, subject)

    homework_data = {
        "bank_item_id": bank_ref.id,
        "class_id": req.class_id,
        "target_class_id": req.class_id,
        "target_class_name": target_class.get("name") if target_class else None,
        "teacher_id": current_user["id"],
        "title": req.title,
        "description": req.description,
        "subject": subject,
        "status": "draft",
        "workflow_status": "draft_created",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "max_score": 10,
        "allow_resubmission": True,
        "answer_key_approved": False
    }

    doc_ref = db.collection("homeworks").document()
    bank_item["latest_assignment_id"] = doc_ref.id
    doc_ref.set(homework_data)
    bank_ref.set(bank_item)
    return _homework_response(doc_ref.id, homework_data)


@router.post("/classes/{class_id}/homeworks")
async def create_homework(class_id: str, req: HomeworkDraftRequest, current_user: dict = Depends(get_current_user)):
    req.class_id = class_id
    return await create_homework_draft(req, current_user)

@router.get("/classes/{class_id}/homeworks")
async def list_class_homeworks(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") == "teacher":
        _verify_teacher_class(db, class_id, current_user["id"])

    assigned_docs = list(db.collection("homeworks").where("class_id", "==", class_id).stream())
    target_docs = list(db.collection("homeworks").where("target_class_id", "==", class_id).stream())
    docs_by_id = {doc.id: doc for doc in [*assigned_docs, *target_docs]}
    hw_list = [_homework_response(h.id, h.to_dict()) for h in docs_by_id.values()]
    hw_list.sort(key=lambda item: _date_key(item.get("created_at")), reverse=True)
    return hw_list

@router.get("/teacher/homeworks")
async def list_teacher_homeworks(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can list homeworks")
        
    db = get_db()
    hw_docs = db.collection("homeworks").where("teacher_id", "==", current_user["id"]).stream()
    homeworks = [_homework_response(h.id, h.to_dict()) for h in hw_docs]
    homeworks.sort(key=lambda item: _date_key(item.get("created_at")), reverse=True)
    return homeworks


@router.get("/homework-bank")
async def list_homework_bank(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view homework bank")

    db = get_db()
    bank_docs = db.collection("homework_bank").where("teacher_id", "==", current_user["id"]).stream()
    items = []
    for doc in bank_docs:
        data = doc.to_dict()
        assignment_docs = db.collection("homeworks").where("bank_item_id", "==", doc.id).stream()
        assignments = [_homework_response(item.id, item.to_dict()) for item in assignment_docs]
        data["assignment_count"] = len(assignments)
        data["assigned_class_ids"] = sorted({
            item.get("target_class_id") or item.get("class_id")
            for item in assignments
            if item.get("target_class_id") or item.get("class_id")
        })
        items.append(_bank_response(doc.id, data))

    items.sort(key=lambda item: _date_key(item.get("updated_at") or item.get("created_at")), reverse=True)
    return items


@router.post("/homework-bank/{bank_item_id}/assign")
async def assign_homework_bank_item(bank_item_id: str, req: HomeworkBankAssignRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can assign homework bank items")

    db = get_db()
    bank_ref = db.collection("homework_bank").document(bank_item_id)
    bank_doc = bank_ref.get()
    if not bank_doc.exists or bank_doc.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=404, detail="Homework bank item not found")

    class_data = _verify_teacher_class(db, req.class_id, current_user["id"])
    bank_item = bank_doc.to_dict()
    if req.publish and not bank_item.get("answer_key_approved"):
        raise HTTPException(status_code=400, detail="Tasdiqlanmagan vazifani publish qilib bo'lmaydi")

    existing_docs = db.collection("homeworks").where("bank_item_id", "==", bank_item_id).stream()
    for existing_doc in existing_docs:
        existing = existing_doc.to_dict()
        existing_class_id = existing.get("target_class_id") or existing.get("class_id")
        if existing_class_id == req.class_id and existing.get("status") != "archived":
            return {
                "status": "already_assigned",
                "homework": _homework_response(existing_doc.id, existing),
            }

    assignment = _build_assignment_from_bank(bank_item_id, bank_item, req.class_id, class_data, publish=req.publish)
    doc_ref = db.collection("homeworks").document()
    doc_ref.set(assignment)
    bank_ref.update({
        "latest_assignment_id": doc_ref.id,
        "updated_at": datetime.utcnow(),
    })
    return {
        "status": "assigned",
        "homework": _homework_response(doc_ref.id, assignment),
    }


@router.get("/teacher/dashboard")
async def get_teacher_dashboard(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view dashboard")

    db = get_db()
    teacher_id = current_user["id"]

    class_docs = list(db.collection("classes").where("teacher_id", "==", teacher_id).stream())
    class_map = {}
    student_ids = set()
    student_classes = {}

    for doc in class_docs:
        data = doc.to_dict()
        class_map[doc.id] = {
            "id": doc.id,
            "name": data.get("name") or "Nomsiz sinf",
            "subject": data.get("subject") or "Noma'lum fan",
            "join_code": data.get("join_code"),
            "created_at": data.get("created_at"),
            "student_ids": set(),
            "homework_ids": [],
        }

    for class_id, class_data in class_map.items():
        members = db.collection("class_members").where("class_id", "==", class_id).stream()
        for member in members:
            member_data = member.to_dict()
            if member_data.get("status", "active") != "active":
                continue
            student_id = member_data.get("student_id")
            if not student_id:
                continue
            class_data["student_ids"].add(student_id)
            student_ids.add(student_id)
            student_classes.setdefault(student_id, set()).add(class_id)

    student_map = {}
    for student_id in student_ids:
        student_doc = db.collection("users").document(student_id).get()
        if student_doc.exists:
            student_map[student_id] = student_doc.to_dict()

    homework_docs = list(db.collection("homeworks").where("teacher_id", "==", teacher_id).stream())
    homework_map = {}
    for doc in homework_docs:
        data = doc.to_dict()
        class_id = data.get("class_id")
        if class_id and class_id in class_map:
            class_map[class_id]["homework_ids"].append(doc.id)

        homework_map[doc.id] = {
            "id": doc.id,
            "bank_item_id": data.get("bank_item_id"),
            "class_id": class_id,
            "target_class_id": data.get("target_class_id"),
            "target_class_name": data.get("target_class_name"),
            "title": data.get("title") or "Nomsiz vazifa",
            "description": data.get("description"),
            "subject": data.get("subject") or class_map.get(class_id, {}).get("subject") or "Noma'lum fan",
            "status": data.get("status") or "draft",
            "workflow_status": data.get("workflow_status"),
            "max_score": data.get("max_score", 10),
            "created_at": data.get("created_at"),
            "published_at": data.get("published_at"),
            "answer_key_approved": data.get("answer_key_approved", False),
        }

    submission_rows = []
    for homework_id, homework in homework_map.items():
        submissions = db.collection("submissions").where("homework_id", "==", homework_id).stream()
        for submission in submissions:
            data = submission.to_dict()
            student_id = data.get("student_id")
            class_id = data.get("class_id") or homework.get("class_id")
            class_data = class_map.get(class_id, {})
            student_data = student_map.get(student_id, {})
            max_score = data.get("max_score") or homework.get("max_score") or 10
            score = data.get("score")
            percentage = data.get("percentage")
            if percentage is None and isinstance(score, (int, float)) and max_score:
                percentage = (score / max_score) * 100

            submission_rows.append({
                "id": submission.id,
                "homework_id": homework_id,
                "homework_title": homework.get("title"),
                "class_id": class_id,
                "class_name": class_data.get("name") or "Noma'lum sinf",
                "subject": homework.get("subject") or class_data.get("subject") or "Noma'lum fan",
                "student_id": student_id,
                "student_name": student_data.get("full_name") or "Noma'lum o'quvchi",
                "telegram_username": student_data.get("telegram_username"),
                "attempt_number": data.get("attempt_number", 1),
                "score": score,
                "max_score": max_score,
                "percentage": percentage,
                "status": data.get("status"),
                "submitted_at": data.get("submitted_at"),
                "grading_result": data.get("grading_result"),
            })

    submission_rows.sort(
        key=lambda row: (_date_key(row.get("submitted_at")), _as_float(row.get("attempt_number"))),
        reverse=True,
    )
    latest_rows = _latest_attempts(submission_rows)
    published_latest_rows = [
        row for row in latest_rows
        if homework_map.get(row.get("homework_id"), {}).get("status") == "published"
    ]

    total_possible_submissions = sum(
        len(class_map.get(homework.get("class_id"), {}).get("student_ids", set()))
        for homework in homework_map.values()
        if homework.get("status") == "published"
    )

    class_stats = []
    for class_id, class_data in class_map.items():
        class_homeworks = [
            homework_map[homework_id]
            for homework_id in class_data["homework_ids"]
            if homework_id in homework_map
        ]
        class_latest = [row for row in latest_rows if row.get("class_id") == class_id]
        class_attempts = [row for row in submission_rows if row.get("class_id") == class_id]
        published_homework_ids = {
            homework["id"] for homework in class_homeworks if homework.get("status") == "published"
        }
        submitted_pairs = {
            (row.get("homework_id"), row.get("student_id"))
            for row in class_latest
            if row.get("homework_id") in published_homework_ids
        }
        possible = len(class_data["student_ids"]) * len(published_homework_ids)

        class_stats.append({
            "id": class_id,
            "name": class_data["name"],
            "subject": class_data["subject"],
            "join_code": class_data.get("join_code"),
            "student_count": len(class_data["student_ids"]),
            "homework_count": len(class_homeworks),
            "published_homework_count": len(published_homework_ids),
            "submission_count": len(class_attempts),
            "submitted_student_count": len({row.get("student_id") for row in class_latest if row.get("student_id")}),
            "average_score": _average(_score_values(class_latest, "score")),
            "average_percentage": _average(_score_values(class_latest, "percentage")),
            "coverage_percent": _percent(len(submitted_pairs), possible),
            "last_submission_at": _latest_at(class_attempts),
        })

    subject_names = sorted({data["subject"] for data in class_map.values()} | {hw["subject"] for hw in homework_map.values()})
    subject_stats = []
    for subject in subject_names:
        subject_class_ids = {class_id for class_id, data in class_map.items() if data.get("subject") == subject}
        subject_homeworks = [hw for hw in homework_map.values() if hw.get("subject") == subject]
        subject_latest = [row for row in latest_rows if row.get("subject") == subject]
        subject_attempts = [row for row in submission_rows if row.get("subject") == subject]
        published_homework_ids = {hw["id"] for hw in subject_homeworks if hw.get("status") == "published"}
        subject_students = set()
        for class_id in subject_class_ids:
            subject_students.update(class_map[class_id]["student_ids"])
        submitted_pairs = {
            (row.get("homework_id"), row.get("student_id"))
            for row in subject_latest
            if row.get("homework_id") in published_homework_ids
        }
        possible = sum(
            len(class_map.get(hw.get("class_id"), {}).get("student_ids", set()))
            for hw in subject_homeworks
            if hw.get("status") == "published"
        )

        subject_stats.append({
            "subject": subject,
            "class_count": len(subject_class_ids),
            "student_count": len(subject_students),
            "homework_count": len(subject_homeworks),
            "published_homework_count": len(published_homework_ids),
            "submission_count": len(subject_attempts),
            "submitted_student_count": len({row.get("student_id") for row in subject_latest if row.get("student_id")}),
            "average_score": _average(_score_values(subject_latest, "score")),
            "average_percentage": _average(_score_values(subject_latest, "percentage")),
            "coverage_percent": _percent(len(submitted_pairs), possible),
            "last_submission_at": _latest_at(subject_attempts),
        })

    homework_stats = []
    for homework_id, homework in homework_map.items():
        homework_latest = [row for row in latest_rows if row.get("homework_id") == homework_id]
        homework_attempts = [row for row in submission_rows if row.get("homework_id") == homework_id]
        class_data = class_map.get(homework.get("class_id"), {})
        student_count = len(class_data.get("student_ids", set()))
        submitted_students = {row.get("student_id") for row in homework_latest if row.get("student_id")}

        homework_stats.append({
            **homework,
            "class_name": class_data.get("name") or homework.get("target_class_name") or "Biriktirilmagan",
            "student_count": student_count,
            "submission_count": len(homework_attempts),
            "submitted_student_count": len(submitted_students),
            "average_score": _average(_score_values(homework_latest, "score")),
            "average_percentage": _average(_score_values(homework_latest, "percentage")),
            "coverage_percent": _percent(len(submitted_students), student_count),
            "last_submission_at": _latest_at(homework_attempts),
        })

    homework_stats.sort(key=lambda hw: _date_key(hw.get("created_at")), reverse=True)

    student_stats = []
    for student_id in student_ids:
        enrolled_class_ids = student_classes.get(student_id, set())
        student_latest = [row for row in latest_rows if row.get("student_id") == student_id]
        student_attempts = [row for row in submission_rows if row.get("student_id") == student_id]
        assigned_homework_count = len([
            homework for homework in homework_map.values()
            if homework.get("status") == "published" and homework.get("class_id") in enrolled_class_ids
        ])
        submitted_homework_ids = {row.get("homework_id") for row in student_latest if row.get("homework_id")}
        student_data = student_map.get(student_id, {})

        student_stats.append({
            "id": student_id,
            "full_name": student_data.get("full_name") or "Noma'lum o'quvchi",
            "telegram_username": student_data.get("telegram_username"),
            "class_ids": sorted(enrolled_class_ids),
            "classes": [
                {
                    "id": class_id,
                    "name": class_map[class_id]["name"],
                    "subject": class_map[class_id]["subject"],
                }
                for class_id in sorted(enrolled_class_ids)
                if class_id in class_map
            ],
            "assigned_homework_count": assigned_homework_count,
            "submitted_homework_count": len(submitted_homework_ids),
            "submission_count": len(student_attempts),
            "average_score": _average(_score_values(student_latest, "score")),
            "average_percentage": _average(_score_values(student_latest, "percentage")),
            "coverage_percent": _percent(len(submitted_homework_ids), assigned_homework_count),
            "last_submission_at": _latest_at(student_attempts),
        })

    student_stats.sort(key=lambda student: (_date_key(student.get("last_submission_at")), student.get("full_name") or ""), reverse=True)

    return {
        "generated_at": datetime.utcnow(),
        "summary": {
            "class_count": len(class_map),
            "subject_count": len(subject_names),
            "student_count": len(student_ids),
            "homework_count": len(homework_map),
            "published_homework_count": len([hw for hw in homework_map.values() if hw.get("status") == "published"]),
            "submission_count": len(submission_rows),
            "submitted_student_count": len({row.get("student_id") for row in latest_rows if row.get("student_id")}),
            "average_score": _average(_score_values(latest_rows, "score")),
            "average_percentage": _average(_score_values(latest_rows, "percentage")),
            "coverage_percent": _percent(len(published_latest_rows), total_possible_submissions),
        },
        "classes": class_stats,
        "subjects": subject_stats,
        "homeworks": homework_stats,
        "students": student_stats,
        "submissions": submission_rows,
    }

@router.post("/homeworks/{homework_id}/analyze-source")
async def analyze_homework_source(
    homework_id: str, 
    problem_range: str = Form(...),
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can analyze source")
        
    db = get_db()
    hw_ref = db.collection("homeworks").document(homework_id)
    hw = hw_ref.get()
    if not hw.exists or hw.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    hw_dict = hw.to_dict()

    # save image temporarily
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        instruction = f"Extract the following problems from the image: {problem_range}"
        analysis_result = await extract_book_problems(tmp_path, instruction)
        
        # update homework doc with AI result
        ai_key = analysis_result.model_dump()
        updates = {
            "selected_problem_range": problem_range,
            "ai_generated_answer_key": ai_key,
            "answer_key_approved": False,
            "workflow_status": "analyzed",
            "updated_at": datetime.utcnow(),
        }
        hw_ref.update(updates)
        _sync_bank_item(db, hw_dict, updates)
        return {"status": "success", "ai_generated_answer_key": ai_key}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.post("/homeworks/{homework_id}/approve-answer-key")
async def approve_answer_key(homework_id: str, req: HomeworkApproveKeyRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    hw_ref = db.collection("homeworks").document(homework_id)
    hw = hw_ref.get()
    if not hw.exists or hw.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    hw_dict = hw.to_dict()
    updates = {
        "approved_answer_key": req.approved_answer_key,
        "answer_key_approved": True,
        "workflow_status": "approved",
        "updated_at": datetime.utcnow(),
    }
    hw_ref.update(updates)
    _sync_bank_item(db, hw_dict, updates)
    return {"status": "success"}

@router.patch("/homeworks/{homework_id}")
async def update_homework(homework_id: str, req: HomeworkUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    hw_ref = db.collection("homeworks").document(homework_id)
    hw = hw_ref.get()
    if not hw.exists or hw.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    updates = {k: v for k, v in req.model_dump(exclude_unset=True).items()}
    if updates:
        hw_ref.update(updates)
    return {"status": "success"}

@router.post("/homeworks/{homework_id}/publish")
async def publish_homework(homework_id: str, req: Optional[HomeworkPublishRequest] = None, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    hw_ref = db.collection("homeworks").document(homework_id)
    hw = hw_ref.get()
    if not hw.exists or hw.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    hw_dict = hw.to_dict()
    if not hw_dict.get("answer_key_approved"):
        raise HTTPException(status_code=400, detail="Cannot publish without approved answer key")

    publish_class_id = (req.class_id if req else None) or hw_dict.get("class_id") or hw_dict.get("target_class_id")
    if not publish_class_id:
        raise HTTPException(status_code=400, detail="Publish qilishdan oldin sinfni tanlang")
    target_class = _verify_teacher_class(db, publish_class_id, current_user["id"])

    hw_ref.update({
        "class_id": publish_class_id,
        "target_class_id": publish_class_id,
        "target_class_name": target_class.get("name"),
        "subject": target_class.get("subject") or hw_dict.get("subject"),
        "status": "published",
        "workflow_status": "published",
        "published_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    })
    return {"status": "success"}

@router.get("/homeworks/{homework_id}/submissions")
async def get_homework_submissions(homework_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    hw = db.collection("homeworks").document(homework_id).get()
    if not hw.exists or hw.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")

    hw_dict = hw.to_dict()
    class_id = hw_dict.get("class_id")
    class_dict = {}
    if class_id:
        class_doc = db.collection("classes").document(class_id).get()
        class_dict = class_doc.to_dict() if class_doc.exists else {}
    subs = db.collection("submissions").where("homework_id", "==", homework_id).stream()
    result = []
    for sub in subs:
        sub_dict = sub.to_dict()
        student_id = sub_dict.get("student_id")
        student_doc = db.collection("users").document(student_id).get() if student_id else None
        student_dict = student_doc.to_dict() if student_doc and student_doc.exists else {}
        result.append({
            "id": sub.id,
            **sub_dict,
            "homework_title": hw_dict.get("title"),
            "class_name": class_dict.get("name") or "Noma'lum sinf",
            "subject": hw_dict.get("subject") or class_dict.get("subject"),
            "student_name": student_dict.get("full_name") or "Noma'lum o'quvchi",
            "telegram_username": student_dict.get("telegram_username"),
        })

    return sorted(
        result,
        key=lambda item: (_date_key(item.get("submitted_at")), _as_float(item.get("attempt_number"))),
        reverse=True,
    )


# ----------------- STUDENT ENDPOINTS -----------------

@router.get("/student/homeworks")
async def get_student_homeworks(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    # Get classes student is in
    memberships = db.collection("class_members").where("student_id", "==", current_user["id"]).where("status", "==", "active").stream()
    class_ids = [m.to_dict().get("class_id") for m in memberships]
    
    if not class_ids:
        return []
        
    homeworks = []
    # Firestore 'in' query supports max 10, batching might be needed if many, but fine for MVP
    # Simplest way: iterate and fetch published homeworks
    for cid in class_ids:
        hws = db.collection("homeworks").where("class_id", "==", cid).where("status", "==", "published").stream()
        for hw in hws:
            hw_dict = hw.to_dict()
            # Omit answer keys
            hw_dict.pop("approved_answer_key", None)
            hw_dict.pop("ai_generated_answer_key", None)
            
            # Check for submission
            subs = db.collection("submissions").where("homework_id", "==", hw.id).where("student_id", "==", current_user["id"]).stream()
            sub_list = [{"id": s.id, **s.to_dict()} for s in subs]
            if sub_list:
                # Sort in memory by submitted_at to get latest
                sub_list.sort(key=lambda x: str(x.get("submitted_at") or ""), reverse=True)
                latest_sub = sub_list[0]
                hw_dict["student_status"] = "submitted"
                hw_dict["latest_score"] = latest_sub.get("score")
                hw_dict["latest_percentage"] = latest_sub.get("percentage")
                hw_dict["attempt_count"] = latest_sub.get("attempt_number", 1)
                hw_dict["latest_submission"] = latest_sub
            else:
                hw_dict["student_status"] = "pending"
                
            homeworks.append({"id": hw.id, **hw_dict})
            
    return homeworks

@router.get("/homeworks/{homework_id}")
async def get_homework_detail(homework_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    hw = db.collection("homeworks").document(homework_id).get()
    if not hw.exists:
        raise HTTPException(status_code=404, detail="Homework not found")
        
    hw_dict = hw.to_dict()
    
    # Simple check for student
    if current_user.get("role") == "student":
        if hw_dict.get("status") != "published":
            raise HTTPException(status_code=403, detail="Not published")
        # Hide answer keys from student!
        hw_dict.pop("approved_answer_key", None)
        hw_dict.pop("ai_generated_answer_key", None)
    elif current_user.get("role") == "teacher":
        if hw_dict.get("teacher_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Access denied")
            
    return {"id": hw.id, **hw_dict}

@router.post("/homeworks/{homework_id}/submit")
async def submit_homework(
    homework_id: str,
    image: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can submit homework")
        
    db = get_db()
    hw_ref = db.collection("homeworks").document(homework_id)
    hw = hw_ref.get()
    if not hw.exists:
        raise HTTPException(status_code=404, detail="Homework not found")
    hw_dict = hw.to_dict()
    if hw_dict.get("status") != "published":
        raise HTTPException(status_code=400, detail="Homework is not published")
        
    # verify deadline if exists
    if hw_dict.get("deadline"):
        try:
            deadline = datetime.fromisoformat(hw_dict["deadline"].replace("Z", "+00:00"))
            if datetime.utcnow().timestamp() > deadline.timestamp():
                raise HTTPException(status_code=400, detail="Ushbu vazifaning topshirish muddati tugagan.")
        except Exception:
            pass # ignore parse error for now
            
    # check resubmission rules
    existing_subs = list(db.collection("submissions")
                        .where("homework_id", "==", homework_id)
                        .where("student_id", "==", current_user["id"])
                        .stream())
                        
    if len(existing_subs) > 0 and not hw_dict.get("allow_resubmission", True):
        raise HTTPException(status_code=400, detail="Resubmission is not allowed")
        
    attempt_number = len(existing_subs) + 1
    
    answer_key = hw_dict.get("approved_answer_key")
    if not answer_key:
        raise HTTPException(status_code=500, detail="Homework has no approved answer key")

    # Temp file for Gemini
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # evaluate
        evaluation = await evaluate_homework(tmp_path, json.dumps(answer_key))
        eval_dict = evaluation.model_dump()
        
        # calculate max score and score correctly
        # for MVP we can use correct_count as score if equal weights
        total = eval_dict.get("total_problems", 1)
        correct = eval_dict.get("correct_count", 0)
        max_score = hw_dict.get("max_score", 10)
        percentage = correct / total if total > 0 else 0
        score = round(percentage * max_score, 1)
        
        submission = {
            "homework_id": homework_id,
            "class_id": hw_dict["class_id"],
            "student_id": current_user["id"],
            "attempt_number": attempt_number,
            "score": score,
            "max_score": max_score,
            "percentage": percentage * 100,
            "grading_result": eval_dict,
            "submitted_at": datetime.utcnow(),
            "status": "graded"
        }
        
        sub_ref = db.collection("submissions").document()
        sub_ref.set(submission)
        
        return {"id": sub_ref.id, **submission}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

@router.get("/homeworks/{homework_id}/my-submissions")
async def get_my_submissions(homework_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Access denied")
        
    db = get_db()
    subs = db.collection("submissions").where("homework_id", "==", homework_id).where("student_id", "==", current_user["id"]).stream()
    return sorted([{"id": s.id, **s.to_dict()} for s in subs], key=lambda x: x.get("attempt_number", 1))
