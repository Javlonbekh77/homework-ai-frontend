import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  Camera,
  Check,
  ClipboardList,
  Copy,
  FileCheck,
  GraduationCap,
  Plus,
  RefreshCcw,
  School,
  Send,
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
  title: string;
  description?: string | null;
  subject: string;
  status?: string;
  max_score?: number;
  answer_key_approved?: boolean;
  ai_generated_answer_key?: AnswerKey;
  approved_answer_key?: AnswerKey;
};

type EvaluationProblem = {
  problem_number?: string;
  status?: string;
  feedback?: string;
};

type Submission = {
  id: string;
  attempt_number?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  status?: string;
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
    if (!user || !selectedClassId || !homeworkForm.title.trim()) return;
    setBusyAction("create-homework");
    setError("");
    setNotice("");
    try {
      await createHomework(
        user.id,
        selectedClassId,
        homeworkForm.title.trim(),
        homeworkForm.description.trim(),
        homeworkForm.subject.trim() || "Matematika",
      );
      setHomeworkForm({ title: "", description: "", subject: "Matematika" });
      setNotice("Vazifa qoralamasi yaratildi.");
      await loadTeacherHomeworks(user.id, selectedClassId);
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
      await loadTeacherHomeworks(user.id, selectedClassId);
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
      await loadTeacherHomeworks(user.id, selectedClassId);
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
      await loadTeacherHomeworks(user.id, selectedClassId);
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

  async function copyJoinCode() {
    if (!selectedClass?.join_code) return;
    await navigator.clipboard?.writeText(selectedClass.join_code);
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
          <div className="avatar-lg">{initials(user.full_name) || <UserRound size={28} />}</div>
          <h1>Homework AI</h1>
          <p className="profile-name">{user.full_name || "Telegram foydalanuvchi"}</p>
          {error ? <div className="alert error">{error}</div> : null}
          <div className="role-grid">
            <button
              className="role-card"
              type="button"
              disabled={isBusy}
              onClick={() => void chooseRole("teacher")}
            >
              <GraduationCap size={28} />
              <span>O'qituvchi</span>
            </button>
            <button
              className="role-card"
              type="button"
              disabled={isBusy}
              onClick={() => void chooseRole("student")}
            >
              <BookOpen size={28} />
              <span>O'quvchi</span>
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-container">
      <header className="header app-header">
        <div className="user-chip">
          <div className="avatar-sm">{initials(user.full_name) || <UserRound size={16} />}</div>
          <div>
            <p className="eyebrow">{user.role === "teacher" ? "O'qituvchi" : "O'quvchi"}</p>
            <h1 className="header-title">{user.full_name || "Homework AI"}</h1>
          </div>
        </div>
        <button
          className="icon-btn"
          type="button"
          disabled={refreshing}
          title="Yangilash"
          onClick={() => void loadDashboard(user, selectedClassId)}
        >
          <RefreshCcw size={19} />
        </button>
      </header>

      <section className="page-content">
        {error ? <div className="alert error">{error}</div> : null}
        {notice ? <div className="alert success">{notice}</div> : null}
        {user.role === "teacher" ? renderTeacher() : renderStudent()}
      </section>
    </main>
  );

  function renderTeacher() {
    return (
      <>
        <section className="stat-grid">
          <div className="stat-card">
            <School size={20} />
            <div className="stat-value">{classes.length}</div>
            <p>Sinflar</p>
          </div>
          <div className="stat-card">
            <ClipboardList size={20} />
            <div className="stat-value">{homeworks.length}</div>
            <p>Vazifalar</p>
          </div>
        </section>

        <form className="panel" onSubmit={handleCreateClass}>
          <div className="panel-title">
            <School size={20} />
            <h2>Sinf yaratish</h2>
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
              <input
                className="input-field"
                value={classForm.subject}
                onChange={(event) => setClassForm({ ...classForm, subject: event.target.value })}
                placeholder="Matematika"
              />
            </label>
          </div>
          <button className="btn btn-primary" type="submit" disabled={isBusy || !classForm.name.trim()}>
            <Plus size={18} />
            Yaratish
          </button>
        </form>

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
          <div className="empty-state">Hali sinf yo'q.</div>
        )}

        {selectedClass ? (
          <>
            <section className="join-strip">
              <div>
                <p className="eyebrow">Qo'shilish kodi</p>
                <strong>{selectedClass.join_code}</strong>
              </div>
              <button className="icon-btn" type="button" title="Koddan nusxa olish" onClick={() => void copyJoinCode()}>
                <Copy size={18} />
              </button>
            </section>

            <form className="panel" onSubmit={handleCreateHomework}>
              <div className="panel-title">
                <FileCheck size={20} />
                <h2>Vazifa yaratish</h2>
              </div>
              <label className="input-group">
                <span className="input-label">Sarlavha</span>
                <input
                  className="input-field"
                  value={homeworkForm.title}
                  onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
                  placeholder="Algebra, 12-bet"
                />
              </label>
              <label className="input-group">
                <span className="input-label">Izoh</span>
                <textarea
                  className="input-field textarea"
                  value={homeworkForm.description}
                  onChange={(event) => setHomeworkForm({ ...homeworkForm, description: event.target.value })}
                  placeholder="Uyga vazifa haqida qisqa izoh"
                />
              </label>
              <button
                className="btn btn-secondary"
                type="submit"
                disabled={isBusy || !homeworkForm.title.trim()}
              >
                <Plus size={18} />
                Qoralama ochish
              </button>
            </form>

            <section className="stack">
              {homeworks.map((homework) => renderTeacherHomework(homework))}
              {!homeworks.length ? <div className="empty-state">Bu sinfda vazifa yo'q.</div> : null}
            </section>
          </>
        ) : null}
      </>
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
          <section className="answer-key">
            <div className="flex-between">
              <strong>Javob kaliti</strong>
              <span className="badge badge-blue">{problems.length} ta</span>
            </div>
            {answerKey.general_notes ? <p>{answerKey.general_notes}</p> : null}
            <div className="problem-list">
              {problems.slice(0, 4).map((problem, index) => (
                <div className="problem-row" key={`${problem.problem_number || index}`}>
                  <span>{problem.problem_number || index + 1}</span>
                  <p>{problem.correct_answer || problem.problem_text || "Javob topildi"}</p>
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
          </section>
        ) : null}

        {showingSubmissions ? renderSubmissions(teacherSubmissions, "Hali topshirilgan ish yo'q.") : null}
      </article>
    );
  }

  function renderStudent() {
    return (
      <>
        <form className="panel" onSubmit={handleJoinClass}>
          <div className="panel-title">
            <School size={20} />
            <h2>Sinfga qo'shilish</h2>
          </div>
          <label className="input-group">
            <span className="input-label">Kod</span>
            <input
              className="input-field code-input"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              placeholder="ABC123"
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={isBusy || !joinCode.trim()}>
            <Plus size={18} />
            Qo'shilish
          </button>
        </form>

        {classes.length ? (
          <section className="class-list">
            {classes.map((item) => (
              <div className="mini-class" key={item.id}>
                <School size={18} />
                <div>
                  <strong>{item.name}</strong>
                  <p>{item.subject}</p>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        <section className="stack">
          <div className="section-title">
            <ClipboardList size={20} />
            <h2>Vazifalar</h2>
          </div>
          {homeworks.map((homework) => renderStudentHomework(homework))}
          {!homeworks.length ? <div className="empty-state">Hozircha vazifa yo'q.</div> : null}
        </section>
      </>
    );
  }

  function renderStudentHomework(homework: Homework) {
    const isActive = studentSubmissionHomeworkId === homework.id;

    return (
      <article className="card homework-card" key={homework.id}>
        <div className="card-head">
          <div>
            <h3>{homework.title}</h3>
            <p>{homework.description || homework.subject}</p>
          </div>
          <span className={`badge ${statusBadge(homework.status)}`}>{statusLabel(homework.status)}</span>
        </div>

        <form className="inline-form" onSubmit={(event) => void handleSubmitHomework(event, homework.id)}>
          <label className="file-picker">
            <Upload size={18} />
            <span>{submitFileValue?.name || "Homework rasmini tanlash"}</span>
            <input accept="image/*" type="file" onChange={handleSubmitFile} />
          </label>
          <div className="action-row">
            <button className="btn btn-primary" type="submit" disabled={isBusy || !submitFileValue}>
              <Send size={17} />
              Yuborish
            </button>
            <button
              className="btn btn-outline"
              type="button"
              disabled={isBusy}
              onClick={() => void handleLoadMySubmissions(homework.id)}
            >
              <Trophy size={17} />
              Natijalar
            </button>
          </div>
        </form>

        {isActive ? renderSubmissions(studentSubmissions, "Bu vazifa uchun natija yo'q.") : null}
      </article>
    );
  }

  function renderSubmissions(items: Submission[], emptyText: string) {
    if (!items.length) return <div className="empty-state compact">{emptyText}</div>;

    return (
      <section className="submission-list">
        {items.map((submission) => (
          <div className="submission" key={submission.id}>
            <div className="submission-score">
              <Trophy size={18} />
              <strong>{scoreText(submission)}</strong>
            </div>
            <p>
              Urinish {submission.attempt_number ?? 1}
              {typeof submission.percentage === "number" ? ` - ${Math.round(submission.percentage)}%` : ""}
            </p>
            {submission.grading_result ? (
              <div className="result-grid">
                <span>To'g'ri: {submission.grading_result.correct_count ?? 0}</span>
                <span>Xato: {submission.grading_result.incorrect_count ?? 0}</span>
                <span>Yo'q: {submission.grading_result.missing_count ?? 0}</span>
                <span>Noaniq: {submission.grading_result.uncertain_count ?? 0}</span>
              </div>
            ) : null}
            {submission.grading_result?.general_feedback ? (
              <p className="feedback">{submission.grading_result.general_feedback}</p>
            ) : null}
          </div>
        ))}
      </section>
    );
  }
}
