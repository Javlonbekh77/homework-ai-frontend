import os

from aiogram import Router
from aiogram.filters import CommandStart
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message, WebAppInfo


router = Router()


@router.message(CommandStart())
async def start(message: Message) -> None:
    web_app_url = os.getenv("TELEGRAM_WEB_APP_URL") or os.getenv("FRONTEND_URL")
    text = (
        "Assalomu alaykum!\n\n"
        "Homework AI mini app orqali sinflar, vazifalar va tekshiruvlarni boshqarishingiz mumkin."
    )

    if not web_app_url:
        await message.answer(
            f"{text}\n\nAdmin uchun: TELEGRAM_WEB_APP_URL env qiymati sozlanmagan."
        )
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
