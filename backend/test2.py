import sys
sys.path.insert(0, '.')
from app.services.firebase_service import init_firebase, get_db

def test_firebase():
    try:
        print("Initializing Firebase...")
        init_firebase()
        db = get_db()
        print("Firebase initialized successfully!")
        
        print("Testing Firestore connection...")
        doc_ref = db.collection('test_connection').document('ping')
        doc_ref.set({
            'status': 'success',
            'message': 'Firestore is working!'
        })
        print("Successfully wrote data to Firestore!")
        
        doc = doc_ref.get()
        if doc.exists:
            print(f"Successfully read data from Firestore: {doc.to_dict()}")
            
            # Clean up the test document
            doc_ref.delete()
            print("Successfully cleaned up test data!")
            return True
        else:
            print("Failed to read data back.")
            return False
            
    except Exception as e:
        print(f"Error connecting to Firebase: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    test_firebase()
