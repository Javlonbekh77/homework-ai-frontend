from typing import List, Literal

from pydantic import BaseModel, Field


ImageQuality = Literal["good", "medium", "poor"]


class BookProblem(BaseModel):
    problem_number: str = Field(description="Problem number from the textbook, for example 1 or 12(a).")
    problem_text: str = Field(description="Original problem text transcribed from the image.")
    correct_answer: str = Field(description="Final correct answer.")
    solution_steps: List[str] = Field(description="Short step-by-step solution used to reach the answer.")
    unreadable_parts: List[str] = Field(description="Unclear words, symbols, or parts of the problem.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this extracted problem, from 0 to 1.")


class BookExtractionResult(BaseModel):
    image_quality: ImageQuality = Field(description="Overall readability of the textbook photo.")
    problems: List[BookProblem] = Field(description="Extracted and solved problems selected by the teacher.")
    general_notes: str = Field(description="Short Uzbek note about extraction quality or limitations.")


class ErrorDetail(BaseModel):
    step: str = Field(description="Student step where the first relevant error appears.")
    description: str = Field(description="Short Uzbek explanation of the error.")
    suggestion: str = Field(description="Short Uzbek suggestion for fixing the error.")


class EvaluatedProblem(BaseModel):
    problem_number: str = Field(description="Problem number from the answer key.")
    expected_answer: str = Field(description="Correct answer from the answer key after teacher overrides.")
    student_answer: str = Field(description="Student's final answer if visible, otherwise empty.")
    student_steps: List[str] = Field(description="Student work transcribed step by step.")
    status: Literal["correct", "incorrect", "missing", "uncertain"] = Field(
        description="Evaluation status for this problem."
    )
    errors: List[ErrorDetail] = Field(description="Errors found in the solution, empty if none.")
    unreadable_parts: List[str] = Field(description="Unreadable or unclear parts in the student's work.")
    feedback: str = Field(description="Brief Uzbek feedback for this problem.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this evaluation, from 0 to 1.")


class HomeworkEvaluationResult(BaseModel):
    total_problems: int = Field(ge=0, description="Total number of assigned problems.")
    correct_count: int = Field(ge=0, description="Number of correctly solved problems.")
    incorrect_count: int = Field(ge=0, description="Number of incorrectly solved problems.")
    missing_count: int = Field(ge=0, description="Number of assigned problems not found in the homework photo.")
    uncertain_count: int = Field(ge=0, description="Number of problems that could not be evaluated confidently.")
    problems: List[EvaluatedProblem] = Field(description="Detailed evaluation for every assigned problem.")
    general_feedback: str = Field(description="Overall Uzbek feedback for the student.")
