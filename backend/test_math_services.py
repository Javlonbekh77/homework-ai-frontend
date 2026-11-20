import sys
import os
import asyncio
from dotenv import load_dotenv

# Load env variables from root directory
load_dotenv(os.path.join(os.path.dirname(__file__), "../.env"))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from app.services.firebase_service import init_firebase
from app.services.curriculum_service import get_active_grades, get_topics_by_grade, get_skills_by_topic
from app.services.question_validation_service import validate_question
from app.services.question_bank_service import generate_variant_from_template

def test_curriculum():
    print("\n=== Testing Curriculum Taxonomy ===")
    init_firebase()
    
    # 1. Fetch active grades
    grades = get_active_grades()
    print(f"Active grades in database: {grades}")
    if not grades:
        print("Warning: No grades found. Please seed the database first.")
        return
        
    # 2. Fetch topics for first grade
    first_grade = grades[0]["grade_number"]
    topics = get_topics_by_grade(first_grade)
    print(f"Topics for Grade {first_grade}: {[t['name'] for t in topics]}")
    
    if topics:
        # 3. Fetch skills for first topic
        first_topic_id = topics[0]["id"]
        skills = get_skills_by_topic(first_topic_id)
        print(f"Skills for topic '{topics[0]['name']}': {[s['name'] for s in skills]}")

def test_validation():
    print("\n=== Testing Mathematical Validation Engine ===")
    
    # Test linear equation validation
    print("Testing linear equation:")
    res_linear = validate_question(
        "2x + 4 = 10 tenglamani yeching.",
        "3",
        "numeric"
    )
    print(f"2x + 4 = 10 with answer '3': {res_linear}") # should be verified
    
    res_linear_wrong = validate_question(
        "2x + 4 = 10 tenglamani yeching.",
        "5",
        "numeric"
    )
    print(f"2x + 4 = 10 with answer '5': {res_linear_wrong}") # should be failed

    # Test quadratic equation validation
    print("\nTesting quadratic equation:")
    res_quad = validate_question(
        "x^2 - 5x + 6 = 0 tenglamaning yechimlarini toping.",
        "2,3",
        "numeric"
    )
    print(f"x^2 - 5x + 6 = 0 with answer '2,3': {res_quad}") # should be verified
    
    res_quad_wrong = validate_question(
        "x^2 - 5x + 6 = 0 tenglamaning yechimlarini toping.",
        "1,6",
        "numeric"
    )
    print(f"x^2 - 5x + 6 = 0 with answer '1,6': {res_quad_wrong}") # should be failed

def test_variant_generation():
    print("\n=== Testing Variant Generation Concept ===")
    # We will mock the DB get for a doc or just check the logic directly in question_bank_service
    # Since we defined generate_variant_from_template inside question_bank_service, let's verify if we can test it
    print("Checking variant math logic...")
    # Let's test the substitution manually
    # quadratic template:
    from app.services.question_bank_service import get_db
    db = get_db()
    # Check if we have any question_templates in the DB to test variant generation on
    docs = list(db.collection("question_templates").limit(1).stream())
    if docs:
        q_id = docs[0].id
        q_data = docs[0].to_dict()
        print(f"Found question template: {q_data.get('question_text')}")
        if q_data.get("variant_allowed") and q_data.get("variant_template"):
            # Update to make sure template_type is recognized
            template = q_data["variant_template"]
            print(f"Template type: {template.get('template_type')}")
            # generate variant with new parameters
            if template.get("template_type") == "quadratic_equation":
                res = generate_variant_from_template(q_id, {"a": 1, "b": -7, "c": 12})
                print(f"Generated variant: {res}")
            elif template.get("template_type") == "ax_plus_b_equals_c":
                res = generate_variant_from_template(q_id, {"a": 3, "b": -6, "c": 9})
                print(f"Generated variant: {res}")
        else:
            print("Question template doesn't allow variants.")
    else:
        print("No question templates found in Firestore to test variant generation.")

if __name__ == "__main__":
    test_curriculum()
    test_validation()
    test_variant_generation()
