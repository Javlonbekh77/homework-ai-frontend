# Homework AI Backend

FastAPI backend for the Telegram Mini App.

## Run Locally

```bash
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

## Required Environment Variables

```env
TELEGRAM_BOT_TOKEN=your_telegram_bot_token
TELEGRAM_WEB_APP_URL=https://your-frontend-domain.vercel.app
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
GEMINI_TIMEOUT_SECONDS=60
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
ENABLE_BOT_POLLING=true
```

For API-only deploys, set `ENABLE_BOT_POLLING=false`.

`TELEGRAM_WEB_APP_URL` must be the public Vercel frontend URL. The bot also accepts
`WEB_APP_URL`, `FRONTEND_URL`, `VERCEL_PROJECT_PRODUCTION_URL`, or `VERCEL_URL`.
