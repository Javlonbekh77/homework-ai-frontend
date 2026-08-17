import os
import tempfile
import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel, Field

from .users import get_current_user
from ..services import curriculum_service, question_bank_service, question_extraction_service

router = APIRouter()
logger = logging.getLogger(__name__)

# Request schemas
class StatusUpdateRequest(BaseModel):
    status: str = Field(description="approved, rejected, or archived")

class QuestionSaveRequest(BaseModel):
    subject_id: str
    grade: int
    topic_id: str
    skill_ids: List[str] = []
    question_text: str
    question_type: str
    correct_answer: str
    difficulty: int = 2
    options: Optional[List[str]] = None
    correct_option_index: Optional[int] = None
    accepted_answers: Optional[List[str]] = None
    solution_steps: List[str] = []
    variant_allowed: bool = False
    variant: Optional[dict] = None

class GenerateVariantRequest(BaseModel):
    parameters: dict

class TopicCreateRequest(BaseModel):
    grade: int
    name: str
    subject: str = "mathematics"
    class_id: Optional[str] = None

# --- Curriculum taxonomy ---
@router.get("/math/grades")
async def get_grades(current_user: dict = Depends(get_current_user)):
    try:
        return curriculum_service.get_active_grades()
    except Exception as e:
        logger.error(f"Error fetching grades: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/math/topics")
async def get_topics(grade: Optional[int] = None, current_user: dict = Depends(get_current_user)):
    try:
        return curriculum_service.get_topics_by_grade(grade, teacher_id=current_user.get("id"))
    except Exception as e:
        logger.error(f"Error fetching topics: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/math/topics")
async def create_topic(req: TopicCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can create custom topics")
    try:
        return curriculum_service.create_custom_topic(
            teacher_id=current_user["id"],
            grade=req.grade,
            name=req.name,
            subject=req.subject,
            class_id=req.class_id
        )
    except Exception as e:
        logger.error(f"Error creating topic: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/math/topics/{topic_id}/skills")
async def get_skills(topic_id: str, current_user: dict = Depends(get_current_user)):
    try:
        return curriculum_service.get_skills_by_topic(topic_id)
    except Exception as e:
        logger.error(f"Error fetching skills: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Question Bank management ---
@router.get("/question-bank/questions")
async def list_questions(
    subject_id: Optional[str] = None,
    grade: Optional[int] = None,
    topic_id: Optional[str] = None,
    skill_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can access the Question Bank")
    try:
        return question_bank_service.get_questions(
            subject_id=subject_id,
            grade=grade,
            topic_id=topic_id,
            skill_id=skill_id,
            status=status
        )
    except Exception as e:
        logger.error(f"Error listing questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/question-bank/questions")
async def create_question(req: QuestionSaveRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can manage questions")
    try:
        saved_ids = question_bank_service.save_extracted_questions(
            teacher_id=current_user["id"],
            subject_id=req.subject_id,
            grade=req.grade,
            topic_id=req.topic_id,
            questions=[req.model_dump()]
        )
        return {"status": "success", "question_ids": saved_ids}
    except Exception as e:
        logger.error(f"Error saving question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/question-bank/questions/{question_id}")
async def edit_question(question_id: str, req: Dict[str, Any], current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can edit questions")
    try:
        success = question_bank_service.update_question(question_id, req)
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating question: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/question-bank/questions/{question_id}/status")
async def update_status(question_id: str, req: StatusUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can approve/archive questions")
    try:
        success = question_bank_service.update_question_status(
            question_id=question_id,
            status=req.status,
            approved_by=current_user["id"] if req.status == "approved" else None
        )
        if not success:
            raise HTTPException(status_code=404, detail="Question not found")
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error updating status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/question-bank/questions/{question_id}/generate-variant")
async def generate_variant(question_id: str, req: GenerateVariantRequest, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can generate variants")
    try:
        variant = question_bank_service.generate_variant_from_template(question_id, req.parameters)
        if not variant:
            raise HTTPException(status_code=400, detail="Cannot generate variant for this question template")
        return variant
    except Exception as e:
        logger.error(f"Error generating variant: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/question-bank/extract")
async def extract_questions(
    subject_id: str = Form(...),
    grade: int = Form(...),
    topic_id: str = Form(...),
    text_content: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Only teachers can extract questions")

    # Fetch skills for this topic to pass as allowed context to Gemini
    skills = curriculum_service.get_skills_by_topic(topic_id)
    # Fetch topic details for name
    db = curriculum_service.get_db()
    topic_doc = db.collection("topics").document(topic_id).get()
    topic_name = topic_doc.to_dict().get("name") if topic_doc.exists else topic_id

    tmp_path = None
    if image:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            content = await image.read()
            tmp.write(content)
            tmp_path = tmp.name

    try:
        # Call Gemini extraction service
        extraction_result = await question_extraction_service.extract_questions_from_material(
            teacher_id=current_user["id"],
            grade=grade,
            topic_name=topic_name,
            allowed_skills=skills,
            image_path=tmp_path,
            text_content=text_content
        )
        
        # Save to database
        saved_ids = question_bank_service.save_extracted_questions(
            teacher_id=current_user["id"],
            subject_id=subject_id,
            grade=grade,
            topic_id=topic_id,
            questions=[q.model_dump() for q in extraction_result.questions]
        )
        
        # Load the saved questions to return to UI
        saved_questions = []
        for q_id in saved_ids:
            doc = db.collection("question_templates").document(q_id).get()
            if doc.exists:
                saved_questions.append({"id": doc.id, **doc.to_dict()})
                
        return {"status": "success", "questions": saved_questions}
        
    except Exception as e:
        logger.error(f"Error in extract_questions: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
