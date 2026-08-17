const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const fallbackBaseUrl = import.meta.env.DEV
  ? "http://localhost:8000/api"
  : "https://homework-ai-backend-mots.onrender.com/api";
const BASE_URL = normalizeApiBaseUrl(configuredBaseUrl || fallbackBaseUrl);

function normalizeApiBaseUrl(url: string) {
  const cleanUrl = url.replace(/\/$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
}

export function apiAssetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  const backendRoot = BASE_URL.replace(/\/api$/, "");
  return `${backendRoot}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function parseError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  if (!data?.detail) return fallback;
  if (typeof data.detail === "string") return data.detail;
  return JSON.stringify(data.detail);
}

export async function authWithTelegram(initData: string) {
  const res = await fetch(`${BASE_URL}/auth/telegram`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ init_data: initData }),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to auth"));
  return res.json();
}

export async function updateRole(userId: string, role: string) {
  const res = await fetch(`${BASE_URL}/users/me/role`, {
    method: "PATCH",
    headers: { 
      "Content-Type": "application/json",
      "x-user-id": userId 
    },
    body: JSON.stringify({ role }),
  });
  if (!res.ok) throw new Error("Failed to update role");
  return res.json();
}

export async function updateProfile(userId: string, updates: { full_name?: string }) {
  const res = await fetch(`${BASE_URL}/users/me/profile`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to update profile"));
  return res.json();
}

export async function getClasses(userId: string) {
  const res = await fetch(`${BASE_URL}/classes/`, {
    headers: { "x-user-id": userId },
  });
  if (!res.ok) throw new Error("Failed to fetch classes");
  return res.json();
}

export async function createClass(userId: string, name: string, subject: string) {
  const res = await fetch(`${BASE_URL}/classes/`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-user-id": userId 
    },
    body: JSON.stringify({ name, subject }),
  });
  if (!res.ok) throw new Error("Failed to create class");
  return res.json();
}

export async function joinClass(userId: string, joinCode: string) {
  const res = await fetch(`${BASE_URL}/classes/join`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      "x-user-id": userId 
    },
    body: JSON.stringify({ join_code: joinCode }),
  });
  if (!res.ok) throw new Error("Failed to join class");
  return res.json();
}

export async function searchClassByCode(userId: string, joinCode: string) {
  const params = new URLSearchParams({ join_code: joinCode.trim().toUpperCase() });
  const res = await fetch(`${BASE_URL}/classes/search?${params.toString()}`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error(await parseError(res, "Sinf topilmadi"));
  return res.json();
}

// ----------------- HOMEWORKS -----------------

export async function createHomework(userId: string, classId: string, title: string, description: string, subject: string) {
  const res = await fetch(`${BASE_URL}/homeworks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ title, description, subject, class_id: classId })
  });
  if (!res.ok) throw new Error("Failed to create homework");
  return res.json();
}

export async function getClassHomeworks(userId: string, classId: string) {
  const res = await fetch(`${BASE_URL}/classes/${classId}/homeworks`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch homeworks");
  return res.json();
}

export async function analyzeHomeworkSource(userId: string, homeworkId: string, file: File, problemRange: string) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("problem_range", problemRange);

  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/analyze-source`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to analyze source");
  }
  return res.json();
}

export async function approveAnswerKey(userId: string, homeworkId: string, answerKey: any) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/approve-answer-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ approved_answer_key: answerKey })
  });
  if (!res.ok) throw new Error("Failed to approve answer key");
  return res.json();
}

export async function updateHomework(userId: string, homeworkId: string, updates: any) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error("Failed to update homework");
  return res.json();
}

export async function publishHomework(userId: string, homeworkId: string, classId?: string) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ class_id: classId })
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to publish homework");
  }
  return res.json();
}

export async function getHomeworkSubmissions(userId: string, homeworkId: string) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/submissions`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function getStudentHomeworks(userId: string) {
  const res = await fetch(`${BASE_URL}/student/homeworks`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch student homeworks");
  return res.json();
}

export async function getHomeworkDetail(userId: string, homeworkId: string) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch homework detail");
  return res.json();
}

export async function submitHomework(userId: string, homeworkId: string, file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/submit`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to submit homework");
  }
  return res.json();
}

export async function getMySubmissions(userId: string, homeworkId: string) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/my-submissions`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch my submissions");
  return res.json();
}

export async function getClassStudents(userId: string, classId: string) {
  const res = await fetch(`${BASE_URL}/classes/${classId}/students`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch class students");
  return res.json();
}

export async function getTeacherHomeworks(userId: string) {
  const res = await fetch(`${BASE_URL}/teacher/homeworks`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch teacher homeworks");
  return res.json();
}

export async function getTeacherDashboard(userId: string) {
  const res = await fetch(`${BASE_URL}/teacher/dashboard`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch teacher dashboard");
  return res.json();
}

export async function getHomeworkBank(userId: string) {
  const res = await fetch(`${BASE_URL}/homework-bank`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch homework bank"));
  return res.json();
}

export async function assignHomeworkBankItem(userId: string, bankItemId: string, classId: string, publish = false) {
  const res = await fetch(`${BASE_URL}/homework-bank/${bankItemId}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({ class_id: classId, publish })
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to assign homework bank item"));
  return res.json();
}

export async function getUncertainReviews(userId: string) {
  const res = await fetch(`${BASE_URL}/homework-reviews/uncertain`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch uncertain reviews"));
  return res.json();
}

export async function reviewUncertainProblem(
  userId: string,
  submissionId: string,
  problemIndex: number,
  decision: "correct" | "incorrect" | "unrelated",
  feedback?: string,
) {
  const res = await fetch(`${BASE_URL}/homework-reviews/uncertain/${submissionId}/problems/${problemIndex}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({ decision, feedback })
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to review uncertain problem"));
  return res.json();
}

// --- MATH LEARNING / TAXONOMY & QUESTION BANK API ---

export async function getGrades(userId: string) {
  const res = await fetch(`${BASE_URL}/math/grades`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch math grades");
  return res.json();
}

export async function getTopics(userId: string, grade?: number) {
  const url = grade ? `${BASE_URL}/math/topics?grade=${grade}` : `${BASE_URL}/math/topics`;
  const res = await fetch(url, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch math topics");
  return res.json();
}

export async function getSkills(userId: string, topicId: string) {
  const res = await fetch(`${BASE_URL}/math/topics/${topicId}/skills`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch math skills");
  return res.json();
}

export async function getQuestionBank(
  userId: string,
  filters: { subject_id?: string; grade?: number; topic_id?: string; skill_id?: string; status?: string }
) {
  const params = new URLSearchParams();
  if (filters.subject_id) params.append("subject_id", filters.subject_id);
  if (filters.grade !== undefined) params.append("grade", String(filters.grade));
  if (filters.topic_id) params.append("topic_id", filters.topic_id);
  if (filters.skill_id) params.append("skill_id", filters.skill_id);
  if (filters.status) params.append("status", filters.status);

  const res = await fetch(`${BASE_URL}/question-bank/questions?${params.toString()}`, {
    headers: { "x-user-id": userId }
  });
  if (!res.ok) throw new Error("Failed to fetch question bank");
  return res.json();
}

export async function createQuestion(userId: string, question: any) {
  const res = await fetch(`${BASE_URL}/question-bank/questions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify(question)
  });
  if (!res.ok) throw new Error("Failed to create question");
  return res.json();
}

export async function updateQuestion(userId: string, questionId: string, updates: any) {
  const res = await fetch(`${BASE_URL}/question-bank/questions/${questionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error("Failed to update question");
  return res.json();
}

export async function updateQuestionStatus(userId: string, questionId: string, status: string) {
  const res = await fetch(`${BASE_URL}/question-bank/questions/${questionId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({ status })
  });
  if (!res.ok) throw new Error("Failed to update question status");
  return res.json();
}

export async function extractQuestions(userId: string, formData: FormData) {
  const res = await fetch(`${BASE_URL}/question-bank/extract`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Failed to extract questions");
  }
  return res.json();
}

export async function generateVariant(userId: string, questionId: string, parameters: any) {
  const res = await fetch(`${BASE_URL}/question-bank/questions/${questionId}/generate-variant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({ parameters })
  });
  if (!res.ok) throw new Error("Failed to generate variant");
  return res.json();
}

export async function createTopic(userId: string, topic: { grade: number; name: string; subject?: string; class_id?: string }) {
  const res = await fetch(`${BASE_URL}/math/topics`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify(topic)
  });
  if (!res.ok) throw new Error("Failed to create topic");
  return res.json();
}

// --- AI CHECKERS ---

export async function checkDiktant(
  userId: string,
  payload: {
    originalText: string;
    studentName: string;
    className?: string;
    studentId?: string;
    classId?: string;
    title?: string;
    subject?: string;
    maxScore?: number;
    image: File;
  }
) {
  const formData = new FormData();
  formData.append("original_text", payload.originalText);
  formData.append("student_name", payload.studentName);
  formData.append("title", payload.title || "Diktant");
  formData.append("subject", payload.subject || "Ona tili");
  formData.append("max_score", String(payload.maxScore || 10));
  if (payload.className) formData.append("class_name", payload.className);
  if (payload.studentId) formData.append("student_id", payload.studentId);
  if (payload.classId) formData.append("class_id", payload.classId);
  formData.append("image", payload.image);

  const res = await fetch(`${BASE_URL}/checkers/diktant`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to check diktant"));
  return res.json();
}

export async function checkTestManual(
  userId: string,
  payload: {
    title: string;
    className?: string;
    classId?: string;
    studentName: string;
    studentId?: string;
    subject?: string;
    maxScore: number;
    answerKey: Record<number | string, string>;
    studentAnswers: Record<number | string, string>;
  }
) {
  const res = await fetch(`${BASE_URL}/checkers/tests/manual`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({
      title: payload.title,
      class_name: payload.className,
      class_id: payload.classId,
      student_name: payload.studentName,
      student_id: payload.studentId,
      subject: payload.subject || "Matematika",
      max_score: payload.maxScore,
      answer_key: payload.answerKey,
      student_answers: payload.studentAnswers
    })
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to check test"));
  return res.json();
}

export async function checkTestScan(
  userId: string,
  payload: {
    title: string;
    className?: string;
    classId?: string;
    studentName: string;
    studentId?: string;
    subject?: string;
    maxScore: number;
    questionCount: number;
    answerKey: Record<number | string, string>;
    image: File;
  }
) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("student_name", payload.studentName);
  formData.append("subject", payload.subject || "Matematika");
  formData.append("max_score", String(payload.maxScore));
  formData.append("question_count", String(payload.questionCount));
  formData.append("answer_key_json", JSON.stringify(payload.answerKey));
  if (payload.className) formData.append("class_name", payload.className);
  if (payload.classId) formData.append("class_id", payload.classId);
  if (payload.studentId) formData.append("student_id", payload.studentId);
  formData.append("image", payload.image);

  const res = await fetch(`${BASE_URL}/checkers/tests/scan`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to scan test"));
  return res.json();
}

export async function checkControlWork(
  userId: string,
  payload: {
    title: string;
    subject: string;
    studentName: string;
    className?: string;
    studentId?: string;
    classId?: string;
    maxScore: number;
    criteriaText?: string;
    answerKey?: any;
    image: File;
  }
) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("subject", payload.subject);
  formData.append("student_name", payload.studentName);
  formData.append("max_score", String(payload.maxScore));
  if (payload.className) formData.append("class_name", payload.className);
  if (payload.studentId) formData.append("student_id", payload.studentId);
  if (payload.classId) formData.append("class_id", payload.classId);
  if (payload.criteriaText) formData.append("criteria_text", payload.criteriaText);
  if (payload.answerKey) formData.append("answer_key_json", JSON.stringify(payload.answerKey));
  formData.append("image", payload.image);

  const res = await fetch(`${BASE_URL}/checkers/control-work`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to check control work"));
  return res.json();
}

export async function analyzeControlWorkBase(
  userId: string,
  payload: {
    title: string;
    subject: string;
    problemRange?: string;
    image: File;
  }
) {
  const formData = new FormData();
  formData.append("title", payload.title);
  formData.append("subject", payload.subject);
  formData.append("problem_range", payload.problemRange || "Barcha ko'ringan savollar");
  formData.append("image", payload.image);

  const res = await fetch(`${BASE_URL}/checkers/control-work/base/analyze`, {
    method: "POST",
    headers: { "x-user-id": userId },
    body: formData
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to analyze control work base"));
  return res.json();
}

export async function sendTutorMessage(
  userId: string,
  payload: {
    message: string;
    homeworkId?: string;
    history?: Array<{ sender: "user" | "ai"; text: string }>;
  }
) {
  const res = await fetch(`${BASE_URL}/student/tutor/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-user-id": userId
    },
    body: JSON.stringify({
      message: payload.message,
      homework_id: payload.homeworkId,
      history: payload.history || []
    })
  });
  if (!res.ok) throw new Error(await parseError(res, "Failed to send tutor message"));
  return res.json();
}
