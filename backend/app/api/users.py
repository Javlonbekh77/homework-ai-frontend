from fastapi import APIRouter, HTTPException, Header, Depends
from ..services.firebase_service import get_db
from ..models.api_schemas import UpdateRoleRequest

router = APIRouter()

def get_current_user(x_user_id: str = Header(None)):
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID header required")
    db = get_db()
    user = db.collection("users").document(x_user_id).get()
    if not user.exists:
        raise HTTPException(status_code=401, detail="User not found")
    return {"id": user.id, **user.to_dict()}

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

@router.patch("/me/role")
async def update_role(req: UpdateRoleRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    db.collection("users").document(current_user["id"]).update({"role": req.role})
    return {"status": "success", "role": req.role}
