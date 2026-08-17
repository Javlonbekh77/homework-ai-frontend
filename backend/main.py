import os
import asyncio
import logging
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
from aiogram import Bot, Dispatcher
from aiogram.types import Update
from contextlib import asynccontextmanager

from app.services.firebase_service import (
    get_firebase_env_status,
    get_firebase_error,
    init_firebase,
    is_firebase_ready,
)
from app.api import auth, checkers, classes, homeworks, math_learning, tutor, users
from app.bot.handlers import BOT_HANDLER_VERSION, router as bot_router

load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))
logging.basicConfig(level=logging.INFO)

APP_VERSION = "uncertain-review-workflow"
bot = None
dp = Dispatcher()
bot_mode = "disabled"
bot_webhook_url = None
bot_router_included = False


def env_flag(name: str, default: bool = False) -> bool:
    raw_value = os.getenv(name)
    if raw_value is None:
        return default
    return raw_value.strip().lower() in {"1", "true", "yes", "on"}


def get_public_backend_url() -> str | None:
    backend_url = (
        os.getenv("TELEGRAM_WEBHOOK_BASE_URL")
        or os.getenv("BACKEND_URL")
        or os.getenv("PUBLIC_BACKEND_URL")
        or os.getenv("RENDER_EXTERNAL_URL")
    )
    if not backend_url:
        return None
    backend_url = backend_url.strip().rstrip("/")
    if backend_url and not backend_url.startswith(("http://", "https://")):
        backend_url = f"https://{backend_url}"
    return backend_url


def include_bot_router_once() -> None:
    global bot_router_included
    if not bot_router_included:
        dp.include_router(bot_router)
        bot_router_included = True


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        init_firebase()
    except Exception:
        logging.exception("Firebase initialization failed. API endpoints will retry lazily.")
    
    global bot, bot_mode, bot_webhook_url
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if token:
        try:
            bot = Bot(token=token)
            include_bot_router_once()
            if env_flag("ENABLE_BOT_POLLING", False):
                await bot.delete_webhook(drop_pending_updates=True)
                asyncio.create_task(start_bot_polling(bot))
                bot_mode = "polling"
            elif env_flag("ENABLE_BOT_WEBHOOK", True):
                public_backend_url = get_public_backend_url()
                if public_backend_url:
                    bot_webhook_url = f"{public_backend_url}/api/bot/webhook"
                    webhook_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
                    await bot.set_webhook(
                        bot_webhook_url,
                        secret_token=webhook_secret or None,
                        drop_pending_updates=True,
                    )
                    bot_mode = "webhook"
                    logging.info("Telegram bot webhook configured: %s", bot_webhook_url)
                else:
                    bot_mode = "missing_webhook_url"
                    logging.warning("TELEGRAM_BOT_TOKEN is set, but webhook base URL is missing.")
            else:
                bot_mode = "disabled_by_env"
        except Exception:
            logging.exception("Telegram bot polling could not be started.")
            bot_mode = "startup_error"
    else:
        bot_mode = "missing_token"
    yield
    # Shutdown
    if bot:
        await bot.session.close()

app = FastAPI(lifespan=lifespan)

UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", Path(__file__).resolve().parent / "uploads"))
UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_ROOT)), name="uploads")


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
app.include_router(math_learning.router, prefix="/api")
app.include_router(checkers.router, prefix="/api")
app.include_router(tutor.router, prefix="/api")


@app.post("/api/bot/webhook")
async def telegram_bot_webhook(request: Request):
    if not bot:
        raise HTTPException(status_code=503, detail="Telegram bot is not initialized")

    expected_secret = os.getenv("TELEGRAM_WEBHOOK_SECRET")
    if expected_secret and request.headers.get("X-Telegram-Bot-Api-Secret-Token") != expected_secret:
        raise HTTPException(status_code=403, detail="Invalid Telegram webhook secret")

    payload = await request.json()
    update = Update.model_validate(payload, context={"bot": bot})
    await dp.feed_update(bot, update)
    return {"ok": True}


@app.get("/api/bot/status")
async def telegram_bot_status():
    webhook_info = None
    if bot:
        try:
            info = await bot.get_webhook_info()
            webhook_info = {
                "url": info.url,
                "pending_update_count": info.pending_update_count,
                "last_error_date": info.last_error_date,
                "last_error_message": info.last_error_message,
            }
        except Exception as exc:
            webhook_info = {"error": str(exc)}

    return {
        "has_telegram_bot_token": bool(os.getenv("TELEGRAM_BOT_TOKEN")),
        "has_telegram_web_app_url": bool(os.getenv("TELEGRAM_WEB_APP_URL")),
        "has_webhook_base_url": bool(get_public_backend_url()),
        "bot_mode": bot_mode,
        "configured_webhook_url": bot_webhook_url,
        "webhook_info": webhook_info,
    }


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
            "has_webhook_base_url": bool(get_public_backend_url()),
            "has_gemini_api_key": bool(os.getenv("GEMINI_API_KEY")),
            "has_groq_api_key": bool(os.getenv("GROQ_API_KEY")),
            "enable_bot_webhook": env_flag("ENABLE_BOT_WEBHOOK", True),
            "enable_bot_polling": env_flag("ENABLE_BOT_POLLING", True),
        },
        "bot": {
            "mode": bot_mode,
            "configured_webhook_url": bot_webhook_url,
        },
    }


@app.get("/")
async def root():
    return {"status": "ok", "service": "homework-ai-backend"}


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
