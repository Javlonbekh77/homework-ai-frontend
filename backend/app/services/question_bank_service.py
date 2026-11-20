import time
import logging
from typing import List, Dict, Any, Optional
from .firebase_service import get_db
from .question_validation_service import validate_question

logger = logging.getLogger(__name__)

def save_extracted_questions(
    teacher_id: str,
    subject_id: str,
    grade: int,
    topic_id: str,
    questions: List[Dict[str, Any]]
) -> List[str]:
    """
    Saves extracted questions to Firestore.
    Runs auto-validation to automatically approve high-confidence matching answers.
    """
    db = get_db()
    saved_ids = []
    
    for q in questions:
        # Run auto-validation
        q_text = q.get("question_text", "")
        correct_ans = str(q.get("correct_answer", ""))
        q_type = q.get("question_type", "numeric")
        confidence = q.get("confidence", 0.0)
        
        val_status = validate_question(q_text, correct_ans, q_type)
        
        # Determine initial status
        # Auto-approve if verified and high confidence
        if val_status == "verified" and confidence >= 0.85:
            status = "approved"
            approved_by = "system_auto"
            approved_at = time.time()
        else:
            status = "draft"
            approved_by = None
            approved_at = None
            
        doc_data = {
            "subject_id": subject_id,
            "grade": grade,
            "topic_id": topic_id,
            "skill_ids": q.get("skill_slugs", []),
            "question_text": q_text,
            "question_type": q_type,
            "correct_answer": correct_ans,
            "solution_steps": q.get("solution_steps", []),
            "difficulty": q.get("difficulty", 2),
            "status": status,
            "options": q.get("options"),
            "correct_option_index": q.get("correct_option_index"),
            "accepted_answers": q.get("accepted_answers"),
            "answer_tolerance": q.get("answer_tolerance", 0.0),
            "answer_unit": q.get("answer_unit"),
            "variant_allowed": q.get("variant_allowed", False),
            "variant_template": q.get("variant"),
            "validation_status": val_status,
            "created_by": teacher_id,
            "created_at": time.time(),
            "updated_at": time.time(),
            "approved_by": approved_by,
            "approved_at": approved_at
        }
        
        doc_ref = db.collection("question_templates").document()
        doc_ref.set(doc_data)
        saved_ids.append(doc_ref.id)
        
    return saved_ids

def get_questions(
    subject_id: Optional[str] = None,
    grade: Optional[int] = None,
    topic_id: Optional[str] = None,
    skill_id: Optional[str] = None,
    status: Optional[str] = None
) -> List[Dict[str, Any]]:
    db = get_db()
    query = db.collection("question_templates")
    
    if subject_id:
        query = query.where("subject_id", "==", subject_id)
    if grade is not None:
        query = query.where("grade", "==", grade)
    if topic_id:
        query = query.where("topic_id", "==", topic_id)
    if status:
        query = query.where("status", "==", status)
        
    docs = query.stream()
    results = []
    for doc in docs:
        data = doc.to_dict()
        # Filter by skill_id in application logic if Firestore array-contains is needed
        if skill_id and skill_id not in data.get("skill_ids", []):
            continue
        # Avoid archived questions by default unless explicitly looking for archived
        if not status and data.get("status") == "archived":
            continue
        results.append({"id": doc.id, **data})
        
    # Sort by created_at descending
    results.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return results

def update_question_status(question_id: str, status: str, approved_by: Optional[str] = None) -> bool:
    db = get_db()
    doc_ref = db.collection("question_templates").document(question_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
        
    update_data = {
        "status": status,
        "updated_at": time.time()
    }
    if status == "approved" and approved_by:
        update_data["approved_by"] = approved_by
        update_data["approved_at"] = time.time()
        
    doc_ref.update(update_data)
    return True

def update_question(question_id: str, update_data: Dict[str, Any]) -> bool:
    db = get_db()
    doc_ref = db.collection("question_templates").document(question_id)
    doc = doc_ref.get()
    if not doc.exists:
        return False
        
    # Standardize updated time
    update_data["updated_at"] = time.time()
    # If the teacher manually edits the question, recheck validation or mark verified
    if "question_text" in update_data or "correct_answer" in update_data:
        q_text = update_data.get("question_text", doc.to_dict().get("question_text", ""))
        correct_ans = str(update_data.get("correct_answer", doc.to_dict().get("correct_answer", "")))
        q_type = update_data.get("question_type", doc.to_dict().get("question_type", "numeric"))
        
        val_status = validate_question(q_text, correct_ans, q_type)
        update_data["validation_status"] = val_status
        
    doc_ref.update(update_data)
    return True

def generate_variant_from_template(question_id: str, new_parameters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Generates a new variant of a question conceptually using the new parameters.
    """
    db = get_db()
    doc_ref = db.collection("question_templates").document(question_id)
    doc = doc_ref.get()
    if not doc.exists:
        return None
        
    data = doc.to_dict()
    if not data.get("variant_allowed") or not data.get("variant_template"):
        return None
        
    template = data["variant_template"]
    template_type = template.get("template_type")
    
    new_question_text = data["question_text"]
    new_correct_answer = data["correct_answer"]
    
    # Simple substitution rules
    if template_type == "quadratic_equation":
        a = new_parameters.get("a", 1)
        b = new_parameters.get("b", -5)
        c = new_parameters.get("c", 6)
        
        # Format quadratic equation string
        def fmt_term(val, suffix):
            if val == 0: return ""
            prefix = "+" if val > 0 else "-"
            abs_val = abs(val)
            val_str = "" if abs_val == 1 and suffix else str(abs_val)
            return f" {prefix} {val_str}{suffix}"
            
        eq_str = f"{a}x^2" if a != 1 else "x^2"
        if a == -1: eq_str = "-x^2"
        
        eq_str += fmt_term(b, "x")
        eq_str += fmt_term(c, "")
        eq_str += " = 0"
        
        # Calculate roots
        D = b**2 - 4*a*c
        if D >= 0:
            x1 = (-b - D**0.5) / (2*a)
            x2 = (-b + D**0.5) / (2*a)
            if abs(D) < 1e-9:
                new_correct_answer = f"{x1:.1f}".replace(".0", "")
            else:
                roots = sorted([x1, x2])
                new_correct_answer = f"{roots[0]:.1f},{roots[1]:.1f}".replace(".0", "")
        else:
            new_correct_answer = "haqiqiy ildizga ega emas"
            
        new_question_text = f"{eq_str} kvadrat tenglamaning yechimlarini toping."
        
    elif template_type == "ax_plus_b_equals_c":
        a = new_parameters.get("a", 1)
        b = new_parameters.get("b", 0)
        c = new_parameters.get("c", 0)
        
        op = "+" if b >= 0 else "-"
        abs_b = abs(b)
        eq_str = f"{a}x {op} {abs_b} = {c}" if a != 1 else f"x {op} {abs_b} = {c}"
        if a == -1: eq_str = f"-x {op} {abs_b} = {c}"
        
        x = (c - b) / a
        new_correct_answer = f"{x:.1f}".replace(".0", "")
        new_question_text = f"{eq_str} tenglamani yeching."
        
    return {
        "original_id": question_id,
        "question_text": new_question_text,
        "question_type": data["question_type"],
        "correct_answer": new_correct_answer,
        "difficulty": data["difficulty"],
        "parameters": new_parameters
    }
