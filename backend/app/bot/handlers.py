import logging
import os
import tempfile
from datetime import datetime
from typing import Iterable

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    CallbackQuery,
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    Message,
    WebAppInfo,
)

from ..services.firebase_service import get_db
from ..services.gemini_service import (
    GeminiAnalysisError,
    evaluate_homework,
    extract_book_problems,
)
from ..services.schemas import BookExtractionResult, HomeworkEvaluationResult

router = Router()
BOT_HANDLER_VERSION = "fifty-unified-homework-checker-2026"


class BotState(StatesGroup):
    waiting_for_book = State()
    waiting_for_edit = State()
    waiting_for_homework = State()


def get_web_app_url() -> str | None:
    web_app_url = (
        os.getenv("TELEGRAM_WEB_APP_URL")
        or os.getenv("MINI_APP_URL")
        or os.getenv("WEB_APP_URL")
        or os.getenv("FRONTEND_URL")
        or os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
        or os.getenv("VERCEL_URL")
        or "https://fifty-app.pages.dev"
    )
    if not web_app_url or "your-frontend" in web_app_url:
        return "https://fifty-app.pages.dev"

    web_app_url = web_app_url.strip().rstrip("/")
    if web_app_url and not web_app_url.startswith(("http://", "https://")):
        web_app_url = f"https://{web_app_url}"
    return web_app_url


def get_start_keyboard(role: str | None = None) -> InlineKeyboardMarkup:
    web_app_url = get_web_app_url()
    keyboard_buttons = [
        [
            InlineKeyboardButton(
                text="🚀 Fifty Ilovasini Ochish",
                web_app=WebAppInfo(url=web_app_url),
            )
        ]
    ]

    if not role:
        keyboard_buttons.append([
            InlineKeyboardButton(text="👨‍🏫 Men O'qituvchiman", callback_data="set_role:teacher"),
            InlineKeyboardButton(text="🎒 Men O'quvchiman", callback_data="set_role:student"),
        ])
    else:
        keyboard_buttons.append([
            InlineKeyboardButton(text="🔄 Rolni almashtirish", callback_data="change_role_menu"),
        ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard_buttons)


def get_confirm_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="✅ Tasdiqlash", callback_data="confirm_answers"),
                InlineKeyboardButton(text="✏️ Tahrirlash", callback_data="edit_answers"),
            ]
        ]
    )


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext) -> None:
    await state.clear()
    from_user = message.from_user
    if not from_user:
        return

    telegram_id = from_user.id
    first_name = from_user.first_name or "Foydalanuvchi"
    last_name = from_user.last_name or ""
    full_name = f"{first_name} {last_name}".strip()
    username = from_user.username

    # Avtomatik ro'yxatdan o'tkazish / bazani tekshirish
    user_data = None
    try:
        db = get_db()
        users_ref = db.collection("users").where("telegram_id", "==", telegram_id).limit(1).stream()
        user_doc = None
        for doc in users_ref:
            user_doc = doc
            break

        if user_doc:
            user_data = user_doc.to_dict()
            updates = {}
            if username and user_data.get("telegram_username") != username:
                updates["telegram_username"] = username
            if full_name and user_data.get("full_name") != full_name:
                updates["full_name"] = full_name
            if updates:
                db.collection("users").document(user_doc.id).update(updates)
                user_data.update(updates)
        else:
            new_user = {
                "telegram_id": telegram_id,
                "telegram_username": username,
                "full_name": full_name,
                "role": None,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
            }
            new_doc = db.collection("users").document()
            new_doc.set(new_user)
            user_data = new_user
    except Exception as exc:
        logging.error("Foydalanuvchini bazada ro'yxatdan o'tkazishda xatolik: %s", exc, exc_info=True)

    role = user_data.get("role") if user_data else None
    reply_markup = get_start_keyboard(role=role)

    if role == "teacher":
        role_desc = "Siz tizimdan **O'qituvchi 👨‍🏫** sifatida ro'yxatdan o'tgansiz."
    elif role == "student":
        role_desc = "Siz tizimdan **O'quvchi 🎒** sifatida ro'yxatdan o'tgansiz."
    else:
        role_desc = "✅ **Siz Telegram orqali muvaffaqiyatli ro'yxatdan o'tdingiz!**\n\nDavom etish uchun quyida o'z rolingizni tanlang:"

    text = (
        f"Assalomu alaykum, {first_name}! 🎓\n\n"
        f"**Fifty (SmartCheck) AI ta'lim platformasiga xush kelibsiz!**\n\n"
        f"{role_desc}\n\n"
        f"✨ **Platforma imkoniyatlari:**\n"
        f"• 👨‍🏫 **O'qituvchilar:** Yangi sinflar ochish, uy vazifalarini va testlarni AI orqali 3 soniyada tekshirish, sinf bo'yicha tahliliy hisobotlar olish.\n"
        f"• 🎒 **O'quvchilar:** Vazifalarni rasmga olib yuborish, xatolarni AI repetitor bilan qadam-baqadam o'rganish.\n\n"
        f"⚡️ *Har doim ushbu bot orqali kirganingiz uchun hisobingiz **avtomatik avtorizatsiya** qilinadi.*"
    )
    await message.answer(text, reply_markup=reply_markup, parse_mode="Markdown")


@router.callback_query(F.data.startswith("set_role:"))
async def handle_set_role(callback: CallbackQuery) -> None:
    role = callback.data.split(":")[1]
    user_id = callback.from_user.id
    role_text = "O'qituvchi 👨‍🏫" if role == "teacher" else "O'quvchi 🎒"

    try:
        db = get_db()
        users_ref = db.collection("users").where("telegram_id", "==", user_id).limit(1).stream()
        for doc in users_ref:
            db.collection("users").document(doc.id).update({
                "role": role,
                "updated_at": datetime.utcnow(),
            })
            break
    except Exception as exc:
        logging.error("Rolni yangilashda xatolik: %s", exc, exc_info=True)

    web_app_url = get_web_app_url()
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🚀 Fifty Ilovasiga Kirish",
                    web_app=WebAppInfo(url=web_app_url),
                )
            ],
            [
                InlineKeyboardButton(text="🔄 Rolni almashtirish", callback_data="change_role_menu"),
            ]
        ]
    )

    if callback.message:
        await callback.message.edit_text(
            f"✅ Rolingiz muvaffaqiyatli saqlandi: **{role_text}**!\n\n"
            f"Endi quyidagi **\"Fifty Ilovasiga Kirish\"** tugmasini bosing. "
            f"Dastur sizni avtomatik taniydi va hech qanday login/parolsiz shaxsiy kabinetingiz ochiladi:",
            reply_markup=keyboard,
            parse_mode="Markdown",
        )
    await callback.answer(f"Rol tanlandi: {role_text}")


@router.callback_query(F.data == "change_role_menu")
async def handle_change_role_menu(callback: CallbackQuery) -> None:
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👨‍🏫 Men O'qituvchiman", callback_data="set_role:teacher"),
                InlineKeyboardButton(text="🎒 Men O'quvchiman", callback_data="set_role:student"),
            ],
            [
                InlineKeyboardButton(
                    text="🚀 Ilovani Ochish",
                    web_app=WebAppInfo(url=get_web_app_url()),
                )
            ]
        ]
    )
    if callback.message:
        await callback.message.edit_text(
            "Qaysi rolni tanlamoqchisiz? Quyidagilardan birini bosing:",
            reply_markup=keyboard,
        )
    await callback.answer()


@router.message(Command("new"))
async def cmd_new(message: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(BotState.waiting_for_book)
    await message.answer(
        "Yangi vazifa boshlandi. Darslik rasmini va captionda masalalar oralig'ini yuboring."
    )


@router.message(Command("confirm"))
async def cmd_confirm(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    if not data.get("answer_key"):
        await message.answer("Hali javob kaliti yo'q. Avval darslik rasmini yuboring.")
        await state.set_state(BotState.waiting_for_book)
        return

    await state.set_state(BotState.waiting_for_homework)
    await message.answer(
        "Javob kaliti tasdiqlandi. Endi o'quvchi homework rasmini yuborishi mumkin."
    )


@router.message(BotState.waiting_for_book, F.photo)
async def handle_book_photo(message: Message, state: FSMContext) -> None:
    instruction = message.caption or "Rasmda ko'rinib turgan barcha masalalarni ajratib oling."
    status_msg = await message.answer("Darslik rasmi tahlil qilinmoqda, javob kaliti tayyorlanmoqda...")

    temp_filename = None
    try:
        temp_filename = await _download_highest_resolution_photo(message, prefix="book_")
        analysis = await extract_book_problems(temp_filename, instruction)
        await state.update_data(answer_key=analysis.model_dump_json(), manual_edits="")

        chunks = list(_split_message(format_book_result(analysis)))
        await status_msg.edit_text(chunks[0], reply_markup=get_confirm_menu())
        for chunk in chunks[1:]:
            await message.answer(chunk)

    except GeminiAnalysisError as exc:
        logging.error("Book extraction error: %s", exc, exc_info=True)
        await status_msg.edit_text(_gemini_error_message(exc))
    except Exception as exc:
        logging.error("Book photo handling error: %s", exc, exc_info=True)
        await status_msg.edit_text("Darslik rasmini o'qishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
    finally:
        _delete_temp_file(temp_filename)


@router.callback_query(F.data == "edit_answers")
async def edit_answers_handler(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    if not data.get("answer_key"):
        await callback.message.edit_text("Hali javob kaliti yo'q. Avval darslik rasmini yuboring.")
        await state.set_state(BotState.waiting_for_book)
        await callback.answer()
        return

    await state.set_state(BotState.waiting_for_edit)
    await callback.message.edit_text(
        "Tahrirlash rejimi.\n\n"
        "Qaysi javobni qanday o'zgartirish kerakligini oddiy matn bilan yozing.\n"
        "Masalan: 3-misol javobi 15 emas, 20 bo'lishi kerak.\n\n"
        "Tahrirlar tugasa /confirm yuboring."
    )
    await callback.answer()


@router.message(BotState.waiting_for_edit, F.text)
async def process_edit(message: Message, state: FSMContext) -> None:
    if message.text and message.text.startswith("/"):
        return

    data = await state.get_data()
    manual_edits = data.get("manual_edits", "")
    manual_edits = f"{manual_edits}\n- {message.text}".strip()
    await state.update_data(manual_edits=manual_edits)

    await message.answer("Tahrir saqlandi. Yana tahrir yozishingiz yoki /confirm yuborishingiz mumkin.")


@router.message(BotState.waiting_for_edit, F.photo)
async def edit_photo_fallback(message: Message) -> None:
    await message.answer("Hozir tahrirlash rejimidasiz. Avval tahrir yozing yoki /confirm yuboring.")


@router.callback_query(F.data == "confirm_answers")
async def confirm_answers_handler(callback: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    if not data.get("answer_key"):
        await callback.message.edit_text("Hali javob kaliti yo'q. Avval darslik rasmini yuboring.")
        await state.set_state(BotState.waiting_for_book)
        await callback.answer()
        return

    await state.set_state(BotState.waiting_for_homework)
    await callback.message.edit_text(
        "Javob kaliti tasdiqlandi. Endi o'quvchi homework rasmini yuborishi mumkin."
    )
    await callback.answer()


@router.message(BotState.waiting_for_homework, F.photo)
async def handle_homework_photo(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    answer_key = data.get("answer_key")
    manual_edits = data.get("manual_edits", "")

    if not answer_key:
        await state.set_state(BotState.waiting_for_book)
        await message.answer("Avval ustoz darslik rasmini yuborib, javob kalitini tasdiqlashi kerak.")
        return

    status_msg = await message.answer("O'quvchi homeworki tekshirilmoqda...")
    temp_filename = None

    try:
        temp_filename = await _download_highest_resolution_photo(message, prefix="homework_")
        analysis = await evaluate_homework(temp_filename, answer_key, manual_edits)
        chunks = list(_split_message(format_homework_result(analysis)))
        await status_msg.edit_text(chunks[0])
        for chunk in chunks[1:]:
            await message.answer(chunk)

    except GeminiAnalysisError as exc:
        logging.error("Homework evaluation error: %s", exc, exc_info=True)
        await status_msg.edit_text(_gemini_error_message(exc))
    except Exception as exc:
        logging.error("Homework photo handling error: %s", exc, exc_info=True)
        await status_msg.edit_text("Homework rasmini tekshirishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
    finally:
        _delete_temp_file(temp_filename)


@router.message(BotState.waiting_for_book)
async def waiting_for_book_fallback(message: Message) -> None:
    await message.answer("Iltimos, darslik rasmini yuboring. Masalalar oralig'ini captionda yozing.")


@router.message(BotState.waiting_for_homework)
async def waiting_for_homework_fallback(message: Message) -> None:
    await message.answer("Iltimos, o'quvchining homework rasmini yuboring.")


@router.message(F.photo)
async def handle_unexpected_photo(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    if data.get("answer_key"):
        await state.set_state(BotState.waiting_for_homework)
        await handle_homework_photo(message, state)
        return

    await state.set_state(BotState.waiting_for_book)
    await handle_book_photo(message, state)


@router.message(F.text)
async def handle_text(message: Message) -> None:
    await message.answer(
        "Darslik yoki o'quvchi homework rasmini yuboring yoki /start bosing."
    )


@router.message()
async def handle_unsupported_media(message: Message) -> None:
    await message.answer("Bu turdagi xabarni tahlil qila olmayman. Iltimos, rasm yuboring.")


async def _download_highest_resolution_photo(message: Message, prefix: str) -> str:
    if not message.photo:
        raise ValueError("Message does not contain a photo")

    photo = message.photo[-1]
    file_info = await message.bot.get_file(photo.file_id)
    suffix = ".jpg"
    if file_info.file_path:
        _, ext = os.path.splitext(file_info.file_path)
        suffix = ext or suffix

    with tempfile.NamedTemporaryFile(prefix=prefix, suffix=suffix, delete=False) as temp_file:
        temp_filename = temp_file.name

    await message.bot.download_file(file_info.file_path, temp_filename)
    return temp_filename


def _delete_temp_file(path: str | None) -> None:
    if not path or not os.path.exists(path):
        return

    try:
        os.remove(path)
    except OSError:
        logging.warning("Could not delete temporary file: %s", path)


def _split_message(text: str, limit: int = 3900) -> Iterable[str]:
    remaining = text.strip()
    while len(remaining) > limit:
        split_at = remaining.rfind("\n\n", 0, limit)
        if split_at == -1:
            split_at = limit
        yield remaining[:split_at].strip()
        remaining = remaining[split_at:].strip()
    if remaining:
        yield remaining


def _gemini_error_message(exc: Exception) -> str:
    error_text = str(exc).lower()
    if "timed out" in error_text:
        return "Gemini javobi kechikdi. Iltimos, birozdan keyin yana urinib ko'ring."
    if "invalid json" in error_text or "schema" in error_text:
        return (
            "Gemini javobini to'g'ri formatda o'qiy olmadim. "
            "Iltimos, rasmni aniqroq qilib qayta yuboring."
        )
    return (
        "Rasmni yetarlicha aniq tahlil qila olmadim. "
        "Iltimos, yorug'roq joyda, kamerani daftar ustiga to'g'ri tutib qayta suratga oling."
    )


def format_book_result(result: BookExtractionResult) -> str:
    lines = [
        "📚 Darslikdan ajratilgan masalalar va javob kaliti",
        f"Rasm sifati: {_quality_label(result.image_quality)}",
        "",
    ]

    if not result.problems:
        lines.append("Ko'rsatmaga mos aniq masala topilmadi.")
        if result.general_notes:
            lines.extend(["", f"Izoh: {result.general_notes}"])
        return "\n".join(lines)

    for problem in result.problems:
        lines.append(f"🔢 {problem.problem_number}-masala")
        lines.append("")
        lines.extend(["Sharti:", problem.problem_text or "Aniq o'qilmadi.", ""])

        if problem.solution_steps:
            lines.append("Yechim:")
            for index, step in enumerate(problem.solution_steps, start=1):
                lines.append(f"{index}. {step}")
            lines.append("")

        lines.extend(
            [
                "Javob:",
                problem.correct_answer or "Aniq emas.",
                f"Ishonch: {_percent(problem.confidence)}",
            ]
        )

        if problem.unreadable_parts:
            lines.extend(["", "Noaniq joylar:"])
            lines.extend(f"- {part}" for part in problem.unreadable_parts)

        lines.extend(["", "---", ""])

    if result.general_notes:
        lines.extend(["Umumiy izoh:", result.general_notes, ""])

    lines.append("Javoblar to'g'rimi? Tasdiqlang yoki tahrirlang.")
    return "\n".join(lines).strip()


def format_homework_result(result: HomeworkEvaluationResult) -> str:
    lines = [
        "📝 Homework tekshiruv natijasi",
        f"Umumiy: {result.total_problems} ta",
        f"✅ To'g'ri: {result.correct_count} ta",
        f"❌ Xato: {result.incorrect_count} ta",
        f"⚪️ Ishlanmagan: {result.missing_count} ta",
        f"❓ Aniq baholab bo'lmadi: {result.uncertain_count} ta",
        "",
    ]

    for problem in result.problems:
        lines.append(f"{problem.problem_number}-masala: {_status_label(problem.status)}")
        if problem.expected_answer:
            lines.append(f"To'g'ri javob: {problem.expected_answer}")
        if problem.student_answer:
            lines.append(f"O'quvchi javobi: {problem.student_answer}")

        if problem.student_steps:
            lines.append("O'qilgan yechim:")
            for index, step in enumerate(problem.student_steps, start=1):
                lines.append(f"{index}. {step}")

        if problem.errors:
            first_error = problem.errors[0]
            lines.extend(
                [
                    "Birinchi xato:",
                    first_error.step,
                    f"Izoh: {first_error.description}",
                ]
            )
            if first_error.suggestion:
                lines.append(f"Tavsiya: {first_error.suggestion}")

        if problem.unreadable_parts:
            lines.append("Noaniq joylar:")
            lines.extend(f"- {part}" for part in problem.unreadable_parts)

        if problem.feedback:
            lines.append(f"Feedback: {problem.feedback}")

        lines.append(f"Ishonch: {_percent(problem.confidence)}")
        lines.extend(["", "---", ""])

    if getattr(result, "general_feedback", None):
        lines.extend(["Umumiy feedback:", result.general_feedback])

    return "\n".join(lines).strip()


def _quality_label(quality: str) -> str:
    labels = {"good": "Yaxshi", "medium": "O'rtacha", "poor": "Past"}
    return labels.get(quality, quality)


def _status_label(status: str) -> str:
    labels = {
        "correct": "✅ To'g'ri",
        "incorrect": "❌ Xato",
        "missing": "⚪️ Ishlanmagan",
        "uncertain": "❓ Aniqlab bo'lmadi",
    }
    return labels.get(status, status)


def _percent(value: float) -> str:
    return f"{round(value * 100)}%"
