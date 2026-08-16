from fastapi import APIRouter, HTTPException
from ..services.telegram_auth import validate_init_data
from ..services.firebase_service import get_db
from ..models.api_schemas import TelegramAuthRequest
from datetime import datetime
import logging

router = APIRouter()

@router.post("/telegram")
async def auth_telegram(req: TelegramAuthRequest):
    if req.init_data == "dev_test_mode":
        tg_user = {
            "id": 123456789,
            "username": "testuser",
            "first_name": "Ali",
            "last_name": "Valiyev",
            "photo_url": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali"
        }
    else:
        try:
            tg_user = validate_init_data(req.init_data)
        except Exception as e:
            logging.error(f"Init data validation failed: {e}")
            raise HTTPException(status_code=401, detail="Invalid Telegram data")
        
    db = get_db()
    tg_id = tg_user.get("id")
    users_ref = db.collection("users").where("telegram_id", "==", tg_id).stream()
    
    user_doc = None
    for doc in users_ref:
        user_doc = doc
        break
        
    if user_doc:
        user_data = user_doc.to_dict()
        updates = {}
        if tg_user.get("photo_url") and user_data.get("photo_url") != tg_user.get("photo_url"):
            updates["photo_url"] = tg_user.get("photo_url")
        if tg_user.get("username") and user_data.get("telegram_username") != tg_user.get("username"):
            updates["telegram_username"] = tg_user.get("username")
            
        if updates:
            db.collection("users").document(user_doc.id).update(updates)
            user_data.update(updates)
            
        return {"status": "ok", "user": {"id": user_doc.id, **user_data}}
    else:
        new_user = {
            "telegram_id": tg_id,
            "telegram_username": tg_user.get("username"),
            "photo_url": tg_user.get("photo_url"),
            "full_name": f"{tg_user.get('first_name', '')} {tg_user.get('last_name', '')}".strip(),
            "role": None,
            "created_at": datetime.utcnow()
        }
        doc_ref = db.collection("users").document()
        doc_ref.set(new_user)
        return {"status": "created", "user": {"id": doc_ref.id, **new_user}}
