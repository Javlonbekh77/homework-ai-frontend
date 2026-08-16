import os
import json
import firebase_admin
from firebase_admin import credentials, firestore

db = None

def init_firebase():
    global db
    if not firebase_admin._apps:
        service_account_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        cred_path = (
            os.getenv("FIREBASE_CREDENTIALS_PATH")
            or os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            or os.path.join(os.path.dirname(__file__), "../../../firebase-adminsdk.json")
        )

        if service_account_json:
            cred = credentials.Certificate(json.loads(service_account_json))
            firebase_admin.initialize_app(cred)
        elif os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            raise ValueError(
                "Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON "
                f"or provide a credentials file at {cred_path}"
            )
    db = firestore.client()

def get_db():
    if db is None:
        raise RuntimeError("Firebase is not initialized")
    return db
