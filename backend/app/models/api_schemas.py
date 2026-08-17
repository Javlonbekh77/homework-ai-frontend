from pydantic import BaseModel
from typing import Optional, Literal

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

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None

SubjectType = Literal["Matematika", "Fizika", "Ona tili"]

class ClassCreateRequest(BaseModel):
    name: str
    subject: SubjectType

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
    subject: SubjectType
    class_id: Optional[str] = None

class HomeworkApproveKeyRequest(BaseModel):
    approved_answer_key: dict

class HomeworkPublishRequest(BaseModel):
    class_id: Optional[str] = None

class HomeworkBankAssignRequest(BaseModel):
    class_id: str
    publish: bool = False

class HomeworkUpdateRequest(BaseModel):
    max_score: Optional[int] = None
    grading_mode: Optional[str] = None
    deadline: Optional[str] = None
    allow_resubmission: Optional[bool] = None
