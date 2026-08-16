import os

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo


router = Router()
BOT_HANDLER_VERSION = "no-admin-env-message-2026-08-16"


def get_web_app_url() -> str | None:
    web_app_url = (
        os.getenv("TELEGRAM_WEB_APP_URL")
        or os.getenv("WEB_APP_URL")
        or os.getenv("FRONTEND_URL")
        or os.getenv("VERCEL_PROJECT_PRODUCTION_URL")
        or os.getenv("VERCEL_URL")
    )

    if not web_app_url:
        return None

    web_app_url = web_app_url.strip().rstrip("/")
    if web_app_url and not web_app_url.startswith(("http://", "https://")):
        web_app_url = f"https://{web_app_url}"
    return web_app_url


@router.message(CommandStart())
async def start(message: Message) -> None:
    web_app_url = get_web_app_url()
    text = (
        "Assalomu alaykum!\n\n"
        "Homework AI mini app orqali sinflar, vazifalar va tekshiruvlarni boshqarishingiz mumkin."
    )

    if not web_app_url:
        await message.answer(f"{text}\n\nMini app havolasi hozircha sozlanmoqda.")
        return

    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="Mini appni ochish",
                    web_app=WebAppInfo(url=web_app_url),
                )
            ]
        ]
    )
    await message.answer(text, reply_markup=keyboard)
