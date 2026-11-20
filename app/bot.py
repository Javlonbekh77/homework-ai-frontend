import logging
import os
import tempfile
from typing import Iterable

from aiogram import F, Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo

from .gemini_service import GeminiAnalysisError, evaluate_homework, extract_book_problems
from .schemas import BookExtractionResult, HomeworkEvaluationResult

router = Router()


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
    )
    if not web_app_url or "your-frontend" in web_app_url:
        return None

    web_app_url = web_app_url.strip().rstrip("/")
    if web_app_url and not web_app_url.startswith(("http://", "https://")):
        web_app_url = f"https://{web_app_url}"
    return web_app_url


def get_start_keyboard() -> InlineKeyboardMarkup | None:
    web_app_url = get_web_app_url()
    if not web_app_url:
        return None

    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="📱 Mini Appni ochish",
                    web_app=WebAppInfo(url=web_app_url),
                )
            ]
        ]
    )


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
    await state.set_state(BotState.waiting_for_book)
    reply_markup = get_start_keyboard()
    await message.answer(
        "Assalomu alaykum! Men Fifty (SmartCheck) botiman 🎓\n\n"
        "Matematika vazifalarini sun'iy intellekt orqali tekshirish oqimi:\n\n"
        "1. Ustoz darslik yoki varaq rasmini yuboradi.\n"
        "2. Rasm izohida qaysi masalalar kerakligini yozadi (masalan: 1-misoldan 5-misolgacha).\n"
        "3. Men darslikdan masalalarni ajratib, yechib, javob kalitini chiqaraman.\n"
        "4. Ustoz tasdiqlaydi yoki oddiy matn bilan tahrir kiritadi.\n"
        "5. Keyin o'quvchi uyga vazifa rasmini yuboradi va men uni tekshiraman.\n\n"
        "👉 Boshlash uchun darslik rasmini caption bilan yuboring!",
        reply_markup=reply_markup,
    )


@router.message(Command("new"))
async def cmd_new(message: Message, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(BotState.waiting_for_book)
    await message.answer("Yangi vazifa boshlandi. Darslik rasmini va captionda masalalar oralig'ini yuboring.")


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
        "Demo uchun rasm kerak. /start yuboring yoki darslik/homework rasmini yuboring."
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
        "Darslikdan ajratilgan masalalar va javob kaliti",
        f"Rasm sifati: {_quality_label(result.image_quality)}",
        "",
    ]

    if not result.problems:
        lines.append("Ko'rsatmaga mos aniq masala topilmadi.")
        if result.general_notes:
            lines.extend(["", f"Izoh: {result.general_notes}"])
        return "\n".join(lines)

    for problem in result.problems:
        lines.append(f"{problem.problem_number}-masala")
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
        "Homework tekshiruv natijasi",
        f"Umumiy: {result.total_problems} ta",
        f"To'g'ri: {result.correct_count} ta",
        f"Xato: {result.incorrect_count} ta",
        f"Ishlanmagan: {result.missing_count} ta",
        f"Aniq baholab bo'lmadi: {result.uncertain_count} ta",
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

    if result.general_feedback:
        lines.extend(["Umumiy feedback:", result.general_feedback])

    return "\n".join(lines).strip()


def _quality_label(quality: str) -> str:
    labels = {"good": "Yaxshi", "medium": "O'rtacha", "poor": "Past"}
    return labels.get(quality, quality)


def _status_label(status: str) -> str:
    labels = {
        "correct": "To'g'ri",
        "incorrect": "Xato",
        "missing": "Ishlanmagan",
        "uncertain": "Aniqlab bo'lmadi",
    }
    return labels.get(status, status)


def _percent(value: float) -> str:
    return f"{round(value * 100)}%"
