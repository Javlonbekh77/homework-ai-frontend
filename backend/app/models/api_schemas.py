from pydantic import BaseModel
from typing import Optional

class TelegramAuthRequest(BaseModel):
    init_data: str

class UserProfile(BaseModel):
    id: str
    telegram_id: int
    telegram_username: Optional[str]
    full_name: str
    role: Optional[str]

class UpdateRoleRequest(BaseModel):
    role: str

class ClassCreateRequest(BaseModel):
    name: str
    subject: str

class ClassResponse(BaseModel):
    id: str
    name: str
    subject: str
    teacher_id: str
    join_code: str
    student_count: int = 0

class JoinClassRequest(BaseModel):
    join_code: str

class HomeworkDraftRequest(BaseModel):
    title: str
    description: Optional[str] = None
    subject: str

class HomeworkApproveKeyRequest(BaseModel):
    approved_answer_key: dict

class HomeworkUpdateRequest(BaseModel):
    max_score: Optional[int] = None
    grading_mode: Optional[str] = None
    deadline: Optional[str] = None
    allow_resubmission: Optional[bool] = None

