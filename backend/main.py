import os
import asyncio
import logging
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from aiogram import Bot, Dispatcher
from contextlib import asynccontextmanager

from app.services.firebase_service import (
    get_firebase_env_status,
    get_firebase_error,
    init_firebase,
    is_firebase_ready,
)
from app.api import auth, classes, users, homeworks
from app.bot.handlers import BOT_HANDLER_VERSION, router as bot_router

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
logging.basicConfig(level=logging.INFO)

APP_VERSION = "teacher-dashboard-fc128f7"
bot = None
dp = Dispatcher()


def env_flag(name: str, default: bool = False) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_firebase()
    except Exception:
        logging.exception("Firebase initialization failed. API endpoints will retry lazily.")
    
    global bot
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token and env_flag("ENABLE_BOT_POLLING", True):
        try:
            bot = Bot(token=token)
            dp.include_router(bot_router)
            asyncio.create_task(start_bot_polling(bot))
        except Exception:
            logging.exception("Telegram bot polling could not be started.")
    yield
    # Shutdown
    if bot:
        await bot.session.close()

app = FastAPI(lifespan=lifespan)


async def start_bot_polling(active_bot: Bot) -> None:
    try:
        await dp.start_polling(active_bot)
    except Exception:
        logging.exception("Telegram bot polling stopped with an error.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth")
app.include_router(classes.router, prefix="/api/classes")
app.include_router(users.router, prefix="/api/users")
app.include_router(homeworks.router, prefix="/api")


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "app_version": APP_VERSION,
        "bot_handler_version": BOT_HANDLER_VERSION,
        "firebase_ready": is_firebase_ready(),
        "firebase_error": get_firebase_error(),
        "env": {
            **get_firebase_env_status(),
            "has_telegram_bot_token": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
            "has_telegram_web_app_url": bool(os.getenv("TELEGRAM_WEB_APP_URL")),
            "has_gemini_api_key": bool(os.getenv("GEMINI_API_KEY")),
            "enable_bot_polling": env_flag("ENABLE_BOT_POLLING", True),
        },
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "homework-ai-backend"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
