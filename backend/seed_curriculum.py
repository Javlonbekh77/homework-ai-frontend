import os
import sys
from datetime import datetime

# Add the backend directory to sys.path to resolve app imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.firebase_service import init_firebase, get_db

def seed_data():
    print("Initializing Firebase...")
    init_firebase()
    db = get_db()
    
    print("Seeding subjects...")
    subject_ref = db.collection("subjects").document("mathematics")
    subject_ref.set({
        "name": "Matematika",
        "slug": "mathematics",
        "active": True
    })
    
    print("Seeding grades...")
    grades = [7, 8, 9]
    for grade in grades:
        grade_id = f"mathematics_{grade}"
        db.collection("grades").document(grade_id).set({
            "grade_number": grade,
            "subject_id": "mathematics",
            "active": True
        })
        
    print("Seeding topics and skills...")
    curriculum = {
        7: [
            {
                "name": "Chiziqli tenglamalar",
                "slug": "linear_equations",
                "order": 1,
                "skills": [
                    {
                        "slug": "solve_ax_plus_b_equals_c",
                        "name": "ax + b = c ko'rinishidagi tenglamani yechish",
                        "description": "Chiziqli tenglamalarni yechish va noma'lum o'zgaruvchini topish.",
                        "order": 1
                    },
                    {
                        "slug": "simplify_expression",
                        "name": "Ifodalarni soddalashtirish",
                        "description": "Qavslarni ochish va o'xshash hadlarni guruhlash.",
                        "order": 2
                    },
                    {
                        "slug": "move_term",
                        "name": "Haddlarni tenglikning ikkinchi tarafiga o'tkazish",
                        "description": "Tenglamadagi hadlarni qarama-qarshi ishora bilan o'tkazish.",
                        "order": 3
                    },
                    {
                        "slug": "verify_linear_solution",
                        "name": "Yechimni tekshirish",
                        "description": "Topilgan javobni tenglamaga qo'yib tekshirib ko'rish.",
                        "order": 4
                    }
                ]
            },
            {
                "name": "Kasrlar",
                "slug": "fractions",
                "order": 2,
                "skills": [
                    {
                        "slug": "common_denominator",
                        "name": "Umumiy maxrajga keltirish",
                        "description": "Kasrlarni umumiy maxrajga keltirish qoidasi.",
                        "order": 1
                    },
                    {
                        "slug": "fraction_addition_subtraction",
                        "name": "Kasrlarni qo'shish va ayirish",
                        "description": "Oddiy va aralash kasrlarni qo'shish va ayirish.",
                        "order": 2
                    },
                    {
                        "slug": "fraction_multiplication",
                        "name": "Kasrlarni ko'paytirish",
                        "description": "Kasrlarni va aralash sonlarni ko'paytirish.",
                        "order": 3
                    },
                    {
                        "slug": "fraction_division",
                        "name": "Kasrlarni bo'lish",
                        "description": "Kasrlarni va butun sonlarni bo'lish qoidasi.",
                        "order": 4
                    }
                ]
            },
            {
                "name": "Manfiy sonlar",
                "slug": "negative_numbers",
                "order": 3,
                "skills": [
                    {
                        "slug": "negative_addition_subtraction",
                        "name": "Manfiy sonlarni qo'shish va ayirish",
                        "description": "Musbat va manfiy sonlarni qo'shish va ayirish.",
                        "order": 1
                    },
                    {
                        "slug": "negative_multiplication_division",
                        "name": "Manfiy sonlarni ko'paytirish va bo'lish",
                        "description": "Musbat va manfiy sonlarni ko'paytirish hamda bo'lish.",
                        "order": 2
                    },
                    {
                        "slug": "negative_sign_rules",
                        "name": "Ishoralar qoidasini qo'llash",
                        "description": "Amallarni bajarishda ishoralarning o'zgarish qoidasi.",
                        "order": 3
                    }
                ]
            },
            {
                "name": "Nisbat va proporsiya",
                "slug": "ratios_and_proportions",
                "order": 4,
                "skills": [
                    {
                        "slug": "identify_proportion",
                        "name": "Proporsiyani aniqlash",
                        "description": "Proporsiyaning asosiy xossasini tushunish.",
                        "order": 1
                    },
                    {
                        "slug": "find_unknown_proportion",
                        "name": "Proporsiyaning noma'lum hadini topish",
                        "description": "Proporsiyaning noma'lum chetki yoki o'rta hadini aniqlash.",
                        "order": 2
                    },
                    {
                        "slug": "direct_proportion",
                        "name": "To'g'ri proporsional bog'liqlik",
                        "description": "To'g'ri proporsional bog'liqlik bo'yicha masalalarni yechish.",
                        "order": 3
                    }
                ]
            }
        ],
        8: [
            {
                "name": "Chiziqli tenglamalar tizimi",
                "slug": "linear_systems",
                "order": 1,
                "skills": [
                    {
                        "slug": "substitution_method",
                        "name": "O'rniga qo'yish usuli",
                        "description": "Tizimni o'rniga qo'yish usuli yordamida yechish.",
                        "order": 1
                    },
                    {
                        "slug": "elimination_method",
                        "name": "Qo'shish usuli",
                        "description": "Tizimni hadma-had qo'shish yoki ayirish usuli bilan yechish.",
                        "order": 2
                    },
                    {
                        "slug": "system_simplification",
                        "name": "Tizimni soddalashtirish",
                        "description": "Tizim tenglamalarini sodda ko'rinishga keltirish.",
                        "order": 3
                    },
                    {
                        "slug": "verify_system_solution",
                        "name": "Tizim yechimini tekshirish",
                        "description": "Yechimlar juftligini har ikkala tenglamaga qo'yib tekshirish.",
                        "order": 4
                    }
                ]
            },
            {
                "name": "Kvadrat ifodalar",
                "slug": "quadratic_expressions",
                "order": 2,
                "skills": [
                    {
                        "slug": "coefficient_recognition",
                        "name": "Koeffitsiyentlarni aniqlash",
                        "description": "Kvadrat uchhadda a, b, c koeffitsiyentlarini aniqlash.",
                        "order": 1
                    },
                    {
                        "slug": "factoring_quadratic",
                        "name": "Kvadrat ifodani ko'paytuvchilarga ajratish",
                        "description": "Kvadrat uchhadni ko'paytuvchilarga ajratish qoidalari.",
                        "order": 2
                    },
                    {
                        "slug": "expression_simplification",
                        "name": "Kvadrat ifodalarni soddalashtirish",
                        "description": "Kvadrat qavslarni ochish va qisqartirish.",
                        "order": 3
                    }
                ]
            },
            {
                "name": "Kvadrat tenglamalar",
                "slug": "quadratic_equations",
                "order": 3,
                "skills": [
                    {
                        "slug": "identify_a_b_c",
                        "name": "Koeffitsiyentlarni (a, b, c) aniqlash",
                        "description": "ax^2 + bx + c = 0 ko'rinishidagi tenglamada koeffitsiyentlarni topish.",
                        "order": 1
                    },
                    {
                        "slug": "calculate_discriminant",
                        "name": "Diskriminantni hisoblash",
                        "description": "D = b^2 - 4ac formula yordamida diskriminantni hisoblash.",
                        "order": 2
                    },
                    {
                        "slug": "handle_negative_signs_quadratic",
                        "name": "Manfiy ishoralar bilan ishlash",
                        "description": "Kvadrat tenglamalarda manfiy ishoralarni to'g'ri hisoblash.",
                        "order": 3
                    },
                    {
                        "slug": "quadratic_formula",
                        "name": "Kvadrat formula orqali yechish",
                        "description": "Kvadrat tenglama ildizlari formulasini qo'llash.",
                        "order": 4
                    },
                    {
                        "slug": "calculate_roots",
                        "name": "Ildizlarni hisoblash",
                        "description": "Tenglamaning haqiqiy ildizlarini topish.",
                        "order": 5
                    },
                    {
                        "slug": "verify_roots",
                        "name": "Ildizlarni tekshirish",
                        "description": "Ildizlarni berilgan tenglamaga qo'yib tekshirish.",
                        "order": 6
                    }
                ]
            },
            {
                "name": "Funksiyalar",
                "slug": "functions",
                "order": 4,
                "skills": [
                    {
                        "slug": "identify_function",
                        "name": "Funksiyani aniqlash",
                        "description": "Funksiya ta'rifi va turlarini tushunish.",
                        "order": 1
                    },
                    {
                        "slug": "substitute_function_value",
                        "name": "Argument qiymatini qo'yish",
                        "description": "Funksiyadagi x o'rniga berilgan qiymatni qo'yish.",
                        "order": 2
                    },
                    {
                        "slug": "calculate_function_value",
                        "name": "Funksiya qiymatini hisoblash",
                        "description": "Funksiyaning y o'qidagi qiymatini hisoblash.",
                        "order": 3
                    }
                ]
            }
        ],
        9: [
            {
                "name": "Tengsizliklar",
                "slug": "inequalities",
                "order": 1,
                "skills": [
                    {
                        "slug": "solve_linear_inequality",
                        "name": "Chiziqli tengsizlikni yechish",
                        "description": "Chiziqli tengsizliklarni yechish va soddalashtirish.",
                        "order": 1
                    },
                    {
                        "slug": "inequality_sign_change",
                        "name": "Tengsizlik ishorasining o'zgarishi",
                        "description": "Manfiy songa ko'paytirish yoki bo'lishda ishorani o'zgartirish.",
                        "order": 2
                    },
                    {
                        "slug": "interval_notation",
                        "name": "Interval ko'rinishida yozish",
                        "description": "Yechimni sonlar o'qida va interval shaklida tasvirlash.",
                        "order": 3
                    }
                ]
            },
            {
                "name": "Kvadrat funksiyalar",
                "slug": "quadratic_functions",
                "order": 2,
                "skills": [
                    {
                        "slug": "calculate_vertex",
                        "name": "Parabola uchini hisoblash",
                        "description": "Parabolaning uchi koordinatalarini (x_0, y_0) topish.",
                        "order": 1
                    },
                    {
                        "slug": "find_roots",
                        "name": "Nollarni topish",
                        "description": "Kvadrat funksiya ildizlari va grafikning x o'qi bilan kesishish nuqtalarini topish.",
                        "order": 2
                    },
                    {
                        "slug": "interpret_parabola_graph",
                        "name": "Parabola grafigini tahlil qilish",
                        "description": "Parabola tarmoqlari yo'nalishini va uning holatini tushunish.",
                        "order": 3
                    }
                ]
            },
            {
                "name": "Ketma-ketlik va progressiyalar",
                "slug": "progressions",
                "order": 3,
                "skills": [
                    {
                        "slug": "identify_progression_sequence",
                        "name": "Ketma-ketlikni aniqlash",
                        "description": "Ketma-ketlik qonuniyatini va uning turini aniqlash.",
                        "order": 1
                    },
                    {
                        "slug": "arithmetic_progression_nth",
                        "name": "Arifmetik progressiya n-hadi",
                        "description": "Arifmetik progressiyaning n-hadini topish formulasini qo'llash.",
                        "order": 2
                    },
                    {
                        "slug": "arithmetic_progression_sum",
                        "name": "Progressiya yig'indisi",
                        "description": "Arifmetik progressiyaning dastlabki n ta had yig'indisini hisoblash.",
                        "order": 3
                    }
                ]
            },
            {
                "name": "Tizimlar / Murakkab algebra",
                "slug": "advanced_systems",
                "order": 4,
                "skills": [
                    {
                        "slug": "advanced_substitution",
                        "name": "Murakkab o'rniga qo'yish usuli",
                        "description": "Yuqori darajali tenglamalar tizimini yechish.",
                        "order": 1
                    },
                    {
                        "slug": "advanced_algebraic_manipulation",
                        "name": "Algebraik almashtirishlar",
                        "description": "Murakkab algebraik ifodalarni soddalashtirish.",
                        "order": 2
                    }
                ]
            }
        ]
    }
    
    for grade, topics in curriculum.items():
        for topic_index, topic_data in enumerate(topics):
            topic_id = f"mathematics_g{grade}_{topic_data['slug']}"
            print(f"Creating topic: {topic_id} ({topic_data['name']})")
            db.collection("topics").document(topic_id).set({
                "subject_id": "mathematics",
                "grade": grade,
                "name": topic_data["name"],
                "slug": topic_data["slug"],
                "order": topic_data["order"],
                "active": True
            })
            
            for skill_data in topic_data["skills"]:
                skill_id = f"math_g{grade}_{topic_data['slug']}_{skill_data['slug']}"
                print(f"  Creating skill: {skill_id} ({skill_data['name']})")
                db.collection("skills").document(skill_id).set({
                    "subject_id": "mathematics",
                    "grade": grade,
                    "topic_id": topic_id,
                    "name": skill_data["name"],
                    "slug": skill_data["slug"],
                    "description": skill_data["description"],
                    "order": skill_data["order"],
                    "active": True
                })
                
    print("✅ Successfully seeded math curriculum taxonomy!")

if __name__ == "__main__":
    seed_data()
