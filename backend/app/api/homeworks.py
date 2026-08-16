from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List
from datetime import datetime
import tempfile
import os
import json

from ..services.firebase_service import get_db
from ..services.gemini_service import extract_book_problems, evaluate_homework
from ..models.api_schemas import HomeworkDraftRequest, HomeworkApproveKeyRequest, HomeworkUpdateRequest
from .users import get_current_user

router = APIRouter()

# ----------------- TEACHER ENDPOINTS -----------------

@router.post("/classes/{class_id}/homeworks")
async def create_homework(class_id: str, req: HomeworkDraftRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create homeworks")
        
    db = get_db()
    # verify class ownership
    cls = db.collection("classes").document(class_id).get()
    if not cls.exists or cls.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not own this class")
        
    homework_data = {
        "class_id": class_id,
        "teacher_id": current_user["id"],
        "title": req.title,
        "description": req.description,
        "subject": req.subject,
        "status": "draft",
        "created_at": datetime.utcnow(),
        "max_score": 10,
        "allow_resubmission": True,
        "answer_key_approved": False
    }
    
    doc_ref = db.collection("homeworks").document()
    doc_ref.set(homework_data)
    return {"id": doc_ref.id, **homework_data}

@router.get("/classes/{class_id}/homeworks")
async def list_class_homeworks(class_id: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    hw_docs = db.collection("homeworks").where("class_id", "==", class_id).stream()
    hw_list = [{"id": h.id, **h.to_dict()} for h in hw_docs]
    return hw_list

@router.get("/teacher/homeworks")
async def list_teacher_homeworks(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can list homeworks")
        
    db = get_db()
    hw_docs = db.collection("homeworks").where("teacher_id", "==", current_user["id"]).stream()
    return [{"id": h.id, **h.to_dict()} for h in hw_docs]

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
        hw_ref.update({
            "selected_problem_range": problem_range,
            "ai_generated_answer_key": ai_key,
            "answer_key_approved": False
        })
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
        
    hw_ref.update({
        "approved_answer_key": req.approved_answer_key,
        "answer_key_approved": True
    })
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
async def publish_homework(homework_id: str, current_user: dict = Depends(get_current_user)):
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
        
    hw_ref.update({
        "status": "published",
        "published_at": datetime.utcnow()
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
        
    subs = db.collection("submissions").where("homework_id", "==", homework_id).stream()
    return [{"id": s.id, **s.to_dict()} for s in subs]


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
