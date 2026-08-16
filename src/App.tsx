import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  Home,
  TrendingUp,
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Copy,
  FileCheck,
  Flame,
  GraduationCap,
  Plus,
  RefreshCcw,
  School,
  Send,
  Star,
  Trophy,
  Upload,
  UserRound,
  UsersRound,
} from "lucide-react";
import "./App.css";
import {
  analyzeHomeworkSource,
  approveAnswerKey,
  authWithTelegram,
  createClass,
  createHomework,
  getClassHomeworks,
  getClasses,
  getHomeworkSubmissions,
  getMySubmissions,
  getStudentHomeworks,
  joinClass,
  publishHomework,
  submitHomework,
  updateRole,
  getClassStudents,
  getTeacherHomeworks,
} from "./services/api";

type Role = "teacher" | "student";

type TelegramWebApp = {
  initData?: string;
  ready?: () => void;
  expand?: () => void;
};

type User = {
  id: string;
  telegram_id: number;
  telegram_username?: string | null;
  photo_url?: string | null;
  full_name: string;
  role?: Role | null;
};

type SchoolClass = {
  id: string;
  name: string;
  subject: string;
  join_code?: string;
  student_count?: number;
};

type AnswerProblem = {
  problem_number?: string;
  problem_text?: string;
  correct_answer?: string;
  confidence?: number;
};

type AnswerKey = {
  image_quality?: string;
  general_notes?: string;
  problems?: AnswerProblem[];
} & Record<string, unknown>;

type Homework = {
  id: string;
  class_id?: string;
  title: string;
  description?: string | null;
  subject: string;
  status?: string;
  max_score?: number;
  answer_key_approved?: boolean;
  ai_generated_answer_key?: AnswerKey;
  approved_answer_key?: AnswerKey;
  student_status?: "pending" | "submitted";
  latest_score?: number;
  latest_percentage?: number;
  attempt_count?: number;
  deadline?: string | null;
};

type ErrorDetail = {
  step?: string;
  description?: string;
  suggestion?: string;
};

type EvaluationProblem = {
  problem_number?: string;
  status?: string;
  feedback?: string;
  errors?: ErrorDetail[];
};

type Submission = {
  id: string;
  attempt_number?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  status?: string;
  submitted_at: string;
  grading_result?: {
    total_problems?: number;
    correct_count?: number;
    incorrect_count?: number;
    missing_count?: number;
    uncertain_count?: number;
    general_feedback?: string;
    problems?: EvaluationProblem[];
  };
};

type AuthResponse = {
  user: User;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const isLocalhost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Noma'lum xatolik yuz berdi";
}

function statusLabel(status?: string) {
  if (status === "published") return "Nashr qilingan";
  if (status === "graded") return "Tekshirildi";
  if (status === "draft") return "Qoralama";
  return status || "Yangi";
}

function statusBadge(status?: string) {
  if (status === "published") return "badge-green";
  if (status === "graded") return "badge-green";
  if (status === "draft") return "badge-orange";
  return "badge-gray";
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function scoreText(submission: Submission) {
  if (typeof submission.score !== "number") return "Natija tayyor";
  const maxScore = submission.max_score ?? 10;
  return `${submission.score}/${maxScore}`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [homeworks, setHomeworks] = useState<Homework[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTab, setCurrentTab] = useState("home");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [classForm, setClassForm] = useState({ name: "", subject: "Matematika" });
  const [homeworkForm, setHomeworkForm] = useState({
    title: "",
    description: "",
    subject: "Matematika",
  });
  const [joinCode, setJoinCode] = useState("");
  const [activeHomeworkId, setActiveHomeworkId] = useState("");
  const [problemRange, setProblemRange] = useState("1-misoldan 5-misolgacha");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [submitFileValue, setSubmitFileValue] = useState<File | null>(null);
  const [studentSubmissionHomeworkId, setStudentSubmissionHomeworkId] = useState("");
  const [studentSubmissions, setStudentSubmissions] = useState<Submission[]>([]);
  const [teacherSubmissionHomeworkId, setTeacherSubmissionHomeworkId] = useState("");
  const [teacherSubmissions, setTeacherSubmissions] = useState<Submission[]>([]);
  
  // Teacher Class Detail States
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState("");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [classSubTab, setClassSubTab] = useState<"students" | "homeworks" | "grades">("students");
  const [allTeacherHomeworks, setAllTeacherHomeworks] = useState<Homework[]>([]);
  const [expandedAnswerKeys, setExpandedAnswerKeys] = useState<string[]>([]);

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId),
    [classes, selectedClassId],
  );

  const isBusy = busyAction !== null;

  const loadTeacherHomeworks = useCallback(async (userId: string, classId: string) => {
    const list = (await getClassHomeworks(userId, classId)) as Homework[];
    setHomeworks(list);
  }, []);

  const loadDashboard = useCallback(
    async (nextUser: User, preferredClassId = "") => {
      if (!nextUser.role) return;

      setRefreshing(true);
      setError("");
      try {
        const classList = (await getClasses(nextUser.id)) as SchoolClass[];
        setClasses(classList);

        if (nextUser.role === "teacher") {
          const nextClassId = preferredClassId || classList[0]?.id || "";
          setSelectedClassId(nextClassId);
          if (nextClassId) {
            await loadTeacherHomeworks(nextUser.id, nextClassId);
          } else {
            setHomeworks([]);
          }
          const allHws = (await getTeacherHomeworks(nextUser.id)) as Homework[];
          setAllTeacherHomeworks(allHws);
        } else {
          const list = (await getStudentHomeworks(nextUser.id)) as Homework[];
          setHomeworks(list);
        }
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setRefreshing(false);
      }
    },
    [loadTeacherHomeworks],
  );

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.ready?.();
    webApp?.expand?.();

    async function bootstrap() {
      try {
        const initData = webApp?.initData || (isLocalhost ? "dev_test_mode" : "");
        if (!initData) {
          throw new Error("Mini appni Telegram ichidan oching.");
        }

        const auth = (await authWithTelegram(initData)) as AuthResponse;
        setUser(auth.user);

        if (auth.user.role) {
          await loadDashboard(auth.user);
        }
      } catch (caught) {
        setError(getErrorMessage(caught));
      } finally {
        setLoading(false);
      }
    }

    void bootstrap();
  }, [loadDashboard]);

  useEffect(() => {
    if (user?.role === "teacher" && selectedClassId) {
      void loadTeacherHomeworks(user.id, selectedClassId);
    }
  }, [loadTeacherHomeworks, selectedClassId, user?.id, user?.role]);

  useEffect(() => {
    if (user?.role === "teacher" && selectedTeacherClassId) {
      const loadStudents = async () => {
        setClassStudentsLoading(true);
        try {
          const list = await getClassStudents(user.id, selectedTeacherClassId);
          setClassStudents(list);
        } catch (caught) {
          setError(getErrorMessage(caught));
        } finally {
          setClassStudentsLoading(false);
        }
      };
      void loadStudents();
      // Load class homeworks as well to keep them in sync
      void loadTeacherHomeworks(user.id, selectedTeacherClassId);
    }
  }, [user?.role, user?.id, selectedTeacherClassId, loadTeacherHomeworks]);

  async function chooseRole(role: Role) {
    if (!user) return;
    setBusyAction(`role-${role}`);
    setError("");
    try {
      await updateRole(user.id, role);
      const nextUser = { ...user, role };
      setUser(nextUser);
      await loadDashboard(nextUser);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateClass(event: FormEvent) {
    event.preventDefault();
    if (!user || !classForm.name.trim()) return;
    setBusyAction("create-class");
    setError("");
    setNotice("");
    try {
      const created = (await createClass(
        user.id,
        classForm.name.trim(),
        classForm.subject.trim() || "Matematika",
      )) as SchoolClass;
      setClassForm({ name: "", subject: "Matematika" });
      setSelectedClassId(created.id);
      setNotice("Sinf yaratildi.");
      await loadDashboard(user, created.id);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJoinClass(event: FormEvent) {
    event.preventDefault();
    if (!user || !joinCode.trim()) return;
    setBusyAction("join-class");
    setError("");
    setNotice("");
    try {
      await joinClass(user.id, joinCode);
      setJoinCode("");
      setNotice("Sinfga qo'shildingiz.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateHomework(event: FormEvent) {
    event.preventDefault();
    const activeClassId = selectedClassId || selectedTeacherClassId;
    if (!user || !activeClassId || !homeworkForm.title.trim()) return;
    setBusyAction("create-homework");
    setError("");
    setNotice("");
    try {
      const activeClass = classes.find((c) => c.id === activeClassId);
      await createHomework(
        user.id,
        activeClassId,
        homeworkForm.title.trim(),
        homeworkForm.description.trim(),
        activeClass?.subject || "Matematika",
      );
      setHomeworkForm({ title: "", description: "", subject: "Matematika" });
      setNotice("Vazifa qoralamasi yaratildi.");
      await loadTeacherHomeworks(user.id, activeClassId);
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAnalyzeSource(event: FormEvent, homeworkId: string) {
    event.preventDefault();
    if (!user || !sourceFile || !problemRange.trim()) return;
    setBusyAction(`analyze-${homeworkId}`);
    setError("");
    setNotice("");
    try {
      await analyzeHomeworkSource(user.id, homeworkId, sourceFile, problemRange.trim());
      setNotice("Rasm tahlil qilindi.");
      setSourceFile(null);
      
      const activeHomework = allTeacherHomeworks.find(h => h.id === homeworkId);
      const activeClassId = activeHomework?.class_id || selectedClassId || selectedTeacherClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApprove(homework: Homework) {
    if (!user || !homework.ai_generated_answer_key) return;
    setBusyAction(`approve-${homework.id}`);
    setError("");
    setNotice("");
    try {
      await approveAnswerKey(user.id, homework.id, homework.ai_generated_answer_key);
      setNotice("Javob kaliti tasdiqlandi.");
      
      const activeClassId = homework.class_id || selectedClassId || selectedTeacherClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handlePublish(homeworkId: string) {
    if (!user) return;
    setBusyAction(`publish-${homeworkId}`);
    setError("");
    setNotice("");
    try {
      await publishHomework(user.id, homeworkId);
      setNotice("Vazifa o'quvchilarga yuborildi.");
      
      const activeHomework = allTeacherHomeworks.find(h => h.id === homeworkId);
      const activeClassId = activeHomework?.class_id || selectedClassId || selectedTeacherClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadTeacherSubmissions(homeworkId: string) {
    if (!user) return;
    setBusyAction(`teacher-submissions-${homeworkId}`);
    setError("");
    try {
      const list = (await getHomeworkSubmissions(user.id, homeworkId)) as Submission[];
      setTeacherSubmissionHomeworkId(homeworkId);
      setTeacherSubmissions(list);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleSubmitHomework(event: FormEvent, homeworkId: string) {
    event.preventDefault();
    if (!user || !submitFileValue) return;
    setBusyAction(`submit-${homeworkId}`);
    setError("");
    setNotice("");
    try {
      await submitHomework(user.id, homeworkId, submitFileValue);
      const list = (await getMySubmissions(user.id, homeworkId)) as Submission[];
      setStudentSubmissionHomeworkId(homeworkId);
      setStudentSubmissions(list);
      setSubmitFileValue(null);
      setNotice("Homework yuborildi va tekshirildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLoadMySubmissions(homeworkId: string) {
    if (!user) return;
    setBusyAction(`my-submissions-${homeworkId}`);
    setError("");
    try {
      const list = (await getMySubmissions(user.id, homeworkId)) as Submission[];
      setStudentSubmissionHomeworkId(homeworkId);
      setStudentSubmissions(list);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  function handleSourceFile(event: ChangeEvent<HTMLInputElement>) {
    setSourceFile(event.target.files?.[0] ?? null);
  }

  function handleSubmitFile(event: ChangeEvent<HTMLInputElement>) {
    setSubmitFileValue(event.target.files?.[0] ?? null);
  }

  async function copyJoinCode(code?: string) {
    if (!code) return;
    await navigator.clipboard?.writeText(code);
    setNotice("Kod nusxalandi.");
  }

  if (loading) {
    return (
      <main className="app-container shell-center">
        <div className="loading-mark">
          <RefreshCcw size={28} />
        </div>
        <h1>Homework AI</h1>
        <p>Telegram tekshiruvi...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="app-container shell-center">
        <AlertCircle size={36} />
        <h1>Ulanish xatosi</h1>
        <p>{error || "Telegram auth ishlamadi."}</p>
        <button className="btn btn-primary" type="button" onClick={() => window.location.reload()}>
          <RefreshCcw size={18} />
          Qayta urinish
        </button>
      </main>
    );
  }

  if (!user.role) {
    return (
      <main className="app-container">
        <section className="role-screen">
          <div className="onboarding-header">
            <div className="logo-badge" style={{ background: "rgba(59, 130, 246, 0.1)", width: "60px", height: "60px", borderRadius: "50%", display: "grid", placeItems: "center", margin: "0 auto 16px" }}>
              <School size={30} color="var(--primary)" />
            </div>
            <h1>Xush kelibsiz!</h1>
            <p className="subtitle">Iltimos, rolingizni tanlang</p>
          </div>
          {error ? <div className="alert error">{error}</div> : null}
          <div className="role-grid">
            <button
              className="role-card card-interactive"
              type="button"
              disabled={isBusy}
              onClick={() => void chooseRole("teacher")}
            >
              <div className="role-icon-container" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)" }}>
                <GraduationCap size={32} />
              </div>
              <div className="role-content">
                <h2>O'qituvchi</h2>
                <p>Sinflaringizni boshqaring va natijalarni kuzating</p>
              </div>
              <div className="role-arrow" style={{ background: "var(--primary)", color: "white", width: "28px", height: "28px", borderRadius: "50%", display: "grid", placeItems: "center", marginLeft: "auto" }}>
                →
              </div>
            </button>
            <button
              className="role-card card-interactive"
              type="button"
              disabled={isBusy}
              onClick={() => void chooseRole("student")}
            >
              <div className="role-icon-container" style={{ background: "rgba(16, 185, 129, 0.1)", color: "var(--secondary)" }}>
                <BookOpen size={32} />
              </div>
              <div className="role-content">
                <h2>O'quvchi</h2>
                <p>Uy vazifalarini topshiring va AI yordamida o'sib boring</p>
              </div>
              <div className="role-arrow" style={{ background: "var(--secondary)", color: "white", width: "28px", height: "28px", borderRadius: "50%", display: "grid", placeItems: "center", marginLeft: "auto" }}>
                →
              </div>
            </button>
          </div>
          <p style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "2rem" }}>
            Keyinroq rolni o'zgartirishingiz mumkin
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-container">
      <section className="page-content pb-20" style={{ paddingTop: "1.2rem" }}>
        {refreshing ? (
          <div style={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            gap: "8px", 
            padding: "8px 12px", 
            background: "rgba(59, 130, 246, 0.08)", 
            color: "var(--primary)", 
            borderRadius: "12px", 
            fontSize: "0.8rem", 
            fontWeight: 700, 
            marginBottom: "12px",
            border: "1px solid rgba(59, 130, 246, 0.15)"
          }}>
            <RefreshCcw size={14} style={{ animation: "spin 1.5s linear infinite" }} />
            Yangilanmoqda...
          </div>
        ) : null}
        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
        
        {user.role === "teacher" && ["home", "classes", "homeworks"].includes(currentTab) && renderTeacher()}
        {user.role === "student" && ["home", "homeworks"].includes(currentTab) && renderStudent()}
        
        {user.role === "student" && currentTab === "progress" && renderProgress()}
        {currentTab === "profile" && renderProfile()}
      </section>

      <nav className="bottom-nav">
        <button className={`nav-item ${currentTab === "home" ? "active" : ""}`} onClick={() => setCurrentTab("home")}>
          <Home size={22} />
          <span>Asosiy</span>
        </button>
        {user.role === "teacher" ? (
          <>
            <button className={`nav-item ${currentTab === "classes" ? "active" : ""}`} onClick={() => setCurrentTab("classes")}>
              <School size={22} />
              <span>Sinflar</span>
            </button>
            <button className={`nav-item ${currentTab === "homeworks" ? "active" : ""}`} onClick={() => setCurrentTab("homeworks")}>
              <ClipboardList size={22} />
              <span>Vazifalar</span>
            </button>
          </>
        ) : (
          <>
            <button className={`nav-item ${currentTab === "homeworks" ? "active" : ""}`} onClick={() => setCurrentTab("homeworks")}>
              <BookOpen size={22} />
              <span>Vazifalar</span>
            </button>
            <button className={`nav-item ${currentTab === "progress" ? "active" : ""}`} onClick={() => setCurrentTab("progress")}>
              <TrendingUp size={22} />
              <span>Progress</span>
            </button>
          </>
        )}
        <button className={`nav-item ${currentTab === "profile" ? "active" : ""}`} onClick={() => setCurrentTab("profile")}>
          <UserRound size={22} />
          <span>Profil</span>
        </button>
      </nav>
    </main>
  );

  function renderTeacher() {
    if (currentTab === "classes") {
      if (selectedTeacherClassId) {
        const activeClass = classes.find(c => c.id === selectedTeacherClassId);
        const classHws = homeworks.filter(h => h.class_id === selectedTeacherClassId);
        
        return (
          <div className="animate-fade-in">
            <button 
              className="btn btn-outline" 
              onClick={() => {
                setSelectedTeacherClassId("");
                setClassStudents([]);
              }}
              style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1.2rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              <ArrowLeft size={16} /> Orqaga
            </button>

            {activeClass && (
              <div className="card" style={{ marginBottom: "1.5rem", background: "linear-gradient(135deg, var(--primary), #3b82f6)", color: "white", borderColor: "transparent", padding: "1.2rem" }}>
                <div className="flex-between">
                  <div>
                    <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "white", margin: 0 }}>
                      {activeClass.name} Sinf
                    </h2>
                    <p style={{ margin: "4px 0 0", color: "rgba(255,255,255,0.85)", fontSize: "0.85rem" }}>
                      Fan: {activeClass.subject}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p className="eyebrow" style={{ color: "rgba(255,255,255,0.7)", margin: 0, fontSize: "0.65rem" }}>KOD</p>
                    <div className="flex-start" style={{ gap: "6px", marginTop: "4px" }}>
                      <strong style={{ fontSize: "1.1rem", color: "white", letterSpacing: "0.05em" }}>{activeClass.join_code}</strong>
                      <button 
                        className="icon-btn" 
                        style={{ width: "26px", height: "26px", background: "rgba(255, 255, 255, 0.2)", border: "none", color: "white" }} 
                        onClick={(e) => {
                          e.stopPropagation();
                          void copyJoinCode(activeClass.join_code || "");
                        }}
                      >
                        <Copy size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tabs: O'quvchilar, Vazifalar, Baholar */}
            <div className="tabs-container class-tabs" style={{ display: "flex", gap: "8px", marginBottom: "1.2rem", background: "var(--background)", padding: "4px", borderRadius: "12px", border: "1px solid var(--border)" }}>
              <button 
                className={`tab-btn ${classSubTab === "students" ? "active" : ""}`} 
                onClick={() => setClassSubTab("students")}
                style={{ flex: 1, padding: "8px", fontSize: "0.85rem", fontWeight: 700, borderRadius: "8px" }}
              >
                O'quvchilar
              </button>
              <button 
                className={`tab-btn ${classSubTab === "homeworks" ? "active" : ""}`} 
                onClick={() => setClassSubTab("homeworks")}
                style={{ flex: 1, padding: "8px", fontSize: "0.85rem", fontWeight: 700, borderRadius: "8px" }}
              >
                Vazifalar
              </button>
              <button 
                className={`tab-btn ${classSubTab === "grades" ? "active" : ""}`} 
                onClick={() => setClassSubTab("grades")}
                style={{ flex: 1, padding: "8px", fontSize: "0.85rem", fontWeight: 700, borderRadius: "8px" }}
              >
                Baholar
              </button>
            </div>

            {classSubTab === "students" && (
              <div className="card" style={{ padding: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px" }}>O'quvchilar Ro'yxati</h3>
                {classStudentsLoading ? (
                  <div className="flex-center" style={{ padding: "2rem", color: "var(--text-muted)" }}>Yuklanmoqda...</div>
                ) : classStudents.length === 0 ? (
                  <div className="empty-state compact">Ushbu sinfda hali o'quvchilar yo'q.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {classStudents.map((student) => (
                      <div key={student.id} className="flex-between" style={{ padding: "10px", background: "var(--background)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                        <div className="flex-start" style={{ gap: "10px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                            {initials(student.full_name)}
                          </div>
                          <div>
                            <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>{student.full_name}</h4>
                            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                              {student.telegram_username ? `@${student.telegram_username}` : "Username yo'q"}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--secondary)" }}>
                            {student.average_score}%
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            {student.submission_count} ta topshirdi
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {classSubTab === "homeworks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <form className="panel" onSubmit={handleCreateHomework} style={{ margin: 0 }}>
                  <div className="panel-title">
                    <FileCheck size={20} />
                    <h2>Yangi vazifa berish</h2>
                  </div>
                  <label className="input-group">
                    <input
                      className="input-field"
                      value={homeworkForm.title}
                      onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
                      placeholder="Mavzu: Kvadrat tenglamalar"
                    />
                  </label>
                  <button className="btn btn-secondary" type="submit" disabled={isBusy || !homeworkForm.title.trim()}>
                    <Plus size={18} /> Qoralama ochish
                  </button>
                </form>

                <div className="stack">
                  {classHws.map((homework) => renderTeacherHomework(homework))}
                  {classHws.length === 0 && (
                    <div className="empty-state compact">Ushbu sinfda hali vazifalar yaratilmagan.</div>
                  )}
                </div>
              </div>
            )}

            {classSubTab === "grades" && (
              <div className="card" style={{ padding: "1rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 12px" }}>Baholar Jurnali</h3>
                {classStudents.length === 0 ? (
                  <div className="empty-state compact">Sinfda hali o'quvchilar yo'q.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {classStudents.map((student) => (
                      <div key={student.id} style={{ padding: "12px", background: "var(--background)", borderRadius: "12px", border: "1px solid var(--border)" }}>
                        <div className="flex-between" style={{ marginBottom: "8px" }}>
                          <strong style={{ fontSize: "0.9rem" }}>{student.full_name}</strong>
                          <span style={{ fontWeight: 800, color: "var(--secondary)" }}>{student.average_score}%</span>
                        </div>
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {classHws.map(h => (
                            <span 
                              key={h.id} 
                              style={{ 
                                fontSize: "0.7rem", 
                                padding: "4px 8px", 
                                borderRadius: "6px", 
                                background: "var(--surface)", 
                                border: "1px solid var(--border)" 
                              }}
                              title={h.title}
                            >
                              {h.title.slice(0, 8)}...
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="animate-fade-in">
          <div className="section-title">
            <h2>Sinflarni boshqarish</h2>
          </div>
          <form className="panel" onSubmit={handleCreateClass}>
            <div className="panel-title">
              <School size={20} />
              <h2>Yangi sinf yaratish</h2>
            </div>
            <div className="form-grid">
              <label className="input-group">
                <span className="input-label">Sinf nomi</span>
                <input
                  className="input-field"
                  value={classForm.name}
                  onChange={(event) => setClassForm({ ...classForm, name: event.target.value })}
                  placeholder="7-A"
                />
              </label>
              <label className="input-group">
                <span className="input-label">Fan</span>
                <select
                  className="input-field"
                  value={classForm.subject}
                  onChange={(event) => setClassForm({ ...classForm, subject: event.target.value })}
                >
                  <option value="Matematika">Matematika</option>
                  <option value="Fizika">Fizika</option>
                  <option value="Ona tili">Ona tili</option>
                </select>
              </label>
            </div>
            <button className="btn btn-primary" type="submit" disabled={isBusy || !classForm.name.trim()}>
              <Plus size={18} /> Yaratish
            </button>
          </form>

          {classes.length ? (
            <section className="class-list mt-2">
              <h3 className="text-sm text-muted mb-2">Mavjud sinflar (Batafsil ko'rish uchun tanlang)</h3>
              {classes.map((item) => (
                <div 
                  className="card card-interactive" 
                  style={{ padding: "1rem", marginBottom: "0.8rem", cursor: "pointer" }} 
                  key={item.id}
                  onClick={() => {
                    setSelectedTeacherClassId(item.id);
                  }}
                >
                  <div className="flex-between">
                    <div className="flex-start">
                      <School size={24} color="var(--primary)" />
                      <div>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>{item.name}</h3>
                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)" }}>{item.subject}</p>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end" }} onClick={(e) => e.stopPropagation()}>
                      <p className="eyebrow" style={{ marginBottom: "4px" }}>KOD</p>
                      <div className="flex-start">
                        <strong style={{ letterSpacing: "0.1em", fontSize: "1.1rem" }}>{item.join_code}</strong>
                        <button className="icon-btn" style={{ width: "28px", height: "28px" }} type="button" title="Koddan nusxa olish" onClick={() => void copyJoinCode(item.join_code || "")}>
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ) : (
            <div className="empty-state">Hali sinf yaratmagansiz.</div>
          )}
        </div>
      );
    }

    if (currentTab === "homeworks") {
      return (
        <div className="animate-fade-in">
          <div className="section-title">
            <h2>Vazifalar va Natijalar</h2>
          </div>

          {classes.length ? (
            <section className="tabs-container class-tabs">
              {classes.map((item) => (
                <button
                  className={`tab-btn ${item.id === selectedClassId ? "active" : ""}`}
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedClassId(item.id)}
                >
                  <School size={16} />
                  {item.name}
                </button>
              ))}
            </section>
          ) : (
            <div className="empty-state">Sinf tanlanmagan yoki sinflar yo'q.</div>
          )}

          {selectedClass ? (
            <>
              <form className="panel" onSubmit={handleCreateHomework}>
                <div className="panel-title">
                  <FileCheck size={20} />
                  <h2>Yangi vazifa berish</h2>
                </div>
                <label className="input-group">
                  <input
                    className="input-field"
                    value={homeworkForm.title}
                    onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
                    placeholder="Mavzu: Kvadrat tenglamalar"
                  />
                </label>
                <button className="btn btn-secondary" type="submit" disabled={isBusy || !homeworkForm.title.trim()}>
                  <Plus size={18} /> Qoralama ochish
                </button>
              </form>

              <section className="stack mt-2">
                {homeworks.map((homework) => renderTeacherHomework(homework))}
                {!homeworks.length ? <div className="empty-state compact">Bu sinfda vazifa yo'q.</div> : null}
              </section>
            </>
          ) : null}
        </div>
      );
    }

    // HOME TAB
    const totalStudents = classes.reduce((acc, c) => acc + (c.student_count || 0), 0);
    const unapprovedHws = allTeacherHomeworks.filter(h => !h.answer_key_approved);
    const draftHws = allTeacherHomeworks.filter(h => h.status === "draft" && h.answer_key_approved);
    
    // Sort homeworks to show the newest ones first
    const recentHws = [...allTeacherHomeworks].slice(-5).reverse();

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            Salom, {user?.full_name?.split(" ")[0]}! 👋
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Bugun ajoyib dars bo'lsin!
          </p>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.5rem" }}>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <School size={24} color="var(--primary)" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{classes.length} ta</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Sinflar jami</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <UsersRound size={24} color="var(--secondary)" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{totalStudents} nafar</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>O'quvchilar jami</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <ClipboardList size={24} color="#8b5cf6" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{allTeacherHomeworks.length} ta</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Berilgan vazifalar</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "3px solid var(--warning)", display: "grid", placeItems: "center", fontSize: "0.65rem", fontWeight: 800, color: "var(--warning)", marginBottom: "8px" }}>
              %
            </div>
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>82%</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>O'rtacha o'zlashtirish</p>
          </div>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>E'tiborga muhtoj</h3>
        </div>

        {unapprovedHws.length > 0 || draftHws.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
            {unapprovedHws.map(hw => (
              <div key={hw.id} className="card" style={{ borderLeft: "4px solid var(--warning)", padding: "1rem" }}>
                <div className="flex-between">
                  <div className="flex-start" style={{ gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(245, 158, 11, 0.1)", display: "grid", placeItems: "center", color: "var(--warning)", fontSize: "0.8rem", fontWeight: "bold" }}>!</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Javoblar kalitini tasdiqlash kutilmoqda</h4>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>"{hw.title}" vazifasi tahlil qilingan, lekin tasdiqlanmagan.</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {draftHws.map(hw => (
              <div key={hw.id} className="card" style={{ borderLeft: "4px solid var(--primary)", padding: "1rem" }}>
                <div className="flex-between">
                  <div className="flex-start" style={{ gap: "8px" }}>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", display: "grid", placeItems: "center", color: "var(--primary)", fontSize: "0.8rem", fontWeight: "bold" }}>i</div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Nashr etilmagan qoralama mavjud</h4>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>"{hw.title}" vazifasini o'quvchilarga yuborish (nashr qilish) mumkin.</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card" style={{ borderLeft: "4px solid var(--green)", padding: "1rem", marginBottom: "1.5rem" }}>
            <div className="flex-start" style={{ gap: "8px" }}>
              <div style={{ width: "24px", height: "24px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "grid", placeItems: "center", color: "var(--green)", fontSize: "0.8rem", fontWeight: "bold" }}>✓</div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700 }}>Hamma darslar nazorat ostida</h4>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Tekshirilmagan vazifalar yoki nashr etilmagan qoralamalar yo'q.</p>
              </div>
            </div>
          </div>
        )}

        <div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>So'nggi berilgan vazifalar</h3>
        </div>

        <div className="stack" style={{ gap: "10px" }}>
          {recentHws.map(hw => {
            const cls = classes.find(c => c.id === hw.class_id);
            return (
              <div key={hw.id} className="card flex-between" style={{ padding: "12px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>{hw.title}</h4>
                  <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    Sinf: {cls?.name || "Noma'lum"} • Fan: {hw.subject}
                  </p>
                </div>
                <span className={`badge ${statusBadge(hw.status)}`}>
                  {statusLabel(hw.status)}
                </span>
              </div>
            );
          })}
          {recentHws.length === 0 && (
            <div className="empty-state compact">Hozirgacha hech qanday vazifa berilmagan.</div>
          )}
        </div>

        <button className="btn btn-primary" style={{ display: "flex", width: "100%", justifyContent: "center", fontWeight: 700, marginTop: "1.5rem" }} onClick={() => setCurrentTab("homeworks")}>
          + Yangi vazifa yaratish
        </button>
      </div>
    );
  }

  function renderTeacherHomework(homework: Homework) {
    const answerKey = homework.ai_generated_answer_key || homework.approved_answer_key;
    const problems = answerKey?.problems ?? [];
    const isActive = activeHomeworkId === homework.id;
    const showingSubmissions = teacherSubmissionHomeworkId === homework.id;

    return (
      <article className="card homework-card" key={homework.id}>
        <div className="card-head">
          <div>
            <h3>{homework.title}</h3>
            <p>{homework.description || homework.subject}</p>
          </div>
          <span className={`badge ${statusBadge(homework.status)}`}>{statusLabel(homework.status)}</span>
        </div>

        <div className="action-row">
          <button className="btn btn-outline" type="button" onClick={() => setActiveHomeworkId(isActive ? "" : homework.id)}>
            {isActive ? <ArrowLeft size={17} /> : <Camera size={17} />}
            {isActive ? "Yopish" : "Tahlil"}
          </button>
          <button
            className="btn btn-outline"
            type="button"
            disabled={isBusy}
            onClick={() => void handleLoadTeacherSubmissions(homework.id)}
          >
            <UsersRound size={17} />
            Natijalar
          </button>
        </div>

        {isActive ? (
          <form className="inline-form" onSubmit={(event) => void handleAnalyzeSource(event, homework.id)}>
            <label className="input-group">
              <span className="input-label">Masalalar oralig'i</span>
              <input
                className="input-field"
                value={problemRange}
                onChange={(event) => setProblemRange(event.target.value)}
              />
            </label>
            <label className="file-picker">
              <Upload size={18} />
              <span>{sourceFile?.name || "Darslik rasmini tanlash"}</span>
              <input accept="image/*" type="file" onChange={handleSourceFile} />
            </label>
            <button
              className="btn btn-primary"
              type="submit"
              disabled={isBusy || !sourceFile || !problemRange.trim()}
            >
              <Camera size={18} />
              AI bilan yechish
            </button>
          </form>
        ) : null}

        {answerKey ? (
          <section className="answer-key" style={{ borderTop: "none", marginTop: 0, paddingTop: 0 }}>
            <div 
              className="flex-between" 
              style={{ 
                cursor: "pointer", 
                padding: "10px 12px", 
                background: "var(--background)", 
                borderRadius: "8px", 
                border: "1px solid var(--border)",
                marginTop: "12px",
                transition: "background 0.2s ease"
              }}
              onClick={() => {
                const isExpanded = expandedAnswerKeys.includes(homework.id);
                setExpandedAnswerKeys(prev => 
                  isExpanded ? prev.filter(id => id !== homework.id) : [...prev, homework.id]
                );
              }}
            >
              <div className="flex-start" style={{ gap: "8px" }}>
                {expandedAnswerKeys.includes(homework.id) ? (
                  <ChevronUp size={16} color="var(--primary)" />
                ) : (
                  <ChevronDown size={16} color="var(--text-muted)" />
                )}
                <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>Javob kaliti</strong>
              </div>
              <span className="badge badge-blue" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
                {problems.length} TA
              </span>
            </div>

            {expandedAnswerKeys.includes(homework.id) ? (
              <div style={{ marginTop: "12px", animation: "slide-down 0.2s ease" }}>
                {answerKey.general_notes ? (
                  <p style={{ margin: "0 0 10px 0", fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {answerKey.general_notes}
                  </p>
                ) : null}
                <div className="problem-list" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
                  {problems.map((problem, index) => (
                    <div 
                      className="problem-row" 
                      key={`${problem.problem_number || index}`}
                      style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        gap: "8px", 
                        padding: "8px 12px", 
                        background: "var(--background)", 
                        borderRadius: "8px", 
                        border: "1px solid var(--border)" 
                      }}
                    >
                      <span style={{ 
                        background: "rgba(59, 130, 246, 0.1)", 
                        color: "var(--primary)", 
                        fontWeight: 800, 
                        fontSize: "0.8rem", 
                        width: "24px", 
                        height: "24px", 
                        borderRadius: "50%", 
                        display: "grid", 
                        placeItems: "center" 
                      }}>
                        {problem.problem_number || index + 1}
                      </span>
                      <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-main)", flex: 1 }}>
                        {problem.correct_answer || problem.problem_text || "Javob topildi"}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={isBusy || homework.answer_key_approved || !homework.ai_generated_answer_key}
                    onClick={() => void handleApprove(homework)}
                  >
                    <Check size={17} />
                    Tasdiqlash
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={isBusy || !homework.answer_key_approved || homework.status === "published"}
                    onClick={() => void handlePublish(homework.id)}
                  >
                    <Send size={17} />
                    Publish
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {showingSubmissions ? renderSubmissions(teacherSubmissions, "Hali topshirilgan ish yo'q.") : null}
            </article>
    );
  }

  function renderStudent() {
    if (currentTab === "homeworks") {
      const pendingHws = homeworks.filter(h => h.student_status !== "submitted");
      const completedHws = homeworks.filter(h => h.student_status === "submitted");

      return (
        <div className="animate-fade-in">
          <div className="section-title">
            <h2>Barcha vazifalar</h2>
          </div>
          
          <h3 className="text-sm text-muted mb-2">Faol vazifalar ({pendingHws.length})</h3>
          <section className="stack mb-3">
            {pendingHws.map((homework) => renderStudentHomework(homework))}
            {!pendingHws.length && <div className="empty-state compact">Hozircha faol vazifa yo'q.</div>}
          </section>

          <h3 className="text-sm text-muted mb-2">Bajarilgan ({completedHws.length})</h3>
          <section className="stack">
            {completedHws.map((homework) => renderStudentHomework(homework))}
            {!completedHws.length && <div className="empty-state compact">Hali vazifa bajarmadingiz.</div>}
          </section>
        </div>
      );
    }

    // HOME TAB
    const pendingHomeworks = homeworks.filter(h => h.student_status !== "submitted");
    const completedHomeworks = homeworks.filter(h => h.student_status === "submitted");
    const nextTask = pendingHomeworks[0];

    // Simple stats
    let totalScore = 0;
    completedHomeworks.forEach(hw => totalScore += (hw.latest_score || 0));
    const averageScore = completedHomeworks.length ? Math.round((totalScore / (completedHomeworks.length * 10)) * 100) : 0;
    const totalXP = completedHomeworks.length * 10;

    return (
      <div className="animate-fade-in">
        <div style={{ marginBottom: "1.5rem" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0 }}>
            Salom, {user?.full_name?.split(" ")[0]}! 👋
          </h2>
          <p style={{ margin: "2px 0 0", fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Bugun ajoyib dars bo'lsin!
          </p>
        </div>

        {nextTask ? (
          <div className="card" style={{ background: "linear-gradient(135deg, var(--primary), #3b82f6)", color: "white", borderColor: "transparent", padding: "1.5rem" }}>
            <p className="eyebrow" style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.75rem", margin: 0 }}>FAOL VAZIFA</p>
            <div className="badge badge-green" style={{ background: "rgba(255,255,255,0.2)", color: "white", marginTop: "8px" }}>
              {nextTask.subject}
            </div>
            <h3 style={{ color: "white", fontSize: "1.3rem", margin: "8px 0 4px", fontWeight: 700 }}>{nextTask.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.9)", fontSize: "0.85rem", margin: "0 0 16px" }}>
              Muddati: {nextTask.deadline || "Tez orada"}
            </p>
            <button className="btn" style={{ background: "white", color: "var(--primary)", fontWeight: 700, padding: "0.6rem 1rem" }} onClick={() => setCurrentTab("homeworks")}>
              Vazifani topshirish
            </button>
          </div>
        ) : (
          <div className="card flex-center" style={{ padding: "2rem 1rem", flexDirection: "column", color: "var(--text-muted)", textAlign: "center" }}>
            <Trophy size={36} color="var(--warning)" />
            <h3 style={{ margin: "8px 0 0" }}>Barcha vazifalar bajarildi!</h3>
            <p style={{ margin: 0 }}>Hozircha yangi vazifa yo'q.</p>
          </div>
        )}

        <div style={{ marginTop: "1.5rem", marginBottom: "0.75rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Sizning ko'rsatkichlaringiz</h3>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.5rem" }}>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <Flame size={24} color="var(--danger)" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>1 kun</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Streak</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <Star size={24} color="var(--warning)" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{totalXP} XP</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Jami tajriba</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <div style={{ width: "24px", height: "24px", borderRadius: "50%", border: "3px solid var(--secondary)", display: "grid", placeItems: "center", fontSize: "0.65rem", fontWeight: 800, color: "var(--secondary)", marginBottom: "8px" }}>
              %
            </div>
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{averageScore}%</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>O'rtacha ball</p>
          </div>
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "1rem", borderRadius: "16px" }}>
            <Trophy size={24} color="#8b5cf6" style={{ marginBottom: "8px" }} />
            <div className="stat-value" style={{ fontSize: "1.4rem", fontWeight: 800 }}>{completedHomeworks.length} ta</div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Topshirilgan</p>
          </div>
        </div>

        <button className="btn btn-primary" style={{ display: "flex", width: "100%", justifyContent: "center", fontWeight: 700 }} onClick={() => setCurrentTab("homeworks")}>
          + Vazifa topshirish
        </button>

        {!classes.length && (
          <form className="panel" onSubmit={handleJoinClass} style={{ marginTop: "1.5rem" }}>
            <div className="panel-title">
              <School size={20} />
              <h2>Sinfga qo'shilish</h2>
            </div>
            <label className="input-group">
              <input
                className="input-field code-input"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="Kod: ABC123"
              />
            </label>
            <button className="btn btn-primary" type="submit" disabled={isBusy || !joinCode.trim()}>
              <Plus size={18} /> Qo'shilish
            </button>
          </form>
        )}
      </div>
    );
  }

  function renderStudentHomework(homework: Homework) {
    const isActive = studentSubmissionHomeworkId === homework.id;
    const isCompleted = homework.student_status === "submitted";

    // Map subject to color/icon
    let iconColor = "var(--primary)";
    let bgColor = "rgba(59, 130, 246, 0.1)";
    if (homework.subject === "Fizika") {
      iconColor = "#8b5cf6";
      bgColor = "rgba(139, 92, 246, 0.1)";
    } else if (homework.subject === "Ona tili") {
      iconColor = "var(--secondary)";
      bgColor = "rgba(16, 185, 129, 0.1)";
    }

    return (
      <article 
        className={`card card-interactive ${isActive ? 'active-card' : ''}`} 
        key={homework.id}
        style={{ padding: "1.2rem", marginBottom: "0.8rem", borderLeft: isActive ? `4px solid ${iconColor}` : "1px solid var(--border)" }}
        onClick={() => {
          if (isActive) {
            setStudentSubmissionHomeworkId("");
          } else {
            setStudentSubmissionHomeworkId(homework.id);
            void handleLoadMySubmissions(homework.id);
          }
        }}
      >
        <div className="flex-between" style={{ width: "100%" }}>
          <div className="flex-start" style={{ gap: "12px" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: bgColor, color: iconColor, display: "grid", placeItems: "center" }}>
              <BookOpen size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>{homework.title}</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {homework.subject} • {homework.deadline || "Muddatsiz"}
              </p>
            </div>
          </div>
          <span className={`badge ${isCompleted ? 'badge-green' : 'badge-orange'}`} style={{ fontSize: "0.7rem" }}>
            {isCompleted ? "Bajarilgan" : "Faol"}
          </span>
        </div>

        {isActive && (
          <div className="homework-detail-expanded animate-fade-in" style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }} onClick={(e) => e.stopPropagation()}>
            <p style={{ fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "1rem" }}>
              {homework.description || "Ushbu vazifa uchun qo'shimcha tavsif berilmagan."}
            </p>

            <form className="inline-form" onSubmit={(event) => void handleSubmitHomework(event, homework.id)} style={{ background: "var(--background)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem" }}>
              <p className="eyebrow" style={{ marginBottom: "8px" }}>Vazifani topshirish (Rasm yuklash)</p>
              <label className="file-picker" style={{ border: "2px dashed var(--border)", background: "var(--surface)" }}>
                <Upload size={18} />
                <span>{submitFileValue?.name || "Rasm tanlash"}</span>
                <input accept="image/*" type="file" onChange={handleSubmitFile} />
              </label>
              <div className="action-row" style={{ marginTop: "12px" }}>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} type="submit" disabled={isBusy || !submitFileValue}>
                  <Send size={17} />
                  Yuborish
                </button>
              </div>
            </form>

            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "8px" }}>Tarixiy natijalar</h4>
              {renderSubmissions(studentSubmissions, "Hozircha natijalar yo'q. Rasm yuklab topshiring!")}
            </div>
          </div>
        )}
      </article>
    );
  }

  function renderSubmissions(items: Submission[], emptyText: string) {
    if (!items.length) return <div className="empty-state compact">{emptyText}</div>;

    return (
      <section className="submission-list" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px" }}>
        {items.map((submission) => {
          const result = submission.grading_result;
          const problems = result?.problems || [];
          
          return (
            <div className="card" key={submission.id} style={{ padding: "1.2rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "16px", boxShadow: "var(--shadow-sm)" }}>
              {/* Submission attempt header */}
              <div className="flex-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700 }}>
                    Urinish {submission.attempt_number ?? 1}
                  </h4>
                  <span className="text-xs text-muted">
                    {new Date(submission.submitted_at).toLocaleString("uz-UZ")}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>
                    {scoreText(submission)}
                  </div>
                  {typeof submission.percentage === "number" && (
                    <span className="badge badge-blue" style={{ fontSize: "0.65rem", padding: "2px 6px" }}>
                      {Math.round(submission.percentage)}% to'g'ri
                    </span>
                  )}
                </div>
              </div>

              {result && (
                <div>
                  {/* Grid summary: Correct / Incorrect / Missing */}
                  <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ background: "rgba(16, 185, 129, 0.08)", color: "var(--secondary)", padding: "8px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{result.correct_count ?? 0}</div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600 }}>To'g'ri</div>
                    </div>
                    <div style={{ background: "rgba(239, 68, 68, 0.08)", color: "var(--danger)", padding: "8px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{result.incorrect_count ?? 0}</div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600 }}>Xato</div>
                    </div>
                    <div style={{ background: "rgba(100, 116, 139, 0.08)", color: "var(--text-muted)", padding: "8px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{result.missing_count ?? 0}</div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600 }}>Yo'q</div>
                    </div>
                  </div>

                  {/* Question-by-question details */}
                  {problems.length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <p className="eyebrow" style={{ marginBottom: "8px" }}>Masalalar bo'yicha tahlil</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {problems.map((prob, idx) => {
                          const isCorrect = prob.status === "correct";
                          const isIncorrect = prob.status === "incorrect";
                          const isMissing = prob.status === "missing";
                          
                          let statusBg = "rgba(100, 116, 139, 0.05)";
                          let statusColor = "var(--text-muted)";
                          let statusSymbol = "⚪";
                          
                          if (isCorrect) {
                            statusBg = "rgba(16, 185, 129, 0.08)";
                            statusColor = "var(--secondary)";
                            statusSymbol = "✓";
                          } else if (isIncorrect) {
                            statusBg = "rgba(239, 68, 68, 0.08)";
                            statusColor = "var(--danger)";
                            statusSymbol = "✗";
                          } else if (isMissing) {
                            statusBg = "rgba(245, 158, 11, 0.08)";
                            statusColor = "var(--warning)";
                            statusSymbol = "?";
                          }

                          return (
                            <div key={idx} style={{ background: "var(--background)", borderRadius: "12px", padding: "10px", display: "flex", flexDirection: "column", gap: "4px" }}>
                              <div className="flex-between">
                                <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>
                                  {prob.problem_number}-masala
                                </span>
                                <span style={{ 
                                  background: statusBg, 
                                  color: statusColor, 
                                  fontWeight: 800, 
                                  fontSize: "0.75rem", 
                                  padding: "2px 8px", 
                                  borderRadius: "8px" 
                                }}>
                                  {statusSymbol} {prob.status?.toUpperCase() || ""}
                                </span>
                              </div>
                              {prob.feedback && (
                                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                                  {prob.feedback}
                                </p>
                              )}
                              {prob.errors && prob.errors.length > 0 && (
                                <div style={{ borderLeft: "2px solid var(--danger)", paddingLeft: "8px", marginTop: "4px" }}>
                                  {prob.errors.map((err: ErrorDetail, eIdx: number) => (
                                    <div key={eIdx} style={{ fontSize: "0.75rem", color: "var(--danger)" }}>
                                      <strong>Xato:</strong> {err.description} <br/>
                                      <strong>Tavsiya:</strong> {err.suggestion}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* General feedback */}
                  {result.general_feedback && (
                    <div style={{ background: "rgba(59, 130, 246, 0.06)", borderLeft: "4px solid var(--primary)", borderRadius: "8px", padding: "12px", marginTop: "12px" }}>
                      <strong style={{ display: "block", fontSize: "0.85rem", color: "var(--primary)", marginBottom: "4px" }}>AI Tahlili & Tavsiyalar:</strong>
                      <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                        {result.general_feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    );
  }

  function renderProgress() {
    const completedHws = homeworks.filter(h => h.student_status === "submitted");
    let totalScore = 0;
    completedHws.forEach(h => totalScore += (h.latest_score || 0));
    const averageScore = completedHws.length ? (totalScore / completedHws.length).toFixed(1) : "0";
    
    return (
      <div className="animate-fade-in">
        <div className="section-title">
          <h2>Progress va Analitika</h2>
        </div>
        <div className="stat-grid mt-2">
          <div className="stat-card">
            <Trophy size={20} color="var(--warning)" style={{ margin: "0 auto 8px" }} />
            <div className="stat-value">{averageScore}</div>
            <p style={{ margin: 0 }}>O'rtacha ball</p>
          </div>
          <div className="stat-card">
            <Check size={20} color="var(--secondary)" style={{ margin: "0 auto 8px" }} />
            <div className="stat-value">{completedHws.length}</div>
            <p style={{ margin: 0 }}>Bajarildi</p>
          </div>
          <div className="stat-card">
            <TrendingUp size={20} color="var(--primary)" style={{ margin: "0 auto 8px" }} />
            <div className="stat-value">{(completedHws.length / Math.max(1, homeworks.length) * 100).toFixed(0)}%</div>
            <p style={{ margin: 0 }}>Faollik</p>
          </div>
          <div className="stat-card">
            <UsersRound size={20} color="#8b5cf6" style={{ margin: "0 auto 8px" }} />
            <div className="stat-value">{classes.length}</div>
            <p style={{ margin: 0 }}>Sinflar</p>
          </div>
        </div>
        <div className="card mt-3">
          <h3 className="mb-2">Eng ko'p qilingan xatolar</h3>
          <div className="empty-state compact">Yetarlicha ma'lumot yo'q. Ko'proq vazifa bajaring!</div>
        </div>
      </div>
    );
  }

  function renderProfile() {
    const isStudent = user?.role === "student";
    const completedHws = isStudent ? homeworks.filter(h => h.student_status === "submitted").length : homeworks.length;
    const xp = completedHws * 10;
    const level = Math.floor(xp / 100) + 1;
    const xpNext = level * 100;
    
    return (
      <div className="animate-fade-in pb-20">
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>Mening Profilim</h2>
        </div>

        {/* Profile Card Header */}
        <div className="card" style={{ textAlign: "center", padding: "24px 16px", marginBottom: "16px", background: "linear-gradient(135deg, var(--surface) 0%, rgba(59, 130, 246, 0.03) 100%)", position: "relative" }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            {user?.photo_url ? (
              <img 
                src={user.photo_url} 
                alt={user.full_name} 
                style={{ 
                  width: "90px", 
                  height: "90px", 
                  borderRadius: "50%", 
                  objectFit: "cover", 
                  border: "4px solid white",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.08)",
                  marginBottom: "12px"
                }} 
              />
            ) : (
              <div 
                className="avatar-lg" 
                style={{ 
                  margin: "0 auto 12px", 
                  background: isStudent ? "linear-gradient(135deg, var(--secondary), #10b981)" : "linear-gradient(135deg, var(--primary), #3b82f6)", 
                  color: "white", 
                  fontSize: "1.8rem", 
                  fontWeight: "bold",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
                  display: "grid",
                  placeItems: "center"
                }}
              >
                {initials(user?.full_name || "") || <UserRound size={36} />}
              </div>
            )}
            <span style={{ 
              position: "absolute", 
              bottom: "16px", 
              right: "4px", 
              width: "16px", 
              height: "16px", 
              borderRadius: "50%", 
              background: "var(--green)", 
              border: "3px solid white" 
            }}></span>
          </div>

          <h2 style={{ margin: "0 0 4px", fontSize: "1.3rem", fontWeight: 800 }}>{user?.full_name}</h2>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>
            {isStudent ? "O'quvchi rejimi" : "O'qituvchi rejimi"}
          </p>
        </div>

        {/* Personal Details Card */}
        <div className="card" style={{ padding: "18px", marginBottom: "16px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
            <UserRound size={16} color="var(--primary)" />
            Shaxsiy ma'lumotlar
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="flex-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Ism va familiya</span>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>{user?.full_name}</strong>
            </div>
            <div className="flex-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Telegram username</span>
              <strong style={{ fontSize: "0.85rem", color: "var(--primary)" }}>
                {user?.telegram_username ? `@${user.telegram_username}` : "Mavjud emas"}
              </strong>
            </div>
            <div className="flex-between" style={{ borderBottom: "1px solid rgba(0,0,0,0.03)", paddingBottom: "10px" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Telegram ID</span>
              <strong style={{ fontSize: "0.85rem", color: "var(--text-main)", fontFamily: "monospace" }}>{user?.telegram_id}</strong>
            </div>
            <div className="flex-between">
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Foydalanish roli</span>
              <span className={`badge ${isStudent ? 'badge-green' : 'badge-blue'}`} style={{ fontWeight: 800, fontSize: "0.7rem", padding: "3px 10px" }}>
                {isStudent ? "STUDENT" : "TEACHER"}
              </span>
            </div>
          </div>
        </div>

        {/* Statistics & Achievements Section */}
        {isStudent ? (
          <>
            <div className="card" style={{ padding: "18px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                <TrendingUp size={16} color="var(--secondary)" />
                Tajriba va daraja (XP)
              </h3>
              <div style={{ background: "var(--background)", padding: "16px", borderRadius: "12px" }}>
                <div className="flex-between" style={{ marginBottom: "6px" }}>
                  <strong style={{ fontSize: "1rem", color: "var(--text-main)" }}>Level {level}</strong>
                  <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--secondary)" }}>{xp} / {xpNext} XP</span>
                </div>
                <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
                  <div style={{ width: `${(xp / xpNext) * 100}%`, height: "100%", background: "var(--secondary)", borderRadius: "4px" }}></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ padding: "18px", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Trophy size={16} color="var(--warning)" />
                Erishilgan yutuqlar (Achievements)
              </h3>
              <div className="flex-start" style={{ gap: "16px", overflowX: "auto", paddingBottom: "6px" }}>
                <div style={{ minWidth: "85px", textAlign: "center", opacity: xp >= 10 ? 1 : 0.4 }}>
                  <div style={{ width: "46px", height: "46px", margin: "0 auto 8px", background: "rgba(59,130,246,0.1)", borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--primary)" }}>
                    <Check size={20} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block" }}>Ilk qadam</span>
                </div>
                <div style={{ minWidth: "85px", textAlign: "center", opacity: xp >= 100 ? 1 : 0.4 }}>
                  <div style={{ width: "46px", height: "46px", margin: "0 auto 8px", background: "rgba(16,185,129,0.1)", borderRadius: "50%", display: "grid", placeItems: "center", color: "var(--secondary)" }}>
                    <Trophy size={20} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block" }}>Bilimdon</span>
                </div>
                <div style={{ minWidth: "85px", textAlign: "center", opacity: classes.length > 0 ? 1 : 0.4 }}>
                  <div style={{ width: "46px", height: "46px", margin: "0 auto 8px", background: "rgba(139,92,246,0.1)", borderRadius: "50%", display: "grid", placeItems: "center", color: "#8b5cf6" }}>
                    <School size={20} />
                  </div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block" }}>Sinf a'zosi</span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "18px", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 800, marginBottom: "14px", color: "var(--text-main)", display: "flex", alignItems: "center", gap: "6px" }}>
              <School size={16} color="var(--primary)" />
              Faoliyat statistikasi
            </h3>
            <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
              <div className="stat-card" style={{ padding: "12px" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)" }}>{classes.length} ta</div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Boshqaradigan sinflar</p>
              </div>
              <div className="stat-card" style={{ padding: "12px" }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--secondary)" }}>{homeworks.length} ta</div>
                <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Berilgan vazifalar</p>
              </div>
            </div>
          </div>
        )}

        {/* Developer Test Switch */}
        <div style={{ marginTop: "24px" }}>
          <h3 style={{ fontSize: "0.85rem", fontWeight: 800, marginBottom: "10px", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Tizim sozlamalari (Local)
          </h3>
          <button 
            className="btn btn-outline" 
            style={{ width: "100%", justifyContent: "center", background: "white", borderColor: "var(--border)", fontWeight: 700 }}
            onClick={() => void chooseRole(isStudent ? "teacher" : "student")}
            disabled={isBusy}
          >
            <RefreshCcw size={16} style={{ marginRight: "6px" }} />
            {isStudent ? "O'qituvchi rejimiga o'tish" : "O'quvchi rejimiga o'tish"}
          </button>
        </div>
      </div>
    );
  }
}
