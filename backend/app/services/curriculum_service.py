import logging
from typing import List, Dict, Any, Optional
from .firebase_service import get_db

logger = logging.getLogger(__name__)

def get_active_grades() -> List[Dict[str, Any]]:
    db = get_db()
    grades_ref = db.collection("grades").where("active", "==", True).stream()
    grades = []
    for doc in grades_ref:
        grades.append({"id": doc.id, **doc.to_dict()})
    # Sort by grade_number
    grades.sort(key=lambda x: x.get("grade_number", 0))
    return grades

def get_topics_by_grade(grade: Optional[int] = None, teacher_id: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_db()
    query = db.collection("topics").where("active", "==", True)
    if grade is not None:
        query = query.where("grade", "==", grade)
    
    topics_ref = query.stream()
    topics = []
    for doc in topics_ref:
        data = doc.to_dict()
        t_id = data.get("teacher_id")
        # Include global topics or topics owned by this specific teacher
        if not t_id or (teacher_id and t_id == teacher_id):
            topics.append({"id": doc.id, **data})
            
    # Sort by order, then by grade, and fallback to created_at
    topics.sort(key=lambda x: (x.get("grade", 0), x.get("order", 0), x.get("created_at", 0)))
    return topics

def get_skills_by_topic(topic_id: str) -> List[Dict[str, Any]]:
    db = get_db()
    skills_ref = db.collection("skills").where("topic_id", "==", topic_id).where("active", "==", True).stream()
    skills = []
    for doc in skills_ref:
        skills.append({"id": doc.id, **doc.to_dict()})
    # Sort by order
    skills.sort(key=lambda x: x.get("order", 0))
    return skills

def create_custom_topic(
    teacher_id: str,
    grade: int,
    name: str,
    subject: str = "mathematics",
    class_id: Optional[str] = None
) -> Dict[str, Any]:
    import time
    db = get_db()
    slug = name.lower().strip().replace(" ", "_").replace("'", "").replace('"', "")
    topic_data = {
        "teacher_id": teacher_id,
        "class_id": class_id,
        "subject": subject,
        "grade": grade,
        "name": name.strip(),
        "slug": slug,
        "created_at": time.time(),
        "updated_at": time.time(),
        "active": True,
        "order": 1000 # Put custom topics at the end
    }
    doc_ref = db.collection("topics").document()
    doc_ref.set(topic_data)
    return {"id": doc_ref.id, **topic_data}

