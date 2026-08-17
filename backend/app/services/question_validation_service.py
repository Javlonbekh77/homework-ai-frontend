import re
import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

def parse_float(val_str: str) -> Optional[float]:
    """Tries to parse a string as float, handling Uzbek comma decimal separator."""
    try:
        val_str = val_str.replace(",", ".").strip()
        return float(val_str)
    except ValueError:
        return None

def solve_linear(eq_str: str) -> Optional[float]:
    """
    Tries to solve linear equations of type:
    ax + b = c
    ax = c
    """
    # Remove whitespace
    eq_str = re.sub(r"\s+", "", eq_str)
    
    # Match ax + b = c or ax - b = c
    match1 = re.match(r"^([+-]?\d*)x([+-]\d+)=([+-]?\d+)$", eq_str)
    if match1:
        a_str, b_str, c_str = match1.groups()
        a = float(a_str) if a_str and a_str not in ["+", "-"] else (-1.0 if a_str == "-" else 1.0)
        b = float(b_str)
        c = float(c_str)
        if a != 0:
            return (c - b) / a
            
    # Match ax = c
    match2 = re.match(r"^([+-]?\d*)x=([+-]?\d+)$", eq_str)
    if match2:
        a_str, c_str = match2.groups()
        a = float(a_str) if a_str and a_str not in ["+", "-"] else (-1.0 if a_str == "-" else 1.0)
        c = float(c_str)
        if a != 0:
            return c / a
            
    return None

def parse_quadratic_coefficients(eq_str: str) -> Optional[Tuple[float, float, float]]:
    """
    Tries to parse coefficients a, b, c from ax^2 + bx + c = 0
    Supports x^2, x², etc.
    """
    # Remove whitespace
    eq_str = re.sub(r"\s+", "", eq_str)
    # Standardize exponent sign
    eq_str = eq_str.replace("x²", "x^2")
    
    # Match ax^2 + bx + c = 0
    # pattern: ([+-]?\d*)x\^2([+-]?\d*)x([+-]?\d*)=0
    match = re.match(r"^([+-]?\d*)x\^2([+-]?\d*)x([+-]?\d+)=0$", eq_str)
    if match:
        a_str, b_str, c_str = match.groups()
        a = float(a_str) if a_str and a_str not in ["+", "-"] else (-1.0 if a_str == "-" else 1.0)
        b = float(b_str) if b_str and b_str not in ["+", "-"] else (-1.0 if b_str == "-" else (0.0 if not b_str else 1.0))
        c = float(c_str)
        return a, b, c
        
    # Match ax^2 + c = 0
    match_noc = re.match(r"^([+-]?\d*)x\^2([+-]?\d+)=0$", eq_str)
    if match_noc:
        a_str, c_str = match_noc.groups()
        a = float(a_str) if a_str and a_str not in ["+", "-"] else (-1.0 if a_str == "-" else 1.0)
        c = float(c_str)
        return a, 0.0, c

    # Match ax^2 + bx = 0
    match_nob = re.match(r"^([+-]?\d*)x\^2([+-]?\d*)x=0$", eq_str)
    if match_nob:
        a_str, b_str = match_nob.groups()
        a = float(a_str) if a_str and a_str not in ["+", "-"] else (-1.0 if a_str == "-" else 1.0)
        b = float(b_str) if b_str and b_str not in ["+", "-"] else (-1.0 if b_str == "-" else (0.0 if not b_str else 1.0))
        return a, b, 0.0

    return None

def validate_question(question_text: str, correct_answer: str, question_type: str) -> str:
    """
    Validates a question mathematically.
    Returns:
      'verified' - if validation succeeds
      'failed' - if validation fails
      'teacher_required' - if auto-validation is not possible
    """
    if question_type != "numeric":
        return "teacher_required"
        
    ans_val = parse_float(correct_answer)
    # Check if answer is a comma-separated list of roots (e.g. "2,3" or "2;3")
    ans_roots = []
    if ";" in correct_answer or "," in correct_answer or " " in correct_answer:
        parts = re.split(r"[,;\s]+", correct_answer)
        for p in parts:
            pv = parse_float(p)
            if pv is not None:
                ans_roots.append(pv)
    
    # 1. Look for quadratic equations
    quadratic_candidates = re.findall(r"([+-]?\s*\d*\s*x(?:\^2|²|2)\s*[+-]?\s*\d*\s*x\s*[+-]?\s*\d+\s*=\s*0)", question_text)
    if not quadratic_candidates:
        quadratic_candidates = re.findall(r"([+-]?\s*\d*\s*x(?:\^2|²|2)\s*[+-]\s*\d+\s*=\s*0)", question_text)
    if not quadratic_candidates:
        quadratic_candidates = re.findall(r"([+-]?\s*\d*\s*x(?:\^2|²|2)\s*[+-]?\s*\d*\s*x\s*=\s*0)", question_text)

    if quadratic_candidates:
        try:
            eq = quadratic_candidates[0]
            coeffs = parse_quadratic_coefficients(eq)
            if coeffs:
                a, b, c = coeffs
                # Check what is asked
                text_lower = question_text.lower()
                
                # Discriminant check
                if "diskriminant" in text_lower:
                    D = b**2 - 4*a*c
                    if ans_val is not None and abs(D - ans_val) < 1e-5:
                        return "verified"
                    else:
                        return "failed"
                        
                # Roots sum/product check
                if "ildizlari yig'indisi" in text_lower or "ildizlarining yig'indisi" in text_lower:
                    sum_roots = -b / a
                    if ans_val is not None and abs(sum_roots - ans_val) < 1e-5:
                        return "verified"
                    else:
                        return "failed"
                        
                if "ildizlari ko'paytmasi" in text_lower or "ildizlarining ko'paytmasi" in text_lower:
                    prod_roots = c / a
                    if ans_val is not None and abs(prod_roots - ans_val) < 1e-5:
                        return "verified"
                    else:
                        return "failed"
                
                # Default root calculation
                D = b**2 - 4*a*c
                if D >= 0:
                    x1 = (-b - D**0.5) / (2*a)
                    x2 = (-b + D**0.5) / (2*a)
                    roots = sorted([x1, x2])
                    
                    if len(ans_roots) == 2:
                        sorted_ans = sorted(ans_roots)
                        if abs(roots[0] - sorted_ans[0]) < 1e-5 and abs(roots[1] - sorted_ans[1]) < 1e-5:
                            return "verified"
                        else:
                            return "failed"
                    elif ans_val is not None:
                        # Only one root provided, check if it's one of them (or if double root)
                        if abs(D) < 1e-5 and abs(x1 - ans_val) < 1e-5:
                            return "verified"
                        if abs(x1 - ans_val) < 1e-5 or abs(x2 - ans_val) < 1e-5:
                            return "verified"
                        else:
                            return "failed"
        except Exception as e:
            logger.warning(f"Failed to validate quadratic equation: {e}")

    # 2. Look for linear equations
    # Extract something like 3x + 5 = 20
    linear_candidates = re.findall(r"([+-]?\s*\d*\s*x\s*[+-]\s*\d+\s*=\s*[+-]?\d+)", question_text)
    if not linear_candidates:
        linear_candidates = re.findall(r"([+-]?\s*\d*\s*x\s*=\s*[+-]?\d+)", question_text)
        
    if linear_candidates and ans_val is not None:
        try:
            eq = linear_candidates[0]
            expected_x = solve_linear(eq)
            if expected_x is not None:
                if abs(expected_x - ans_val) < 1e-5:
                    return "verified"
                else:
                    return "failed"
        except Exception as e:
            logger.warning(f"Failed to validate linear equation: {e}")

    # 3. Look for simple arithmetic calculations (e.g. "5 * 4 - 3" or similar)
    arithmetic_match = re.search(r"(\d+(?:\s*[\+\-\*\/]\s*\d+)+)", question_text)
    if arithmetic_match and ans_val is not None:
        try:
            expr = arithmetic_match.group(1)
            # Safe eval with restricted characters
            if re.match(r"^[\d\s\+\-\*\/\(\)\.]+$", expr):
                val = eval(expr)
                if abs(val - ans_val) < 1e-5:
                    return "verified"
        except Exception:
            pass

    return "teacher_required"
