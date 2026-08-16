import os
import json
import base64
import firebase_admin
from firebase_admin import credentials, firestore

db = None
firebase_error = None

def init_firebase():
    global db, firebase_error
    try:
        if not firebase_admin._apps:
            service_account_json = _get_service_account_json()
            cred_path = (
                os.getenv("FIREBASE_CREDENTIALS_PATH")
                or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
                or os.path.join(os.path.dirname(__file__), "../../../firebase-adminsdk.json")
            )

            if service_account_json:
                cred = credentials.Certificate(service_account_json)
                firebase_admin.initialize_app(cred)
            elif os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                raise ValueError(
                    "Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_BASE64 "
                    "or FIREBASE_SERVICE_ACCOUNT_JSON "
                    f"or provide a credentials file at {cred_path}"
                )
        db = firestore.client()
        firebase_error = None
    except Exception as exc:
        firebase_error = str(exc)
        raise

def get_db():
    if db is None:
        try:
            init_firebase()
        except Exception as exc:
            raise RuntimeError(f"Firebase is not initialized: {exc}") from exc
    return db


def is_firebase_ready():
    return db is not None


def get_firebase_error():
    return firebase_error


def get_firebase_env_status():
    return {
        "has_firebase_service_account_base64": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64")),
        "has_firebase_service_account_json": bool(os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")),
        "has_firebase_credentials_path": bool(os.getenv("FIREBASE_CREDENTIALS_PATH")),
        "has_google_application_credentials": bool(os.getenv("GOOGLE_APPLICATION_CREDENTIALS")),
    }


def _get_service_account_json():
    global firebase_error
    raw_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    raw_base64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64")

    if raw_base64:
        try:
            decoded = base64.b64decode(raw_base64).decode("utf-8")
            return json.loads(decoded)
        except Exception as exc:
            firebase_error = f"Invalid FIREBASE_SERVICE_ACCOUNT_BASE64: {exc}"
            raise ValueError(firebase_error) from exc

    if not raw_json:
        return None

    try:
        return json.loads(raw_json)
    except json.JSONDecodeError as exc:
        firebase_error = f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {exc}"
        raise ValueError(firebase_error) from exc
