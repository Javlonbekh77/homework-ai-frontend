import os
import hmac
import hashlib
from urllib.parse import parse_qsl
import json
import logging

def validate_init_data(init_data: str) -> dict:
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN not set")
    
    parsed_data = dict(parse_qsl(init_data))
    hash_ = parsed_data.pop("hash", None)
    if not hash_:
        raise ValueError("Hash missing in init_data")
        
    data_check_string = "\n".join(
        f"{k}={v}" for k, v in sorted(parsed_data.items())
    )
    secret_key = hmac.new("WebAppData".encode(), token.encode(), hashlib.sha256).digest()
    calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
    
    if calculated_hash != hash_:
        raise ValueError("Invalid hash signature")
        
    user_str = parsed_data.get("user", "{}")
    user_data = json.loads(user_str)
    return user_data
