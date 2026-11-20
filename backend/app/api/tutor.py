from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
from collections import Counter

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


class StudentSummaryRequest(BaseModel):
    student_id: Optional[str] = None
    class_id: Optional[str] = None


class ClassSummaryRequest(BaseModel):
    class_id: str


@router.post("/student/tutor/chat")
async def student_tutor_chat(
    req: StudentTutorChatRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "student":
        raise HTTPException(status_code=403, detail="Faqat o'quvchilar AI ustozdan foydalanishi mumkin")

    db = get_db()
    mistake_context = _load_homework_mistake_context(
        db=db,
        student_id=current_user["id"],
        homework_id=req.homework_id,
    )

    messages = _build_tutor_messages(
        student_name=current_user.get("full_name", "O'quvchi"),
        student_question=req.message,
        mistake_context=mistake_context,
        history=req.history[-8:],
    )

    try:
        answer = await chat_completion(messages, temperature=0.3, max_tokens=1000)
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


@router.post("/tutor/student-summary")
async def get_student_summary(
    req: StudentSummaryRequest,
    current_user: dict = Depends(get_current_user),
):
    db = get_db()
    user_role = current_user.get("role")

    if user_role == "student":
        target_student_id = current_user["id"]
        is_teacher_view = False
    elif user_role == "teacher":
        if not req.student_id:
            raise HTTPException(status_code=400, detail="O'quvchi ID ko'rsatilishi shart")
        target_student_id = req.student_id
        is_teacher_view = True
    else:
        raise HTTPException(status_code=403, detail="Ruxsat berilmagan foydalanuvchi")

    student_doc = db.collection("users").document(target_student_id).get()
    if not student_doc.exists:
        raise HTTPException(status_code=404, detail="O'quvchi topilmadi")
    student_data = student_doc.to_dict()
    student_name = student_data.get("full_name") or student_data.get("telegram_username") or "O'quvchi"

    # Fetch student submissions
    submissions_query = db.collection("submissions").where("student_id", "==", target_student_id).stream()
    submissions = [{"id": s.id, **s.to_dict()} for s in submissions_query]

    # Calculate metrics
    percentages = [s.get("percentage") for s in submissions if isinstance(s.get("percentage"), (int, float))]
    avg_score = round(sum(percentages) / len(percentages), 1) if percentages else 0.0

    mistakes_list = []
    correct_list = []
    for sub in submissions:
        grading = sub.get("grading_result") or {}
        for p in grading.get("problems", []):
            if p.get("status") == "correct":
                correct_list.append(f"Masala #{p.get('problem_number', '')}")
            else:
                errors = p.get("errors") or []
                desc = errors[0].get("description") if errors else p.get("feedback")
                sug = errors[0].get("suggestion") if errors else ""
                mistakes_list.append({
                    "problem": p.get("problem_number", "?"),
                    "description": desc or "Xato hisoblash",
                    "suggestion": sug
                })

    # Prepare Prompt for Groq
    if is_teacher_view:
        system_prompt = (
            "Siz tajribali matematika fani metodisti va tahlilchisi AIsiz. "
            "O'qituvchiga ushbu o'quvchining o'zlashtirish holati bo'yicha pedagogik tahlil va aniq tavsiyalar bering. "
            "Format: O'zbek tilida, markdown sarlavhalari va chiroyli punktlar bilan:\n"
            "1. 📊 **Umumiy baho va daraja** (qisqa xulosa)\n"
            "2. 💪 **Kuchli jihatlari** (nimalarni yaxshi o'zlashtirgan)\n"
            "3. ⚠️ **Asosiy qiyinchiliklar va xatolar** (qaysi mavzularda adashgan)\n"
            "4. 🎯 **O'qituvchiga amaliy tavsiya** (darsda unga qanday topshiriq berish va qanday yordam ko'rsatish kerak)\n"
            "Javob ixcham (12-18 qator), aniq va professional bo'lsin."
        )
    else:
        system_prompt = (
            "Siz o'quvchining shaxsiy aqlli matematika ustozi va do'stisiz. "
            "O'quvchiga uning topshirgan uy vazifalari bo'yicha shaxsiy, ruhlantiruvchi va tushunarli xulosa bering. "
            "Format: O'zbek tilida, do'stona ohangda, chiroyli belgilar bilan:\n"
            "1. 🌟 **Sening umumiy natijang** (dalda beruvchi so'zlar)\n"
            "2. 🚀 **Sening yutuqlaring va kuchli tomonlaring**\n"
            "3. 🔍 **E'tibor qaratishing kerak bo'lgan joylar** (aniq xatolar misolida)\n"
            "4. 💡 **Oltin maslahat** (kelgusi vazifalar uchun qisqa qoida)\n"
            "Javob 10-15 qatordan oshmasin, tushunarli va motivatsiyaga boy bo'lsin."
        )

    context_prompt = (
        f"O'quvchi: {student_name}\n"
        f"Jami topshirilgan vazifalar soni: {len(submissions)}\n"
        f"O'rtacha o'zlashtirish ko'rsatkichi: {avg_score}%\n"
        f"Muvaffaqiyatli yechilgan namunalar soni: {len(correct_list)}\n"
        f"Kuzatilgan xatolar ro'yxati:\n" +
        ("\n".join(f"- Masala {m['problem']}: {m['description']} (Tavsiya: {m['suggestion']})" for m in mistakes_list[:8]) if mistakes_list else "Hozircha xatolar deyarli yo'q, barchasi to'g'ri ishlangan.")
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context_prompt}
    ]

    try:
        summary_text = await chat_completion(messages, temperature=0.3, max_tokens=1000)
    except GroqAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "ok",
        "student_id": target_student_id,
        "student_name": student_name,
        "submissions_count": len(submissions),
        "average_score": avg_score,
        "summary": summary_text,
        "created_at": datetime.utcnow().isoformat()
    }


@router.post("/tutor/class-summary")
async def get_class_summary(
    req: ClassSummaryRequest,
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") != "teacher":
        raise HTTPException(status_code=403, detail="Faqat o'qituvchilar sinf tahlilini ko'rishi mumkin")

    db = get_db()
    teacher_id = current_user["id"]

    class_doc = db.collection("classes").document(req.class_id).get()
    if not class_doc.exists:
        raise HTTPException(status_code=404, detail="Sinf topilmadi")
    class_data = class_doc.to_dict()
    if class_data.get("teacher_id") != teacher_id:
        raise HTTPException(status_code=403, detail="Siz bu sinf rahbari emassiz")

    class_name = class_data.get("name") or "Sinf"
    subject = class_data.get("subject") or "Matematika"

    # Fetch members count
    members_docs = list(db.collection("class_members").where("class_id", "==", req.class_id).stream())
    student_count = len(members_docs)

    # Fetch class homeworks
    hw_docs = list(db.collection("homeworks").where("class_id", "==", req.class_id).stream())
    target_hw_docs = list(db.collection("homeworks").where("target_class_id", "==", req.class_id).stream())
    all_hw = {d.id: d.to_dict() for d in [*hw_docs, *target_hw_docs]}

    # Fetch submissions for these homeworks
    submissions = []
    for hw_id in list(all_hw.keys())[:15]:
        sub_docs = db.collection("submissions").where("homework_id", "==", hw_id).stream()
        for s in sub_docs:
            submissions.append(s.to_dict())

    percentages = [s.get("percentage") for s in submissions if isinstance(s.get("percentage"), (int, float))]
    avg_score = round(sum(percentages) / len(percentages), 1) if percentages else 0.0

    error_labels = []
    for s in submissions:
        grading = s.get("grading_result") or {}
        for p in grading.get("problems", []):
            if p.get("status") != "correct":
                errors = p.get("errors") or []
                desc = errors[0].get("description") if errors else p.get("feedback")
                if desc:
                    error_labels.append(desc)

    top_errors = [f"{label} ({count} marta)" for label, count in Counter(error_labels).most_common(5)]

    system_prompt = (
        "Siz yetakchi ta'lim metodisti va sinflar faoliyatini tahlil qiluvchi AIsiz. "
        "O'qituvchiga ushbu sinfning matematika fanidan natijalarini to'liq tahlil qilib bering. "
        "Format: O'zbek tilida, markdown sarlavhalar va punktlar bilan:\n"
        "1. 🏫 **Sinfning umumiy holati** (faollik va o'rtacha ko'rsatkich tahlili)\n"
        "2. ⚠️ **Eng ko'p xato qilingan mavzular** (umumiy kamchiliklar)\n"
        "3. 📈 **Sinfdagi tabaqalanish** (yaxshi o'zlashtirganlar va qo'shimcha yordamga muhtojlar balansi)\n"
        "4. 💡 **Keyingi dars uchun o'qituvchiga metodik tavsiyalar** (darsda nimalarni takrorlash, qanday misollar berish kerak)\n"
        "Hisobot ixcham (14-20 qator), asosli va bevosita amaliyotda qo'llashga qulay bo'lsin."
    )

    context_prompt = (
        f"Sinf: {class_name} ({subject})\n"
        f"Jami o'quvchilar soni: {student_count}\n"
        f"Berilgan vazifalar soni: {len(all_hw)}\n"
        f"Topshirilgan ishlar soni: {len(submissions)}\n"
        f"Sinfning o'rtacha o'zlashtirish bali: {avg_score}%\n"
        f"Sinf bo'yicha eng ko'p uchragan xatolar:\n" +
        ("\n".join(f"- {e}" for e in top_errors) if top_errors else "Hozircha jiddiy tizimli xatolar qayd etilmadi.")
    )

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": context_prompt}
    ]

    try:
        summary_text = await chat_completion(messages, temperature=0.3, max_tokens=1100)
    except GroqAIError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "status": "ok",
        "class_id": req.class_id,
        "class_name": class_name,
        "student_count": student_count,
        "homework_count": len(all_hw),
        "submissions_count": len(submissions),
        "average_score": avg_score,
        "summary": summary_text,
        "created_at": datetime.utcnow().isoformat()
    }


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
    if mistake_context:
        context_text = "\n".join(
            (
                f"- Vazifa: {item.get('homework_title')}; "
                f"Masala #{item.get('problem_number') or '?'}; "
                f"Holat: {item.get('status')}; "
                f"O'quvchi javobi: {item.get('student_answer') or 'topilmadi'}; "
                f"To'g'ri javob: {item.get('expected_answer') or 'berilmagan'}; "
                f"Aniqlangan xato: {item.get('label')}; "
                f"Tavsiya: {item.get('suggestion') or item.get('feedback')}"
            )
            for item in mistake_context
        )
        system_instruction = (
            "Siz o'quvchilarga yordam beruvchi bilimdon va do'stona AI repetitorsiz (Fifty AI Tutor). "
            "O'quvchining tekshirilgan uy vazifalaridagi xatolarini hisobga olgan holda javob bering. "
            "Qoidalar:\n"
            "1. Agar o'quvchi o'z xatosi haqida so'rasa, aynan qayerda adashganini va to'g'ri formulani ko'rsating.\n"
            "2. Agar umumiy matematika savoli bersa, to'g'ridan-to'g'ri, muloyim va aniq yechim/qoida bilan tushuntiring.\n"
            "3. Doim bitta kichik tushunarli mini-misol va oraliq qadamlarni keltiring.\n"
            "4. Javobni chiroyli, o'qishga qulay formatda va 8-15 qator oralig'ida bering."
        )
        user_context_block = f"O'quvchi: {student_name}\nUY VAZIFA XATOLARI:\n{context_text}\n\n"
    else:
        system_instruction = (
            "Siz o'quvchilarga matematika fani bo'yicha yordam beruvchi do'stona, professional AI repetitorsiz (Fifty AI Tutor). "
            "O'quvchi savollariga o'zbek tilida juda tushunarli, bosqichma-bosqich, qisqa formulalar va misollar bilan javob bering. "
            "Har doim ruhlantiruvchi va dalda beruvchi ohangda gapiring. "
            "Kerak bo'lsa bitta kichik tushuntiruvchi misol keltiring. Javob 8-14 qatordan oshmasin."
        )
        user_context_block = f"O'quvchi: {student_name}\n\n"

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_instruction},
        {"role": "user", "content": user_context_block + "Savolga aniq va do'stona javob bering."}
    ]
    for item in history:
        messages.append({
            "role": "assistant" if item.sender == "ai" else "user",
            "content": item.text[:1200],
        })
    messages.append({"role": "user", "content": student_question})
    return messages


def _compact_steps(steps: Any) -> str:
    if not isinstance(steps, list) or not steps:
        return "ko'rinmadi"
    return " | ".join(str(step)[:160] for step in steps[:4])


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
    return doc_ref.id
