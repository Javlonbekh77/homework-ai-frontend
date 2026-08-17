from typing import List, Literal, Optional

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


DiktantErrorType = Literal[
    "spelling",
    "punctuation",
    "missing_word",
    "extra_word",
    "wrong_word",
    "capitalization",
    "uncertain",
]


class DiktantError(BaseModel):
    original_text: str = Field(description="Correct word or text fragment from the original dictation.")
    student_text: str = Field(description="Student's written word or text fragment, if visible.")
    error_type: DiktantErrorType = Field(description="Normalized type of the dictation error.")
    label: str = Field(description="Short Uzbek label for the error type.")
    explanation: str = Field(description="Short Uzbek explanation of why it is an error.")
    suggestion: str = Field(description="Short Uzbek correction tip for the student.")
    severity: Literal["minor", "medium", "major"] = Field(default="medium", description="Approximate severity.")


class DiktantEvaluationResult(BaseModel):
    image_quality: ImageQuality = Field(description="Overall readability of the student's dictation photo.")
    transcribed_student_text: str = Field(description="Student dictation text transcribed from the image.")
    total_errors: int = Field(ge=0, description="Total number of meaningful errors.")
    spelling_count: int = Field(ge=0, description="Number of spelling errors.")
    punctuation_count: int = Field(ge=0, description="Number of punctuation errors.")
    missing_word_count: int = Field(ge=0, description="Number of missing words.")
    extra_word_count: int = Field(ge=0, description="Number of extra words.")
    wrong_word_count: int = Field(ge=0, description="Number of wrong substituted words.")
    capitalization_count: int = Field(ge=0, description="Number of capitalization errors.")
    suggested_score_percent: float = Field(ge=0.0, le=100.0, description="Suggested score as a percentage.")
    errors: List[DiktantError] = Field(description="Detailed dictation errors.")
    general_feedback: str = Field(description="Overall Uzbek feedback for the student.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this evaluation, from 0 to 1.")


class TestAnswerItem(BaseModel):
    question_number: str = Field(description="Question number as written on the answer sheet.")
    selected_answer: str = Field(description="Selected answer, for example A, B, C, D, or an empty string if unreadable.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this extracted answer.")


class TestAnswerExtractionResult(BaseModel):
    image_quality: ImageQuality = Field(description="Overall readability of the test answer sheet.")
    answers: List[TestAnswerItem] = Field(description="Extracted answers from the student's answer sheet.")
    unreadable_questions: List[str] = Field(description="Question numbers that could not be read confidently.")
    general_notes: str = Field(description="Short Uzbek note about extraction quality.")


class ControlWorkProblemResult(BaseModel):
    problem_number: str = Field(description="Problem number visible in the student's control work.")
    expected_answer: str = Field(default="", description="Expected answer if provided or inferred.")
    student_answer: str = Field(default="", description="Student's final answer if visible.")
    status: Literal["correct", "partial", "incorrect", "missing", "uncertain"] = Field(description="Evaluation status.")
    score_percent: float = Field(ge=0.0, le=100.0, description="Suggested score percent for this problem.")
    feedback: str = Field(description="Short Uzbek feedback for this problem.")
    errors: List[ErrorDetail] = Field(default_factory=list, description="Specific errors in the solution.")
    unreadable_parts: List[str] = Field(default_factory=list, description="Unreadable or unclear parts.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this problem evaluation.")


class ControlWorkEvaluationResult(BaseModel):
    image_quality: ImageQuality = Field(description="Overall readability of the student's control work photo.")
    total_problems: int = Field(ge=0, description="Total number of problems found or expected.")
    correct_count: int = Field(ge=0, description="Number of correct problems.")
    partial_count: int = Field(ge=0, description="Number of partially correct problems.")
    incorrect_count: int = Field(ge=0, description="Number of incorrect problems.")
    missing_count: int = Field(ge=0, description="Number of missing problems.")
    uncertain_count: int = Field(ge=0, description="Number of uncertain problems.")
    suggested_score_percent: float = Field(ge=0.0, le=100.0, description="Suggested overall score percent.")
    problems: List[ControlWorkProblemResult] = Field(description="Detailed evaluation for every problem.")
    general_feedback: str = Field(description="Overall Uzbek feedback for the student.")
    teacher_private_feedback: str = Field(description="Private Uzbek feedback visible only to the teacher.")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence for this evaluation, from 0 to 1.")


class AIVariantInfo(BaseModel):
    template_type: str = Field(description="Type of equation or problem template, e.g. quadratic_equation, ax_plus_b_equals_c")
    parameters: dict = Field(default_factory=dict, description="Extracted parameters to reproduce this problem with different numbers, e.g. {'a': 1, 'b': -5, 'c': 6}")


class AIExtractedQuestion(BaseModel):
    question_text: str = Field(description="The exact mathematical question text. Output it in Uzbek language.")
    question_type: Literal["multiple_choice", "numeric", "short_answer"] = Field(description="Type of the question.")
    skill_slugs: List[str] = Field(description="One or more skill slugs that this question tests, selected strictly from the list of provided skills. If you cannot confidently map, leave empty.")
    correct_answer: str = Field(description="Correct final answer. For multiple_choice, write the option text. For numeric, write the number.")
    solution_steps: List[str] = Field(description="Step by step solution in Uzbek.")
    difficulty: int = Field(ge=1, le=3, description="Estimated difficulty: 1=easy, 2=medium, 3=hard.")
    variant_allowed: bool = Field(description="Whether similar questions can be generated reliably using controlled numeric variation.")
    variant: Optional[AIVariantInfo] = Field(default=None, description="Variant information if variant_allowed is true.")
    options: Optional[List[str]] = Field(default=None, description="Required only if question_type is multiple_choice. List of options.")
    correct_option_index: Optional[int] = Field(default=None, description="Required only if question_type is multiple_choice. 0-based index of the correct option.")
    accepted_answers: Optional[List[str]] = Field(default=None, description="Required only if question_type is short_answer. List of accepted string representations.")
    answer_tolerance: Optional[float] = Field(default=0.0, description="Tolerance for numeric answers, default 0.")
    answer_unit: Optional[str] = Field(default=None, description="Unit for answers, default null.")
    confidence: float = Field(ge=0.0, le=1.0, description="Self-reported confidence from 0 to 1.")


class AIExtractionResult(BaseModel):
    questions: List[AIExtractedQuestion] = Field(description="List of extracted questions.")
