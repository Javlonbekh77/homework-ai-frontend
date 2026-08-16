from fastapi import APIRouter, HTTPException, Depends
import random
import string
from datetime import datetime
from ..services.firebase_service import get_db
from ..models.api_schemas import ClassCreateRequest, JoinClassRequest
from .users import get_current_user

router = APIRouter()

@router.post("/")
async def create_class(req: ClassCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create classes")
        
    db = get_db()
    join_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
    
    new_class = {
        "name": req.name,
        "subject": req.subject,
        "teacher_id": current_user["id"],
        "join_code": join_code,
        "created_at": datetime.utcnow()
    }
    doc_ref = db.collection("classes").document()
    doc_ref.set(new_class)
    return {"id": doc_ref.id, **new_class}

@router.get("/")
async def list_classes(current_user: dict = Depends(get_current_user)):
    db = get_db()
    if current_user.get("role") == "teacher":
        classes = db.collection("classes").where("teacher_id", "==", current_user["id"]).stream()
    else:
        memberships = db.collection("class_members").where("student_id", "==", current_user["id"]).stream()
        class_ids = [m.to_dict().get("class_id") for m in memberships]
        classes = []
        for cid in class_ids:
            doc = db.collection("classes").document(cid).get()
            if doc.exists:
                classes.append(doc)
                
    result = []
    for c in classes:
        c_dict = c.to_dict() if hasattr(c, "to_dict") else c.to_dict()
        members = db.collection("class_members").where("class_id", "==", c.id).stream()
        c_dict["student_count"] = len(list(members))
        result.append({"id": c.id, **c_dict})
    return result

@router.post("/join")
async def join_class(req: JoinClassRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Only students can join classes")
        
    db = get_db()
    code = req.join_code.strip().upper()
    classes = list(db.collection("classes").where("join_code", "==", code).stream())
    if not classes:
        raise HTTPException(status_code=404, detail="Class not found")
        
    class_id = classes[0].id
    
    existing = list(db.collection("class_members")
                    .where("class_id", "==", class_id)
                    .where("student_id", "==", current_user["id"]).stream())
    if existing:
        raise HTTPException(status_code=400, detail="Already joined")
        
    membership = {
        "class_id": class_id,
        "student_id": current_user["id"],
        "joined_at": datetime.utcnow(),
        "status": "active"
    }
    db.collection("class_members").document().set(membership)
    return {"status": "success", "class_id": class_id}

@router.get("/{class_id}/students")
async def get_class_students(class_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can view class students")
        
    db = get_db()
    # Check if class belongs to this teacher
    class_doc = db.collection("classes").document(class_id).get()
    if not class_doc.exists or class_doc.to_dict().get("teacher_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Access denied")
        
    members = db.collection("class_members").where("class_id", "==", class_id).stream()
    student_ids = [m.to_dict().get("student_id") for m in members]
    
    students = []
    for sid in student_ids:
        s_doc = db.collection("users").document(sid).get()
        if s_doc.exists:
            s_dict = s_doc.to_dict()
            # Calculate their average score in this class
            submissions = db.collection("submissions").where("student_id", "==", sid).stream()
            sub_list = [sub.to_dict() for sub in submissions if sub.to_dict().get("class_id") == class_id]
            
            # Get latest attempt score per homework for this student
            hw_scores = {}
            for sub in sub_list:
                hw_id = sub.get("homework_id")
                # Keep the max score or latest score for this homework
                score = sub.get("score", 0)
                if hw_id not in hw_scores or score > hw_scores[hw_id]:
                    hw_scores[hw_id] = score
            
            avg_score = sum(hw_scores.values()) / len(hw_scores) if hw_scores else 0.0
            
            students.append({
                "id": sid,
                "full_name": s_dict.get("full_name"),
                "telegram_username": s_dict.get("telegram_username"),
                "average_score": round(avg_score, 1),
                "submission_count": len(hw_scores)
            })
            
    return students
