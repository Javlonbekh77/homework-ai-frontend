const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const fallbackBaseUrl = import.meta.env.DEV
  ? "http://localhost:8000/api"
  : "https://homework-ai-backend-mots.onrender.com/api";
const BASE_URL = normalizeApiBaseUrl(configuredBaseUrl || fallbackBaseUrl);

function normalizeApiBaseUrl(url: string) {
  const cleanUrl = url.replace(/\/$/, "");
  return cleanUrl.endsWith("/api") ? cleanUrl : `${cleanUrl}/api`;
}

async function parseError(res: Response, fallback: string) {
  const data = await res.json().catch(() => null);
  return data?.detail || fallback;
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
  const res = await fetch(`${BASE_URL}/classes/${classId}/homeworks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-user-id": userId },
    body: JSON.stringify({ title, description, subject })
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

export async function publishHomework(userId: string, homeworkId: string) {
  const res = await fetch(`${BASE_URL}/homeworks/${homeworkId}/publish`, {
    method: "POST",
    headers: { "x-user-id": userId }
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
