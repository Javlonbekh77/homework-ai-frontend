import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent, ReactNode } from "react";
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
  ChevronRight,
  ClipboardList,
  Copy,
  FileCheck,
  FileText,
  Flame,
  GraduationCap,
  Plus,
  RefreshCcw,
  School,
  Search,
  Send,
  Settings,
  Star,
  Trophy,
  Upload,
  UserPlus,
  UserRound,
  UsersRound,
  Edit,
  Sliders,
  X,
  MessageCircle,
  BookType,
  Wrench,
  PenTool,
  CheckCircle,
  Clock,
  Bell,
} from "lucide-react";
import "./App.css";
import {
  analyzeControlWorkBase,
  analyzeHomeworkSource,
  apiAssetUrl,
  approveAnswerKey,
  authWithTelegram,
  createClass,
  createHomework,
  getClassHomeworks,
  getClasses,
  getHomeworkSubmissions,
  getMySubmissions,
  getStudentHomeworks,
  getUncertainReviews,
  joinClass,
  publishHomework,
  reviewUncertainProblem,
  searchClassByCode,
  submitHomework,
  updateProfile,
  updateRole,
  getClassStudents,
  getTeacherDashboard,
  getTeacherHomeworks,
  getGrades,
  getTopics,
  getSkills,
  getQuestionBank,
  updateQuestion,
  updateQuestionStatus,
  extractQuestions,
  generateVariant,
  createTopic,
  checkControlWork,
  checkDiktant,
  checkTestManual,
  checkTestScan,
  assignHomeworkBankItem,
  getHomeworkBank,
  sendTutorMessage,
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

type ClassSearchResult = SchoolClass & {
  teacher_name?: string | null;
  already_joined?: boolean;
};

type AnswerProblem = {
  problem_number?: string;
  problem_text?: string;
  correct_answer?: string;
  solution_steps?: string[];
  unreadable_parts?: string[];
  confidence?: number;
};

type AnswerKey = {
  image_quality?: string;
  general_notes?: string;
  problems?: AnswerProblem[];
} & Record<string, unknown>;

type Homework = {
  id: string;
  bank_item_id?: string | null;
  class_id?: string;
  target_class_id?: string | null;
  target_class_name?: string | null;
  title: string;
  description?: string | null;
  subject: string;
  status?: string;
  workflow_status?: string;
  max_score?: number;
  answer_key_approved?: boolean;
  ai_generated_answer_key?: AnswerKey;
  approved_answer_key?: AnswerKey;
  student_status?: "pending" | "submitted";
  latest_score?: number;
  latest_percentage?: number;
  attempt_count?: number;
  latest_submission?: Submission;
  deadline?: string | null;
};

type HomeworkBankItem = {
  id: string;
  title: string;
  description?: string | null;
  subject?: string;
  status?: string;
  workflow_status?: string;
  answer_key_approved?: boolean;
  ai_generated_answer_key?: AnswerKey;
  approved_answer_key?: AnswerKey;
  selected_problem_range?: string | null;
  assignment_count?: number;
  assigned_class_ids?: string[];
};

type ErrorDetail = {
  step?: string;
  description?: string;
  suggestion?: string;
};

type EvaluationProblem = {
  problem_number?: string;
  expected_answer?: string;
  student_answer?: string;
  student_steps?: string[];
  status?: string;
  feedback?: string;
  errors?: ErrorDetail[];
  unreadable_parts?: string[];
  confidence?: number;
};

type Submission = {
  id: string;
  homework_title?: string;
  class_name?: string;
  subject?: string;
  student_name?: string;
  telegram_username?: string | null;
  attempt_number?: number;
  score?: number;
  max_score?: number;
  percentage?: number;
  status?: string;
  review_status?: string;
  pending_review_count?: number;
  student_image_url?: string;
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

type UncertainReviewItem = {
  id: string;
  submission_id: string;
  problem_index: number;
  homework_id: string;
  homework_title?: string;
  class_id?: string;
  class_name?: string;
  student_id?: string;
  student_name?: string;
  attempt_number?: number;
  submitted_at?: string;
  student_image_url?: string;
  problem: EvaluationProblem;
};

type TeacherDashboardSummary = {
  class_count: number;
  subject_count: number;
  student_count: number;
  homework_count: number;
  published_homework_count: number;
  submission_count: number;
  submitted_student_count: number;
  average_score: number;
  average_percentage: number;
  coverage_percent: number;
};

type TeacherDashboardClass = {
  id: string;
  name: string;
  subject: string;
  join_code?: string;
  student_count: number;
  homework_count: number;
  published_homework_count: number;
  submission_count: number;
  submitted_student_count: number;
  average_score: number;
  average_percentage: number;
  coverage_percent: number;
  last_submission_at?: string | null;
};

type TeacherDashboardSubject = {
  subject: string;
  class_count: number;
  student_count: number;
  homework_count: number;
  published_homework_count: number;
  submission_count: number;
  submitted_student_count: number;
  average_score: number;
  average_percentage: number;
  coverage_percent: number;
  last_submission_at?: string | null;
};

type TeacherDashboardHomework = {
  id: string;
  bank_item_id?: string | null;
  class_id?: string;
  target_class_id?: string | null;
  target_class_name?: string | null;
  class_name: string;
  title: string;
  subject: string;
  status?: string;
  student_count: number;
  submission_count: number;
  submitted_student_count: number;
  average_score: number;
  average_percentage: number;
  coverage_percent: number;
  created_at?: string | null;
  last_submission_at?: string | null;
};

type TeacherDashboardStudent = {
  id: string;
  full_name: string;
  telegram_username?: string | null;
  class_ids: string[];
  classes: { id: string; name: string; subject: string }[];
  assigned_homework_count: number;
  submitted_homework_count: number;
  submission_count: number;
  average_score: number;
  average_percentage: number;
  coverage_percent: number;
  last_submission_at?: string | null;
};

type TeacherDashboardSubmission = Submission & {
  homework_id: string;
  homework_title: string;
  class_id?: string;
  class_name: string;
  subject: string;
  student_id?: string;
  student_name: string;
  telegram_username?: string | null;
};

type TeacherDashboard = {
  generated_at?: string;
  summary: TeacherDashboardSummary;
  classes: TeacherDashboardClass[];
  subjects: TeacherDashboardSubject[];
  homeworks: TeacherDashboardHomework[];
  students: TeacherDashboardStudent[];
  submissions: TeacherDashboardSubmission[];
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
  import.meta.env.DEV || 
  window.location.hostname === "localhost" || 
  window.location.hostname === "127.0.0.1" || 
  window.location.hostname.startsWith("192.168.");

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Noma'lum xatolik yuz berdi";
}

function statusLabel(status?: string) {
  if (status === "published") return "Nashr qilingan";
  if (status === "graded") return "Tekshirildi";
  if (status === "needs_review") return "Shubhali";
  if (status === "approved") return "Tasdiqlangan";
  if (status === "analyzed") return "AI tahlil qildi";
  if (status === "draft_created") return "Qoralama ochildi";
  if (status === "draft") return "Qoralama";
  return status || "Yangi";
}

function statusBadge(status?: string) {
  if (status === "published") return "badge-green";
  if (status === "graded") return "badge-green";
  if (status === "needs_review") return "badge-orange";
  if (status === "approved") return "badge-blue";
  if (status === "analyzed") return "badge-blue";
  if (status === "draft") return "badge-orange";
  if (status === "draft_created") return "badge-orange";
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

function metricPercent(value?: number) {
  return `${Math.round(value ?? 0)}%`;
}

function submissionRank(submission: Submission) {
  const date = new Date(submission.submitted_at);
  const time = Number.isNaN(date.getTime()) ? 0 : date.getTime();
  return time + (submission.attempt_number ?? 0);
}

function latestSubmission<T extends Submission>(items: T[]) {
  return items.reduce<T | null>((latest, item) => {
    if (!latest) return item;
    return submissionRank(item) > submissionRank(latest) ? item : latest;
  }, null);
}

function cleanInsightText(value?: string | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function problemStatusLabel(status?: string) {
  if (status === "incorrect") return "Xato yechim";
  if (status === "missing") return "Tashlab ketilgan masala";
  if (status === "uncertain") return "Noaniq javob";
  return "AI aniqlagan xato";
}

function buildProgressInsights(items: Homework[], submissionsByHomework: Record<string, Submission[]>) {
  const mistakeMap = new Map<string, {
    label: string;
    suggestion?: string;
    count: number;
    homeworks: Set<string>;
    problems: Set<string>;
  }>();
  const feedbacks: { id: string; homeworkTitle: string; text: string; score: string }[] = [];

  items.forEach((homework) => {
    const cached = submissionsByHomework[homework.id] || [];
    const submissions = cached.length ? cached : homework.latest_submission ? [homework.latest_submission] : [];
    const submission = latestSubmission(submissions);
    const result = submission?.grading_result;
    if (!submission || !result) return;

    const generalFeedback = cleanInsightText(result.general_feedback);
    if (generalFeedback) {
      feedbacks.push({
        id: submission.id,
        homeworkTitle: homework.title,
        text: generalFeedback,
        score: scoreText(submission),
      });
    }

    (result.problems || []).forEach((problem) => {
      const hasProblemIssue = problem.status && problem.status !== "correct";
      const hasDetailedErrors = Boolean(problem.errors?.length);
      if (!hasProblemIssue && !hasDetailedErrors) return;

      const problemNumber = cleanInsightText(problem.problem_number) || "?";
      const entries = hasDetailedErrors
        ? problem.errors || []
        : [{ description: cleanInsightText(problem.feedback) || problemStatusLabel(problem.status), suggestion: "" }];

      entries.forEach((entry) => {
        const label = cleanInsightText(entry.description) || problemStatusLabel(problem.status);
        const suggestion = cleanInsightText(entry.suggestion);
        const key = `${label.toLowerCase()}|${suggestion.toLowerCase()}`;
        const current = mistakeMap.get(key) || {
          label,
          suggestion,
          count: 0,
          homeworks: new Set<string>(),
          problems: new Set<string>(),
        };
        current.count += 1;
        current.homeworks.add(homework.title);
        current.problems.add(problemNumber);
        mistakeMap.set(key, current);
      });
    });
  });

  const mistakes = [...mistakeMap.values()]
    .map((item) => ({
      label: item.label,
      suggestion: item.suggestion,
      count: item.count,
      homeworks: [...item.homeworks],
      problems: [...item.problems],
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5);

  return {
    mistakes,
    feedbacks: feedbacks.slice(0, 5),
  };
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
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ full_name: "" });

  const [classForm, setClassForm] = useState({ name: "", subject: "Matematika" });
  const [homeworkForm, setHomeworkForm] = useState({
    title: "",
    description: "",
    subject: "Matematika",
  });
  const [joinCode, setJoinCode] = useState("");
  const [classSearchResult, setClassSearchResult] = useState<ClassSearchResult | null>(null);
  const [activeHomeworkId, setActiveHomeworkId] = useState("");
  const [problemRange, setProblemRange] = useState("1-misoldan 5-misolgacha");
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [submitFileValue, setSubmitFileValue] = useState<File | null>(null);
  const [studentSubmissionHomeworkId, setStudentSubmissionHomeworkId] = useState("");
  const [studentSubmissionsByHomework, setStudentSubmissionsByHomework] = useState<Record<string, Submission[]>>({});
  const [teacherSubmissionHomeworkId, setTeacherSubmissionHomeworkId] = useState("");
  const [teacherSubmissions, setTeacherSubmissions] = useState<Submission[]>([]);
  const [teacherDashboard, setTeacherDashboard] = useState<TeacherDashboard | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  // Teacher Class Detail States
  const [selectedTeacherClassId, setSelectedTeacherClassId] = useState("");
  const [classStudents, setClassStudents] = useState<any[]>([]);
  const [classStudentsLoading, setClassStudentsLoading] = useState(false);
  const [classSubTab, setClassSubTab] = useState<"students" | "homeworks" | "grades">("students");
  const [allTeacherHomeworks, setAllTeacherHomeworks] = useState<Homework[]>([]);
  const [homeworkBank, setHomeworkBank] = useState<HomeworkBankItem[]>([]);
  const [homeworkBankLoading, setHomeworkBankLoading] = useState(false);
  const [expandedAnswerKeys, setExpandedAnswerKeys] = useState<string[]>([]);
  const [publishClassByHomework, setPublishClassByHomework] = useState<Record<string, string>>({});
  const [bankAssignClassByItem, setBankAssignClassByItem] = useState<Record<string, string>>({});
  const [bankCreateClassId, setBankCreateClassId] = useState("");
  const [answerKeyDrafts, setAnswerKeyDrafts] = useState<Record<string, AnswerKey>>({});
  const [uncertainReviews, setUncertainReviews] = useState<UncertainReviewItem[]>([]);
  const [uncertainReviewsLoading, setUncertainReviewsLoading] = useState(false);

  // Question Bank States
  const [qbQuestions, setQbQuestions] = useState<any[]>([]);
  const [qbLoading, setQbLoading] = useState(false);
  const [qbGradesList, setQbGradesList] = useState<any[]>([]);
  const [qbTopicsList, setQbTopicsList] = useState<any[]>([]);
  const [qbSkillsList, setQbSkillsList] = useState<any[]>([]);

  // Wizard States
  const [qbWizardOpen, setQbWizardOpen] = useState(false);
  const qbSubject = "mathematics";
  const [qbGrade, setQbGrade] = useState<number | "">("");
  const [qbTopicId, setQbTopicId] = useState("");
  const [customTopicName, setCustomTopicName] = useState("");
  const [showCustomTopicInput, setShowCustomTopicInput] = useState(false);
  const [qbSelectedSkills, setQbSelectedSkills] = useState<string[]>([]);
  const [qbTextContent, setQbTextContent] = useState("");
  const [qbFile, setQbFile] = useState<File | null>(null);
  const [qbExtracting, setQbExtracting] = useState(false);
  const [qbExtractedResult, setQbExtractedResult] = useState<any[]>([]);

  // Filter States
  const [qbFilterGrade, setQbFilterGrade] = useState<number | "">("");
  const [qbFilterTopicId, setQbFilterTopicId] = useState("");
  const [qbFilterSkillId, setQbFilterSkillId] = useState("");
  const [qbFilterStatus, setQbFilterStatus] = useState("");

  // Edit / Preview States
  const [qbEditingQuestion, setQbEditingQuestion] = useState<any | null>(null);
  const [qbTestingVariantId, setQbTestingVariantId] = useState("");
  const [qbVariantParams, setQbVariantParams] = useState<Record<string, any>>({});
  const [qbVariantResult, setQbVariantResult] = useState<any | null>(null);

  // Tools Flow States
  const [toolsActiveView, setToolsActiveView] = useState<"home" | "question_bank" | "paper_checker" | "test_checker" | "diktant_checker" | "control_work" | "uncertain_reviews">("home");

  // Diktant Checker States
  const [diktantStep, setDiktantStep] = useState(1);
  const [diktantStudent, setDiktantStudent] = useState("");
  const [diktantClassId, setDiktantClassId] = useState("");
  const [diktantText, setDiktantText] = useState("");
  const [diktantImage, setDiktantImage] = useState<File | null>(null);
  const [diktantResult, setDiktantResult] = useState<any>(null);

  // Test Checker States
  const [testStep, setTestStep] = useState(1);
  const [testStudent, setTestStudent] = useState("");
  const [testAnswers, setTestAnswers] = useState<Record<number, string>>({});
  const [testResult, setTestResult] = useState<any>(null);
  const [testName, setTestName] = useState("Algebra Test #3");
  const [testClass, setTestClass] = useState("8-A");
  const [testQuestionCount, setTestQuestionCount] = useState(20);
  const [testMaxScore, setTestMaxScore] = useState(20);
  const [testStudentAnswers, setTestStudentAnswers] = useState<Record<number, string>>({});
  const [testKeySaved, setTestKeySaved] = useState<Record<number, string>>({});
  const [testImage, setTestImage] = useState<File | null>(null);

  // Control Work States
  const [cwStep, setCwStep] = useState(1);
  const [cwStudent, setCwStudent] = useState("");
  const [cwImage, setCwImage] = useState<File | null>(null);
  const [cwBaseImage, setCwBaseImage] = useState<File | null>(null);
  const [cwProblemRange, setCwProblemRange] = useState("Barcha savollar");
  const [cwAnswerKey, setCwAnswerKey] = useState<AnswerKey | null>(null);
  const [cwResult, setCwResult] = useState<any>(null);
  const [cwName, setCwName] = useState("Kvadrat tenglamalar nazorat ishi");
  const [cwClass, setCwClass] = useState("8-A");
  const [cwSubject, setCwSubject] = useState("Matematika");
  const [cwMaxScore, setCwMaxScore] = useState(10);
  // Teacher custom states
  const [showCreateClassForm, setShowCreateClassForm] = useState(false);

  // Student workflow states
  const [studentSelectedHomeworkId, setStudentSelectedHomeworkId] = useState<string | null>(null);
  const [studentUploadStep, setStudentUploadStep] = useState<"detail" | "upload" | "loading" | "result">("detail");
  const [studentPracticeStep, setStudentPracticeStep] = useState<"list" | "question" | "complete">("list");
  const [studentPracticeAnswers, setStudentPracticeAnswers] = useState<Record<number, string>>({});
  const [studentPracticeInput, setStudentPracticeInput] = useState("-0.5");
  const [studentStreak, setStudentStreak] = useState(12);
  const [studentXP, setStudentXP] = useState(1240);
  const [studentUploadFile, setStudentUploadFile] = useState<File | null>(null);
  const [studentUploadImage, setStudentUploadImage] = useState<string | null>(null);
  const [studentWorkflowSubmission, setStudentWorkflowSubmission] = useState<Submission | null>(null);
  const [studentProgressPercent, setStudentProgressPercent] = useState(8);
  const [studentTutorInput, setStudentTutorInput] = useState("");
  const [studentTutorChat, setStudentTutorChat] = useState<Array<{ sender: "user" | "ai"; text: string; time?: string; isSpecialBlock?: boolean }>>([
    { sender: "ai", text: "Salom, Malika! Keling, bu savolda qayerda xato bo'lganini birga ko'rib chiqamiz." }
  ]);
  // Teacher journal drill-down state
  const [selectedJournalStudentId, setSelectedJournalStudentId] = useState<string | null>(null);
  const [teacherStudentSearch, setTeacherStudentSearch] = useState("");
  const [selectedClassStudentId, setSelectedClassStudentId] = useState<string | null>(null);

  const loadGradesList = useCallback(async (userId: string) => {
    try {
      const data = await getGrades(userId);
      setQbGradesList(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadTopicsList = useCallback(async (userId: string, grade?: number) => {
    try {
      const data = await getTopics(userId, grade);
      setQbTopicsList(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadSkillsList = useCallback(async (userId: string, topicId: string) => {
    try {
      const data = await getSkills(userId, topicId);
      setQbSkillsList(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadQuestionBankQuestions = useCallback(async (userId: string) => {
    setQbLoading(true);
    try {
      const filters: any = {};
      if (qbFilterGrade !== "") filters.grade = Number(qbFilterGrade);
      if (qbFilterTopicId) filters.topic_id = qbFilterTopicId;
      if (qbFilterSkillId) filters.skill_id = qbFilterSkillId;
      if (qbFilterStatus) filters.status = qbFilterStatus;
      filters.subject_id = "mathematics";

      const data = await getQuestionBank(userId, filters);
      setQbQuestions(data);
    } catch (err) {
      if (isLocalhost) {
        console.warn("loadQuestionBankQuestions failed: using local mock questions", err);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setQbLoading(false);
    }
  }, [qbFilterGrade, qbFilterTopicId, qbFilterSkillId, qbFilterStatus]);

  const selectedClass = useMemo(

    () => classes.find((item) => item.id === selectedClassId),
    [classes, selectedClassId],
  );

  const isBusy = busyAction !== null;

  const subjectMeta: Record<string, { bg: string; color: string; icon: ReactNode }> = {
    "Matematika": { bg: "rgba(59,130,246,0.1)", color: "var(--primary)", icon: <BookOpen size={18} /> },
    "Fizika": { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", icon: <TrendingUp size={18} /> },
    "Kimyo": { bg: "rgba(16,185,129,0.1)", color: "var(--secondary)", icon: <FileCheck size={18} /> },
    "Ona tili": { bg: "rgba(245,158,11,0.1)", color: "var(--warning)", icon: <BookType size={18} /> },
    "Ingliz tili": { bg: "rgba(239,68,68,0.1)", color: "var(--danger)", icon: <MessageCircle size={18} /> },
    "Biologiya": { bg: "rgba(34,197,94,0.1)", color: "#16a34a", icon: <School size={18} /> },
  };

  function getSubjectMeta(subject = "Fan") {
    return subjectMeta[subject] || { bg: "rgba(100,116,139,0.1)", color: "var(--text-muted)", icon: <BookOpen size={18} /> };
  }

  function groupHomeworksBySubject(items: Homework[]) {
    return items.reduce<Record<string, Homework[]>>((groups, homework) => {
      const subject = homework.subject || "Boshqa fan";
      groups[subject] = [...(groups[subject] || []), homework];
      return groups;
    }, {});
  }

  function subjectGrowthRows() {
    const rows = [
      { subject: "Matematika", values: [68, 72, 75, 81, 84], teacherFeedback: "Diskriminant va ishoralarda e'tibor kuchaytirilsa, keyingi nazoratda yuqori natija kutiladi." },
      { subject: "Fizika", values: [61, 65, 64, 70, 74], teacherFeedback: "Formulani tanlash yaxshi, lekin birliklarni yozish odatini mustahkamlash kerak." },
      { subject: "Ona tili", values: [78, 80, 83, 82, 86], teacherFeedback: "Matnli javoblarda izohlar aniq. Imlo xatolari kamaymoqda." },
    ];

    const subjectScores = new Map<string, number[]>();
    homeworks.forEach((homework) => {
      if (typeof homework.latest_percentage !== "number") return;
      const current = subjectScores.get(homework.subject) || [];
      subjectScores.set(homework.subject, [...current, homework.latest_percentage]);
    });

    return rows.map((row) => {
      const realScores = subjectScores.get(row.subject);
      const values = realScores?.length ? [...row.values.slice(0, Math.max(0, 5 - realScores.length)), ...realScores].slice(-5) : row.values;
      const average = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
      const delta = values[values.length - 1] - values[0];
      return { ...row, values, average, delta };
    });
  }

  function renderLineGraph(values: number[], color: string) {
    const width = 220;
    const height = 72;
    const padding = 8;
    const min = Math.min(...values, 50);
    const max = Math.max(...values, 100);
    const range = Math.max(1, max - min);
    const points = values.map((value, index) => {
      const x = padding + (index * (width - padding * 2)) / Math.max(1, values.length - 1);
      const y = height - padding - ((value - min) / range) * (height - padding * 2);
      return { x, y, value };
    });
    const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    const areaPath = `${path} L ${points[points.length - 1].x.toFixed(1)} ${height - padding} L ${points[0].x.toFixed(1)} ${height - padding} Z`;

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="72" role="img" aria-label="O'sish grafigi">
        <path d={areaPath} fill={color} opacity="0.1" />
        <path d={path} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="3.5" fill="white" stroke={color} strokeWidth="2" />
        ))}
      </svg>
    );
  }

  function seedQuestionBankDemo() {
    setQbGradesList([
      { grade: 7 },
      { grade: 8 },
      { grade: 9 },
    ]);
    setQbTopicsList([
      { id: "topic_quadratic", name: "Kvadrat tenglamalar", grade: 8 },
      { id: "topic_linear", name: "Chiziqli tenglamalar", grade: 7 },
    ]);
    setQbQuestions([
      {
        id: "q1",
        grade: 8,
        topic_id: "topic_quadratic",
        question_text: "x^2 - 5x + 6 = 0 tenglamani yeching.",
        question_type: "numeric",
        correct_answer: "2,3",
        difficulty: 1,
        status: "approved",
        solution_steps: ["x^2 - 5x + 6 = (x-2)(x-3) = 0", "x1 = 2, x2 = 3"],
        variant_allowed: true,
        variant_template: { template_type: "quadratic_equation", parameters: { a: 1, b: -5, c: 6 } },
      },
      {
        id: "q2",
        grade: 7,
        topic_id: "topic_linear",
        question_text: "2x + 4 = 10 tenglamani yeching.",
        question_type: "numeric",
        correct_answer: "3",
        difficulty: 1,
        status: "draft",
        solution_steps: ["2x = 6", "x = 3"],
        variant_allowed: true,
        variant_template: { template_type: "ax_plus_b_equals_c", parameters: { a: 2, b: 4, c: 10 } },
      },
    ]);
  }

  function seedLocalTeacherDashboard() {
    const demoClasses: SchoolClass[] = [
      { id: "class_8a", name: "8-A", subject: "Matematika", join_code: "M8A24", student_count: 28 },
      { id: "class_8b", name: "8-B", subject: "Matematika", join_code: "M8B18", student_count: 27 },
      { id: "class_7a", name: "7-A", subject: "Matematika", join_code: "M7A31", student_count: 26 },
      { id: "class_7b", name: "7-B", subject: "Matematika", join_code: "M7B09", student_count: 25 },
    ];
    const demoHomeworks: Homework[] = [
      {
        id: "hw_quad",
        class_id: "class_8a",
        title: "Kvadrat tenglamalar",
        subject: "Matematika",
        description: "15-20 mashqlarni daftarda ishlab, rasmini yuboring.",
        status: "published",
        max_score: 5,
        answer_key_approved: true,
        deadline: "Bugun, 23:59",
      },
      {
        id: "hw_poly",
        class_id: "class_8a",
        title: "Muntazam ko'pburchaklar",
        subject: "Matematika",
        description: "Ko'pburchak burchaklari bo'yicha mashqlar.",
        status: "published",
        max_score: 5,
        answer_key_approved: true,
        deadline: "22.05.2025",
      },
      {
        id: "hw_stat",
        class_id: "class_7a",
        title: "Statistika asoslari",
        subject: "Matematika",
        description: "Diagramma va o'rtacha qiymatga oid savollar.",
        status: "draft",
        max_score: 5,
        answer_key_approved: false,
        deadline: "Qoralama",
      },
    ];

    setClasses(demoClasses);
    setSelectedClassId("class_8a");
    setHomeworks(demoHomeworks.filter((homework) => homework.class_id === "class_8a"));
    setAllTeacherHomeworks(demoHomeworks);
    setHomeworkBank(
      demoHomeworks.map((homework) => ({
        id: `bank_${homework.id}`,
        title: homework.title,
        description: homework.description,
        subject: homework.subject,
        status: homework.status,
        workflow_status: homework.workflow_status || homework.status,
        answer_key_approved: homework.answer_key_approved,
        approved_answer_key: homework.approved_answer_key,
        ai_generated_answer_key: homework.ai_generated_answer_key,
        assignment_count: 1,
        assigned_class_ids: homework.class_id ? [homework.class_id] : [],
      })),
    );
    setClassStudents([
      { id: "s1", full_name: "Saidov Asilbek", telegram_username: "asilbek", average_score: 92, submission_count: 14 },
      { id: "s2", full_name: "Karimova Dilnoza", telegram_username: "dilnoza", average_score: 88, submission_count: 12 },
      { id: "s3", full_name: "Yusupov Behruz", telegram_username: "behruz", average_score: 58, submission_count: 8 },
    ]);
    setUncertainReviews([
      {
        id: "demo_uncertain_1",
        submission_id: "demo_submission_1",
        problem_index: 2,
        homework_id: "hw_quad",
        homework_title: "Kvadrat tenglamalar",
        class_id: "class_8a",
        class_name: "8-A",
        student_id: "s1",
        student_name: "Saidov Asilbek",
        attempt_number: 1,
        submitted_at: "2026-08-17T08:30:00+05:00",
        student_image_url: "",
        problem: {
          problem_number: "3",
          status: "uncertain",
          expected_answer: "x = -0.5 yoki x = 3",
          student_answer: "",
          feedback: "Yozuvning ildizlar yozilgan qismi aniq o'qilmadi.",
          unreadable_parts: ["yakuniy javob"],
          confidence: 0.45,
        },
      },
    ]);
    setTeacherDashboard({
      generated_at: "2026-08-17T09:00:00+05:00",
      summary: {
        class_count: demoClasses.length,
        subject_count: 1,
        student_count: 106,
        homework_count: 18,
        published_homework_count: 12,
        submission_count: 36,
        submitted_student_count: 36,
        average_score: 4.2,
        average_percentage: 84,
        coverage_percent: 86,
      },
      classes: demoClasses.map((item) => ({
        id: item.id,
        name: item.name,
        subject: item.subject,
        join_code: item.join_code,
        student_count: item.student_count ?? 0,
        homework_count: item.id === "class_8a" ? 2 : 1,
        published_homework_count: item.id === "class_8a" ? 2 : 1,
        submission_count: item.id === "class_8a" ? 24 : 12,
        submitted_student_count: item.id === "class_8a" ? 24 : 12,
        average_score: item.id === "class_7b" ? 3.6 : 4.2,
        average_percentage: item.id === "class_7b" ? 72 : 84,
        coverage_percent: item.id === "class_8a" ? 86 : 75,
        last_submission_at: "2026-08-17T08:30:00+05:00",
      })),
      subjects: [
        {
          subject: "Matematika",
          class_count: demoClasses.length,
          student_count: 106,
          homework_count: 18,
          published_homework_count: 12,
          submission_count: 36,
          submitted_student_count: 36,
          average_score: 4.2,
          average_percentage: 84,
          coverage_percent: 86,
          last_submission_at: "2026-08-17T08:30:00+05:00",
        },
      ],
      homeworks: demoHomeworks.map((homework) => ({
        id: homework.id,
        class_id: homework.class_id,
        class_name: demoClasses.find((item) => item.id === homework.class_id)?.name || "Sinf",
        title: homework.title,
        subject: homework.subject,
        status: homework.status,
        student_count: homework.class_id === "class_8a" ? 28 : 26,
        submission_count: homework.id === "hw_quad" ? 24 : 18,
        submitted_student_count: homework.id === "hw_quad" ? 24 : 18,
        average_score: homework.id === "hw_stat" ? 0 : 4.2,
        average_percentage: homework.id === "hw_stat" ? 0 : 84,
        coverage_percent: homework.id === "hw_quad" ? 86 : 69,
        created_at: "2026-08-16T10:00:00+05:00",
        last_submission_at: "2026-08-17T08:30:00+05:00",
      })),
      students: [
        {
          id: "s1",
          full_name: "Saidov Asilbek",
          telegram_username: "asilbek",
          class_ids: ["class_8a"],
          classes: [{ id: "class_8a", name: "8-A", subject: "Matematika" }],
          assigned_homework_count: 12,
          submitted_homework_count: 11,
          submission_count: 14,
          average_score: 4.6,
          average_percentage: 92,
          coverage_percent: 92,
          last_submission_at: "2026-08-17T08:30:00+05:00",
        },
      ],
      submissions: [],
    });
    setStudentSubmissionsByHomework({});
    seedQuestionBankDemo();
  }

  function seedLocalStudentDashboard() {
    const gradedSubmission: Submission = {
      id: "student_sub_quad",
      homework_title: "Chiziqli tenglamalar sistemasi",
      class_name: "8-A",
      subject: "Matematika",
      attempt_number: 1,
      score: 4.2,
      max_score: 5,
      percentage: 84,
      status: "graded",
      submitted_at: "2026-08-17T08:15:00+05:00",
      grading_result: {
        total_problems: 28,
        correct_count: 21,
        incorrect_count: 4,
        missing_count: 0,
        uncertain_count: 2,
        general_feedback: "Umuman yaxshi ishlangan. Belgilar va hisoblashga e'tiborni kuchaytirsangiz, natija yanada yaxshilanadi.",
        problems: [
          {
            problem_number: "3",
            status: "incorrect",
            feedback: "Diskriminant hisobida ishora xatosi bor.",
            errors: [{ description: "D = b^2 - 4ac formulasi noto'g'ri qo'llangan", suggestion: "c manfiy bo'lsa, -4ac musbat qiymat beradi." }],
          },
        ],
      },
    };
    const demoHomeworks: Homework[] = [
      {
        id: "student_hw_quad",
        class_id: "class_8a_student",
        title: "Kvadrat tenglamalar",
        subject: "Matematika",
        description: "Berilgan tenglamalarni yeching va javoblaringizni izohlash bilan topshiring.",
        status: "published",
        max_score: 5,
        student_status: "pending",
        deadline: "Bugun, 23:59",
      },
      {
        id: "student_hw_system",
        class_id: "class_8a_student",
        title: "Chiziqli tenglamalar sistemasi",
        subject: "Matematika",
        description: "Sistema yechimlarini taqqoslash usuli bilan toping.",
        status: "graded",
        max_score: 5,
        student_status: "submitted",
        latest_score: 4.2,
        latest_percentage: 84,
        latest_submission: gradedSubmission,
        deadline: "16.08.2026",
      },
      {
        id: "student_hw_force",
        class_id: "class_8a_student",
        title: "Kuch va harakat",
        subject: "Fizika",
        description: "Nyuton qonunlari bo'yicha 6 ta masalani yeching.",
        status: "published",
        max_score: 5,
        student_status: "pending",
        deadline: "Ertaga, 18:00",
      },
      {
        id: "student_hw_grammar",
        class_id: "class_8a_student",
        title: "Matn tahlili",
        subject: "Ona tili",
        description: "Berilgan matndan ega va kesimni toping.",
        status: "graded",
        max_score: 5,
        student_status: "submitted",
        latest_score: 4.6,
        latest_percentage: 92,
        deadline: "15.08.2026",
      },
    ];

    setClasses([{ id: "class_8a_student", name: "8-A", subject: "Matematika", join_code: "M8A24", student_count: 28 }]);
    setSelectedClassId("class_8a_student");
    setHomeworks(demoHomeworks);
    setAllTeacherHomeworks([]);
    setHomeworkBank([]);
    setTeacherDashboard(null);
    setClassStudents([]);
    setSelectedTeacherClassId("");
    setTeacherSubmissions([]);
    setStudentSubmissionsByHomework({ student_hw_system: [gradedSubmission] });
  }

  function seedLocalDashboard(role: Role) {
    if (role === "teacher") {
      seedLocalTeacherDashboard();
    } else {
      seedLocalStudentDashboard();
    }
  }

  const loadTeacherHomeworks = useCallback(async (userId: string, classId: string) => {
    const list = (await getClassHomeworks(userId, classId)) as Homework[];
    setHomeworks(list);
  }, []);

  const loadTeacherAnalytics = useCallback(async (userId: string) => {
    setDashboardLoading(true);
    try {
      const analytics = (await getTeacherDashboard(userId)) as TeacherDashboard;
      setTeacherDashboard(analytics);
      return analytics;
    } finally {
      setDashboardLoading(false);
    }
  }, []);

  const loadHomeworkBank = useCallback(async (userId: string) => {
    setHomeworkBankLoading(true);
    try {
      const items = (await getHomeworkBank(userId)) as HomeworkBankItem[];
      setHomeworkBank(items);
      return items;
    } finally {
      setHomeworkBankLoading(false);
    }
  }, []);

  const loadUncertainReviews = useCallback(async (userId: string) => {
    setUncertainReviewsLoading(true);
    try {
      const items = (await getUncertainReviews(userId)) as UncertainReviewItem[];
      setUncertainReviews(items);
      return items;
    } finally {
      setUncertainReviewsLoading(false);
    }
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
          const [allHws] = await Promise.all([
            getTeacherHomeworks(nextUser.id) as Promise<Homework[]>,
            loadTeacherAnalytics(nextUser.id),
            loadHomeworkBank(nextUser.id),
            loadUncertainReviews(nextUser.id),
          ]);
          setAllTeacherHomeworks(allHws);
        } else {
          const list = (await getStudentHomeworks(nextUser.id)) as Homework[];
          setHomeworks(list);
          seedLatestSubmissions(list);
        }
      } catch (caught) {
        if (isLocalhost) {
          console.warn("loadDashboard failed: using local mock dashboard", caught);
          seedLocalDashboard(nextUser.role);
        } else {
          setError(getErrorMessage(caught));
        }
      } finally {
        setRefreshing(false);
      }
    },
    [loadHomeworkBank, loadTeacherAnalytics, loadTeacherHomeworks, loadUncertainReviews],
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
        if (isLocalhost) {
          console.warn("API ulanish xatosi, local mock o'qituvchi rejimida davom etiladi:", caught);
          const mockUser: User = {
            id: "mock_teacher_id",
            telegram_id: 123456789,
            telegram_username: "mock_teacher",
            photo_url: "https://api.dicebear.com/7.x/adventurer/svg?seed=Ali",
            full_name: "Mock O'qituvchi (Demo)",
            role: "teacher"
          };
          setUser(mockUser);
          seedLocalDashboard("teacher");
        } else {
          setError(getErrorMessage(caught));
        }
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
      void loadTeacherAnalytics(user.id);
    }
  }, [user?.role, user?.id, selectedTeacherClassId, loadTeacherHomeworks, loadTeacherAnalytics]);

  useEffect(() => {
    if (user?.role === "teacher" && currentTab === "question_bank") {
      void loadGradesList(user.id);
      void loadQuestionBankQuestions(user.id);
    }
  }, [currentTab, user?.role, user?.id, loadGradesList, loadQuestionBankQuestions]);

  useEffect(() => {
    if (user?.role === "teacher" && currentTab === "tools" && toolsActiveView === "uncertain_reviews") {
      void loadUncertainReviews(user.id);
    }
  }, [currentTab, toolsActiveView, user?.role, user?.id, loadUncertainReviews]);

  useEffect(() => {
    if (user?.role === "teacher" && qbGrade !== "") {
      void loadTopicsList(user.id, Number(qbGrade));
    } else if (user?.role === "teacher") {
      void loadTopicsList(user.id);
    }
    setQbTopicId("");
    setQbSkillsList([]);
    setQbSelectedSkills([]);
  }, [qbGrade, user?.role, user?.id, loadTopicsList]);

  useEffect(() => {
    if (user?.role === "teacher" && qbTopicId) {
      void loadSkillsList(user.id, qbTopicId);
    } else {
      setQbSkillsList([]);
    }
    setQbSelectedSkills([]);
  }, [qbTopicId, user?.role, user?.id, loadSkillsList]);

  useEffect(() => {
    if (studentUploadStep !== "loading") return;
    setStudentProgressPercent(8);
    const interval = setInterval(() => {
      setStudentProgressPercent((prev) => {
        if (prev >= 92) return prev;
        return Math.min(92, prev + (prev < 55 ? 7 : 3));
      });
    }, 260);
    return () => clearInterval(interval);
  }, [studentUploadStep]);

  async function handleCreateCustomTopic() {
    if (!user || !qbGrade || !customTopicName.trim()) return;
    setBusyAction("create-custom-topic");
    setError("");
    setNotice("");
    try {
      const topic = await createTopic(user.id, {
        grade: Number(qbGrade),
        name: customTopicName.trim(),
        subject: "mathematics"
      });
      setQbTopicsList(prev => [...prev, topic]);
      setQbTopicId(topic.id);
      setShowCustomTopicInput(false);
      setCustomTopicName("");
      setNotice("Yangi mavzu yaratildi!");
    } catch (caught) {
      if (isLocalhost) {
        const mockTopic = {
          id: "custom_" + Date.now(),
          grade: Number(qbGrade),
          name: customTopicName.trim(),
          subject: "mathematics",
          slug: customTopicName.toLowerCase().replace(/\s+/g, "_")
        };
        setQbTopicsList(prev => [...prev, mockTopic]);
        setQbTopicId(mockTopic.id);
        setShowCustomTopicInput(false);
        setCustomTopicName("");
        setNotice("Yangi mavzu yaratildi (Mock)!");
      } else {
        setError(getErrorMessage(caught));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleExtractQuestions(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!qbGrade || !qbTopicId) {
      setError("Iltimos, Sinf va Mavzuni tanlang.");
      return;
    }
    if (!qbTextContent.trim() && !qbFile) {
      setError("Iltimos, rasm yuklang yoki matn kiriting.");
      return;
    }

    setQbExtracting(true);
    setError("");
    setNotice("");
    setQbExtractedResult([]);

    const formData = new FormData();
    formData.append("subject_id", qbSubject);
    formData.append("grade", String(qbGrade));
    formData.append("topic_id", qbTopicId);
    if (qbTextContent.trim()) {
      formData.append("text_content", qbTextContent.trim());
    }
    if (qbFile) {
      formData.append("image", qbFile);
    }

    try {
      const data = await extractQuestions(user.id, formData);
      setQbExtractedResult(data.questions || []);
      setNotice("Savollar muvaffaqiyatli tahlil qilindi va saqlandi!");
      // Reset wizard inputs
      setQbTextContent("");
      setQbFile(null);
      // Refresh the main question list
      void loadQuestionBankQuestions(user.id);
    } catch (err) {
      if (isLocalhost) {
        const mockExtracted = [
          {
            id: "mock_e1_" + Date.now(),
            grade: Number(qbGrade),
            topic_id: qbTopicId,
            question_text: qbTextContent ? `Matn asosida savol: ${qbTextContent.substring(0, 30)}` : "Rasm asosidagi mock algebra savoli",
            question_type: "numeric",
            correct_answer: "12",
            difficulty: 2,
            status: "draft",
            solution_steps: ["1-qadam: Tenglamani soddalashtiring.", "2-qadam: Noma'lumni toping."],
            variant_allowed: true,
            variant_template: { template_type: "ax_plus_b_equals_c", parameters: { a: 1, b: 0, c: 12 } }
          },
          {
            id: "mock_e2_" + Date.now(),
            grade: Number(qbGrade),
            topic_id: qbTopicId,
            question_text: "Quyidagilardan qaysi biri to'g'ri kasr?",
            question_type: "multiple_choice",
            options: ["5/3", "3/4", "7/2", "9/5"],
            correct_option_index: 1,
            correct_answer: "3/4",
            difficulty: 1,
            status: "draft",
            solution_steps: ["Surati maxrajidan kichik bo'lgan kasr to'g'ri kasr deyiladi."],
            variant_allowed: false
          }
        ];
        setQbExtractedResult(mockExtracted);
        setQbQuestions(prev => [...mockExtracted, ...prev]);
        setNotice("Savollar tahlil qilindi (Mock rejim)!");
        setQbTextContent("");
        setQbFile(null);
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setQbExtracting(false);
    }
  }

  async function handleApproveQuestion(questionId: string) {
    if (!user) return;
    try {
      await updateQuestionStatus(user.id, questionId, "approved");
      setNotice("Savol tasdiqlandi!");
      void loadQuestionBankQuestions(user.id);
      // update extracted list if visible
      setQbExtractedResult(prev => prev.map(q => q.id === questionId ? { ...q, status: "approved" } : q));
    } catch (err) {
      if (isLocalhost) {
        setQbQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status: "approved" } : q));
        setQbExtractedResult(prev => prev.map(q => q.id === questionId ? { ...q, status: "approved" } : q));
        setNotice("Savol tasdiqlandi (Mock)!");
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  async function handleRejectQuestion(questionId: string) {
    if (!user) return;
    try {
      await updateQuestionStatus(user.id, questionId, "rejected");
      setNotice("Savol rad etildi.");
      void loadQuestionBankQuestions(user.id);
      setQbExtractedResult(prev => prev.map(q => q.id === questionId ? { ...q, status: "rejected" } : q));
    } catch (err) {
      if (isLocalhost) {
        setQbQuestions(prev => prev.map(q => q.id === questionId ? { ...q, status: "rejected" } : q));
        setQbExtractedResult(prev => prev.map(q => q.id === questionId ? { ...q, status: "rejected" } : q));
        setNotice("Savol rad etildi (Mock).");
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  async function handleArchiveQuestion(questionId: string) {
    if (!user) return;
    try {
      await updateQuestionStatus(user.id, questionId, "archived");
      setNotice("Savol arxivlandi.");
      void loadQuestionBankQuestions(user.id);
    } catch (err) {
      if (isLocalhost) {
        setQbQuestions(prev => prev.filter(q => q.id !== questionId));
        setNotice("Savol arxivlandi (Mock).");
      } else {
        setError(getErrorMessage(err));
      }
    }
  }

  async function handleApproveAllQuestions() {
    if (!user || !qbQuestions.length) return;
    const drafts = qbQuestions.filter(q => q.status === "draft");
    if (!drafts.length) return;
    
    setBusyAction("approve-all");
    setError("");
    setNotice("");
    try {
      await Promise.all(drafts.map(q => updateQuestionStatus(user.id, q.id, "approved")));
      setNotice("Barcha qoralamalar tasdiqlandi!");
      void loadQuestionBankQuestions(user.id);
    } catch (err) {
      if (isLocalhost) {
        setQbQuestions(prev => prev.map(q => q.status === "draft" ? { ...q, status: "approved" } : q));
        setNotice("Barcha qoralamalar tasdiqlandi (Mock)!");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApproveAllExtracted() {
    if (!user || !qbExtractedResult.length) return;
    const drafts = qbExtractedResult.filter(q => q.status === "draft");
    if (!drafts.length) return;
    
    setBusyAction("approve-all-extracted");
    setError("");
    setNotice("");
    try {
      await Promise.all(drafts.map(q => updateQuestionStatus(user.id, q.id, "approved")));
      setNotice("Barcha yangi aniqlangan savollar tasdiqlandi!");
      void loadQuestionBankQuestions(user.id);
      setQbExtractedResult(prev => prev.map(q => q.status === "draft" ? { ...q, status: "approved" } : q));
    } catch (err) {
      if (isLocalhost) {
        setQbQuestions(prev => prev.map(q => q.status === "draft" ? { ...q, status: "approved" } : q));
        setQbExtractedResult(prev => prev.map(q => q.status === "draft" ? { ...q, status: "approved" } : q));
        setNotice("Barcha yangi aniqlangan savollar tasdiqlandi (Mock)!");
      } else {
        setError(getErrorMessage(err));
      }
    } finally {
      setBusyAction(null);
    }
  }

  async function handleUpdateQuestion(event: FormEvent) {
    event.preventDefault();
    if (!user || !qbEditingQuestion) return;
    try {
      await updateQuestion(user.id, qbEditingQuestion.id, qbEditingQuestion);
      setNotice("Savol tahrirlandi!");
      setQbEditingQuestion(null);
      void loadQuestionBankQuestions(user.id);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  async function handleGenerateVariantTest() {
    if (!user || !qbTestingVariantId) return;
    setBusyAction("generate-variant");
    setQbVariantResult(null);
    try {
      const data = await generateVariant(user.id, qbTestingVariantId, qbVariantParams);
      setQbVariantResult(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyAction(null);
    }
  }

  function openProfileEditor() {
    setProfileDraft({ full_name: user?.full_name || "" });
    setProfileEditing(true);
  }

  async function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;

    const fullName = profileDraft.full_name.trim();
    if (fullName.length < 2) {
      setError("Ism va familiya juda qisqa.");
      return;
    }

    setBusyAction("profile-save");
    setError("");
    setNotice("");
    try {
      await updateProfile(user.id, { full_name: fullName });
      setUser({ ...user, full_name: fullName });
      setProfileEditing(false);
      setNotice("Profil ma'lumotlari yangilandi.");
    } catch (caught) {
      if (isLocalhost) {
        setUser({ ...user, full_name: fullName });
        setProfileEditing(false);
        setNotice("Profil ma'lumotlari lokal demo rejimida yangilandi.");
      } else {
        setError(getErrorMessage(caught));
      }
    } finally {
      setBusyAction(null);
    }
  }

  function clearStudentUploadFile() {
    if (studentUploadImage?.startsWith("blob:")) {
      URL.revokeObjectURL(studentUploadImage);
    }
    setStudentUploadFile(null);
    setStudentUploadImage(null);
  }

  function resetStudentNestedViews() {
    setStudentSelectedHomeworkId(null);
    setStudentSubmissionHomeworkId("");
    setStudentUploadStep("detail");
    setStudentWorkflowSubmission(null);
    setSubmitFileValue(null);
    clearStudentUploadFile();
  }

  function resetTeacherNestedViews() {
    setSelectedTeacherClassId("");
    setSelectedClassStudentId(null);
    setSelectedJournalStudentId(null);
    setTeacherStudentSearch("");
    setClassStudents([]);
    setClassSubTab("students");
    setActiveHomeworkId("");
    setTeacherSubmissionHomeworkId("");
    setToolsActiveView("home");
  }

  function navigateTo(tab: string) {
    if (user?.role === "student") {
      resetStudentNestedViews();
    }
    if (user?.role === "teacher") {
      resetTeacherNestedViews();
    }
    setCurrentTab(tab);
  }

  function resetRoleViews() {
    setCurrentTab("home");
    resetStudentNestedViews();
    resetTeacherNestedViews();
  }

  async function chooseRole(role: Role) {

    if (!user) return;
    if (user.role && user.role !== role) {
      setError("Rol allaqachon tanlangan. Teacher va student rejimlarini almashtirish yopilgan.");
      return;
    }
    setBusyAction(`role-${role}`);
    setError("");
    setNotice("");
    try {
      await updateRole(user.id, role);
      const nextUser = { ...user, role };
      setUser(nextUser);
      resetRoleViews();
      await loadDashboard(nextUser);
      setNotice(role === "teacher" ? "O'qituvchi rejimiga o'tildi." : "O'quvchi rejimiga o'tildi.");
    } catch (caught) {
      if (isLocalhost && !user.role) {
        const nextUser = { ...user, role };
        setUser(nextUser);
        resetRoleViews();
        await loadDashboard(nextUser);
        setNotice(`Rol muvaffaqiyatli ${role} ga tanlandi (Mock)`);
      } else {
        setError(getErrorMessage(caught));
      }
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

  async function handleSearchClass(event: FormEvent) {
    event.preventDefault();
    if (!user || !joinCode.trim()) return;
    setBusyAction("search-class");
    setError("");
    setNotice("");
    setClassSearchResult(null);
    try {
      const found = (await searchClassByCode(user.id, joinCode)) as ClassSearchResult;
      setClassSearchResult(found);
      setNotice(found.already_joined ? "Siz bu sinfga allaqachon qo'shilgansiz." : "Sinf topildi.");
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleJoinClass(event?: FormEvent, codeOverride?: string) {
    event?.preventDefault();
    const code = (codeOverride || joinCode).trim().toUpperCase();
    if (!user || !code) return;
    setBusyAction("join-class");
    setError("");
    setNotice("");
    try {
      await joinClass(user.id, code);
      setJoinCode("");
      setClassSearchResult(null);
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
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
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
      const analysis = await analyzeHomeworkSource(user.id, homeworkId, sourceFile, problemRange.trim());
      if (analysis?.ai_generated_answer_key) {
        setAnswerKeyDrafts((prev) => ({ ...prev, [homeworkId]: analysis.ai_generated_answer_key }));
      }
      setNotice("Rasm tahlil qilindi.");
      setSourceFile(null);

      const activeHomework = allTeacherHomeworks.find(h => h.id === homeworkId);
      const activeClassId = activeHomework?.class_id || activeHomework?.target_class_id || selectedClassId || selectedTeacherClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleApprove(homework: Homework) {
    const finalAnswerKey = answerKeyDrafts[homework.id] || homework.ai_generated_answer_key;
    if (!user || !finalAnswerKey) return;
    setBusyAction(`approve-${homework.id}`);
    setError("");
    setNotice("");
    try {
      await approveAnswerKey(user.id, homework.id, finalAnswerKey);
      setNotice("Javob kaliti tasdiqlandi.");

      const activeClassId = homework.class_id || homework.target_class_id || selectedClassId || selectedTeacherClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
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
      const activeHomework = allTeacherHomeworks.find(h => h.id === homeworkId) || homeworks.find(h => h.id === homeworkId);
      const publishClassId = publishClassByHomework[homeworkId] || activeHomework?.class_id || activeHomework?.target_class_id || selectedClassId || selectedTeacherClassId;
      if (!publishClassId) {
        throw new Error("Publish qilishdan oldin sinfni tanlang");
      }
      await publishHomework(user.id, homeworkId, publishClassId);
      setNotice("Vazifa o'quvchilarga yuborildi.");

      const activeClassId = publishClassId;
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCreateBankHomework(event: FormEvent) {
    event.preventDefault();
    if (!user || !homeworkForm.title.trim()) return;
    const activeClassId = bankCreateClassId || "";
    setBusyAction("create-bank-homework");
    setError("");
    setNotice("");
    try {
      const activeClass = classes.find((c) => c.id === activeClassId);
      await createHomework(
        user.id,
        activeClassId,
        homeworkForm.title.trim(),
        homeworkForm.description.trim(),
        activeClass?.subject || homeworkForm.subject || "Matematika",
      );
      setHomeworkForm({ title: "", description: "", subject: "Matematika" });
      setNotice(activeClassId ? "Vazifa bankda yaratildi va sinfga qoralama sifatida biriktirildi." : "Vazifa bankda qoralama sifatida yaratildi.");
      if (activeClassId) {
        await loadTeacherHomeworks(user.id, activeClassId);
      }
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAssignHomeworkBankItem(bankItemId: string, classId: string) {
    if (!user || !classId) return;
    setBusyAction(`assign-bank-${bankItemId}`);
    setError("");
    setNotice("");
    try {
      const result = await assignHomeworkBankItem(user.id, bankItemId, classId, false);
      setNotice(
        result?.status === "already_assigned"
          ? "Bu vazifa shu sinfga oldin biriktirilgan."
          : "Vazifa bankdan sinfga biriktirildi.",
      );
      await loadTeacherHomeworks(user.id, classId);
      const allHws = (await getTeacherHomeworks(user.id)) as Homework[];
      setAllTeacherHomeworks(allHws);
      await loadHomeworkBank(user.id);
      await loadTeacherAnalytics(user.id);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReviewUncertainProblem(item: UncertainReviewItem, decision: "correct" | "incorrect" | "unrelated") {
    if (!user) return;
    setBusyAction(`review-uncertain-${item.id}-${decision}`);
    setError("");
    setNotice("");
    const feedback =
      decision === "correct"
        ? "Teacher ko'rib chiqdi: javob to'g'ri."
        : decision === "incorrect"
          ? "Teacher ko'rib chiqdi: javob noto'g'ri."
          : "Teacher ko'rib chiqdi: bu boshqa masala yoki vazifaga tegishli emas.";
    try {
      await reviewUncertainProblem(user.id, item.submission_id, item.problem_index, decision, feedback);
      setUncertainReviews((prev) => prev.filter((review) => review.id !== item.id));
      setNotice("Shubhali javob ko'rib chiqildi va baho qayta hisoblandi.");
      await loadUncertainReviews(user.id);
      await loadTeacherAnalytics(user.id);
      if (selectedClassId) {
        await loadTeacherHomeworks(user.id, selectedClassId);
      }
    } catch (caught) {
      if (isLocalhost) {
        setUncertainReviews((prev) => prev.filter((review) => review.id !== item.id));
        setNotice("Shubhali javob ko'rib chiqildi (Mock).");
      } else {
        setError(getErrorMessage(caught));
      }
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
      const submitted = (await submitHomework(user.id, homeworkId, submitFileValue)) as Submission;
      setStudentSubmissionsByHomework((prev) => ({
        ...prev,
        [homeworkId]: [submitted, ...(prev[homeworkId] || [])],
      }));
      const list = (await getMySubmissions(user.id, homeworkId)) as Submission[];
      setStudentSubmissionHomeworkId(homeworkId);
      setStudentSubmissionsByHomework((prev) => ({ ...prev, [homeworkId]: sortSubmissions(list) }));
      setSubmitFileValue(null);
      setNotice(submitted.status === "needs_review" ? "Homework yuborildi. Shubhali masala ustoz review ro'yxatiga tushdi." : "Homework yuborildi va tekshirildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleStudentWorkflowSubmit(homeworkId: string) {
    if (!user || !studentUploadFile) return;
    setBusyAction(`submit-selected-${homeworkId}`);
    setError("");
    setNotice("");
    setStudentUploadStep("loading");
    setStudentProgressPercent(8);
    try {
      const submitted = (await submitHomework(user.id, homeworkId, studentUploadFile)) as Submission;
      setStudentWorkflowSubmission(submitted);
      setStudentSubmissionsByHomework((prev) => ({
        ...prev,
        [homeworkId]: [submitted, ...(prev[homeworkId] || [])],
      }));
      const list = (await getMySubmissions(user.id, homeworkId)) as Submission[];
      setStudentSubmissionsByHomework((prev) => ({ ...prev, [homeworkId]: sortSubmissions(list) }));
      clearStudentUploadFile();
      setStudentProgressPercent(100);
      setStudentUploadStep("result");
      setNotice(submitted.status === "needs_review" ? "Vazifa yuborildi. Shubhali masala ustozga ko'rib chiqish uchun yuborildi." : "Vazifa yuborildi va AI tomonidan tekshirildi.");
      await loadDashboard(user);
    } catch (caught) {
      setStudentUploadStep("upload");
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
      setStudentSubmissionsByHomework((prev) => ({ ...prev, [homeworkId]: sortSubmissions(list) }));
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  function findToolStudent(studentName: string) {
    return (
      classStudents.find((student) => student.full_name === studentName || student.name === studentName) ||
      teacherDashboard?.students?.find((student) => student.full_name === studentName)
    );
  }

  function findToolClass(className?: string) {
    return classes.find((item) => item.id === className || item.name === className) || classes.find((item) => item.id === selectedTeacherClassId);
  }

  async function handleCheckDiktant() {
    if (!user || !diktantImage || !diktantClassId || !diktantText.trim()) return;
    const activeClass = findToolClass(diktantClassId);
    const studentName = activeClass ? `${activeClass.name} sinfi` : "Sinf bo'yicha diktant";
    setDiktantStudent(studentName);
    setBusyAction("check-diktant");
    setError("");
    setNotice("");
    setDiktantStep(4);
    try {
      const result = await checkDiktant(user.id, {
        originalText: diktantText.trim(),
        studentName,
        classId: activeClass?.id,
        className: activeClass?.name,
        title: "Diktant",
        subject: "Ona tili",
        maxScore: 10,
        image: diktantImage,
      });
      setDiktantResult(result);
      setDiktantStep(5);
      setNotice("Diktant AI yordamida tekshirildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
      setDiktantStep(3);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckTestManual() {
    if (!user || !testStudent) return;
    const student = findToolStudent(testStudent);
    const activeClass = findToolClass(testClass);
    setBusyAction("check-test");
    setError("");
    setNotice("");
    try {
      const result = await checkTestManual(user.id, {
        title: testName,
        className: activeClass?.name || testClass,
        classId: activeClass?.id,
        studentName: testStudent,
        studentId: student?.id,
        subject: "Matematika",
        maxScore: testMaxScore,
        answerKey: testKeySaved,
        studentAnswers: testStudentAnswers,
      });
      setTestResult(result);
      setTestStep(5);
      setNotice("Test javoblari tekshirildi va bazaga yozildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckTestScan() {
    if (!user || !testStudent || !testImage) return;
    const student = findToolStudent(testStudent);
    const activeClass = findToolClass(testClass);
    setBusyAction("scan-test");
    setError("");
    setNotice("");
    setTestStep(6);
    try {
      const result = await checkTestScan(user.id, {
        title: testName,
        className: activeClass?.name || testClass,
        classId: activeClass?.id,
        studentName: testStudent,
        studentId: student?.id,
        subject: "Matematika",
        maxScore: testMaxScore,
        questionCount: testQuestionCount,
        answerKey: testKeySaved,
        image: testImage,
      });
      setTestResult(result);
      setTestStep(5);
      setNotice("Test rasmi o'qildi, tekshirildi va bazaga yozildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
      setTestStep(3);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckControlWork() {
    if (!user || !cwImage || !cwStudent || !cwAnswerKey) return;
    const student = findToolStudent(cwStudent);
    const activeClass = findToolClass(cwClass);
    setBusyAction("check-control-work");
    setError("");
    setNotice("");
    setCwStep(4);
    try {
      const result = await checkControlWork(user.id, {
        title: cwName,
        subject: cwSubject,
        studentName: cwStudent,
        studentId: student?.id,
        classId: activeClass?.id,
        className: activeClass?.name || cwClass,
        maxScore: cwMaxScore,
        answerKey: cwAnswerKey,
        image: cwImage,
      });
      setCwResult(result);
      setCwStep(5);
      setNotice("Nazorat ishi AI yordamida tekshirildi.");
      await loadDashboard(user);
    } catch (caught) {
      setError(getErrorMessage(caught));
      setCwStep(3);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleAnalyzeControlWorkBase() {
    if (!user || !cwBaseImage || !cwName.trim()) return;
    setBusyAction("analyze-control-base");
    setError("");
    setNotice("");
    try {
      const result = await analyzeControlWorkBase(user.id, {
        title: cwName.trim(),
        subject: cwSubject,
        problemRange: cwProblemRange.trim(),
        image: cwBaseImage,
      });
      setCwAnswerKey(result.answer_key);
      setNotice("Nazorat ishi base savollari tahlil qilindi. Javoblarni ko'rib chiqib tasdiqlang.");
    } catch (caught) {
      if (isLocalhost) {
        setCwAnswerKey({
          image_quality: "medium",
          general_notes: "Mock rejim: base savollar namuna sifatida shakllantirildi.",
          problems: [
            {
              problem_number: "1",
              problem_text: "2x^2 - 5x - 3 = 0 tenglamani yeching.",
              correct_answer: "x = -0.5; x = 3",
              solution_steps: ["D = (-5)^2 - 4 * 2 * (-3) = 49", "x = (5 +/- 7) / 4"],
              unreadable_parts: [],
              confidence: 0.9,
            },
          ],
        });
        setNotice("Nazorat ishi base savollari tayyorlandi (Mock).");
      } else {
        setError(getErrorMessage(caught));
      }
    } finally {
      setBusyAction(null);
    }
  }

  function seedLatestSubmissions(items: Homework[]) {
    const entries = items
      .filter((homework) => homework.latest_submission)
      .map((homework) => [homework.id, [homework.latest_submission as Submission] as Submission[]] as const);

    if (!entries.length) return;

    setStudentSubmissionsByHomework((prev) => {
      const next = { ...prev };
      entries.forEach(([homeworkId, submissions]) => {
        if (!next[homeworkId]?.length) {
          next[homeworkId] = submissions;
        }
      });
      return next;
    });
  }

  function sortSubmissions(items: Submission[]) {
    return [...items].sort((a, b) => (b.attempt_number ?? 0) - (a.attempt_number ?? 0));
  }

  function handleSourceFile(event: ChangeEvent<HTMLInputElement>) {
    setSourceFile(event.target.files?.[0] ?? null);
  }

  function handleSubmitFile(event: ChangeEvent<HTMLInputElement>) {
    setSubmitFileValue(event.target.files?.[0] ?? null);
  }

  function handleStudentUploadFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (studentUploadImage?.startsWith("blob:")) {
      URL.revokeObjectURL(studentUploadImage);
    }
    setStudentUploadFile(file);
    setStudentUploadImage(file ? URL.createObjectURL(file) : null);
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
                &gt;
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
                &gt;
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

        {user.role === "teacher" && ["home", "classes", "homeworks", "homework_bank", "tools", "add_wizard"].includes(currentTab) && renderTeacher()}
        {user.role === "teacher" && currentTab === "journal" && renderJournal()}
        {user.role === "student" && studentSelectedHomeworkId && ["home", "homeworks"].includes(currentTab) && renderStudent()}
        {user.role === "student" && !studentSelectedHomeworkId && ["home", "homeworks"].includes(currentTab) && renderStudent()}
        {user.role === "student" && !studentSelectedHomeworkId && currentTab === "practice" && renderPractice()}
        {user.role === "student" && !studentSelectedHomeworkId && currentTab === "tutor" && renderTutor()}
        {user.role === "student" && !studentSelectedHomeworkId && currentTab === "progress" && renderProgress()}
        {currentTab === "profile" && renderProfile()}
      </section>

      <nav className="bottom-nav">
        {user.role === "teacher" ? (
          <>
            <button className={`nav-item ${currentTab === "home" ? "active" : ""}`} onClick={() => navigateTo("home")}>
              <Home size={24} />
              <span>Bosh sahifa</span>
            </button>
            <button className={`nav-item ${currentTab === "classes" ? "active" : ""}`} onClick={() => navigateTo("classes")}>
              <UsersRound size={24} />
              <span>Sinflar</span>
            </button>
            <button className={`nav-item ${currentTab === "homework_bank" ? "active" : ""}`} onClick={() => navigateTo("homework_bank")}>
              <ClipboardList size={24} />
              <span>Bank</span>
            </button>
            <button className={`nav-item ${currentTab === "tools" ? "active" : ""}`} onClick={() => navigateTo("tools")}>
              <Wrench size={24} />
              <span>Vositalar</span>
            </button>
            <button className={`nav-item ${currentTab === "profile" ? "active" : ""}`} onClick={() => navigateTo("profile")}>
              <UserRound size={24} />
              <span>Profil</span>
            </button>
          </>
        ) : (
          <>
            <button className={`nav-item ${currentTab === "home" ? "active" : ""}`} onClick={() => navigateTo("home")}>
              <Home size={24} />
              <span>Bosh sahifa</span>
            </button>
            <button className={`nav-item ${currentTab === "homeworks" ? "active" : ""}`} onClick={() => navigateTo("homeworks")}>
              <BookOpen size={24} />
              <span>Vazifalar</span>
            </button>
            <button className={`nav-item ${currentTab === "practice" ? "active" : ""}`} onClick={() => navigateTo("practice")}>
              <PenTool size={24} />
              <span>Takrorlash</span>
            </button>
            <button className={`nav-item ${currentTab === "tutor" ? "active" : ""}`} onClick={() => navigateTo("tutor")}>
              <MessageCircle size={24} />
              <span>AI izoh</span>
            </button>
            <button className={`nav-item ${currentTab === "profile" ? "active" : ""}`} onClick={() => navigateTo("profile")}>
              <UserRound size={24} />
              <span>Profil</span>
            </button>
          </>
        )}
      </nav>
    </main>
  );

  function renderTeacher() {
    if (currentTab === "add_wizard") {
      return renderAddWizard();
    }
    if (currentTab === "tools") {
      return renderTeacherTools();
    }
    if (currentTab === "homework_bank") {
      return renderHomeworkBankPage();
    }
    if (currentTab === "classes") {
      if (selectedTeacherClassId) {
        const activeClass = classes.find(c => c.id === selectedTeacherClassId);
        const classHws = homeworks.filter(h => (h.class_id || h.target_class_id) === selectedTeacherClassId);
        const filteredClassStudents = classStudents.filter((student) =>
          (student.full_name || "").toLowerCase().includes(teacherStudentSearch.trim().toLowerCase()) ||
          (student.telegram_username || "").toLowerCase().includes(teacherStudentSearch.trim().toLowerCase())
        );
        const selectedClassStudent = classStudents.find((student) => student.id === selectedClassStudentId);

        return (
          <div className="animate-fade-in">
            <button
              className="btn btn-outline"
              onClick={() => {
                setSelectedTeacherClassId("");
                setSelectedClassStudentId(null);
                setTeacherStudentSearch("");
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
                onClick={() => {
                  setClassSubTab("students");
                  setSelectedClassStudentId(null);
                }}
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

            {classSubTab === "students" && (selectedClassStudent ? renderTeacherStudentProfile(selectedClassStudent, activeClass?.name) : (
              <div className="card" style={{ padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0 }}>O'quvchilar Ro'yxati</h3>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{classStudents.length} ta o'quvchi</span>
                </div>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <Search size={16} color="var(--text-muted)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    className="input-field"
                    value={teacherStudentSearch}
                    onChange={(event) => setTeacherStudentSearch(event.target.value)}
                    placeholder="Ism yoki username bo'yicha qidirish"
                    style={{ paddingLeft: "36px", margin: 0 }}
                  />
                </div>

                {classStudents.length > 0 && classStudents.filter(s => (s.average_score || 0) < 60).length > 0 && (
                  <div style={{ background: "rgba(239, 68, 68, 0.06)", border: "1px solid rgba(239, 68, 68, 0.15)", padding: "12px 14px", borderRadius: "12px", marginBottom: "16px" }}>
                    <h4 style={{ color: "var(--danger)", display: "flex", alignItems: "center", gap: "6px", margin: "0 0 8px", fontSize: "0.85rem", fontWeight: 800 }}>
                      <AlertCircle size={15} /> Diqqat talab qiladigan o'quvchilar (Qizil ro'yxat)
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {classStudents.filter(s => (s.average_score || 0) < 60).map(student => (
                        <div key={student.id} className="flex-between" style={{ padding: "8px 10px", background: "white", borderRadius: "8px", borderLeft: "4px solid var(--danger)", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.8rem", color: "var(--text-main)" }}>{student.full_name}</span>
                          <span className="badge" style={{ background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", fontWeight: 800, fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px" }}>
                            Natija: {student.average_score || 0}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {classStudentsLoading ? (
                  <div className="flex-center" style={{ padding: "2rem", color: "var(--text-muted)" }}>Yuklanmoqda...</div>
                ) : classStudents.length === 0 ? (
                  <div className="empty-state compact">Ushbu sinfda hali o'quvchilar yo'q.</div>
                ) : filteredClassStudents.length === 0 ? (
                  <div className="empty-state compact">Qidiruv bo'yicha o'quvchi topilmadi.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {filteredClassStudents.map((student) => {
                      const isLowPerformer = (student.average_score || 0) < 60;
                      return (
                        <div
                          key={student.id}
                          className="flex-between animate-fade-in"
                          onClick={() => setSelectedClassStudentId(student.id)}
                          style={{
                            padding: "10px",
                            background: isLowPerformer ? "rgba(239, 68, 68, 0.02)" : "var(--background)",
                            borderRadius: "12px",
                            border: isLowPerformer ? "1px solid rgba(239, 68, 68, 0.2)" : "1px solid var(--border)",
                            cursor: "pointer"
                          }}
                        >
                          <div className="flex-start" style={{ gap: "10px" }}>
                            <div style={{
                              width: "36px",
                              height: "36px",
                              borderRadius: "50%",
                              background: isLowPerformer ? "rgba(239, 68, 68, 0.1)" : "rgba(59, 130, 246, 0.1)",
                              color: isLowPerformer ? "var(--danger)" : "var(--primary)",
                              display: "grid",
                              placeItems: "center",
                              fontWeight: 700,
                              fontSize: "0.85rem"
                            }}>
                              {initials(student.full_name)}
                            </div>
                            <div>
                              <h4 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700 }}>
                                {student.full_name}
                                {isLowPerformer && <span style={{ marginLeft: "6px", color: "var(--danger)", fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.1)", padding: "1px 4px", borderRadius: "4px", fontWeight: 800 }}>FAOL E'TIBOR</span>}
                              </h4>
                              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                                {student.telegram_username ? `@${student.telegram_username}` : "Username yo'q"}
                              </p>
                            </div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.9rem", fontWeight: 800, color: isLowPerformer ? "var(--danger)" : "var(--secondary)" }}>
                              {student.average_score}%
                            </div>
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              {student.submission_count} ta topshirdi
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {classSubTab === "homeworks" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <form className="panel" onSubmit={handleCreateHomework} style={{ margin: 0 }}>
                  <div className="panel-title">
                    <FileCheck size={20} />
                    <h2>Yangi vazifa yuklash</h2>
                  </div>
                  <p style={{ margin: "-6px 0 12px", color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.45 }}>
                    Qoralama shu sinfda ochiladi va avtomatik vazifalar bankiga saqlanadi.
                  </p>
                  <label className="input-group">
                    <input
                      className="input-field"
                      value={homeworkForm.title}
                      onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
                      placeholder="Mavzu: Kvadrat tenglamalar"
                    />
                  </label>
                  <button className="btn btn-secondary" type="submit" disabled={isBusy || !homeworkForm.title.trim()}>
                    {busyAction === "create-homework" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Plus size={18} />}
                    {busyAction === "create-homework" ? "Qoralama ochilmoqda..." : "Qoralama ochish"}
                  </button>
                  {busyAction === "create-homework" ? renderSoftLoading("Qoralama yaratilmoqda", "Vazifa shu sinfga ulanib, bankka saqlanmoqda.") : null}
                </form>

                {renderHomeworkBankPicker(selectedTeacherClassId)}

                <div className="stack">
                  {classHws.map((homework) => renderTeacherHomework(homework))}
                  {classHws.length === 0 && (
                    <div className="empty-state compact">Ushbu sinfda hali vazifalar yaratilmagan.</div>
                  )}
                </div>
              </div>
            )}

            {classSubTab === "grades" && (
              renderClassGradeJournal(selectedTeacherClassId, classHws)
            )}
          </div>
        );
      }

      return (
        <div className="animate-fade-in">
          <div className="section-title flex-between" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem" }}>
            <h2 style={{ margin: 0 }}>Sinflarni boshqarish</h2>
            <button
              className="btn btn-primary"
              type="button"
              style={{ width: "36px", height: "36px", borderRadius: "50%", padding: 0, display: "grid", placeItems: "center", minWidth: "36px" }}
              onClick={() => setShowCreateClassForm(!showCreateClassForm)}
              title="Sinf yaratish"
            >
              <Plus size={20} />
            </button>
          </div>

          {showCreateClassForm && (
            <form className="panel animate-fade-in" onSubmit={(e) => { handleCreateClass(e); setShowCreateClassForm(false); }} style={{ marginBottom: "1.5rem" }}>
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
          )}

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
                  <h2>Yangi vazifa yuklash</h2>
                </div>
                <p style={{ margin: "-6px 0 12px", color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.45 }}>
                  Qoralama tanlangan sinfda ochiladi va avtomatik vazifalar bankiga saqlanadi.
                </p>
                <label className="input-group">
                  <input
                    className="input-field"
                    value={homeworkForm.title}
                    onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
                    placeholder="Mavzu: Kvadrat tenglamalar"
                  />
                </label>
                <button className="btn btn-secondary" type="submit" disabled={isBusy || !homeworkForm.title.trim()}>
                  {busyAction === "create-homework" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Plus size={18} />}
                  {busyAction === "create-homework" ? "Qoralama ochilmoqda..." : "Qoralama ochish"}
                </button>
                {busyAction === "create-homework" ? renderSoftLoading("Qoralama yaratilmoqda", "Vazifa tanlangan sinfga ulanib, bankka saqlanmoqda.") : null}
              </form>

              {renderHomeworkBankPicker(selectedClass.id)}

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
    const summary = teacherDashboard?.summary || { class_count: 6, published_homework_count: 12, submitted_student_count: 36, homework_count: 18 };

    return (
      <div className="animate-fade-in pb-20">
        <div style={{ marginBottom: "1.5rem", marginTop: "0.5rem" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
            Assalomu alaykum, {user?.full_name?.split(" ")[0] || "Ustoz"}!
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Bugun ajoyib dars bo'lsin!
          </p>
        </div>

        <div className="stat-grid" style={{ marginBottom: "2rem" }}>
          <div className="card" style={{ padding: "1.2rem", margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(59, 130, 246, 0.1)", padding: "6px", borderRadius: "8px", color: "var(--primary)" }}>
                <School size={18} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Sinflar soni</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{summary.class_count} <span style={{fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500}}>ta sinf</span></div>
          </div>
          <div className="card" style={{ padding: "1.2rem", margin: 0 }}>
             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(16, 185, 129, 0.1)", padding: "6px", borderRadius: "8px", color: "var(--secondary)" }}>
                <BookOpen size={18} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Faol uy vazifalar</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{summary.published_homework_count} <span style={{fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500}}>ta</span></div>
          </div>
          <div className="card" style={{ padding: "1.2rem", margin: 0 }}>
             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(139, 92, 246, 0.1)", padding: "6px", borderRadius: "8px", color: "#8b5cf6" }}>
                <CheckCircle size={18} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Bugun topshirdi</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{summary.submitted_student_count} <span style={{fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500}}>ta ish</span></div>
          </div>
          <div className="card" style={{ padding: "1.2rem", margin: 0 }}>
             <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <div style={{ background: "rgba(245, 158, 11, 0.1)", padding: "6px", borderRadius: "8px", color: "var(--warning)" }}>
                <Clock size={18} />
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Tekshirishni kutmoqda</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-main)" }}>{summary.homework_count} <span style={{fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500}}>ta ish</span></div>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>E'tibor talab qiladigan o'quvchilar (Qizil ro'yxat)</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.8rem" }}>
          <div className="card" style={{ background: "rgba(239, 68, 68, 0.05)", border: "1px solid rgba(239, 68, 68, 0.2)", padding: "1rem", margin: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div className="flex-between" style={{ padding: "8px 10px", background: "white", borderRadius: "10px", borderLeft: "4px solid var(--danger)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div className="flex-start" style={{ gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }}></div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Nodirbek Hasanov</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(8-A sinf)</span>
                </div>
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--danger)", fontWeight: 800, fontSize: "0.75rem" }}>
                  O'rtacha: 45%
                </span>
              </div>
              <div className="flex-between" style={{ padding: "8px 10px", background: "white", borderRadius: "10px", borderLeft: "4px solid var(--danger)", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                <div className="flex-start" style={{ gap: "8px" }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: "var(--danger)" }}></div>
                  <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Kamola Aliyeva</strong>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>(7-B sinf)</span>
                </div>
                <span className="badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--danger)", fontWeight: 800, fontSize: "0.75rem" }}>
                  O'rtacha: 52%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: 800, margin: 0, color: "var(--text-main)" }}>Sinflar va Yangi topshiriqlar</h3>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div className="card card-interactive" style={{ padding: "1rem", margin: 0, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} onClick={() => { navigateTo("classes"); setSelectedTeacherClassId(classes[0]?.id || ""); }}>
            <div className="flex-start" style={{ gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "grid", placeItems: "center" }}>
                <AlertCircle size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>9-A Matematika</h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>3 ta ish tekshirilmagan</p>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>

          <div className="card card-interactive" style={{ padding: "1rem", margin: 0, display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }} onClick={() => { navigateTo("classes"); setSelectedTeacherClassId(classes[1]?.id || ""); }}>
            <div className="flex-start" style={{ gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "10px", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
                <Bell size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "var(--text-main)" }}>7-B Fizika</h4>
                <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>12 ta yangi ish</p>
              </div>
            </div>
            <ChevronRight size={20} color="var(--text-muted)" />
          </div>
        </div>
      </div>
    );
  }

  function renderClassGradeJournal(classId: string, fallbackHomeworks: Homework[]) {
    const dashboardHomeworks = teacherDashboard?.homeworks.filter((hw) => hw.class_id === classId) || [];
    const dashboardStudents = teacherDashboard?.students.filter((s) => s.class_ids.includes(classId)) || [];
    const dashboardSubmissions = teacherDashboard?.submissions.filter((s) => s.class_id === classId) || [];
    const gradeHomeworks = dashboardHomeworks.length
      ? dashboardHomeworks
      : fallbackHomeworks.map((hw) => ({
          id: hw.id, title: hw.title, status: hw.status,
          student_count: classStudents.length, submitted_student_count: 0, average_percentage: 0,
        }));
    const gradeStudents = dashboardStudents.length
      ? dashboardStudents
      : classStudents.map((s) => ({
          id: s.id, full_name: s.full_name, telegram_username: s.telegram_username,
          assigned_homework_count: gradeHomeworks.filter((hw) => hw.status === 'published').length,
          submitted_homework_count: s.submission_count || 0,
          average_percentage: s.average_score || 0, last_submission_at: null,
        }));
    // Demo data for richer display
    const demoStudents = [
      { id: 's1', full_name: 'Saidov Asilbek',   avg: 92, delta: +0.4, rank: 1 },
      { id: 's2', full_name: 'Karimova Dilnoza',  avg: 88, delta: +0.2, rank: 2 },
      { id: 's3', full_name: 'Abdurahmonov Aziz', avg: 84, delta:  0.0, rank: 3 },
      { id: 's4', full_name: 'Mirzayeva Zarina',  avg: 82, delta: -0.1, rank: 4 },
      { id: 's5', full_name: 'Yusupov Behruz',    avg: 58, delta: -0.2, rank: 5 },
      { id: 's6', full_name: 'Tohirova Malika',   avg: 72, delta:  0.0, rank: 6 },
    ];
    const classAvg = 4.2;

    // Screen 8: individual student profile
    if (selectedJournalStudentId) {
      const ds = demoStudents.find((s) => s.id === selectedJournalStudentId) || demoStudents[0];
      const studentSubs = dashboardSubmissions.filter((s) => s.student_id === selectedJournalStudentId);
      const isLow = ds.avg < 60;
      const scoreColor = ds.avg >= 80 ? 'var(--green)' : ds.avg >= 60 ? 'var(--warning)' : 'var(--danger)';
      const gradeLabel = ds.avg >= 90 ? "A'lo" : ds.avg >= 75 ? 'Yaxshi' : ds.avg >= 60 ? "Qoniqarli" : "Past";
      return (
        <section className="grade-journal-panel">
          {/* Back header */}
          <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'1.2rem' }}>
            <button
              className="icon-btn"
              style={{ width:'34px', height:'34px', borderRadius:'50%', background:'var(--background)', border:'1px solid var(--border)', display:'grid', placeItems:'center', flexShrink:0 }}
              onClick={() => setSelectedJournalStudentId(null)}
            >
              <ArrowLeft size={16} />
            </button>
            <div style={{ flex:1 }}>
              <h3 style={{ margin:0, fontSize:'1rem', fontWeight:800 }}>{ds.full_name}</h3>
              <p style={{ margin:0, fontSize:'0.75rem', color:'var(--text-muted)' }}>8-A sinf</p>
            </div>
            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: isLow ? 'var(--danger)' : 'var(--primary)', display:'grid', placeItems:'center', fontWeight:800, fontSize:'0.8rem' }}>
              {initials(ds.full_name)}
            </div>
          </div>

          {/* Score card */}
          <div className="card" style={{ padding:'16px', marginBottom:'12px', border: isLow ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)' }}>
            <p style={{ margin:'0 0 4px', fontSize:'0.75rem', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase' }}>Umumiy natija</p>
            <div style={{ display:'flex', alignItems:'baseline', gap:'8px', marginBottom:'4px' }}>
              <span style={{ fontSize:'2.4rem', fontWeight:900, color: scoreColor }}>{(ds.avg / 20).toFixed(1)}</span>
              <span style={{ fontSize:'1rem', color:'var(--text-muted)', fontWeight:500 }}>/ 5.0</span>
              <span className={`badge ${ds.avg >= 80 ? 'badge-green' : ds.avg >= 60 ? 'badge-orange' : 'badge-red'}`} style={{ marginLeft:'4px', fontWeight:800 }}>{gradeLabel}</span>
            </div>
            <p style={{ margin:0, fontSize:'0.8rem', color: ds.delta >= 0 ? 'var(--green)' : 'var(--danger)', fontWeight:700 }}>
              O'sish: {ds.delta >= 0 ? '+' : ''}{ds.delta.toFixed(1)} (so'nggi 4 hafta)
            </p>
            {/* Mini sparkline */}
            <svg width="100%" height="40" viewBox="0 0 200 40" style={{ marginTop:'8px' }}>
              <polyline points="0,35 40,28 80,22 120,18 160,14 200,10" fill="none" stroke={scoreColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="200" cy="10" r="4" fill={scoreColor} />
            </svg>
          </div>

          {/* Strengths */}
          <div className="card" style={{ padding:'14px', marginBottom:'10px', border:'1px solid var(--border)' }}>
            <h4 style={{ margin:'0 0 10px', fontSize:'0.85rem', fontWeight:800, color:'var(--text-main)' }}>Kuchli tomonlari</h4>
            {['Algebraik ifodalar bilan ishlash', 'Tenglamalarni yechish', 'Mantiqiy fikrlash'].map((s) => (
              <div key={s} className="flex-start" style={{ gap:'8px', marginBottom:'6px', fontSize:'0.82rem', color:'var(--text-main)' }}>
                <CheckCircle size={15} color="var(--green)" style={{ flexShrink:0 }} /> {s}
              </div>
            ))}
          </div>

          {/* Needs attention */}
          <div className="card" style={{ padding:'14px', marginBottom:'10px', border:'1px solid rgba(245,158,11,0.2)', background:'rgba(245,158,11,0.02)' }}>
            <h4 style={{ margin:'0 0 10px', fontSize:'0.85rem', fontWeight:800, color:'var(--warning)' }}>E'tibor talab qiladigan sohalar</h4>
            {['Geometrik masalalar', 'Matnli masalalar'].map((s) => (
              <div key={s} className="flex-start" style={{ gap:'8px', marginBottom:'6px', fontSize:'0.82rem', color:'var(--text-main)' }}>
                <AlertCircle size={15} color="var(--warning)" style={{ flexShrink:0 }} /> {s}
              </div>
            ))}
          </div>

          {/* Common mistakes */}
          <div className="card" style={{ padding:'14px', marginBottom:'10px', border:'1px solid rgba(239,68,68,0.15)', background:'rgba(239,68,68,0.02)' }}>
            <h4 style={{ margin:'0 0 10px', fontSize:'0.85rem', fontWeight:800, color:'var(--danger)' }}>Ko'p uchraydigan xatolar</h4>
            {["Belgilarga e'tibor bermaslik (-, +)", 'Hisoblashda adashish'].map((s) => (
              <div key={s} className="flex-start" style={{ gap:'8px', marginBottom:'6px', fontSize:'0.82rem', color:'var(--text-main)' }}>
                <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:'var(--danger)', flexShrink:0 }} />{s}
              </div>
            ))}
          </div>

          {/* Per-homework results */}
          {gradeHomeworks.length > 0 && (
            <div className="card" style={{ padding:'14px', marginBottom:'14px', border:'1px solid var(--border)' }}>
              <h4 style={{ margin:'0 0 10px', fontSize:'0.85rem', fontWeight:800, color:'var(--text-main)' }}>Vazifalar bo'yicha natijalar</h4>
              <div className="grade-chip-grid">
                {gradeHomeworks.map((hw) => {
                  const sub = latestSubmission(studentSubs.filter((s) => s.homework_id === hw.id));
                  const low = sub && (sub.percentage ?? 0) < 60;
                  return (
                    <span key={hw.id} className={`grade-chip ${sub ? 'done' : 'pending'}`}
                      style={low ? { border:'1px solid rgba(239,68,68,0.3)', background:'rgba(239,68,68,0.08)', color:'var(--danger)' } : undefined}>
                      <small>{hw.title}</small>
                      <strong style={low ? { color:'var(--danger)' } : undefined}>
                        {sub ? scoreText(sub) : 'Kutilmoqda'}
                      </strong>
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI feedback */}
          <div className="card" style={{ padding:'14px', marginBottom:'14px', border:'1px solid rgba(59,130,246,0.15)', background:'rgba(59,130,246,0.02)' }}>
            <h4 style={{ margin:'0 0 8px', fontSize:'0.85rem', fontWeight:800, color:'var(--primary)', display:'flex', alignItems:'center', gap:'6px' }}>
              <MessageCircle size={14} /> AI umumiy fikri
            </h4>
            <p style={{ margin:0, fontSize:'0.82rem', color:'var(--text-main)', lineHeight:1.5 }}>
              {ds.full_name} {ds.avg >= 80
                ? "darsni a'lo darajada o'zlashtirmoqda. Algebraik ifodalar va tenglamalarni yechishda kuchli. Geometrik masalalarga biroz ko'proq e'tibor berish tavsiya etiladi."
                : "ba'zi mavzularda qiynalmoqda. Belgilar bilan ishlash va hisoblash aniqligiga alohida e'tibor qaratish zarur. Qo'shimcha mashqlar tavsiya etiladi."}
            </p>
          </div>

          {/* CTA */}
          <button className="btn btn-primary" style={{ width:'100%', justifyContent:'center', fontWeight:800, padding:'0.75rem' }}>
            Qo'shimcha mashqlar berish
          </button>
        </section>
      );
    }

    // Screen 7: journal list
    if (classStudentsLoading || dashboardLoading) {
      return (
        <section className="grade-journal-panel">
          <div className="dashboard-loading" style={{ margin:0 }}>
            <RefreshCcw size={18} style={{ animation:'spin 1.2s linear infinite' }} />
            <span>Baholar yangilanmoqda...</span>
          </div>
        </section>
      );
    }
    const classAverage = gradeStudents.length
      ? gradeStudents.reduce((sum, s) => sum + (s.average_percentage || 0), 0) / gradeStudents.length
      : 0;
    const publishedCount = gradeHomeworks.filter((hw) => hw.status === 'published').length;
    return (
      <section className="grade-journal-panel">
        {/* Header */}
        <div className="flex-between" style={{ marginBottom:'1rem' }}>
          <div>
            <h4 style={{ margin:0, fontSize:'1rem', fontWeight:800, color:'var(--text-main)' }}>Baholar jurnali</h4>
            <p style={{ margin:0, fontSize:'0.75rem', color:'var(--text-muted)' }}>O'quvchilar natijalari va AI tahlili</p>
          </div>
          <button className="text-btn" type="button" disabled={!user || dashboardLoading}
            onClick={() => user && void loadTeacherAnalytics(user.id)}>
            Yangilash
          </button>
        </div>

        {/* Summary row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px', marginBottom:'14px' }}>
          <div style={{ background:'var(--background)', padding:'10px 12px', borderRadius:'12px', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:'1.2rem', fontWeight:900, color:'var(--primary)' }}>{demoStudents.length}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>O'quvchi</div>
          </div>
          <div style={{ background:'var(--background)', padding:'10px 12px', borderRadius:'12px', border:'1px solid var(--border)', textAlign:'center' }}>
            <div style={{ fontSize:'1.2rem', fontWeight:900, color:'var(--secondary)' }}>
              {(classAverage ? classAverage / 20 : classAvg).toFixed(1)}
            </div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>O'rtacha ball</div>
          </div>
          <div style={{ background:'rgba(16,185,129,0.06)', padding:'10px 12px', borderRadius:'12px', border:'1px solid rgba(16,185,129,0.15)', textAlign:'center' }}>
            <div style={{ fontSize:'1.1rem', fontWeight:900, color:'var(--green)' }}>{publishedCount}</div>
            <div style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>Faol vazifa</div>
          </div>
        </div>

        {/* Red flag alert */}
        {demoStudents.filter((s) => s.avg < 60).length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.18)', padding:'10px 12px', borderRadius:'12px', marginBottom:'12px' }}>
            <h5 style={{ color:'var(--danger)', display:'flex', alignItems:'center', gap:'5px', margin:'0 0 6px', fontSize:'0.8rem', fontWeight:800 }}>
              <AlertCircle size={13} /> Diqqat - {demoStudents.filter((s) => s.avg < 60).length} ta past o'quvchi
            </h5>
            {demoStudents.filter((s) => s.avg < 60).map((s) => (
              <div key={s.id} className="flex-between" style={{ padding:'6px 8px', background:'white', borderRadius:'8px', borderLeft:'3px solid var(--danger)', marginBottom:'4px', cursor:'pointer' }}
                onClick={() => setSelectedJournalStudentId(s.id)}>
                <span style={{ fontWeight:700, fontSize:'0.78rem' }}>{s.full_name}</span>
                <span style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--danger)' }}>{(s.avg/20).toFixed(1)}/5.0</span>
              </div>
            ))}
          </div>
        )}

        {/* Column headers */}
        <div style={{ display:'grid', gridTemplateColumns:'24px 1fr 70px 60px', gap:'6px', padding:'0 4px', marginBottom:'6px' }}>
          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>#</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700 }}>O'quvchi</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700, textAlign:'center' }}>O'rtacha ball</span>
          <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:700, textAlign:'center' }}>Dinamika</span>
        </div>

        {/* Student rows */}
        <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
          {demoStudents.map((s) => {
            const isLow = s.avg < 60;
            const scoreVal = (s.avg / 20).toFixed(1);
            const scoreColor = s.avg >= 80 ? 'var(--green)' : s.avg >= 60 ? 'var(--text-main)' : 'var(--danger)';
            return (
              <div key={s.id}
                onClick={() => setSelectedJournalStudentId(s.id)}
                style={{
                  display:'grid', gridTemplateColumns:'24px 1fr 70px 60px', gap:'6px', alignItems:'center',
                  padding:'10px 12px', borderRadius:'12px', cursor:'pointer',
                  background: isLow ? 'rgba(239,68,68,0.03)' : 'white',
                  border: isLow ? '1px solid rgba(239,68,68,0.2)' : '1px solid var(--border)',
                  transition:'box-shadow 0.15s'
                }}
              >
                <span style={{ fontSize:'0.75rem', fontWeight:800, color:'var(--text-muted)' }}>{s.rank}</span>
                <div className="flex-start" style={{ gap:'8px', minWidth:0 }}>
                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', background: isLow ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)', color: isLow ? 'var(--danger)' : 'var(--primary)', display:'grid', placeItems:'center', fontWeight:800, fontSize:'0.7rem', flexShrink:0 }}>
                    {initials(s.full_name)}
                  </div>
                  <span style={{ fontWeight:700, fontSize:'0.82rem', color:'var(--text-main)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.full_name}</span>
                </div>
                <span style={{ fontWeight:900, fontSize:'0.9rem', color:scoreColor, textAlign:'center' }}>{scoreVal}</span>
                <span style={{ fontWeight:800, fontSize:'0.8rem', color: s.delta > 0 ? 'var(--green)' : s.delta < 0 ? 'var(--danger)' : 'var(--text-muted)', textAlign:'center' }}>
                  {s.delta > 0 ? `+${s.delta.toFixed(1)}` : s.delta < 0 ? s.delta.toFixed(1) : '0.0'}
                </span>
              </div>
            );
          })}
        </div>

        {(!demoStudents.length) && (
          <div className="empty-state compact">Sinfda hali o'quvchilar yo'q.</div>
        )}
      </section>
    );
  }

  function renderHomeworkBankPage() {
    const readyCount = homeworkBank.filter((item) => item.answer_key_approved).length;
    const assignmentCount = homeworkBank.reduce((sum, item) => sum + (item.assignment_count || 0), 0);
    const classNameById = new Map(classes.map((item) => [item.id, item.name]));

    return (
      <div className="animate-fade-in pb-20">
        <div className="flex-between" style={{ marginBottom: "1.2rem", alignItems: "flex-start" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 900, color: "var(--text-main)" }}>Vazifalar banki</h2>
            <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
              Bir marta tayyorlangan vazifani boshqa sinflarga qayta biriktiring.
            </p>
          </div>
          <button
            className="icon-btn"
            type="button"
            disabled={!user || homeworkBankLoading}
            onClick={() => user && void loadHomeworkBank(user.id)}
            title="Bankni yangilash"
          >
            <RefreshCcw size={17} style={homeworkBankLoading ? { animation: "spin 1.2s linear infinite" } : undefined} />
          </button>
        </div>

        <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "14px" }}>
          <div className="card" style={{ padding: "12px", margin: 0, textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary)" }}>{homeworkBank.length}</div>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 800 }}>Vazifa</span>
          </div>
          <div className="card" style={{ padding: "12px", margin: 0, textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--secondary)" }}>{readyCount}</div>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 800 }}>Tayyor</span>
          </div>
          <div className="card" style={{ padding: "12px", margin: 0, textAlign: "center" }}>
            <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--warning)" }}>{assignmentCount}</div>
            <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 800 }}>Biriktirish</span>
          </div>
        </div>

        <form className="card" onSubmit={handleCreateBankHomework} style={{ padding: "14px", marginBottom: "14px", border: "1px solid rgba(59,130,246,0.16)", background: "rgba(59,130,246,0.03)" }}>
          <div className="flex-start" style={{ gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: 38, height: 38, borderRadius: "10px", background: "rgba(59,130,246,0.1)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Plus size={19} />
            </div>
            <div>
              <strong style={{ display: "block", fontSize: "0.9rem" }}>Bankdan yangi vazifa yaratish</strong>
              <span style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.35 }}>Qoralama bankda saqlanadi, tanlangan sinfga ham biriktiriladi.</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: "8px" }}>
            <input
              className="input-field"
              placeholder="Vazifa nomi"
              value={homeworkForm.title}
              onChange={(event) => setHomeworkForm({ ...homeworkForm, title: event.target.value })}
            />
            <textarea
              className="input-field"
              rows={2}
              style={{ resize: "none" }}
              placeholder="Qisqa tavsif"
              value={homeworkForm.description}
              onChange={(event) => setHomeworkForm({ ...homeworkForm, description: event.target.value })}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              <select className="input-field" value={bankCreateClassId} onChange={(event) => setBankCreateClassId(event.target.value)}>
                <option value="">Faqat bankda saqlash</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</option>
                ))}
              </select>
              <select className="input-field" value={homeworkForm.subject} onChange={(event) => setHomeworkForm({ ...homeworkForm, subject: event.target.value })}>
                <option value="Matematika">Matematika</option>
                <option value="Fizika">Fizika</option>
                <option value="Ona tili">Ona tili</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit" disabled={isBusy || !homeworkForm.title.trim()}>
              {busyAction === "create-bank-homework" ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Plus size={17} />}
              {busyAction === "create-bank-homework" ? "Yaratilmoqda..." : "Qoralama yaratish"}
            </button>
            {busyAction === "create-bank-homework" ? renderSoftLoading("Vazifa yaratilmoqda", "Qoralama bankka saqlanib, kerak bo'lsa sinfga biriktirilmoqda.") : null}
          </div>
        </form>

        {homeworkBankLoading ? (
          renderSoftLoading("Vazifalar banki yuklanmoqda", "Saqlangan qoralamalar va biriktirilgan sinflar tekshirilmoqda.")
        ) : homeworkBank.length === 0 ? (
          <div className="empty-state">Bankda hali vazifa yo'q.</div>
        ) : (
          <section className="stack">
            {homeworkBank.map((item) => {
              const assignedClassIds = item.assigned_class_ids || [];
              const availableClasses = classes.filter((cls) => !assignedClassIds.includes(cls.id));
              const selectedClassForItem = bankAssignClassByItem[item.id] || availableClasses[0]?.id || "";
              const isAssigning = busyAction === `assign-bank-${item.id}`;
              const status = item.workflow_status || item.status;

              return (
                <article className="card homework-card" key={item.id}>
                  <div className="card-head">
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.subject || "Fan"} - {item.assignment_count || 0} ta sinfga biriktirilgan</p>
                    </div>
                    <span className={`badge ${statusBadge(status)}`}>{statusLabel(status)}</span>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "12px" }}>
                    {assignedClassIds.length ? assignedClassIds.map((classId) => (
                      <span key={classId} className="badge badge-blue" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>
                        {classNameById.get(classId) || "Sinf"}
                      </span>
                    )) : (
                      <span className="badge badge-orange" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>Hali sinfga biriktirilmagan</span>
                    )}
                    {item.answer_key_approved ? (
                      <span className="badge badge-green" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>Javob kaliti tayyor</span>
                    ) : (
                      <span className="badge badge-orange" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>Tasdiq kutilmoqda</span>
                    )}
                  </div>

                  <div style={{ display: "grid", gap: "10px" }}>
                    <label className="input-group" style={{ margin: 0 }}>
                      <span className="input-label">Boshqa sinfga biriktirish</span>
                      <select
                        className="input-field"
                        value={selectedClassForItem}
                        onChange={(event) => setBankAssignClassByItem((prev) => ({ ...prev, [item.id]: event.target.value }))}
                        disabled={isBusy || availableClasses.length === 0}
                      >
                        {availableClasses.length === 0 ? (
                          <option value="">Hamma sinflarga biriktirilgan</option>
                        ) : availableClasses.map((cls) => (
                          <option key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="btn btn-secondary"
                      type="button"
                      disabled={isBusy || !selectedClassForItem}
                      onClick={() => void handleAssignHomeworkBankItem(item.id, selectedClassForItem)}
                    >
                      {isAssigning ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Plus size={17} />}
                      {isAssigning ? "Biriktirilmoqda..." : "Sinfga biriktirish"}
                    </button>
                    {isAssigning ? renderSoftLoading("Vazifa biriktirilmoqda", "Bankdagi vazifa tanlangan sinfga qoralama sifatida ulanmoqda.") : null}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  function renderHomeworkBankPicker(activeClassId: string) {
    if (!activeClassId) return null;

    const activeClass = classes.find((item) => item.id === activeClassId);
    const assignedBankIds = new Set(
      allTeacherHomeworks
        .filter((homework) => (homework.class_id || homework.target_class_id) === activeClassId)
        .map((homework) => homework.bank_item_id)
        .filter(Boolean) as string[],
    );
    const bankItems = [...homeworkBank].sort((a, b) => {
      const aMatchesSubject = a.subject === activeClass?.subject ? 1 : 0;
      const bMatchesSubject = b.subject === activeClass?.subject ? 1 : 0;
      return bMatchesSubject - aMatchesSubject || (b.assignment_count || 0) - (a.assignment_count || 0);
    });

    return (
      <section className="panel" style={{ margin: 0 }}>
        <div className="panel-title">
          <BookOpen size={20} />
          <h2>Vazifalar banki</h2>
        </div>
        <p style={{ margin: "-6px 0 12px", color: "var(--text-muted)", fontSize: "0.82rem", lineHeight: 1.45 }}>
          Yaratilgan har bir vazifa bankda saqlanadi va keyin boshqa sinflarga ham biriktiriladi.
        </p>

        {homeworkBankLoading ? (
          renderSoftLoading("Bank yuklanmoqda", "Saqlangan vazifalar va sinf biriktirishlari olinmoqda.")
        ) : bankItems.length === 0 ? (
          <div className="empty-state compact">Bankda hali vazifa yo'q. Avval qoralama oching.</div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {bankItems.map((item) => {
              const assigned = assignedBankIds.has(item.id) || (item.assigned_class_ids || []).includes(activeClassId);
              const isAssigning = busyAction === `assign-bank-${item.id}`;
              const status = item.workflow_status || item.status;
              return (
                <div
                  key={item.id}
                  style={{
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px",
                    background: assigned ? "rgba(16,185,129,0.04)" : "white",
                  }}
                >
                  <div className="flex-between" style={{ gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="flex-start" style={{ gap: "6px", marginBottom: "4px", flexWrap: "wrap" }}>
                        <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{item.title}</strong>
                        <span className={`badge ${statusBadge(status)}`} style={{ fontSize: "0.68rem", padding: "2px 7px" }}>
                          {statusLabel(status)}
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                        {item.subject || "Fan"} - {item.assignment_count || 0} ta sinfga biriktirilgan
                        {item.answer_key_approved ? " - javob kaliti tayyor" : " - hali tasdiqlanmagan"}
                      </p>
                    </div>
                    <button
                      className="btn btn-outline"
                      type="button"
                      disabled={isBusy || assigned}
                      onClick={() => void handleAssignHomeworkBankItem(item.id, activeClassId)}
                      style={{ width: "auto", minWidth: "118px", padding: "0.55rem 0.7rem", fontSize: "0.78rem" }}
                    >
                      {isAssigning ? <RefreshCcw size={16} style={{ animation: "spin 1.2s linear infinite" }} /> : assigned ? <Check size={16} /> : <Plus size={16} />}
                      {isAssigning ? "Kutilmoqda..." : assigned ? "Biriktirilgan" : "Biriktirish"}
                    </button>
                  </div>
                  {isAssigning ? renderSoftLoading("Vazifa biriktirilmoqda", "Bankdagi vazifa shu sinfga qoralama sifatida ulanmoqda.") : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderTeacherHomework(homework: Homework) {
    const answerKey = answerKeyDrafts[homework.id] || homework.ai_generated_answer_key || homework.approved_answer_key;
    const problems = answerKey?.problems ?? [];
    const isActive = activeHomeworkId === homework.id;
    const showingSubmissions = teacherSubmissionHomeworkId === homework.id;
    const isAnalyzing = busyAction === `analyze-${homework.id}`;
    const isApproving = busyAction === `approve-${homework.id}`;
    const isPublishing = busyAction === `publish-${homework.id}`;
    const selectedPublishClassId = publishClassByHomework[homework.id] || homework.class_id || homework.target_class_id || selectedClassId || selectedTeacherClassId || classes[0]?.id || "";
    const updateDraftProblem = (problemIndex: number, field: keyof AnswerProblem, value: string) => {
      const baseKey = answerKey || { image_quality: "medium", general_notes: "", problems: [] };
      const nextProblems = [...(baseKey.problems || [])];
      nextProblems[problemIndex] = { ...(nextProblems[problemIndex] || {}), [field]: value };
      setAnswerKeyDrafts((prev) => ({
        ...prev,
        [homework.id]: { ...baseKey, problems: nextProblems },
      }));
    };

    return (
      <article className="card homework-card" key={homework.id}>
        <div className="card-head">
          <div>
            <h3>{homework.title}</h3>
            <p>
              {homework.description || homework.subject}
              {homework.target_class_name && !homework.class_id ? ` - ${homework.target_class_name} uchun draft` : ""}
            </p>
          </div>
          <span className={`badge ${statusBadge(homework.workflow_status || homework.status)}`}>
            {statusLabel(homework.workflow_status || homework.status)}
          </span>
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
              {isAnalyzing ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Camera size={18} />}
              {isAnalyzing ? "AI tahlil qilmoqda..." : "AI bilan yechish"}
            </button>
            {isAnalyzing ? renderSoftLoading("AI darslik rasmini tahlil qilmoqda", "Masalalar ajratilmoqda, yechim va javob kaliti tayyorlanmoqda.") : null}
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
                        display: "grid",
                        gridTemplateColumns: "64px 1fr",
                        gap: "8px",
                        padding: "8px 12px",
                        background: "var(--background)",
                        borderRadius: "8px",
                        border: "1px solid var(--border)"
                      }}
                    >
                      <input
                        className="input-field"
                        value={problem.problem_number || ""}
                        onChange={(event) => updateDraftProblem(index, "problem_number", event.target.value)}
                        placeholder={`${index + 1}`}
                        disabled={homework.answer_key_approved}
                        style={{ padding: "8px", textAlign: "center", fontWeight: 800, color: "var(--primary)" }}
                      />
                      <div style={{ display: "grid", gap: "6px" }}>
                        <input
                          className="input-field"
                          value={problem.problem_text || ""}
                          onChange={(event) => updateDraftProblem(index, "problem_text", event.target.value)}
                          placeholder="Masala matni"
                          disabled={homework.answer_key_approved}
                          style={{ padding: "8px", fontSize: "0.82rem" }}
                        />
                        <input
                          className="input-field"
                          value={problem.correct_answer || ""}
                          onChange={(event) => updateDraftProblem(index, "correct_answer", event.target.value)}
                          placeholder="To'g'ri javob"
                          disabled={homework.answer_key_approved}
                          style={{ padding: "8px", fontSize: "0.82rem", fontWeight: 800 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {!homework.answer_key_approved ? (
                  <button
                    className="btn btn-outline"
                    type="button"
                    disabled={!answerKey}
                    onClick={() => {
                      const baseKey = answerKey || { image_quality: "medium", general_notes: "", problems: [] };
                      setAnswerKeyDrafts((prev) => ({
                        ...prev,
                        [homework.id]: {
                          ...baseKey,
                          problems: [
                            ...(baseKey.problems || []),
                            { problem_number: `${(baseKey.problems || []).length + 1}`, problem_text: "", correct_answer: "", confidence: 1 },
                          ],
                        },
                      }));
                    }}
                    style={{ width: "100%", marginBottom: "10px" }}
                  >
                    <Plus size={16} /> Masala qo'shish
                  </button>
                ) : null}
                <label className="input-group" style={{ marginBottom: "10px" }}>
                  <span className="input-label">Sinfga biriktirish</span>
                  <select
                    className="input-field"
                    value={selectedPublishClassId}
                    onChange={(event) => setPublishClassByHomework((prev) => ({ ...prev, [homework.id]: event.target.value }))}
                    disabled={homework.status === "published"}
                  >
                    <option value="">Sinf tanlang</option>
                    {classes.map((item) => (
                      <option key={item.id} value={item.id}>{item.name} - {item.subject}</option>
                    ))}
                  </select>
                </label>
                <div className="action-row">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    disabled={isBusy || homework.answer_key_approved || !answerKey}
                    onClick={() => void handleApprove(homework)}
                  >
                    {isApproving ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Check size={17} />}
                    {isApproving ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
                  </button>
                  <button
                    className="btn btn-primary"
                    type="button"
                    disabled={isBusy || !homework.answer_key_approved || homework.status === "published" || !selectedPublishClassId}
                    onClick={() => void handlePublish(homework.id)}
                  >
                    {isPublishing ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Send size={17} />}
                    {isPublishing ? "Yuborilmoqda..." : "Publish"}
                  </button>
                </div>
                {isApproving ? renderSoftLoading("Javob kaliti tasdiqlanmoqda", "Tahrirlangan javoblar bank va sinf vazifasiga saqlanmoqda.") : null}
                {isPublishing ? renderSoftLoading("Vazifa o'quvchilarga yuborilmoqda", "Publish holati va sinf biriktirish ma'lumotlari yangilanmoqda.") : null}
              </div>
            ) : null}
          </section>
        ) : null}

        {showingSubmissions ? renderSubmissions(teacherSubmissions, "Hali topshirilgan ish yo'q.") : null}
      </article>
    );
  }

  function renderTeacherStudentProfile(student: any, className?: string) {
    const average = Math.round(student.average_score ?? student.average_percentage ?? 84);
    const trendRows = subjectGrowthRows();
    const isLow = average < 60;

    return (
      <div className="animate-fade-in" style={{ display: "grid", gap: "12px" }}>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() => setSelectedClassStudentId(null)}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
        >
          <ArrowLeft size={16} /> Ro'yxatga qaytish
        </button>

        <div className="card" style={{ padding: "16px", borderRadius: "14px", border: isLow ? "1px solid rgba(239,68,68,0.22)" : "1px solid var(--border)" }}>
          <div className="flex-start" style={{ gap: "12px" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: isLow ? "rgba(239,68,68,0.1)" : "rgba(59,130,246,0.1)", color: isLow ? "var(--danger)" : "var(--primary)", display: "grid", placeItems: "center", fontWeight: 900 }}>
              {initials(student.full_name || "O'quvchi")}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900, color: "var(--text-main)" }}>{student.full_name}</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.76rem", color: "var(--text-muted)" }}>
                {className || "Sinf"} {student.telegram_username ? `- @${student.telegram_username}` : ""}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <strong style={{ display: "block", fontSize: "1.25rem", color: isLow ? "var(--danger)" : "var(--secondary)" }}>{average}%</strong>
              <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700 }}>o'rtacha</span>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "16px", borderRadius: "14px" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, display: "flex", alignItems: "center", gap: "7px" }}>
            <TrendingUp size={17} color="var(--primary)" />
            Fanlar kesimida o'sish
          </h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {trendRows.map((row) => {
              const meta = getSubjectMeta(row.subject);
              return (
                <div key={row.subject} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", background: "white" }}>
                  <div className="flex-between" style={{ marginBottom: "6px" }}>
                    <div className="flex-start" style={{ gap: "8px" }}>
                      <span style={{ width: 30, height: 30, borderRadius: "8px", background: meta.bg, color: meta.color, display: "grid", placeItems: "center" }}>{meta.icon}</span>
                      <strong style={{ fontSize: "0.84rem" }}>{row.subject}</strong>
                    </div>
                    <span style={{ color: row.delta >= 0 ? "var(--secondary)" : "var(--danger)", fontSize: "0.78rem", fontWeight: 900 }}>
                      {row.delta >= 0 ? "+" : ""}{row.delta}%
                    </span>
                  </div>
                  {renderLineGraph(row.values, meta.color)}
                </div>
              );
            })}
          </div>
        </div>

        <div className="card" style={{ padding: "16px", borderRadius: "14px", border: "1px solid rgba(59,130,246,0.18)", background: "rgba(59,130,246,0.03)" }}>
          <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 900, color: "var(--primary)", display: "flex", alignItems: "center", gap: "7px" }}>
            <MessageCircle size={17} />
            AI feedback
          </h3>
          <p style={{ margin: 0, color: "var(--text-main)", fontSize: "0.82rem", lineHeight: 1.5 }}>
            {isLow
              ? "O'quvchi belgilar va hisoblash aniqligida qiynalayapti. Keyingi darsda 5-7 ta qisqa takrorlash misoli berish tavsiya etiladi."
              : "O'quvchining o'sishi barqaror. Murakkabroq masalalar va izohli yechimlarni ko'paytirish yaxshi natija beradi."}
          </p>
        </div>
      </div>
    );
  }

  function renderStudent() {
    // If a homework is selected, we render the submission workflow sub-steps!
    if (studentSelectedHomeworkId) {
      const demoHw = { id: 'demo-1', title: 'Kvadrat tenglamalar', subject: 'Matematika', description: '', deadline: '', status: 'published', student_status: 'pending', latest_score: null, class_id: '' };
      const activeHomework = homeworks.find(h => h.id === studentSelectedHomeworkId) || homeworks[0] || demoHw;
      
      // Screen 3: Homework Detail
      if (studentUploadStep === "detail") {
        return (
          <div className="animate-fade-in pb-20">
            <button
              className="btn btn-outline"
              onClick={() => setStudentSelectedHomeworkId(null)}
              style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1.2rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              <ArrowLeft size={16} /> Orqaga
            </button>

            <div className="card" style={{ padding: "1.5rem", borderRadius: "18px", border: "1px solid var(--border)", position: "relative" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <span className="badge badge-blue" style={{ fontSize: "0.75rem", textTransform: "uppercase", padding: "3px 10px", borderRadius: "20px", fontWeight: 800 }}>
                    {activeHomework.subject}
                  </span>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: "10px 0 6px", color: "var(--text-main)", letterSpacing: "-0.02em" }}>
                    {activeHomework.title}
                  </h2>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(59, 130, 246, 0.1)", display: "grid", placeItems: "center", color: "var(--primary)" }}>
                  <School size={22} />
                </div>
              </div>

              {/* Teacher info */}
              <div className="flex-start" style={{ gap: "10px", margin: "16px 0", padding: "10px", background: "var(--background)", borderRadius: "12px" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontWeight: 700, fontSize: "0.8rem" }}>
                  T
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Dilshod Nuraliyev</p>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Matematika o'qituvchisi</p>
                </div>
              </div>

              {/* Deadline */}
              <div className="flex-start" style={{ gap: "8px", color: "var(--warning)", background: "rgba(245, 158, 11, 0.08)", padding: "10px 12px", borderRadius: "10px", marginBottom: "1.2rem", border: "1px solid rgba(245, 158, 11, 0.15)" }}>
                <Clock size={16} />
                <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Muddati: 8 soat 45 daqiqa qoldi</span>
              </div>

              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 6px" }}>Topshiriq tavsifi:</h4>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4, margin: "0 0 16px" }}>
                {activeHomework.description || "Ushbu darsda kvadrat tenglamalarni diskriminant va Viyet teoremasi yordamida yechishni mustahkamlaymiz. Darslikdagi 15-20 mashqlarni daftarda yozib bajaring va rasmini yuklang."}
              </p>

              {/* Attachments */}
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 8px" }}>Biriktirilgan fayllar:</h4>
              <div className="flex-between" style={{ padding: "10px 12px", background: "white", borderRadius: "10px", border: "1px solid var(--border)", marginBottom: "1.5rem" }}>
                <div className="flex-start" style={{ gap: "8px" }}>
                  <FileText size={16} color="var(--primary)" />
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-main)" }}>Qo'shimcha_masalalar.pdf</span>
                </div>
                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>1.2 MB</span>
              </div>

              {/* Instructions */}
              <h4 style={{ fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)", margin: "0 0 8px" }}>Ko'rsatmalar:</h4>
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: "0 0 1.5rem", display: "flex", flexDirection: "column", gap: "8px" }}>
                <li className="flex-start" style={{ gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <CheckCircle size={15} color="var(--green)" /> Yechimlar to'liq yozilgan bo'lishi kerak
                </li>
                <li className="flex-start" style={{ gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <CheckCircle size={15} color="var(--primary)" /> Rasmlar aniq va yorug' joyda olingan bo'lishi kerak
                </li>
                <li className="flex-start" style={{ gap: "8px", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <CheckCircle size={15} color="var(--warning)" /> Diskriminant formulasini ko'rsating
                </li>
              </ul>

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.8rem" }}
                onClick={() => {
                  setStudentWorkflowSubmission(null);
                  clearStudentUploadFile();
                  setStudentUploadStep("upload");
                }}
              >
                Topshirishni boshlash
              </button>
            </div>
          </div>
        );
      }

      // Screen 4: Upload Homework Image
      if (studentUploadStep === "upload") {
        return (
          <div className="animate-fade-in pb-20">
            <button
              className="btn btn-outline"
              onClick={() => setStudentUploadStep("detail")}
              style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "1.2rem", padding: "0.5rem 1rem", fontSize: "0.85rem" }}
            >
              <ArrowLeft size={16} /> Orqaga
            </button>

            <div className="card" style={{ padding: "1.5rem", borderRadius: "18px", border: "1px solid var(--border)" }}>
              <h2 style={{ fontSize: "1.3rem", fontWeight: 800, margin: "0 0 4px", color: "var(--text-main)" }}>Yechimni yuklash</h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1.2rem" }}>Daftaringizdagi yechimlar rasmini aniq qilib yuklang</p>

              <label
                className="file-picker"
                style={{
                  minHeight: "116px",
                  border: "2px dashed var(--primary)",
                  background: "rgba(59,130,246,0.04)",
                  borderRadius: "16px",
                  marginBottom: "1.2rem",
                  flexDirection: "column",
                  justifyContent: "center",
                  textAlign: "center",
                  gap: "8px",
                }}
              >
                <Upload size={26} />
                <strong style={{ fontSize: "0.95rem", color: "var(--text-main)" }}>
                  {studentUploadFile?.name || "Rasm yuklash"}
                </strong>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                  Telefon kamera yoki galereya tanlovini o'zi chiqaradi.
                </span>
                <input accept="image/*" type="file" disabled={busyAction?.startsWith("submit-selected-")} onChange={handleStudentUploadFile} />
              </label>

              {/* Advice Checklist */}
              <div style={{ background: "var(--background)", padding: "12px 14px", borderRadius: "12px", marginBottom: "1.2rem" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.85rem", fontWeight: 800, color: "var(--text-main)" }}>Maslahat:</h4>
                <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <li className="flex-start" style={{ gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--primary)" }}></div> Daftar to'g'ri burchak ostida tutilgan
                  </li>
                  <li className="flex-start" style={{ gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--primary)" }}></div> Yozuvlar aniq va tushunarli
                  </li>
                  <li className="flex-start" style={{ gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                    <div style={{ width: "4px", height: "4px", borderRadius: "50%", background: "var(--primary)" }}></div> Barcha masalalar varoqda sig'gan
                  </li>
                </ul>
              </div>

              {/* Photo preview */}
              {studentUploadImage && (
                <div className="card" style={{ padding: "8px", position: "relative", marginBottom: "1.5rem", borderRadius: "12px", border: "1px solid var(--border)", background: "var(--background)" }}>
                  <img
                    src={studentUploadImage}
                    alt="Homework preview"
                    style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "8px" }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "8px", padding: "2px 6px" }}>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{studentUploadFile?.name || "yechim_rasmi.jpg"}</span>
                    <button className="text-btn" type="button" style={{ color: "var(--danger)", padding: 0, border: "none", fontSize: "0.8rem", fontWeight: 700 }} onClick={clearStudentUploadFile}>
                      Rasmni o'chirish
                    </button>
                  </div>
                </div>
              )}

              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.8rem" }}
                disabled={!studentUploadFile || busyAction?.startsWith("submit-selected-")}
                onClick={() => void handleStudentWorkflowSubmit(activeHomework.id)}
              >
                {busyAction === `submit-selected-${activeHomework.id}` ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Send size={18} />}
                {busyAction === `submit-selected-${activeHomework.id}` ? "Yuborilmoqda..." : "AI bilan tekshirish"}
              </button>
              {busyAction === `submit-selected-${activeHomework.id}` ? renderSoftLoading("Rasm yuborilmoqda", "AI tekshiruv boshlanishi uchun rasm backendga jo'natilmoqda.") : null}
            </div>
          </div>
        );
      }

      // Screen 5: AI Checking loading
      if (studentUploadStep === "loading") {
        return (
          <div className="animate-fade-in flex-center" style={{ flexDirection: "column", minHeight: "80vh", padding: "1.5rem" }}>
            {/* Circular Progress */}
            <div style={{ position: "relative", width: "120px", height: "120px", marginBottom: "2rem" }}>
              <svg width="120" height="120" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="60" cy="60" r="50" fill="transparent" stroke="var(--border)" strokeWidth="8" />
                <circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={2 * Math.PI * 50 * (1 - studentProgressPercent / 100)}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 0.15s ease-out" }}
                />
              </svg>
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.4rem", fontWeight: 900, color: "var(--text-main)" }}>
                {studentProgressPercent}%
              </div>
            </div>

            <h3 style={{ fontSize: "1.2rem", fontWeight: 800, margin: "0 0 8px", color: "var(--text-main)", textAlign: "center" }}>AI ishni tekshirmoqda</h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 2rem", textAlign: "center" }}>Barcha amallarni qayta tahlil qilish va baholash amalga oshirilmoqda...</p>

            {/* Checklist */}
            <div className="card" style={{ padding: "16px", width: "100%", maxWidth: "320px", display: "flex", flexDirection: "column", gap: "12px", border: "1px solid var(--border)" }}>
              <div className="flex-start" style={{ gap: "10px" }}>
                {studentProgressPercent > 25 ? (
                  <CheckCircle size={18} color="var(--green)" />
                ) : (
                  <RefreshCcw size={18} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
                )}
                <span style={{ fontSize: "0.85rem", fontWeight: studentProgressPercent > 25 ? 700 : 500, color: studentProgressPercent > 25 ? "var(--text-main)" : "var(--text-muted)" }}>
                  Rasmlar tahlil qilinmoqda
                </span>
              </div>
              <div className="flex-start" style={{ gap: "10px" }}>
                {studentProgressPercent > 50 ? (
                  <CheckCircle size={18} color="var(--green)" />
                ) : studentProgressPercent > 25 ? (
                  <RefreshCcw size={18} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid var(--border)" }}></div>
                )}
                <span style={{ fontSize: "0.85rem", fontWeight: studentProgressPercent > 50 ? 700 : 500, color: studentProgressPercent > 50 ? "var(--text-main)" : "var(--text-muted)" }}>
                  Matn aniqlanmoqda
                </span>
              </div>
              <div className="flex-start" style={{ gap: "10px" }}>
                {studentProgressPercent > 75 ? (
                  <CheckCircle size={18} color="var(--green)" />
                ) : studentProgressPercent > 50 ? (
                  <RefreshCcw size={18} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid var(--border)" }}></div>
                )}
                <span style={{ fontSize: "0.85rem", fontWeight: studentProgressPercent > 75 ? 700 : 500, color: studentProgressPercent > 75 ? "var(--text-main)" : "var(--text-muted)" }}>
                  Yechim tekshirilmoqda
                </span>
              </div>
              <div className="flex-start" style={{ gap: "10px" }}>
                {studentProgressPercent === 100 ? (
                  <CheckCircle size={18} color="var(--green)" />
                ) : studentProgressPercent > 75 ? (
                  <RefreshCcw size={18} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <div style={{ width: "18px", height: "18px", borderRadius: "50%", border: "2px solid var(--border)" }}></div>
                )}
                <span style={{ fontSize: "0.85rem", fontWeight: studentProgressPercent === 100 ? 700 : 500, color: studentProgressPercent === 100 ? "var(--text-main)" : "var(--text-muted)" }}>
                  Natija tayyorlanmoqda
                </span>
              </div>
            </div>
          </div>
        );
      }

      // Screen 6: Homework Result
      if (studentUploadStep === "result") {
        const latestStoredSubmission = (studentSubmissionsByHomework[activeHomework.id] || [])[0];
        const resultSubmission = studentWorkflowSubmission || activeHomework.latest_submission || latestStoredSubmission;
        const grading = resultSubmission?.grading_result;
        const resultProblems = grading?.problems || [];
        const maxScore = resultSubmission?.max_score ?? activeHomework.max_score ?? 10;
        const score = resultSubmission?.score ?? activeHomework.latest_score ?? 0;
        const percentage = resultSubmission?.percentage ?? activeHomework.latest_percentage ?? 0;
        const pendingReview = (grading?.uncertain_count ?? resultSubmission?.pending_review_count ?? 0) > 0;
        const gradeLabel = pendingReview ? "Teacher tekshiradi" : percentage >= 90 ? "A'lo" : percentage >= 75 ? "Yaxshi" : percentage >= 60 ? "Qoniqarli" : "Takrorlash kerak";
        const gradeBadge = pendingReview ? "badge-orange" : percentage >= 75 ? "badge-green" : percentage >= 60 ? "badge-orange" : "badge-red";
        const resultHeroTitle = pendingReview ? "Tekshirildi, lekin shubhali joy bor" : percentage >= 80 ? "Ajoyib!" : percentage >= 60 ? "Yaxshi urinish!" : "Tekshirildi";
        const resultHeroSubtitle = pendingReview
          ? "AI aniq o'qiy olmagan masalani ustoz ko'rib chiqadi. Baho keyin yangilanishi mumkin."
          : percentage >= 80
            ? "Vazifa muvaffaqiyatli tekshirildi."
            : percentage >= 60
              ? "Yaxshi ketayapsiz, endi xatolarni mustahkamlaymiz."
              : "Natija chiqdi. Xatolarni AI izoh bilan qayta ishlab chiqamiz.";
        const resultHeroBg = pendingReview
          ? "linear-gradient(135deg, #f59e0b, #d97706)"
          : percentage >= 80
          ? "linear-gradient(135deg, var(--secondary), #059669)"
          : percentage >= 60
            ? "linear-gradient(135deg, #f59e0b, #d97706)"
            : "linear-gradient(135deg, #2563eb, #1e40af)";
        const stars = Math.max(1, Math.min(5, Math.round((percentage || 0) / 20)));
        const issueRows = resultProblems.filter((problem) => problem.status && problem.status !== "correct").slice(0, 3);

        return (
          <div className="animate-fade-in pb-20">
            {/* Header Celebration */}
            <div className="card" style={{ padding: "22px", background: resultHeroBg, color: "white", textAlign: "center", border: "none", borderRadius: "18px", marginBottom: "16px", boxShadow: "0 14px 30px rgba(37,99,235,0.18)" }}>
              <Trophy size={42} color="#fbbf24" style={{ margin: "0 auto 10px", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.18))" }} />
              <h2 style={{ color: "white", fontSize: "1.45rem", fontWeight: 900, margin: "0 0 6px", textShadow: "0 1px 2px rgba(0,0,0,0.18)" }}>
                {resultHeroTitle}
              </h2>
              <p style={{ color: "rgba(255,255,255,0.94)", fontSize: "0.86rem", margin: 0, fontWeight: 700, lineHeight: 1.4 }}>
                {resultHeroSubtitle}
              </p>
            </div>

            {/* Score box */}
            <div className="card" style={{ padding: "18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{pendingReview ? "VAQTINCHA BAHO" : "BAHO"}</span>
                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-main)", display: "flex", alignItems: "baseline", gap: "4px" }}>
                  {score} <span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}>/ {maxScore}</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <span className={`badge ${gradeBadge}`} style={{ fontSize: "0.8rem", padding: "4px 12px", borderRadius: "20px", fontWeight: 800, marginBottom: "8px", display: "inline-block" }}>
                  {gradeLabel}
                </span>
                <div style={{ display: "flex", gap: "2px", color: "var(--warning)" }}>
                  {[1, 2, 3, 4, 5].map((item) => (
                    <Star key={item} size={16} fill={item <= stars ? "var(--warning)" : "none"} />
                  ))}
                </div>
              </div>
            </div>

            {/* Stats row */}
            <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div className="stat-card" style={{ border: "1px solid rgba(16, 185, 129, 0.2)", background: "rgba(16, 185, 129, 0.02)", padding: "10px", borderRadius: "12px", textAlign: "center" }}>
                <span className="badge badge-green" style={{ fontSize: "0.65rem", padding: "2px 6px", display: "inline-block", marginBottom: "4px" }}>To'g'ri</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--green)" }}>{grading?.correct_count ?? 0} ta</div>
              </div>
              <div className="stat-card" style={{ border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.02)", padding: "10px", borderRadius: "12px", textAlign: "center" }}>
                <span className="badge badge-red" style={{ fontSize: "0.65rem", padding: "2px 6px", display: "inline-block", marginBottom: "4px" }}>Xato</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--danger)" }}>{grading?.incorrect_count ?? 0} ta</div>
              </div>
              <div className="stat-card" style={{ border: "1px solid rgba(245, 158, 11, 0.2)", background: "rgba(245, 158, 11, 0.02)", padding: "10px", borderRadius: "12px", textAlign: "center" }}>
                <span className="badge badge-orange" style={{ fontSize: "0.65rem", padding: "2px 6px", display: "inline-block", marginBottom: "4px" }}>Aniq emas</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--warning)" }}>{(grading?.missing_count ?? 0) + (grading?.uncertain_count ?? 0)} ta</div>
              </div>
            </div>

            {pendingReview ? (
              <div className="card" style={{ padding: "12px", borderRadius: "12px", border: "1px solid rgba(245,158,11,0.2)", background: "rgba(245,158,11,0.06)", marginBottom: "16px" }}>
                <div className="flex-start" style={{ gap: "8px", alignItems: "flex-start" }}>
                  <AlertCircle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: "2px" }} />
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-main)", lineHeight: 1.45 }}>
                    Shubhali masalalarga hozircha ball qo'yilmadi. Ustoz ko'rib chiqqach, yakuniy natija avtomatik yangilanadi.
                  </p>
                </div>
              </div>
            ) : null}

            {/* Topic checklist */}
            <div className="card" style={{ padding: "16px", borderRadius: "16px", border: "1px solid var(--border)", marginBottom: "16px" }}>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 800, color: "var(--text-main)" }}>Qaysi mavzuda xatolaringiz bor?</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {issueRows.length ? issueRows.map((problem) => (
                  <div className="flex-between" key={`${problem.problem_number}-${problem.status}`} style={{ padding: "8px 12px", background: "var(--background)", borderRadius: "8px", gap: "10px" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{problem.errors?.[0]?.description || problem.feedback || `Masala ${problem.problem_number}`}</span>
                    <span className={problem.status === "missing" || problem.status === "uncertain" ? "badge badge-orange" : "badge badge-red"} style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                      {problem.status === "missing" ? "Tushib qolgan" : problem.status === "uncertain" ? "Aniq emas" : "Xato"}
                    </span>
                  </div>
                )) : (
                  <div className="empty-state compact">Aniq xato topilmadi. Shu ritmni ushlab turing!</div>
                )}
              </div>
            </div>

            {/* Detailed list */}
            <div className="card" style={{ padding: "16px", borderRadius: "16px", border: "1px solid var(--border)", marginBottom: "20px" }}>
              <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", fontWeight: 800, color: "var(--text-main)" }}>Batafsil ko'rib chiqish:</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {resultProblems.length ? resultProblems.map((problem) => {
                  const ok = problem.status === "correct";
                  const uncertain = problem.status === "missing" || problem.status === "uncertain";
                  const rowColor = ok ? "var(--green)" : uncertain ? "var(--warning)" : "var(--danger)";
                  return (
                    <div
                      key={`${problem.problem_number}-${problem.status}`}
                      style={{
                        padding: "10px",
                        background: ok ? "var(--background)" : uncertain ? "rgba(245, 158, 11, 0.04)" : "rgba(239, 68, 68, 0.02)",
                        borderRadius: "10px",
                        border: ok ? "none" : `1px solid ${uncertain ? "rgba(245,158,11,0.18)" : "rgba(239,68,68,0.15)"}`,
                        borderLeft: `4px solid ${rowColor}`,
                      }}
                    >
                      <div className="flex-start" style={{ gap: "6px", fontWeight: 700, fontSize: "0.85rem", color: rowColor, marginBottom: problem.feedback ? "4px" : 0 }}>
                        {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                        Masala #{problem.problem_number || "-"}: {ok ? "To'g'ri" : problem.status === "missing" ? "Tushib qolgan" : problem.status === "uncertain" ? "Aniq emas" : "Xato"}
                      </div>
                      {problem.feedback ? (
                        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                          {problem.feedback}
                        </p>
                      ) : null}
                      {problem.errors?.[0]?.suggestion ? (
                        <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--text-main)", lineHeight: 1.4 }}>
                          Tavsiya: {problem.errors[0].suggestion}
                        </p>
                      ) : null}
                    </div>
                  );
                }) : (
                  <div className="empty-state compact">AI batafsil problemalar ro'yxatini qaytarmadi.</div>
                )}
              </div>
            </div>

            {grading?.general_feedback ? (
              <div className="card" style={{ padding: "16px", borderRadius: "16px", border: "1px solid rgba(59,130,246,0.16)", background: "rgba(59,130,246,0.03)", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem", fontWeight: 800, color: "var(--primary)" }}>AI feedback</h4>
                <p style={{ margin: 0, fontSize: "0.84rem", color: "var(--text-main)", lineHeight: 1.5 }}>{grading.general_feedback}</p>
              </div>
            ) : null}

            {/* Action buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <button
                className="btn btn-secondary"
                style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.75rem" }}
                onClick={() => {
                  setStudentPracticeStep("question");
                  navigateTo("practice");
                }}
              >
                Takrorlashga o'tish
              </button>
              <button
                className="btn btn-primary"
                style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.75rem" }}
                onClick={() => {
                  navigateTo("tutor");
                }}
              >
                AI izoh bilan tushuntirish
              </button>
              <button
                className="btn btn-outline"
                style={{ width: "100%", justifyContent: "center", fontWeight: 700, padding: "0.6rem" }}
                onClick={() => {
                  setStudentSelectedHomeworkId(null);
                  setStudentUploadStep("detail");
                }}
              >
                Vazifalar ro'yxatiga qaytish
              </button>
            </div>
          </div>
        );
      }
    }

    if (currentTab === "homeworks") {
      const pendingHws = homeworks.filter(h => h.student_status !== "submitted");
      const completedHws = homeworks.filter(h => h.student_status === "submitted");

      const subjectMeta: Record<string, { bg: string; color: string; emoji: string }> = {
        "Matematika": { bg: "rgba(59,130,246,0.1)", color: "var(--primary)", emoji: "📐" },
        "Fizika": { bg: "rgba(139,92,246,0.1)", color: "#8b5cf6", emoji: "⚡" },
        "Kimyo": { bg: "rgba(16,185,129,0.1)", color: "var(--secondary)", emoji: "🧪" },
        "Ona tili": { bg: "rgba(245,158,11,0.1)", color: "var(--warning)", emoji: "📝" },
        "Ingliz tili": { bg: "rgba(239,68,68,0.1)", color: "var(--danger)", emoji: "🔤" },
        "Biologiya": { bg: "rgba(34,197,94,0.1)", color: "#16a34a", emoji: "🌿" },
      };
      const getMeta = (s: string) => subjectMeta[s] || { bg: "rgba(100,116,139,0.1)", color: "var(--text-muted)", emoji: "📚" };
      const showCompleted = studentPracticeAnswers[99999] === "done";
      const currentList = showCompleted ? completedHws : pendingHws;
      const subjectGroups = groupHomeworksBySubject(currentList);
      const sortedCurrentList = [...currentList].sort((a, b) => a.subject.localeCompare(b.subject) || a.title.localeCompare(b.title));

      return (
        <div className="animate-fade-in pb-20">
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
            <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)" }}>Topshiriqlar</h2>
            <button style={{ width: 36, height: 36, borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", cursor: "pointer" }}>
              <ChevronDown size={18} color="var(--text-muted)" />
            </button>
          </div>

          {!classes.length ? renderJoinClassPanel("Avval sinfga qo'shiling") : null}

          {/* Tabs */}
          <div style={{ display: "flex", marginBottom: "1.2rem", background: "#f1f5f9", borderRadius: "12px", padding: "4px", gap: "4px" }}>
            {[
              { label: `Faol (${pendingHws.length})`, done: false },
              { label: `Bajarilgan (${completedHws.length})`, done: true },
            ].map(tab => {
              const active = showCompleted === tab.done;
              return (
                <button key={tab.label}
                  onClick={() => setStudentPracticeAnswers(prev => ({ ...prev, 99999: tab.done ? "done" : "" }))}
                  style={{ flex: 1, padding: "8px", border: "none", borderRadius: "9px", cursor: "pointer",
                    background: active ? "white" : "transparent",
                    color: active ? "var(--primary)" : "var(--text-muted)",
                    fontWeight: 700, fontSize: "0.85rem",
                    boxShadow: active ? "0 2px 6px rgba(0,0,0,0.08)" : "none",
                    transition: "all 0.2s",
                  }}
                >{tab.label}</button>
              );
            })}
          </div>

          {/* Cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {sortedCurrentList.map((hw, index) => {
              const m = getMeta(hw.subject);
              const isFirstSubject = index === 0 || sortedCurrentList[index - 1]?.subject !== hw.subject;
              return (
                <div key={hw.id} style={{ display: "grid", gap: "8px" }}>
                  {isFirstSubject ? (
                    <div className="flex-between" style={{ padding: "2px 2px 0" }}>
                      <div className="flex-start" style={{ gap: "8px" }}>
                        <span style={{ width: 28, height: 28, borderRadius: "8px", background: m.bg, color: m.color, display: "grid", placeItems: "center" }}>{m.emoji}</span>
                        <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>{hw.subject}</strong>
                      </div>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 800 }}>
                        {(subjectGroups[hw.subject] || []).length} ta vazifa
                      </span>
                    </div>
                  ) : null}
                  <div
                    style={{ background: "white", borderRadius: "16px", padding: "14px", border: "1px solid var(--border)", cursor: "pointer", display: "flex", gap: "12px", alignItems: "flex-start" }}
                    onClick={() => {
                      setStudentWorkflowSubmission(null);
                      clearStudentUploadFile();
                      setStudentSelectedHomeworkId(hw.id);
                      setStudentUploadStep(showCompleted ? "result" : "detail");
                    }}
                  >
                  <div style={{ width: 42, height: 42, borderRadius: "12px", background: m.bg, display: "grid", placeItems: "center", fontSize: "1.15rem", flexShrink: 0 }}>{m.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "0.72rem", fontWeight: 800, color: m.color }}>{hw.subject}</span>
                      {hw.student_status !== "submitted" && (
                        <span style={{ background: "var(--primary)", color: "white", fontSize: "0.58rem", fontWeight: 800, padding: "1px 6px", borderRadius: "99px" }}>Yangi</span>
                      )}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--text-main)", marginBottom: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hw.title}</div>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Topshiriq muddati: {hw.deadline || "Muddatsiz"}</div>
                    {hw.student_status === "submitted" && (
                      <div style={{ marginTop: "5px", display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--secondary)" }} />
                        <span style={{ fontSize: "0.72rem", color: "var(--secondary)", fontWeight: 700 }}>
                          Baholandi: {hw.latest_score ?? "–"}/{hw.max_score ?? 10}
                        </span>
                      </div>
                    )}
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0, marginTop: "4px" }} />
                  </div>
                </div>
              );
            })}
            {currentList.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--text-muted)" }}>
                <BookOpen size={32} style={{ marginBottom: "10px", opacity: 0.4 }} />
                <p style={{ margin: 0, fontSize: "0.88rem" }}>{showCompleted ? "Hali bajarilgan vazifa yo'q." : "Hozircha faol vazifa yo'q."}</p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // HOME TAB (Screen 1)

    const pendingHomeworks = homeworks.filter(h => h.student_status !== "submitted");
    const completedHomeworks = homeworks.filter(h => h.student_status === "submitted");
    const nextTask = pendingHomeworks[0];

    const totalXP = studentXP;

    return (
      <div className="animate-fade-in pb-20">

        {/* ── Top greeting row ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.2rem" }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Assalomu alaykum,</p>
            <h2 style={{ margin: "2px 0 2px", fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-0.02em", color: "var(--text-main)" }}>
              {user?.full_name?.split(" ")[0] || "Malika"}! 👋
            </h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 500 }}>Bugun ajoyib kun bo'lsin!</p>
          </div>
          <button
            onClick={() => navigateTo("profile")}
            style={{ width: 42, height: 42, borderRadius: "50%", border: "2.5px solid var(--border)", padding: 0, cursor: "pointer", overflow: "hidden", background: "var(--surface)", display: "grid", placeItems: "center", flexShrink: 0 }}
          >
            {user?.photo_url
              ? <img src={user.photo_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "var(--primary)" }}>{initials(user?.full_name || "M")}</span>
            }
          </button>
        </div>

        {/* ── XP / Level / Streak pills ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "1.3rem" }}>
          {[
            { label: "XP", val: totalXP.toLocaleString(), sub: "+50 bugun", col: "var(--primary)", icon: <Star size={13} color="var(--primary)" /> },
            { label: "Daraja", val: "7", sub: "Yaxshi", col: "var(--warning)", icon: <Trophy size={13} color="var(--warning)" /> },
            { label: "Seriya", val: String(studentStreak), sub: "kun", col: "var(--danger)", icon: <Flame size={13} fill="var(--danger)" color="var(--danger)" /> },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: "14px", padding: "12px 8px", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "3px", marginBottom: "4px" }}>
                {s.icon}
                <span style={{ fontSize: "0.58rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              </div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: s.col, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "3px" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Active homework card ── */}
        <h3 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Bugungi topshiriq</h3>
        {nextTask ? (
          <div
            style={{ background: "linear-gradient(135deg, #2563eb 0%, #4f86f7 100%)", borderRadius: "20px", padding: "20px", marginBottom: "1.3rem", position: "relative", overflow: "hidden", cursor: "pointer", boxShadow: "0 10px 30px rgba(37,99,235,0.28)" }}
            onClick={() => {
              setStudentWorkflowSubmission(null);
              clearStudentUploadFile();
              setStudentSelectedHomeworkId(nextTask.id);
              setStudentUploadStep("detail");
            }}
          >
            <div style={{ position: "absolute", top: -25, right: -25, width: 110, height: 110, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
            <span style={{ background: "rgba(255,255,255,0.18)", color: "white", fontSize: "0.65rem", fontWeight: 800, padding: "2px 10px", borderRadius: "99px", textTransform: "uppercase" }}>{nextTask.subject}</span>
            <h3 style={{ color: "white", fontSize: "1.15rem", margin: "10px 0 4px", fontWeight: 800, letterSpacing: "-0.01em" }}>{nextTask.title}</h3>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.78rem", margin: "0 0 16px" }}>Muddati: Bugun 23:59</p>
            <button style={{ background: "white", color: "#2563eb", border: "none", borderRadius: "10px", padding: "8px 18px", fontWeight: 800, fontSize: "0.82rem", cursor: "pointer" }}>
              Topshirishni boshlash →
            </button>
          </div>
        ) : (
          <div style={{ background: "white", borderRadius: "18px", padding: "22px", marginBottom: "1.3rem", textAlign: "center", border: "1px solid var(--border)" }}>
            <Trophy size={34} color="var(--warning)" style={{ marginBottom: "8px" }} />
            <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem" }}>Barcha vazifalar bajarildi!</h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Yangi topshiriqlarni kuting</p>
          </div>
        )}

        {/* ── Quick actions ── */}
        <h3 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Tezkor kirish</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.3rem" }}>
          <button onClick={() => navigateTo("practice")} style={{ background: "white", borderRadius: "16px", padding: "16px", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(16,185,129,0.1)", color: "var(--secondary)", display: "grid", placeItems: "center", marginBottom: "10px" }}>
              <PenTool size={18} />
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-main)", marginBottom: "2px" }}>Takrorlash</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Oldingi misollar</div>
          </button>
          <button onClick={() => navigateTo("tutor")} style={{ background: "white", borderRadius: "16px", padding: "16px", border: "1px solid var(--border)", cursor: "pointer", textAlign: "left" }}>
            <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(139,92,246,0.1)", color: "#8b5cf6", display: "grid", placeItems: "center", marginBottom: "10px" }}>
              <MessageCircle size={18} />
            </div>
            <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--text-main)", marginBottom: "2px" }}>AI izoh</div>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Xatolar bo'yicha</div>
          </button>
        </div>

        {/* ── Completed homeworks list ── */}
        {completedHomeworks.length > 0 && (
          <>
            <h3 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>So'nggi natijalar</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "1rem" }}>
              {completedHomeworks.slice(0, 3).map(hw => (
                <div key={hw.id}
                  style={{ background: "white", borderRadius: "14px", padding: "12px 14px", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
                  onClick={() => {
                    setStudentWorkflowSubmission(null);
                    clearStudentUploadFile();
                    setStudentSelectedHomeworkId(hw.id);
                    setStudentUploadStep("result");
                  }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "10px", background: "rgba(59,130,246,0.08)", display: "grid", placeItems: "center" }}>
                      <BookOpen size={16} color="var(--primary)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>{hw.title}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{hw.subject}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.9rem", color: (hw.latest_percentage ?? 0) >= 80 ? "var(--secondary)" : "var(--warning)" }}>
                      {hw.latest_score ?? "–"}/{hw.max_score ?? 10}
                    </div>
                    <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Baholandi</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {renderJoinClassPanel(classes.length ? "Yana sinfga qo'shilish" : "Sinfga qo'shilish")}
      </div>
    );
  }

  function renderJoinClassPanel(title = "Sinfga qo'shilish") {
    const isSearching = busyAction === "search-class";
    const isJoining = busyAction === "join-class";

    return (
      <section className="panel join-search-panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-title">
          <School size={20} />
          <h2>{title}</h2>
        </div>
        <form onSubmit={handleSearchClass}>
          <label className="input-group">
            <span className="input-label">O'qituvchi bergan sinf kodi</span>
            <input
              className="input-field code-input"
              value={joinCode}
              onChange={(event) => {
                setJoinCode(event.target.value.toUpperCase());
                setClassSearchResult(null);
              }}
              placeholder="Kod: ABC123"
            />
          </label>
          <button className="btn btn-outline" type="submit" disabled={isBusy || !joinCode.trim()}>
            {isSearching ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Search size={18} />}
            Sinfni qidirish
          </button>
        </form>

        {classSearchResult ? (
          <div className="class-search-result">
            <div className="flex-start" style={{ minWidth: 0 }}>
              <div className="student-avatar">
                <School size={17} />
              </div>
              <div style={{ minWidth: 0 }}>
                <strong>{classSearchResult.name}</strong>
                <span>
                  {classSearchResult.subject} - {classSearchResult.teacher_name || "O'qituvchi"}
                </span>
                <small>{classSearchResult.student_count ?? 0} o'quvchi</small>
              </div>
            </div>
            <button
              className="btn btn-primary"
              type="button"
              disabled={isBusy || classSearchResult.already_joined}
              onClick={() => void handleJoinClass(undefined, classSearchResult.join_code || joinCode)}
            >
              {isJoining ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <UserPlus size={17} />}
              {classSearchResult.already_joined ? "Qo'shilgansiz" : "Qo'shilish"}
            </button>
          </div>
        ) : null}
      </section>
    );
  }

  function renderStudentHomework(homework: Homework) {
    const isActive = studentSubmissionHomeworkId === homework.id;
    const isCompleted = homework.student_status === "submitted";
    const isSubmitting = busyAction === `submit-${homework.id}`;
    const isLoadingSubmissions = busyAction === `my-submissions-${homework.id}`;
    const submissions = studentSubmissionsByHomework[homework.id] || [];

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
            if (!studentSubmissionsByHomework[homework.id]?.length) {
              void handleLoadMySubmissions(homework.id);
            }
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
                {homework.subject} - {homework.deadline || "Muddatsiz"}
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

            <form className="inline-form" onSubmit={(event) => void handleSubmitHomework(event, homework.id)} style={{ background: "var(--background)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem", position: "relative", overflow: "hidden" }}>
              <p className="eyebrow" style={{ marginBottom: "8px" }}>Vazifani topshirish (Rasm yuklash)</p>
              <label className="file-picker" style={{ border: "2px dashed var(--border)", background: "var(--surface)" }}>
                <Upload size={18} />
                <span>{submitFileValue?.name || "Rasm tanlash"}</span>
                <input accept="image/*" type="file" disabled={isSubmitting} onChange={handleSubmitFile} />
              </label>
              <div className="action-row" style={{ marginTop: "12px" }}>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} type="submit" disabled={isBusy || !submitFileValue}>
                  {isSubmitting ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Send size={17} />}
                  {isSubmitting ? "AI tekshiryapti..." : "Yuborish"}
                </button>
              </div>
              {isSubmitting ? renderSubmissionProcessing() : null}
            </form>

            <div style={{ marginTop: "1rem" }}>
              <div className="flex-between" style={{ marginBottom: "8px" }}>
                <h4 style={{ fontSize: "0.95rem", fontWeight: 700, margin: 0 }}>Saqlangan AI feedbacklar</h4>
                {isLoadingSubmissions ? <RefreshCcw size={15} style={{ animation: "spin 1.2s linear infinite", color: "var(--primary)" }} /> : null}
              </div>
              {renderSubmissions(submissions, "Hozircha natijalar yo'q. Rasm yuklab topshiring!")}
            </div>
          </div>
        )}
      </article>
    );
  }

  function renderSubmissionProcessing() {
    return (
      <div className="submission-processing" aria-live="polite">
        <div className="ai-loader">
          <div className="ai-loader-ring"></div>
          <FileCheck size={26} />
        </div>
        <div>
          <strong>AI javobingizni tekshiryapti</strong>
          <p>Rasm o'qilmoqda, yechimlar solishtirilmoqda va feedback saqlanmoqda.</p>
          <div className="processing-steps">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    );
  }

  function renderSoftLoading(title: string, detail: string) {
    return (
      <div className="submission-processing" aria-live="polite">
        <div className="ai-loader">
          <div className="ai-loader-ring"></div>
          <RefreshCcw size={24} style={{ animation: "spin 1.2s linear infinite" }} />
        </div>
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
          <div className="processing-steps">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
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
                    {submission.student_name || `Urinish ${submission.attempt_number ?? 1}`}
                  </h4>
                  <span className="text-xs text-muted">
                    {submission.student_name ? `Urinish ${submission.attempt_number ?? 1} - ` : ""}
                    {submission.homework_title ? `${submission.homework_title} - ` : ""}
                    {new Date(submission.submitted_at).toLocaleString("uz-UZ")}
                  </span>
                  {submission.class_name || submission.subject ? (
                    <span className="text-xs text-muted" style={{ display: "block" }}>
                      {[submission.class_name, submission.subject].filter(Boolean).join(" - ")}
                    </span>
                  ) : null}
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
                  {/* Grid summary */}
                  <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
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
                    <div style={{ background: "rgba(245, 158, 11, 0.08)", color: "var(--warning)", padding: "8px", borderRadius: "12px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{result.uncertain_count ?? 0}</div>
                      <div style={{ fontSize: "0.65rem", fontWeight: 600 }}>Shubhali</div>
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
                          let statusSymbol = "";

                          if (isCorrect) {
                            statusBg = "rgba(16, 185, 129, 0.08)";
                            statusColor = "var(--secondary)";
                            statusSymbol = "OK";
                          } else if (isIncorrect) {
                            statusBg = "rgba(239, 68, 68, 0.08)";
                            statusColor = "var(--danger)";
                            statusSymbol = "X";
                          } else if (isMissing) {
                            statusBg = "rgba(245, 158, 11, 0.08)";
                            statusColor = "var(--warning)";
                            statusSymbol = "Yo'q";
                          } else if (prob.status === "uncertain") {
                            statusBg = "rgba(245, 158, 11, 0.08)";
                            statusColor = "var(--warning)";
                            statusSymbol = "Shubhali";
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
                                  {statusSymbol || prob.status?.toUpperCase() || ""}
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
                                      <strong>Xato:</strong> {err.description} <br />
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

  function renderProgressAnalyticsLegacy() {
    const completedHws = homeworks.filter(h => h.student_status === "submitted");
    let totalScore = 0;
    completedHws.forEach(h => totalScore += (h.latest_score || 0));
    const averageScore = completedHws.length ? (totalScore / completedHws.length).toFixed(1) : "0";
    const progressInsights = buildProgressInsights(homeworks, studentSubmissionsByHomework);

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
          {progressInsights.mistakes.length ? (
            <div className="progress-insight-list">
              {progressInsights.mistakes.map((mistake) => (
                <article className="progress-insight" key={`${mistake.label}-${mistake.count}`}>
                  <div className="progress-insight-head">
                    <strong>{mistake.label}</strong>
                    <span>{mistake.count} marta</span>
                  </div>
                  {mistake.suggestion ? <p>{mistake.suggestion}</p> : null}
                  <small>
                    {mistake.homeworks.slice(0, 2).join(", ")}
                    {mistake.problems.length ? ` - masalalar: ${mistake.problems.slice(0, 4).join(", ")}` : ""}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state compact">AI feedback yig'ilishi uchun kamida bitta tekshirilgan vazifa kerak.</div>
          )}

          {progressInsights.feedbacks.length ? (
            <div className="progress-feedback-block">
              <p className="eyebrow">So'nggi AI tavsiyalari</p>
              {progressInsights.feedbacks.map((feedback) => (
                <article className="progress-feedback" key={feedback.id}>
                  <div className="flex-between">
                    <strong>{feedback.homeworkTitle}</strong>
                    <span>{feedback.score}</span>
                  </div>
                  <p>{feedback.text.length > 220 ? `${feedback.text.slice(0, 220)}...` : feedback.text}</p>
                </article>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function renderProfile() {
    const isStudent = user?.role === "student";
    const completedHomeworks = homeworks.filter((homework) => homework.student_status === "submitted");
    const level = Math.floor(studentXP / 200) + 1;
    const xpForNextLevel = level * 200;
    const xpProgress = Math.min(100, Math.round((studentXP / xpForNextLevel) * 100));
    const teacherSummary = teacherDashboard?.summary;
    const teacherAverage = metricPercent(teacherSummary?.average_percentage ?? 84);
    const teacherRoleText = isStudent ? "O'quvchi" : "O'qituvchi";
    const profileSaving = busyAction === "profile-save";
    const profileInitial = (user?.full_name || teacherRoleText).trim().charAt(0).toUpperCase() || "U";

    return (
      <div className="animate-fade-in pb-20">
        <div className="flex-between" style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)" }}>Mening Profilim</h2>
          <button
            className="icon-btn"
            type="button"
            title="Profilni tahrirlash"
            onClick={openProfileEditor}
          >
            <Edit size={18} />
          </button>
        </div>

        <div
          className="card"
          style={{
            padding: "32px 20px 30px",
            marginBottom: "16px",
            borderRadius: "28px",
            minHeight: "260px",
            textAlign: "center",
            background: "linear-gradient(145deg, #ffffff 0%, #f8fbff 100%)",
            boxShadow: "0 18px 40px rgba(15,23,42,0.08)",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center" }}>
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: "50%",
                padding: 5,
                marginBottom: 28,
                background: "#ffffff",
                boxShadow: "0 16px 38px rgba(99,102,241,0.22)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  background: isStudent ? "linear-gradient(135deg, #34d399, #2563eb)" : "linear-gradient(135deg, #7da2ff, #5b4ff0)",
                  color: "#ffffff",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                {user?.photo_url ? (
                  <img src={user.photo_url} alt={user.full_name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: "3rem", lineHeight: 1 }}>{profileInitial}</span>
                )}
              </div>
            </div>
            <h3 style={{ margin: "0 0 14px", fontSize: "1.38rem", lineHeight: 1.2, fontWeight: 900, color: "var(--text-main)", maxWidth: "100%", overflowWrap: "anywhere" }}>
              {user?.full_name || "Foydalanuvchi"}
            </h3>
            <p style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: "var(--text-muted)" }}>
              {teacherRoleText} rejimi
            </p>
          </div>
        </div>

        {profileEditing ? (
          <form className="card animate-fade-in" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }} onSubmit={handleProfileSubmit}>
            <div className="flex-between">
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900 }}>Profilni tahrirlash</h3>
              <button className="icon-btn" type="button" title="Yopish" onClick={() => setProfileEditing(false)} style={{ width: 34, height: 34 }}>
                <X size={16} />
              </button>
            </div>
            <label className="input-group" style={{ marginBottom: 0 }}>
              <span className="input-label">Ism va familiya</span>
              <input
                className="input-field"
                value={profileDraft.full_name}
                onChange={(event) => setProfileDraft({ full_name: event.target.value })}
                placeholder="Masalan: Malika To'rayeva"
                disabled={profileSaving}
              />
            </label>
            <div className="action-row">
              <button className="btn btn-outline" type="button" disabled={profileSaving} onClick={() => setProfileEditing(false)}>
                <X size={17} />
                Bekor qilish
              </button>
              <button className="btn btn-primary" type="submit" disabled={profileSaving || !profileDraft.full_name.trim()}>
                {profileSaving ? <RefreshCcw size={17} style={{ animation: "spin 1.2s linear infinite" }} /> : <Check size={17} />}
                Saqlash
              </button>
            </div>
          </form>
        ) : null}

        <div className="card" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }}>
          <h3 style={{ fontSize: "0.95rem", fontWeight: 900, margin: 0, color: "var(--text-main)", display: "flex", alignItems: "center", gap: "7px" }}>
            <UserRound size={17} color="var(--primary)" />
            Shaxsiy ma'lumotlar
          </h3>
          <div style={{ display: "grid", gap: "11px" }}>
            {[
              ["Ism va familiya", user?.full_name || "Kiritilmagan"],
              ["Telegram username", user?.telegram_username ? `@${user.telegram_username}` : "Mavjud emas"],
              ["Rol", teacherRoleText],
            ].map(([label, value]) => (
              <div className="flex-between" key={label} style={{ gap: "12px", borderTop: "1px solid var(--border)", paddingTop: "10px" }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", fontWeight: 700 }}>{label}</span>
                <strong style={{ fontSize: "0.84rem", color: "var(--text-main)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</strong>
              </div>
            ))}
          </div>
        </div>

        {isStudent ? (
          <>
            <div className="card" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: "7px" }}>
                <TrendingUp size={17} color="var(--secondary)" />
                O'quvchi natijalari
              </h3>
              <div style={{ background: "var(--background)", padding: "14px", borderRadius: "10px" }}>
                <div className="flex-between" style={{ marginBottom: "7px" }}>
                  <strong style={{ fontSize: "0.95rem" }}>Daraja {level}</strong>
                  <span style={{ color: "var(--secondary)", fontSize: "0.8rem", fontWeight: 800 }}>{studentXP} / {xpForNextLevel} XP</span>
                </div>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: `${xpProgress}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), var(--secondary))" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "8px" }}>
                {[
                  { label: "Seriya", value: `${studentStreak} kun`, icon: <Flame size={17} color="var(--danger)" /> },
                  { label: "Topshiriq", value: `${completedHomeworks.length}`, icon: <ClipboardList size={17} color="var(--primary)" /> },
                  { label: "O'rtacha", value: "4.3/5", icon: <Star size={17} color="var(--warning)" /> },
                ].map((item) => (
                  <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", textAlign: "center", background: "white" }}>
                    <div style={{ display: "grid", placeItems: "center", marginBottom: "4px" }}>{item.icon}</div>
                    <strong style={{ display: "block", fontSize: "0.9rem" }}>{item.value}</strong>
                    <span style={{ fontSize: "0.66rem", color: "var(--text-muted)", fontWeight: 700 }}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: "7px" }}>
                <TrendingUp size={17} color="var(--primary)" />
                Fanlar bo'yicha o'sish
              </h3>
              <div style={{ display: "grid", gap: "12px" }}>
                {subjectGrowthRows().map((row) => {
                  const meta = getSubjectMeta(row.subject);
                  return (
                    <div key={row.subject} style={{ border: "1px solid var(--border)", borderRadius: "12px", padding: "12px", background: "white" }}>
                      <div className="flex-between" style={{ marginBottom: "6px" }}>
                        <div className="flex-start" style={{ gap: "8px" }}>
                          <span style={{ width: 30, height: 30, borderRadius: "8px", background: meta.bg, color: meta.color, display: "grid", placeItems: "center" }}>{meta.icon}</span>
                          <strong style={{ fontSize: "0.86rem" }}>{row.subject}</strong>
                        </div>
                        <span style={{ fontSize: "0.78rem", color: row.delta >= 0 ? "var(--secondary)" : "var(--danger)", fontWeight: 900 }}>
                          {row.delta >= 0 ? "+" : ""}{row.delta}%
                        </span>
                      </div>
                      {renderLineGraph(row.values, meta.color)}
                      <div className="flex-between" style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                        <span>O'rtacha: {row.average}%</span>
                        <span>5 ta oxirgi ish</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }}>
              <h3 style={{ fontSize: "0.95rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: "7px" }}>
                <Trophy size={17} color="var(--warning)" />
                Yutuqlar
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {[
                  { label: "Izlanuvchi", sub: "10 ta mashq yakunlandi", done: true },
                  { label: "Muntazam", sub: "7 kun ketma-ket", done: true },
                  { label: "Perfeksionist", sub: "90%+ aniqlik", done: false },
                  { label: "Faol", sub: "1000 XP yig'ildi", done: studentXP >= 1000 },
                ].map((item) => (
                  <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "10px", background: item.done ? "white" : "#f8fafc", opacity: item.done ? 1 : 0.58 }}>
                    <strong style={{ display: "block", fontSize: "0.8rem" }}>{item.label}</strong>
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>{item.sub}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="card" style={{ padding: "18px", marginBottom: "16px", borderRadius: "14px" }}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 900, margin: 0, display: "flex", alignItems: "center", gap: "7px" }}>
              <School size={17} color="var(--primary)" />
              O'qituvchi statistikasi
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {[
                { label: "Sinflar", value: `${teacherSummary?.class_count ?? classes.length}`, icon: <UsersRound size={18} color="var(--primary)" /> },
                { label: "O'quvchilar", value: `${teacherSummary?.student_count ?? classes.reduce((sum, item) => sum + (item.student_count ?? 0), 0)}`, icon: <GraduationCap size={18} color="var(--secondary)" /> },
                { label: "Faol vazifalar", value: `${teacherSummary?.published_homework_count ?? allTeacherHomeworks.filter((item) => item.status === "published").length}`, icon: <BookOpen size={18} color="var(--warning)" /> },
                { label: "O'rtacha natija", value: teacherAverage, icon: <TrendingUp size={18} color="#8b5cf6" /> },
              ].map((item) => (
                <div key={item.label} style={{ border: "1px solid var(--border)", borderRadius: "10px", padding: "12px", background: "white" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
                    {item.icon}
                    <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 800 }}>{item.label}</span>
                  </div>
                  <strong style={{ fontSize: "1.15rem", color: "var(--text-main)" }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card" style={{ padding: "18px", borderRadius: "14px" }}>
          <h3 style={{ fontSize: "0.9rem", fontWeight: 900, margin: 0, color: "var(--text-main)" }}>
            Rol
          </h3>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
            {teacherRoleText} rejimi tanlangan. Xavfsizlik uchun role almashtirish yopilgan.
          </p>
          <span className="badge badge-gray" style={{ alignSelf: "flex-start" }}>{teacherRoleText}</span>
        </div>
      </div>
    );
  }

  function renderQuestionBank() {
    return (
      <div className="animate-fade-in pb-20">
        <div className="flex-between" style={{ marginBottom: "1.2rem", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, margin: 0 }}>Savollar banki</h2>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Sinflar uchun AI-tahlil va savollar boshqaruvi</p>
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "8px 16px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 700 }}
            onClick={() => {
              setQbWizardOpen(!qbWizardOpen);
              setQbExtractedResult([]);
            }}
          >
            {qbWizardOpen ? <ArrowLeft size={16} /> : <Plus size={16} />}
            {qbWizardOpen ? "Ro'yxatga qaytish" : "Material qo'shish"}
          </button>
        </div>

        {qbWizardOpen ? renderWizard() : (
          <>
            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", marginBottom: "16px" }}>
              <div style={{ background: "white", padding: "10px 8px", borderRadius: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-main)" }}>{qbQuestions.length}</div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Jami</div>
              </div>
              <div style={{ background: "white", padding: "10px 8px", borderRadius: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--secondary)" }}>
                  {qbQuestions.filter(q => q.status === "approved").length}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Tasdiqlangan</div>
              </div>
              <div style={{ background: "white", padding: "10px 8px", borderRadius: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--warning)" }}>
                  {qbQuestions.filter(q => q.status === "draft").length}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Tekshirish</div>
              </div>
              <div style={{ background: "white", padding: "10px 8px", borderRadius: "10px", border: "1px solid var(--border)", textAlign: "center" }}>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--primary)" }}>
                  {new Set(qbQuestions.map(q => q.topic_id)).size}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>Mavzular</div>
              </div>
            </div>

            {/* Filters panel */}
            <div className="card" style={{ padding: "16px", marginBottom: "16px", background: "var(--surface)", border: "1px solid var(--border)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Sliders size={16} color="var(--primary)" />
                <h3 style={{ fontSize: "0.9rem", fontWeight: 800, margin: 0 }}>Filtrlar</h3>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Sinf</label>
                  <select
                    value={qbFilterGrade}
                    onChange={e => setQbFilterGrade(e.target.value === "" ? "" : Number(e.target.value))}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  >
                    <option value="">Barchasi</option>
                    {qbGradesList.map(g => (
                      <option key={g.grade} value={g.grade}>{g.grade}-sinf</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Mavzu</label>
                  <select
                    value={qbFilterTopicId}
                    onChange={e => setQbFilterTopicId(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  >
                    <option value="">Barchasi</option>
                    {qbTopicsList.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.grade}-sinf)</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Ko'nikma</label>
                  <select
                    value={qbFilterSkillId}
                    onChange={e => setQbFilterSkillId(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                    disabled={!qbFilterTopicId}
                  >
                    <option value="">Barchasi</option>
                    {qbSkillsList.map(s => (
                      <option key={s.slug} value={s.slug}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Holat</label>
                  <select
                    value={qbFilterStatus}
                    onChange={e => setQbFilterStatus(e.target.value)}
                    style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  >
                    <option value="">Barchasi (Aktiv)</option>
                    <option value="approved">Tasdiqlangan</option>
                    <option value="draft">Qoralama (Draft)</option>
                    <option value="rejected">Rad etilgan</option>
                    <option value="archived">Arxivlangan</option>
                  </select>
                </div>
              </div>
              <div className="flex-end" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {qbQuestions.some(q => q.status === "draft") && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: "6px 12px", fontSize: "0.75rem", marginRight: "auto", background: "#e6f4ea", color: "#137333", border: "1px solid #137333", display: "flex", alignItems: "center", gap: "4px" }}
                    onClick={handleApproveAllQuestions}
                    disabled={isBusy}
                  >
                    <Check size={14} />
                    Hammasini tasdiqlash ({qbQuestions.filter(q => q.status === "draft").length})
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-outline"
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  onClick={() => {
                    setQbFilterGrade("");
                    setQbFilterTopicId("");
                    setQbFilterSkillId("");
                    setQbFilterStatus("");
                  }}
                >
                  Filtrlarni tozalash
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "6px 12px", fontSize: "0.75rem" }}
                  onClick={() => void loadQuestionBankQuestions(user!.id)}
                >
                  Izlash
                </button>
              </div>
            </div>

            {/* Questions List */}
            {qbLoading ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                <RefreshCcw size={24} className="spin" style={{ margin: "0 auto 10px" }} />
                <span>Savollar yuklanmoqda...</span>
              </div>
            ) : qbQuestions.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={28} color="var(--text-muted)" style={{ marginBottom: "8px" }} />
                <p style={{ margin: 0 }}>Hech qanday savol topilmadi.</p>
                <button
                  className="btn btn-outline mt-2"
                  onClick={() => {
                    setQbWizardOpen(true);
                    setQbExtractedResult([]);
                  }}
                >
                  Yangi savol qo'shish
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {qbQuestions.map(q => renderQuestionCard(q))}
              </div>
            )}
          </>
        )}

        {/* Editing Modal */}
        {qbEditingQuestion && renderEditModal()}
      </div>
    );
  }

  function renderWizard() {
    return (
      <div className="card animate-fade-in" style={{ padding: "20px", background: "white", border: "1px solid var(--border)" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "16px", color: "var(--text-main)" }}>
          AI Savol Yaratish Oynasi
        </h3>

        <form onSubmit={handleExtractQuestions}>
          {/* Step 1: Select Curriculum Level */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              1. Mavzu va Ko'nikmalarni tanlash
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Sinf *</label>
                <select
                  value={qbGrade}
                  onChange={e => setQbGrade(e.target.value === "" ? "" : Number(e.target.value))}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  required
                >
                  <option value="">Tanlang</option>
                  {qbGradesList.map(g => (
                    <option key={g.grade} value={g.grade}>{g.grade}-sinf</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Mavzu *</label>
                <select
                  value={showCustomTopicInput ? "NEW_CUSTOM_TOPIC" : qbTopicId}
                  onChange={e => {
                    if (e.target.value === "NEW_CUSTOM_TOPIC") {
                      setShowCustomTopicInput(true);
                      setQbTopicId("");
                    } else {
                      setShowCustomTopicInput(false);
                      setQbTopicId(e.target.value);
                    }
                  }}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  required={!showCustomTopicInput}
                  disabled={qbGrade === ""}
                >
                  <option value="">Tanlang</option>
                  {qbTopicsList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                  {qbGrade !== "" && (
                    <option value="NEW_CUSTOM_TOPIC" style={{ color: "var(--primary)", fontWeight: "bold" }}>
                      + Yangi mavzu
                    </option>
                  )}
                </select>
              </div>
            </div>

            {showCustomTopicInput && (
              <div style={{ marginTop: "10px", background: "var(--background)", padding: "10px", borderRadius: "8px", border: "1px solid var(--border)" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>
                  Yangi mavzu nomi *
                </label>
                <div style={{ display: "flex", gap: "8px" }}>
                  <input
                    type="text"
                    placeholder="Masalan: Diskriminant va ildizlar"
                    value={customTopicName}
                    onChange={e => setCustomTopicName(e.target.value)}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "8px 12px", fontSize: "0.8rem" }}
                    onClick={handleCreateCustomTopic}
                    disabled={isBusy || !customTopicName.trim()}
                  >
                    Yaratish
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "8px 12px", fontSize: "0.8rem" }}
                    onClick={() => {
                      setShowCustomTopicInput(false);
                      setCustomTopicName("");
                      setQbTopicId("");
                    }}
                  >
                    Bekor qilish
                  </button>
                </div>
              </div>
            )}

            {qbSkillsList.length > 0 && (
              <div style={{ marginTop: "10px" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>
                  Mavzuga oid ko'nikmalar (AI faqat shular doirasida moslaydi)
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", padding: "8px", background: "var(--background)", borderRadius: "8px", border: "1px solid var(--border)" }}>
                  {qbSkillsList.map(s => (
                    <label key={s.slug} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={qbSelectedSkills.includes(s.slug) || true}
                        readOnly
                      />
                      <span><strong>{s.name}</strong> - <span style={{ color: "var(--text-muted)" }}>{s.description}</span></span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Material Ingestion */}
          <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: "16px", marginBottom: "16px" }}>
            <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              2. Material manbasini yuklash
            </h4>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Kitob/Varaq rasmi (Ixtiyoriy)</label>
              <div style={{ border: "2px dashed var(--border)", borderRadius: "10px", padding: "16px", textAlign: "center", cursor: "pointer", position: "relative" }} className="card-interactive">
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setQbFile(e.target.files?.[0] || null)}
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }}
                />
                <Camera size={24} color="var(--text-muted)" style={{ margin: "0 auto 8px" }} />
                <span style={{ fontSize: "0.75rem", fontWeight: 600, display: "block" }}>
                  {qbFile ? qbFile.name : "Rasm tanlash (yoki kameradan olish)"}
                </span>
                {qbFile && (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: "2px 8px", fontSize: "0.65rem", marginTop: "8px", zIndex: 2 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setQbFile(null);
                    }}
                  >
                    O'chirish
                  </button>
                )}
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Yoki matn ko'rinishida yozing (Ixtiyoriy)</label>
              <textarea
                placeholder="Masalan: Kvadrat tenglamaga doir 3 ta savol tuzib ber yoki rasmdagi 2-mashqni yechimini aniqlab ber..."
                value={qbTextContent}
                onChange={e => setQbTextContent(e.target.value)}
                style={{ width: "100%", minHeight: "80px", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white", resize: "vertical" }}
              />
            </div>
          </div>

          <div className="flex-end">
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setQbWizardOpen(false);
                setQbExtractedResult([]);
              }}
              disabled={qbExtracting}
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ marginLeft: "8px" }}
              disabled={qbExtracting || (!qbTextContent.trim() && !qbFile)}
            >
              {qbExtracting ? (
                <>
                  <RefreshCcw size={16} className="spin" style={{ marginRight: "6px" }} />
                  AI Tahlil qilmoqda...
                </>
              ) : "AI orqali tahlil qilish"}
            </button>
          </div>
        </form>

        {/* Wizard Review Area */}
        {qbExtractedResult.length > 0 && (
          <div style={{ marginTop: "24px", borderTop: "2px solid var(--primary)", paddingTop: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, margin: 0, color: "var(--primary)" }}>
                AI tomonidan aniqlangan va saqlangan savollar ({qbExtractedResult.length} ta)
              </h3>
              {qbExtractedResult.some(q => q.status === "draft") && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "6px 12px", fontSize: "0.75rem", background: "#e6f4ea", color: "#137333", border: "1px solid #137333", display: "flex", alignItems: "center", gap: "4px" }}
                  onClick={handleApproveAllExtracted}
                  disabled={isBusy}
                >
                  <Check size={14} />
                  Hammasini tasdiqlash
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {qbExtractedResult.map(q => renderQuestionCard(q, true))}
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderQuestionCard(q: any, _isExtractedView = false) {
    const isApproved = q.status === "approved";
    const isDraft = q.status === "draft";

    const diffLabels = ["Oson", "O'rtacha", "Qiyin"];
    const diffColors = ["var(--secondary)", "var(--warning)", "var(--danger)"];
    const diffColor = diffColors[(q.difficulty || 2) - 1] || "var(--primary)";

    const isTestingThis = qbTestingVariantId === q.id;

    return (
      <div key={q.id} className="card" style={{ padding: "16px", border: "1px solid var(--border)", background: "white", position: "relative" }}>
        {/* Top Badges */}
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <span style={{
              background: isApproved ? "rgba(16, 185, 129, 0.08)" : isDraft ? "rgba(245, 158, 11, 0.08)" : "rgba(100, 116, 139, 0.08)",
              color: isApproved ? "var(--secondary)" : isDraft ? "var(--warning)" : "var(--text-muted)",
              fontWeight: 800, fontSize: "0.7rem", padding: "2px 8px", borderRadius: "8px"
            }}>
              {q.status?.toUpperCase() || "DRAFT"}
            </span>

            <span style={{
              background: `rgba(${q.difficulty === 1 ? '16, 185, 129' : q.difficulty === 3 ? '239, 68, 68' : '245, 158, 11'}, 0.08)`,
              color: diffColor,
              fontWeight: 800, fontSize: "0.7rem", padding: "2px 8px", borderRadius: "8px"
            }}>
              {diffLabels[(q.difficulty || 2) - 1] || "O'rtacha"}
            </span>

            <span style={{ background: "rgba(59, 130, 246, 0.08)", color: "var(--primary)", fontWeight: 800, fontSize: "0.7rem", padding: "2px 8px", borderRadius: "8px" }}>
              {q.question_type === "multiple_choice" ? "MCQ" : q.question_type === "numeric" ? "Numeric" : "Short Answer"}
            </span>

            {/* Validation Badge */}
            {q.validation_status && (
              <span style={{
                background: q.validation_status === "verified" ? "rgba(16, 185, 129, 0.08)" : q.validation_status === "failed" ? "rgba(239, 68, 68, 0.08)" : "rgba(245, 158, 11, 0.08)",
                color: q.validation_status === "verified" ? "var(--secondary)" : q.validation_status === "failed" ? "var(--danger)" : "var(--warning)",
                fontWeight: 800, fontSize: "0.7rem", padding: "2px 8px", borderRadius: "8px"
              }}>
                Solver: {q.validation_status === "verified" ? "Tasdiqlandi" : q.validation_status === "failed" ? "Xato aniqlandi" : "Tekshirish kutilmoqda"}
              </span>
            )}
          </div>
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
            Sinf: {q.grade} | Mavzu ID: {q.topic_id}
          </span>
        </div>

        {/* Question Text */}
        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: "0.9rem", color: "var(--text-main)", whiteSpace: "pre-wrap" }}>
          {q.question_text}
        </p>

        {/* Options if MCQ */}
        {q.question_type === "multiple_choice" && q.options && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            {q.options.map((opt: string, oIdx: number) => {
              const isCorrectOpt = oIdx === q.correct_option_index;
              return (
                <div key={oIdx} style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: `1px solid ${isCorrectOpt ? "var(--secondary)" : "var(--border)"}`,
                  background: isCorrectOpt ? "rgba(16, 185, 129, 0.05)" : "var(--background)",
                  fontSize: "0.8rem",
                  fontWeight: isCorrectOpt ? 700 : 500
                }}>
                  {String.fromCharCode(65 + oIdx)}) {opt} {isCorrectOpt ? "To'g'ri" : ""}
                </div>
              );
            })}
          </div>
        )}

        {/* Correct Answer */}
        <div style={{ background: "var(--background)", padding: "10px", borderRadius: "8px", marginBottom: "12px" }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>To'g'ri javob:</div>
          <strong style={{ fontSize: "0.85rem", color: "var(--secondary)" }}>
            {q.question_type === "multiple_choice"
              ? `${String.fromCharCode(65 + (q.correct_option_index ?? 0))}) ${q.options?.[q.correct_option_index ?? 0] || ""}`
              : q.correct_answer}
          </strong>
        </div>

        {/* Solution Steps */}
        {q.solution_steps && q.solution_steps.length > 0 && (
          <details style={{ marginBottom: "12px", cursor: "pointer" }}>
            <summary style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--primary)" }}>
              Yechim qadamlari ({q.solution_steps.length} ta qadam)
            </summary>
            <div style={{ padding: "8px 12px", background: "var(--background)", borderRadius: "8px", marginTop: "6px", fontSize: "0.75rem" }}>
              {q.solution_steps.map((step: string, idx: number) => (
                <div key={idx} style={{ marginBottom: "4px" }}>
                  <strong>{idx + 1}-qadam:</strong> {step}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Skill Slugs Tags */}
        {q.skill_ids && q.skill_ids.length > 0 && (
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {q.skill_ids.map((slug: string) => (
              <span key={slug} style={{ fontSize: "0.65rem", background: "rgba(139, 92, 246, 0.08)", color: "#8b5cf6", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                #{slug}
              </span>
            ))}
          </div>
        )}

        {/* Actions panel */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: "10px", marginTop: "10px" }}>
          <div style={{ display: "flex", gap: "6px" }}>
            {isDraft && (
              <>
                <button
                  className="btn btn-outline"
                  style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--secondary)", color: "var(--secondary)", background: "rgba(16, 185, 129, 0.03)" }}
                  onClick={() => void handleApproveQuestion(q.id)}
                >
                  Tasdiqlash
                </button>
                <button
                  className="btn btn-outline"
                  style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--danger)", color: "var(--danger)", background: "rgba(239, 68, 68, 0.03)" }}
                  onClick={() => void handleRejectQuestion(q.id)}
                >
                  Rad etish
                </button>
              </>
            )}
            {isApproved && (
              <button
                className="btn btn-outline"
                style={{ padding: "4px 10px", fontSize: "0.75rem", color: "var(--text-muted)" }}
                onClick={() => void handleArchiveQuestion(q.id)}
              >
                Arxivlash
              </button>
            )}
            <button
              className="btn btn-outline"
              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
              onClick={() => {
                setQbEditingQuestion(q);
              }}
            >
              <Edit size={12} style={{ marginRight: "4px" }} />
              Tahrirlash
            </button>
          </div>

          {q.variant_allowed && (
            <button
              className="btn btn-outline"
              style={{ padding: "4px 10px", fontSize: "0.75rem", borderColor: "var(--primary)", color: "var(--primary)" }}
              onClick={() => {
                if (isTestingThis) {
                  setQbTestingVariantId("");
                  setQbVariantResult(null);
                } else {
                  setQbTestingVariantId(q.id);
                  setQbVariantParams(q.variant_template?.parameters || {});
                  setQbVariantResult(null);
                }
              }}
            >
              <Sliders size={12} style={{ marginRight: "4px" }} />
              {isTestingThis ? "Yopish" : "Variant sinash"}
            </button>
          )}
        </div>

        {/* Variant Testing Section */}
        {isTestingThis && (
          <div style={{ marginTop: "12px", borderTop: "2px dashed var(--border)", paddingTop: "12px" }}>
            <h4 style={{ margin: "0 0 8px", fontSize: "0.8rem", color: "var(--primary)" }}>
              Kanal parametrlari varianti ({q.variant_template?.template_type})
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "10px" }}>
              {Object.keys(qbVariantParams).map((paramName) => (
                <div key={paramName}>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>
                    Parametr {paramName}
                  </label>
                  <input
                    type="number"
                    value={qbVariantParams[paramName] === undefined ? "" : qbVariantParams[paramName]}
                    onChange={(e) => {
                      const val = e.target.value === "" ? "" : Number(e.target.value);
                      setQbVariantParams(prev => ({ ...prev, [paramName]: val }));
                    }}
                    style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.75rem" }}
                  />
                </div>
              ))}
            </div>
            <div className="flex-end" style={{ marginBottom: "10px" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                onClick={() => void handleGenerateVariantTest()}
                disabled={isBusy}
              >
                Variant Generatsiya Qilish
              </button>
            </div>

            {qbVariantResult && (
              <div style={{ background: "rgba(59, 130, 246, 0.04)", border: "1px solid rgba(59, 130, 246, 0.15)", borderRadius: "8px", padding: "10px", marginTop: "8px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Yangi generatsiya qilingan variant:
                </p>
                <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "0.85rem", color: "var(--text-main)" }}>
                  {qbVariantResult.question_text}
                </p>
                <div style={{ display: "flex", gap: "10px", fontSize: "0.75rem" }}>
                  <div>Javob: <strong style={{ color: "var(--secondary)" }}>{qbVariantResult.correct_answer}</strong></div>
                  <div>Qiyinchilik: <strong>{qbVariantResult.difficulty}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  function renderEditModal() {
    if (!qbEditingQuestion) return null;
    return (
      <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", zIndex: 100, display: "grid", placeItems: "center", padding: "16px" }}>
        <div className="card animate-fade-in" style={{ width: "100%", maxWidth: "500px", padding: "20px", background: "white", maxHeight: "90vh", overflowY: "auto" }}>
          <div className="flex-between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: "10px", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>Savolni tahrirlash</h3>
            <button
              onClick={() => setQbEditingQuestion(null)}
              style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
            >
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleUpdateQuestion}>
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Savol matni</label>
              <textarea
                value={qbEditingQuestion.question_text || ""}
                onChange={e => setQbEditingQuestion({ ...qbEditingQuestion, question_text: e.target.value })}
                style={{ width: "100%", minHeight: "80px", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Savol turi</label>
              <select
                value={qbEditingQuestion.question_type}
                onChange={e => setQbEditingQuestion({ ...qbEditingQuestion, question_type: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem", background: "white" }}
              >
                <option value="numeric">Sonli yechim (Numeric)</option>
                <option value="multiple_choice">Ko'p tanlovli (MCQ)</option>
                <option value="short_answer">Qisqa matnli yechim</option>
              </select>
            </div>

            {qbEditingQuestion.question_type === "multiple_choice" && (
              <div style={{ marginBottom: "12px", border: "1px solid var(--border)", padding: "10px", borderRadius: "8px", background: "var(--background)" }}>
                <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "6px", fontWeight: 600 }}>Variantlar va To'g'ri index (0-dan 3-gacha)</label>
                {(qbEditingQuestion.options || ["", "", "", ""]).map((opt: string, idx: number) => (
                  <div key={idx} style={{ display: "flex", gap: "6px", marginBottom: "6px", alignItems: "center" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{String.fromCharCode(65 + idx)})</span>
                    <input
                      type="text"
                      value={opt}
                      onChange={e => {
                        const newOpts = [...(qbEditingQuestion.options || ["", "", "", ""])];
                        newOpts[idx] = e.target.value;
                        setQbEditingQuestion({ ...qbEditingQuestion, options: newOpts });
                      }}
                      style={{ flex: 1, padding: "6px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                      placeholder={`Variant ${String.fromCharCode(65 + idx)}`}
                      required
                    />
                  </div>
                ))}
                <div style={{ marginTop: "10px" }}>
                  <label style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginBottom: "2px" }}>To'g'ri variant indexi (0: A, 1: B, 2: C, 3: D)</label>
                  <input
                    type="number"
                    min={0} max={3}
                    value={qbEditingQuestion.correct_option_index ?? 0}
                    onChange={e => setQbEditingQuestion({ ...qbEditingQuestion, correct_option_index: Number(e.target.value) })}
                    style={{ width: "60px", padding: "6px", borderRadius: "6px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                    required
                  />
                </div>
              </div>
            )}

            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>To'g'ri javob</label>
              <input
                type="text"
                value={qbEditingQuestion.correct_answer || ""}
                onChange={e => setQbEditingQuestion({ ...qbEditingQuestion, correct_answer: e.target.value })}
                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                required
              />
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "4px", fontWeight: 600 }}>Qiyinchilik darajasi (1-Oson, 2-O'rtacha, 3-Qiyin)</label>
              <input
                type="number"
                min={1} max={3}
                value={qbEditingQuestion.difficulty || 2}
                onChange={e => setQbEditingQuestion({ ...qbEditingQuestion, difficulty: Number(e.target.value) })}
                style={{ width: "80px", padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", fontSize: "0.8rem" }}
                required
              />
            </div>

            <div className="flex-end">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setQbEditingQuestion(null)}
              >
                Bekor qilish
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ marginLeft: "8px" }}
              >
                Saqlash
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  function renderAddWizard() {
    return (
      <div className="animate-fade-in pb-20">
        <div style={{ marginBottom: "1.5rem", marginTop: "0.5rem" }}>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-main)", letterSpacing: "-0.03em" }}>
            Yarating va Tekshiring
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: "0.9rem", color: "var(--text-muted)", fontWeight: 500 }}>
            Yangi dars, topshiriq yoki tekshirish turini tanlang
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
          <div 
            className="card card-interactive" 
            style={{ padding: "1.2rem", display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", cursor: "pointer" }}
            onClick={() => {
              navigateTo("classes");
              setSelectedTeacherClassId("");
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", color: "var(--secondary)", display: "grid", placeItems: "center" }}>
              <UsersRound size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Sinf Yaratish</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.3 }}>Yangi o'quvchilar guruhini qo'shish va ularga kod yuborish</p>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          <div 
            className="card card-interactive" 
            style={{ padding: "1.2rem", display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", cursor: "pointer" }}
            onClick={() => {
              navigateTo("tools");
              setToolsActiveView("diktant_checker");
              setDiktantStep(1);
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)", display: "grid", placeItems: "center" }}>
              <PenTool size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Diktant Tekshirish</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.3 }}>O'quvchilar yozgan diktant xatolarini rasm orqali AI tahlili bilan tekshirish</p>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          <div 
            className="card card-interactive" 
            style={{ padding: "1.2rem", display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", cursor: "pointer" }}
            onClick={() => {
              navigateTo("tools");
              setToolsActiveView("test_checker");
              setTestStep(1);
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", color: "var(--warning)", display: "grid", placeItems: "center" }}>
              <FileCheck size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Test Tekshirish</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.3 }}>Yozma test javoblar varaqasini skanerlash va natijalarni hisoblash</p>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>

          <div 
            className="card card-interactive" 
            style={{ padding: "1.2rem", display: "flex", flexDirection: "row", alignItems: "center", gap: "16px", cursor: "pointer" }}
            onClick={() => {
              navigateTo("tools");
              setToolsActiveView("control_work");
              setCwStep(1);
            }}
          >
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "grid", placeItems: "center" }}>
              <BookOpen size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700 }}>Nazorat Ishi</h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.3 }}>Yozma nazorat ishlarining AI yordamida baholanishi va tahlil qilinishi</p>
            </div>
            <ChevronRight size={18} color="var(--text-muted)" />
          </div>
        </div>
      </div>
    );
  }

  function renderUncertainReviews() {
    return (
      <div className="animate-fade-in pb-20">
        <button className="btn btn-outline" onClick={() => setToolsActiveView("home")} style={{ marginBottom: "1rem", padding: "4px 10px", fontSize: "0.8rem" }}>
          <ArrowLeft size={14} style={{ marginRight: "4px" }}/> Orqaga
        </button>
        <div className="section-title" style={{ marginBottom: "1rem" }}>
          <h2>Shubhali javoblar</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            AI aniq baholay olmagan masalalarni ko'rib chiqing. Qarordan keyin o'quvchi bahosi qayta hisoblanadi.
          </p>
        </div>

        <div className="flex-between" style={{ marginBottom: "12px" }}>
          <span className="badge badge-orange">{uncertainReviews.length} ta shubhali</span>
          <button className="icon-btn" type="button" disabled={!user || uncertainReviewsLoading} onClick={() => user && void loadUncertainReviews(user.id)} title="Yangilash">
            <RefreshCcw size={17} style={uncertainReviewsLoading ? { animation: "spin 1.2s linear infinite" } : undefined} />
          </button>
        </div>

        {uncertainReviewsLoading ? (
          renderSoftLoading("Shubhali javoblar yuklanmoqda", "AI noaniq deb belgilagan masalalar olinmoqda.")
        ) : uncertainReviews.length === 0 ? (
          <div className="empty-state">Hozircha shubhali javob yo'q.</div>
        ) : (
          <section style={{ display: "grid", gap: "12px" }}>
            {uncertainReviews.map((item) => {
              const imageSrc = apiAssetUrl(item.student_image_url);
              const reviewBusy = busyAction?.startsWith(`review-uncertain-${item.id}`);
              return (
                <article key={item.id} className="card" style={{ padding: "14px", borderRadius: "14px", border: "1px solid rgba(245,158,11,0.22)" }}>
                  <div className="flex-between" style={{ gap: "10px", alignItems: "flex-start" }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 900 }}>{item.student_name || "O'quvchi"}</h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.35 }}>
                        {item.class_name || "Sinf"} - {item.homework_title || "Vazifa"} - urinish {item.attempt_number || 1}
                      </p>
                    </div>
                    <span className="badge badge-orange" style={{ fontSize: "0.68rem", padding: "3px 8px" }}>
                      {item.problem?.problem_number || item.problem_index + 1}-masala
                    </span>
                  </div>

                  <div style={{ display: "grid", gap: "8px", padding: "10px", background: "rgba(245,158,11,0.05)", borderRadius: "10px", border: "1px solid rgba(245,158,11,0.12)" }}>
                    <strong style={{ fontSize: "0.84rem", color: "var(--text-main)" }}>{item.problem?.feedback || "AI bu masalani ishonch bilan baholay olmadi."}</strong>
                    {item.problem?.student_answer ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Student javobi: {item.problem.student_answer}</span>
                    ) : null}
                    {item.problem?.expected_answer ? (
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Kutilgan javob: {item.problem.expected_answer}</span>
                    ) : null}
                  </div>

                  {imageSrc ? (
                    <div style={{ marginTop: "10px", border: "1px solid var(--border)", borderRadius: "10px", overflow: "hidden", background: "var(--background)" }}>
                      <img src={imageSrc} alt="Student yuborgan rasm" style={{ width: "100%", maxHeight: "260px", objectFit: "contain", display: "block" }} />
                    </div>
                  ) : (
                    <div className="empty-state compact">Rasm URL topilmadi. Yangi submissionlarda rasm shu yerda ko'rinadi.</div>
                  )}

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginTop: "10px" }}>
                    <button className="btn btn-secondary" type="button" disabled={isBusy} style={{ padding: "0.62rem 0.4rem", fontSize: "0.76rem" }} onClick={() => void handleReviewUncertainProblem(item, "correct")}>
                      {busyAction === `review-uncertain-${item.id}-correct` ? <RefreshCcw size={15} style={{ animation: "spin 1.2s linear infinite" }} /> : <Check size={15} />}
                      To'g'ri
                    </button>
                    <button className="btn btn-danger" type="button" disabled={isBusy} style={{ padding: "0.62rem 0.4rem", fontSize: "0.76rem" }} onClick={() => void handleReviewUncertainProblem(item, "incorrect")}>
                      {busyAction === `review-uncertain-${item.id}-incorrect` ? <RefreshCcw size={15} style={{ animation: "spin 1.2s linear infinite" }} /> : <X size={15} />}
                      Noto'g'ri
                    </button>
                    <button className="btn btn-outline" type="button" disabled={isBusy} style={{ padding: "0.62rem 0.4rem", fontSize: "0.74rem" }} onClick={() => void handleReviewUncertainProblem(item, "unrelated")}>
                      {busyAction === `review-uncertain-${item.id}-unrelated` ? <RefreshCcw size={15} style={{ animation: "spin 1.2s linear infinite" }} /> : <AlertCircle size={15} />}
                      Boshqa
                    </button>
                  </div>
                  {reviewBusy ? renderSoftLoading("Qaror saqlanmoqda", "Submission qayta hisoblanib, student natijasi yangilanmoqda.") : null}
                </article>
              );
            })}
          </section>
        )}
      </div>
    );
  }

  function renderTeacherTools() {
    if (toolsActiveView === "question_bank") return renderQuestionBank();
    if (toolsActiveView === "diktant_checker") return renderDiktantChecker();
    if (toolsActiveView === "test_checker") return renderTestChecker();
    if (toolsActiveView === "control_work") return renderControlWorkChecker();
    if (toolsActiveView === "uncertain_reviews") return renderUncertainReviews();

    return (
      <div className="animate-fade-in pb-20">
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>O'qituvchi vositalari</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            AI yordamida ishlaringizni osonlashtiring
          </p>
        </div>
        
        <div style={{ display: "grid", gap: "12px" }}>
          <button className="card card-interactive flex-start" style={{ textAlign: "left", padding: "16px", border: "1px solid var(--border)", gap: "16px" }} onClick={() => setToolsActiveView("control_work")}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(16, 185, 129, 0.1)", display: "grid", placeItems: "center", color: "var(--secondary)", flexShrink: 0 }}>
              <FileCheck size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem", color: "var(--text-main)" }}>Nazorat ishlari</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Yozma ishlarni rasm orqali tekshirish</p>
            </div>
          </button>

          <button className="card card-interactive flex-start" style={{ textAlign: "left", padding: "16px", border: "1px solid var(--border)", gap: "16px" }} onClick={() => setToolsActiveView("test_checker")}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(139, 92, 246, 0.1)", display: "grid", placeItems: "center", color: "#8b5cf6", flexShrink: 0 }}>
              <ClipboardList size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem", color: "var(--text-main)" }}>Test Checker</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Test javoblarini avtomatik tekshirish</p>
            </div>
          </button>

          <button className="card card-interactive flex-start" style={{ textAlign: "left", padding: "16px", border: "1px solid var(--border)", gap: "16px" }} onClick={() => setToolsActiveView("diktant_checker")}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", display: "grid", placeItems: "center", color: "var(--warning)", flexShrink: 0 }}>
              <PenTool size={24} />
            </div>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "1rem", color: "var(--text-main)" }}>Diktant Checker</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>Imlo va diktantlarni tekshirish</p>
            </div>
          </button>

          <button className="card card-interactive flex-start" style={{ textAlign: "left", padding: "16px", border: "1px solid var(--border)", gap: "16px" }} onClick={() => setToolsActiveView("uncertain_reviews")}>
            <div style={{ width: "48px", height: "48px", borderRadius: "12px", background: "rgba(245, 158, 11, 0.1)", display: "grid", placeItems: "center", color: "var(--warning)", flexShrink: 0 }}>
              <AlertCircle size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="flex-between" style={{ gap: "8px" }}>
                <h3 style={{ margin: "0 0 4px", fontSize: "1rem", color: "var(--text-main)" }}>Shubhali javoblar</h3>
                <span className="badge badge-orange" style={{ fontSize: "0.68rem", padding: "2px 7px" }}>{uncertainReviews.length}</span>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>AI aniq o'qiy olmagan masalalarni teacher hal qiladi</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  function renderDiktantChecker() {
    return (
      <div className="animate-fade-in pb-20">
        <button className="btn btn-outline" onClick={() => setToolsActiveView("home")} style={{ marginBottom: "1rem", padding: "4px 10px", fontSize: "0.8rem" }}>
          <ArrowLeft size={14} style={{ marginRight: "4px" }}/> Orqaga
        </button>
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>Diktant tekshirish</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            O'quvchilarning yozma diktant ishlarini AI yordamida tekshiring
          </p>
        </div>

        {diktantStep === 1 && (
           <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>1. Sinfni tanlang</h3>
              <select className="input-field" style={{ marginBottom: "16px" }} value={diktantClassId} onChange={e => setDiktantClassId(e.target.value)}>
                 <option value="">Sinfni tanlang...</option>
                 {classes.length ? classes.map((cls) => (
                   <option key={cls.id} value={cls.id}>{cls.name} - {cls.subject}</option>
                 )) : (
                   <>
                     <option value="8-A">8-A - Ona tili</option>
                     <option value="9-B">9-B - Ona tili</option>
                   </>
                 )}
              </select>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setDiktantStep(2)} disabled={!diktantClassId}>Keyingi qadam</button>
           </div>
        )}

        {diktantStep === 2 && (
           <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>2. Original matn (Javob kaliti)</h3>
              <textarea className="input-field" rows={5} style={{ marginBottom: "16px", resize: "none" }} placeholder="Bahor fasli boshlandi. Daraxtlar yashil libosga kirdi..." value={diktantText} onChange={e => setDiktantText(e.target.value)} />
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setDiktantStep(3)} disabled={!diktantText.trim()}>Keyingi qadam</button>
           </div>
        )}

        {diktantStep === 3 && (
           <div className="card">
              <h3 style={{ marginBottom: "12px", fontSize: "1rem" }}>3. Sinf diktant ishi</h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "12px" }}>Matn to'liq ko'rinsin, rasm tiniq bo'lsin.</p>
              <label className="file-picker" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", border: "2px dashed var(--border)", borderRadius: "12px", cursor: "pointer", background: "var(--background)" }}>
                <Camera size={32} color="var(--primary)" style={{ marginBottom: "8px" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>{diktantImage ? diktantImage.name : "Diktant rasmini yuklang"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setDiktantImage(e.target.files?.[0] || null)} />
              </label>
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={!diktantImage || busyAction === "check-diktant"} onClick={() => void handleCheckDiktant()}>
                {busyAction === "check-diktant" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Send size={18} />}
                {busyAction === "check-diktant" ? "Tekshirilmoqda..." : "AI bilan tekshirish"}
              </button>
              {busyAction === "check-diktant" ? renderSoftLoading("Diktant tekshirilmoqda", "Yozuv o'qilib, original matn bilan solishtirilmoqda.") : null}
           </div>
        )}

        {diktantStep === 4 && (
           <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "3rem 1rem", textAlign: "center" }}>
              <RefreshCcw size={40} style={{ animation: "spin 1.5s linear infinite", marginBottom: "1rem", color: "var(--primary)" }} />
              <h3 style={{ marginBottom: "8px", fontSize: "1.1rem" }}>AI diktantni tekshirmoqda...</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.5 }}>
                Yozuv o'qilmoqda...<br/>Original matn bilan solishtirilmoqda...
              </p>
           </div>
        )}

        {diktantStep === 5 && diktantResult && (
           <div className="card animate-fade-in" style={{ padding: "0", overflow: "hidden" }}>
              <div style={{ padding: "16px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                 <div>
                   <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{diktantStudent}</h3>
                   <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--text-muted)" }}>
                     {findToolClass(diktantClassId)?.name || diktantClassId}
                   </p>
                   <span className="badge badge-green mt-1" style={{ fontSize: "0.75rem", display: "inline-block" }}>Yaxshi natija</span>
                 </div>
                 
                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button className="icon-btn" style={{ padding: "4px 8px", background: "var(--border)", border: "none", borderRadius: "4px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }} onClick={() => setDiktantResult({ ...diktantResult, score: Math.max(0, diktantResult.score - 1) })}>-</button>
                    <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>
                       {diktantResult.score}
                    </span>
                    <button className="icon-btn" style={{ padding: "4px 8px", background: "var(--border)", border: "none", borderRadius: "4px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }} onClick={() => setDiktantResult({ ...diktantResult, score: Math.min(diktantResult.max, diktantResult.score + 1) })}>+</button>
                    <span style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginLeft: "4px" }}>/ {diktantResult.max}</span>
                 </div>
              </div>
              
              <div style={{ padding: "16px" }}>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
                    <div style={{ background: "rgba(239, 68, 68, 0.05)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid rgba(239, 68, 68, 0.1)" }}>
                       <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--danger)" }}>{diktantResult.totalErrors}</div>
                       <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Jami xato</div>
                    </div>
                    <div style={{ background: "rgba(245, 158, 11, 0.05)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid rgba(245, 158, 11, 0.1)" }}>
                       <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--warning)" }}>
                         {diktantResult.errors.filter((e: any) => e.type === "Imlo xatosi").length}
                       </div>
                       <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Imlo</div>
                    </div>
                    <div style={{ background: "rgba(59, 130, 246, 0.05)", padding: "10px", borderRadius: "8px", textAlign: "center", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
                       <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>
                         {diktantResult.errors.filter((e: any) => e.type === "Tinish belgisi").length}
                       </div>
                       <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Tinish belgisi</div>
                    </div>
                 </div>

                 <h4 style={{ margin: "0 0 12px", fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Xatolar tahlili</h4>
                 
                 <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
                   {diktantResult.errors.map((err: any, i: number) => (
                      <div key={i} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px", background: "var(--background)" }}>
                         <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                           <select 
                             className="input-field" 
                             style={{ width: "auto", padding: "2px 8px", fontSize: "0.75rem", height: "26px", borderRadius: "6px" }}
                             value={err.type}
                             onChange={(e) => {
                               const newErrors = [...diktantResult.errors];
                               newErrors[i] = { ...newErrors[i], type: e.target.value };
                               setDiktantResult({ ...diktantResult, errors: newErrors });
                             }}
                           >
                             <option value="Imlo xatosi">Imlo xatosi</option>
                             <option value="Tinish belgisi">Tinish belgisi</option>
                             <option value="Tushib qolgan so'z">Tushib qolgan so'z</option>
                             <option value="Ortiqcha so'z">Ortiqcha so'z</option>
                             <option value="Noto'g'ri so'z">Noto'g'ri so'z</option>
                             <option value="Katta/kichik harf">Katta/kichik harf</option>
                           </select>

                           <button 
                             style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "grid", placeItems: "center" }}
                             onClick={() => {
                               const newErrors = diktantResult.errors.filter((_: any, idx: number) => idx !== i);
                               setDiktantResult({
                                 ...diktantResult,
                                 totalErrors: newErrors.length,
                                 errors: newErrors
                               });
                             }}
                           >
                             <X size={16} />
                           </button>
                         </div>
                         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.85rem" }}>
                           <div style={{ padding: "8px", background: "rgba(16, 185, 129, 0.05)", borderRadius: "6px" }}>
                             <strong style={{ color: "var(--secondary)", display: "block", marginBottom: "4px", fontSize: "0.7rem" }}>ORIGINAL:</strong>
                             {err.original}
                           </div>
                           <div style={{ padding: "8px", background: "rgba(239, 68, 68, 0.05)", borderRadius: "6px" }}>
                             <strong style={{ color: "var(--danger)", display: "block", marginBottom: "4px", fontSize: "0.7rem" }}>O'QUVCHI:</strong>
                             <span style={{ color: "var(--danger)", textDecoration: "underline wavy" }}>{err.student}</span>
                           </div>
                         </div>
                      </div>
                   ))}
                 </div>

                 <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onClick={() => { setNotice("Natija tasdiqlandi!"); setDiktantStep(1); setDiktantImage(null); setDiktantText(""); setDiktantStudent(""); setDiktantClassId(""); }}>
                      <Check size={16}/> Tasdiqlash
                    </button>
                    <button className="btn btn-outline" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} onClick={() => setNotice("Jurnalga qo'shildi!")}>
                      <BookType size={16}/> Jurnalga
                    </button>
                 </div>
              </div>
           </div>
        )}
      </div>
    );
  }

  function renderTestChecker() {
    return (
      <div className="animate-fade-in pb-20">
        <button className="btn btn-outline" onClick={() => setToolsActiveView("home")} style={{ marginBottom: "1rem", padding: "4px 10px", fontSize: "0.8rem" }}>
          <ArrowLeft size={14} style={{ marginRight: "4px" }}/> Orqaga
        </button>
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>Test Checker</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Javoblarni kalit bilan avtomatik tekshirish
          </p>
        </div>

        {testStep === 1 && (
           <div className="card animate-fade-in">
              <h3 style={{ marginBottom: "16px", fontSize: "1.1rem", fontWeight: 800 }}>Yangi Test Yaratish</h3>
              <div style={{ marginBottom: "12px" }}>
                <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Test Nomi</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={testName} 
                  onChange={e => setTestName(e.target.value)} 
                  placeholder="Algebra Test #3" 
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Sinf</label>
                  <select className="input-field" value={testClass} onChange={e => setTestClass(e.target.value)}>
                     <option value="8-A">8-A</option>
                     <option value="9-B">9-B</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Savollar soni</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={testQuestionCount} 
                    onChange={e => setTestQuestionCount(Math.min(50, Math.max(1, Number(e.target.value))))} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: "20px" }}>
                <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Maksimal ball</label>
                <input 
                  type="number" 
                  className="input-field" 
                  value={testMaxScore} 
                  onChange={e => setTestMaxScore(Math.max(1, Number(e.target.value)))} 
                />
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => setTestStep(2)}>Kalit yaratish</button>
           </div>
        )}

        {testStep === 2 && (
           <div className="card animate-fade-in">
              <div className="flex-between" style={{ marginBottom: "16px" }}>
                 <h3 style={{ fontSize: "1rem", margin: 0, fontWeight: 700 }}>Javob kalitlari</h3>
                 <span className="badge badge-gray" style={{ background: "rgba(59, 130, 246, 0.1)", color: "var(--primary)" }}>{testQuestionCount} ta savol</span>
              </div>
              <div style={{ maxHeight: "280px", overflowY: "auto", paddingRight: "4px", display: "grid", gap: "10px", marginBottom: "20px" }}>
                 {Array.from({ length: testQuestionCount }, (_, idx) => idx + 1).map(q => (
                    <div key={q} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                       <span style={{ width: "24px", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>{q}.</span>
                       <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                          {['A', 'B', 'C', 'D'].map(opt => (
                             <button key={opt} 
                               style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", background: testAnswers[q] === opt ? "var(--primary)" : "var(--background)", color: testAnswers[q] === opt ? "white" : "var(--text-main)", fontWeight: 600, transition: "all 0.2s", cursor: "pointer" }}
                               onClick={() => setTestAnswers({...testAnswers, [q]: opt})}
                             >
                               {opt}
                             </button>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => { setTestKeySaved(testAnswers); setTestStep(3); }}>Kalitni saqlash</button>
           </div>
        )}

        {testStep === 3 && (
           <div className="card animate-fade-in">
              <h3 style={{ marginBottom: "12px", fontSize: "1rem", fontWeight: 700 }}>O'quvchi javoblari</h3>
              <select className="input-field" style={{ marginBottom: "16px" }} value={testStudent} onChange={e => setTestStudent(e.target.value)}>
                 <option value="">O'quvchini tanlang...</option>
                 <option value="Ali Valiyev">Ali Valiyev</option>
                 <option value="Madina Karimova">Madina Karimova</option>
              </select>
              
              <div style={{ marginBottom: "16px", padding: "16px", background: "rgba(59, 130, 246, 0.05)", borderRadius: "8px", border: "1px dashed var(--primary)", textAlign: "center" }}>
                 <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "12px" }}>O'quvchi javoblarini kiriting yoki rasmga oling:</p>
                 <label className="file-picker" style={{ marginBottom: "12px", display: "flex", flexDirection: "column", alignItems: "center", padding: "16px", border: "1px dashed var(--border)", borderRadius: "10px", cursor: "pointer", background: "white" }}>
                   <Camera size={24} color="var(--primary)" style={{ marginBottom: "6px" }} />
                   <span style={{ fontSize: "0.82rem", color: "var(--primary)", fontWeight: 700 }}>{testImage ? testImage.name : "Test javob varaqasi rasmini tanlang"}</span>
                   <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setTestImage(e.target.files?.[0] || null)} />
                 </label>
                 <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setTestStudentAnswers({}); setTestStep(4); }} disabled={!testStudent}>Qo'lda kiritish</button>
                    <button className="btn btn-primary" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }} disabled={!testStudent || !testImage || busyAction === "scan-test"} onClick={() => void handleCheckTestScan()}>
                      {busyAction === "scan-test" ? <RefreshCcw size={16} style={{ animation: "spin 1.2s linear infinite" }} /> : <Camera size={16}/>}
                      {busyAction === "scan-test" ? "Skan..." : "Skaner"}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {testStep === 6 && (
           <div className="card text-center animate-fade-in" style={{ padding: "3rem 1rem" }}>
              <RefreshCcw size={40} style={{ animation: "spin 1.5s linear infinite", marginBottom: "1rem", color: "var(--primary)", margin: "0 auto 1rem" }} />
              <h4>Javoblar tekshirilmoqda...</h4>
           </div>
        )}

        {testStep === 4 && (
           <div className="card animate-fade-in">
              <h3 style={{ marginBottom: "12px", fontSize: "1rem", color: "var(--primary)", fontWeight: 700 }}>{testStudent || "O'quvchi"} javoblari</h3>
              <div style={{ maxHeight: "280px", overflowY: "auto", paddingRight: "4px", display: "grid", gap: "10px", marginBottom: "20px" }}>
                 {Array.from({ length: testQuestionCount }, (_, idx) => idx + 1).map(q => (
                    <div key={q} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                       <span style={{ width: "24px", fontWeight: 700, color: "var(--text-muted)", textAlign: "right" }}>{q}.</span>
                       <div style={{ display: "flex", gap: "8px", flex: 1 }}>
                          {['A', 'B', 'C', 'D'].map(opt => (
                             <button key={opt} 
                               style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid var(--border)", background: testStudentAnswers[q] === opt ? "var(--text-main)" : "var(--background)", color: testStudentAnswers[q] === opt ? "white" : "var(--text-main)", fontWeight: 600, transition: "all 0.2s", cursor: "pointer" }}
                               onClick={() => setTestStudentAnswers({...testStudentAnswers, [q]: opt})}
                             >
                               {opt}
                             </button>
                          ))}
                       </div>
                    </div>
                 ))}
              </div>
              <button className="btn btn-primary" style={{ width: "100%" }} disabled={busyAction === "check-test"} onClick={() => void handleCheckTestManual()}>
                {busyAction === "check-test" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Check size={18} />}
                {busyAction === "check-test" ? "Tekshirilmoqda..." : "Tekshirish"}
              </button>
              {busyAction === "check-test" ? renderSoftLoading("Test tekshirilmoqda", "Javob kaliti va o'quvchi javoblari solishtirilmoqda.") : null}
           </div>
        )}

        {testStep === 5 && testResult && (
           <div className="card animate-fade-in">
              <div className="flex-between" style={{ marginBottom: "20px", borderBottom: "1px solid var(--border)", paddingBottom: "16px" }}>
                 <div>
                    <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>{testStudent}</h3>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>{testName}</span>
                 </div>
                 <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--secondary)" }}>{Math.round((testResult.correct / testQuestionCount) * 100)}%</div>
                    <div style={{ fontSize: "0.9rem", color: "var(--text-main)", fontWeight: 700 }}>{testResult.score} / {testResult.max}</div>
                 </div>
              </div>

              <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
                 <div style={{ flex: 1, background: "rgba(16, 185, 129, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>To'g'ri</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--secondary)" }}>{testResult.correct}</div>
                 </div>
                 <div style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", padding: "12px", borderRadius: "8px", border: "1px solid rgba(239, 68, 68, 0.2)", textAlign: "center" }}>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Xato</div>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--danger)" }}>{testResult.wrong}</div>
                 </div>
              </div>

              <div style={{ marginBottom: "24px" }}>
                 <h4 style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Xato qilingan savollar:</h4>
                 <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {testResult.wrongQs.map((q: number) => (
                       <span key={q} style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(239, 68, 68, 0.1)", color: "var(--danger)", display: "grid", placeItems: "center", fontWeight: 700, border: "1px solid rgba(239, 68, 68, 0.2)" }}>{q}</span>
                    ))}
                    {testResult.wrongQs.length === 0 && (
                      <span style={{ fontSize: "0.85rem", color: "var(--secondary)", fontWeight: 600 }}>Mukammal! Hech qanday xato yo'q.</span>
                    )}
                 </div>
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                 <button className="btn btn-primary" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }} onClick={() => { setNotice("Tasdiqlandi"); setTestStep(3); setTestStudent(""); setTestStudentAnswers({}); setTestImage(null); }}><Check size={16}/> Tasdiqlash</button>
                 <button className="btn btn-outline" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }} onClick={() => { setNotice("Jurnalga qo'shildi!"); setToolsActiveView("home"); }}><BookType size={16}/> Jurnalga</button>
              </div>
           </div>
        )}
      </div>
    );
  }

  function renderControlWorkChecker() {
    const activeClass = findToolClass(cwClass);
    const dashboardStudents = teacherDashboard?.students?.filter((student) => !activeClass?.id || student.class_ids?.includes(activeClass.id)) || [];
    const toolStudents = classStudents.length ? classStudents : dashboardStudents.length ? dashboardStudents : [
      { id: "demo_ali", full_name: "Ali Valiyev" },
      { id: "demo_madina", full_name: "Madina Karimova" },
    ];
    const cwProblems = cwAnswerKey?.problems || [];
    const updateCwAnswerProblem = (index: number, updates: Partial<AnswerProblem>) => {
      if (!cwAnswerKey) return;
      const nextProblems = [...(cwAnswerKey.problems || [])];
      nextProblems[index] = { ...nextProblems[index], ...updates };
      setCwAnswerKey({ ...cwAnswerKey, problems: nextProblems });
    };

    return (
      <div className="animate-fade-in pb-20">
        <button className="btn btn-outline" onClick={() => setToolsActiveView("home")} style={{ marginBottom: "1rem", padding: "4px 10px", fontSize: "0.8rem" }}>
          <ArrowLeft size={14} style={{ marginRight: "4px" }}/> Orqaga
        </button>
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>Nazorat ishlari</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Yozma nazorat ishlarini rasm orqali AI yordamida tekshiring
          </p>
        </div>

        {cwStep === 1 && (
           <div className="card animate-fade-in">
              <h3 style={{ marginBottom: "16px", fontSize: "1.1rem", fontWeight: 800 }}>Yangi Nazorat Ishi</h3>
              <div style={{ marginBottom: "12px" }}>
                <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Nazorat nomi</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={cwName} 
                  onChange={e => setCwName(e.target.value)} 
                  placeholder="Kvadrat tenglamalar nazorat ishi" 
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                <div>
                  <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Sinf</label>
                  <select
                    className="input-field"
                    value={cwClass}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      const nextClass = classes.find((cls) => cls.id === nextValue || cls.name === nextValue);
                      setCwClass(nextValue);
                      setCwStudent("");
                      if (nextClass) setCwSubject(nextClass.subject);
                    }}
                  >
                     {classes.length ? classes.map((cls) => (
                       <option key={cls.id} value={cls.name}>{cls.name}</option>
                     )) : (
                       <>
                         <option value="8-A">8-A</option>
                         <option value="9-B">9-B</option>
                       </>
                     )}
                  </select>
                </div>
                <div>
                  <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Max ball</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    value={cwMaxScore} 
                    onChange={e => setCwMaxScore(Math.max(1, Number(e.target.value)))} 
                  />
                </div>
              </div>
              <div style={{ marginBottom: "16px" }}>
                <label className="text-muted" style={{ fontSize: "0.8rem", display: "block", marginBottom: "4px" }}>Fan</label>
                <select className="input-field" value={cwSubject} onChange={e => setCwSubject(e.target.value)}>
                   <option value="Matematika">Matematika</option>
                   <option value="Fizika">Fizika</option>
                   <option value="Kimyo">Kimyo</option>
                </select>
              </div>
              <button
                className="btn btn-primary"
                style={{ width: "100%", marginTop: "8px" }}
                onClick={() => {
                  setCwBaseImage(null);
                  setCwAnswerKey(null);
                  setCwImage(null);
                  setCwResult(null);
                  setCwStep(2);
                }}
              >
                Base yaratish
              </button>
           </div>
        )}

        {cwStep === 2 && (
           <div className="card animate-fade-in">
              <div className="flex-between" style={{ marginBottom: "16px" }}>
                 <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Base savollar</h3>
                 <span className="badge badge-gray" style={{ background: "rgba(139, 92, 246, 0.1)", color: "#8b5cf6" }}>{activeClass?.name || cwClass}</span>
              </div>
              <p style={{ margin: "0 0 12px", fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                Savollar rasmi yuklanadi, AI javob kalitini shakllantiradi. Ustoz uni tahrirlab, keyin o'quvchi ishlarini ketma-ket tekshiradi.
              </p>
              <input
                className="input-field"
                style={{ marginBottom: "12px" }}
                value={cwProblemRange}
                onChange={(event) => setCwProblemRange(event.target.value)}
                placeholder="Masalan: 1-variant, 1-5 savollar"
              />
              <label className="file-picker" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", border: "2px dashed var(--border)", borderRadius: "12px", cursor: "pointer", background: "var(--background)" }}>
                <Upload size={32} color="var(--primary)" style={{ marginBottom: "8px" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>{cwBaseImage ? cwBaseImage.name : "Nazorat savollari rasmini yuklang"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setCwBaseImage(e.target.files?.[0] || null)} />
              </label>

              <button className="btn btn-primary" style={{ width: "100%" }} disabled={!cwBaseImage || busyAction === "analyze-control-base"} onClick={() => void handleAnalyzeControlWorkBase()}>
                {busyAction === "analyze-control-base" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <FileCheck size={18} />}
                {busyAction === "analyze-control-base" ? "AI tahlil qilmoqda..." : "Base ni AI bilan tahlil qilish"}
              </button>
              {busyAction === "analyze-control-base" ? renderSoftLoading("Base savollar tahlil qilinmoqda", "AI savollarni o'qib, javob kalitini shakllantirmoqda.") : null}

              {cwAnswerKey ? (
                <div style={{ display: "grid", gap: "10px", marginTop: "14px" }}>
                  <div className="flex-between">
                    <strong style={{ fontSize: "0.9rem" }}>Javob kaliti</strong>
                    <span className="badge badge-blue" style={{ fontSize: "0.68rem", padding: "2px 7px" }}>{cwProblems.length} ta savol</span>
                  </div>
                  {cwProblems.map((problem, index) => (
                    <div key={`${problem.problem_number}-${index}`} style={{ display: "grid", gap: "8px", padding: "10px", background: "var(--background)", borderRadius: "10px", border: "1px solid var(--border)" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "74px 1fr", gap: "8px" }}>
                        <input className="input-field" value={problem.problem_number || ""} onChange={(event) => updateCwAnswerProblem(index, { problem_number: event.target.value })} placeholder="#" />
                        <input className="input-field" value={problem.correct_answer || ""} onChange={(event) => updateCwAnswerProblem(index, { correct_answer: event.target.value })} placeholder="To'g'ri javob" />
                      </div>
                      <textarea className="input-field" rows={2} style={{ resize: "none" }} value={problem.problem_text || ""} onChange={(event) => updateCwAnswerProblem(index, { problem_text: event.target.value })} placeholder="Savol matni" />
                    </div>
                  ))}
                  {cwProblems.length === 0 ? <div className="empty-state compact">AI savol ajrata olmadi. Rasmni aniqroq yuklang.</div> : null}
                  <button className="btn btn-secondary" type="button" disabled={!cwProblems.length} onClick={() => setCwStep(3)}>
                    <Check size={17} /> Base ni tasdiqlash
                  </button>
                </div>
              ) : null}
           </div>
        )}

        {cwStep === 3 && (
           <div className="card animate-fade-in">
              <div className="flex-between" style={{ marginBottom: "16px" }}>
                 <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>O'quvchi ishini tekshirish</h3>
                 <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>Base tayyor</span>
              </div>
              <select className="input-field" style={{ marginBottom: "16px" }} value={cwStudent} onChange={e => setCwStudent(e.target.value)}>
                 <option value="">O'quvchini tanlang...</option>
                 {toolStudents.map((student) => (
                   <option key={student.id || student.full_name || student.name} value={student.full_name || student.name}>
                     {student.full_name || student.name}
                   </option>
                 ))}
              </select>

              <label className="file-picker" style={{ marginBottom: "16px", display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", border: "2px dashed var(--border)", borderRadius: "12px", cursor: "pointer", background: "var(--background)" }}>
                <Camera size={32} color="var(--primary)" style={{ marginBottom: "8px" }} />
                <span style={{ fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600 }}>{cwImage ? cwImage.name : "Yozma ish rasmini yuklang"}</span>
                <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => setCwImage(e.target.files?.[0] || null)} />
              </label>

              <button className="btn btn-primary" style={{ width: "100%" }} disabled={!cwImage || !cwStudent || busyAction === "check-control-work"} onClick={() => void handleCheckControlWork()}>
                {busyAction === "check-control-work" ? <RefreshCcw size={18} style={{ animation: "spin 1.2s linear infinite" }} /> : <Send size={18} />}
                {busyAction === "check-control-work" ? "Tekshirilmoqda..." : "AI bilan tekshirish"}
              </button>
              {busyAction === "check-control-work" ? renderSoftLoading("Nazorat ishi tekshirilmoqda", "Yozuvlar o'qilib, yechimlar va umumiy feedback tayyorlanmoqda.") : null}
           </div>
        )}

        {cwStep === 4 && (
           <div className="card text-center animate-fade-in" style={{ padding: "3rem 1rem" }}>
              <RefreshCcw size={40} style={{ animation: "spin 1.5s linear infinite", marginBottom: "1rem", color: "var(--primary)", margin: "0 auto 1rem" }} />
              <h3 style={{ fontSize: "1.1rem" }}>Nazorat ishi tahlil qilinmoqda...</h3>
              <p className="text-muted mt-2" style={{ fontSize: "0.85rem" }}>Yozuvlar o'qilmoqda va yechimlar tekshirilmoqda...</p>
           </div>
        )}

        {cwStep === 5 && cwResult && (
           <div className="card animate-fade-in">
              <div className="flex-between mb-3">
                 <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>{cwStudent}</h3>
                 
                 <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button className="icon-btn" style={{ padding: "4px 8px", background: "var(--border)", border: "none", borderRadius: "4px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }} onClick={() => setCwResult({ ...cwResult, score: Math.max(0, cwResult.score - 1) })}>-</button>
                    <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary)" }}>
                       {cwResult.score}
                    </span>
                    <button className="icon-btn" style={{ padding: "4px 8px", background: "var(--border)", border: "none", borderRadius: "4px", fontSize: "1rem", fontWeight: "bold", cursor: "pointer" }} onClick={() => setCwResult({ ...cwResult, score: Math.min(cwResult.max, cwResult.score + 1) })}>+</button>
                    <span style={{ fontSize: "1.1rem", color: "var(--text-muted)", marginLeft: "4px" }}>/ {cwResult.max}</span>
                 </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "20px" }}>
                 <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--secondary)" }}>{cwResult.correct}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>To'g'ri</div>
                 </div>
                 <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--warning)" }}>{cwResult.partial}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Qisman</div>
                 </div>
                 <div style={{ padding: "12px", background: "var(--background)", borderRadius: "8px", textAlign: "center", border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--danger)" }}>{cwResult.wrong}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Xato</div>
                 </div>
              </div>

              <div style={{ marginBottom: "20px", display: "grid", gap: "10px" }}>
                 {cwResult.problems && cwResult.problems.map((prob: any, idx: number) => (
                    <div key={idx} className="card" style={{ padding: "12px", border: "1px solid var(--border)", background: "var(--background)" }}>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <span className={`badge ${prob.status === 'Xato' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: "0.75rem" }}>{prob.status}</span>
                          <button 
                            style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", display: "grid", placeItems: "center" }}
                            onClick={() => {
                               const newProbs = cwResult.problems.filter((_: any, i: number) => i !== idx);
                               const correct = newProbs.filter((p: any) => p.status === "To'g'ri").length;
                               const partial = newProbs.filter((p: any) => p.status === "Qisman").length;
                               const wrong = newProbs.filter((p: any) => p.status === "Xato").length;
                               setCwResult({ ...cwResult, problems: newProbs, correct, partial, wrong });
                            }}
                          >
                             <X size={16} />
                          </button>
                       </div>
                       <input 
                         type="text" 
                         className="input-field" 
                         style={{ fontSize: "0.85rem", padding: "6px 8px", background: "var(--surface)", border: "1px solid var(--border)", margin: 0 }}
                         value={prob.desc} 
                         onChange={(e) => {
                            const newProbs = [...cwResult.problems];
                            newProbs[idx] = { ...newProbs[idx], desc: e.target.value };
                            setCwResult({ ...cwResult, problems: newProbs });
                         }}
                       />
                    </div>
                 ))}
                 {(!cwResult.problems || cwResult.problems.length === 0) && (
                    <span style={{ fontSize: "0.85rem", color: "var(--secondary)", fontWeight: 600, textAlign: "center" }}>Hech qanday muammo topilmadi!</span>
                 )}
              </div>

              <div style={{ display: "flex", gap: "8px" }}>
                 <button className="btn btn-primary" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }} onClick={() => { setNotice("Tasdiqlandi"); setCwStep(3); setCwStudent(""); setCwImage(null); }}><Check size={16}/> Keyingi o'quvchi</button>
                 <button className="btn btn-outline" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }} onClick={() => { setNotice("Jurnalga qo'shildi!"); setToolsActiveView("home"); }}><BookType size={16}/> Jurnalga</button>
              </div>
           </div>
        )}
      </div>
    );
  }

  function renderJournal() {
    const mockStudents = [
      { id: "1", name: "Ali Valiyev", avg: 85, scores: [100, 80, 75, 90] },
      { id: "2", name: "Malika Sobirova", avg: 92, scores: [90, 95, 100, 85] },
      { id: "3", name: "Sardor Oripov", avg: 68, scores: [60, 70, 55, 80] },
      { id: "4", name: "Nigina Azimova", avg: 74, scores: [80, 60, 75, 80] },
    ];
    return (
      <div className="animate-fade-in pb-20">
        <div className="section-title" style={{ marginBottom: "1.2rem" }}>
          <h2>O'qituvchi Jurnali</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            O'quvchilarning baholari va o'zlashtirish tahlili
          </p>
        </div>
        
        <div className="card" style={{ marginBottom: "16px", background: "linear-gradient(135deg, var(--surface) 0%, rgba(139, 92, 246, 0.05) 100%)" }}>
          <div className="flex-between" style={{ marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "1rem", color: "var(--text-main)" }}>Sinf o'zlashtirishi</h3>
            <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "#8b5cf6" }}>80%</span>
          </div>
          <div style={{ width: "100%", height: "8px", background: "var(--border)", borderRadius: "4px", overflow: "hidden" }}>
            <div style={{ width: "80%", height: "100%", background: "#8b5cf6", borderRadius: "4px" }}></div>
          </div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "10px", margin: 0 }}>
            O'tgan haftaga nisbatan +5% o'sish
          </p>
        </div>

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "16px", borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.02)" }}>
            <h3 style={{ margin: 0, fontSize: "0.95rem" }}>O'quvchilar ro'yxati</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {mockStudents.map((s, idx) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", padding: "12px 16px", borderBottom: idx !== mockStudents.length - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--primary)", color: "white", display: "grid", placeItems: "center", fontSize: "0.8rem", fontWeight: 800, marginRight: "12px" }}>
                  {initials(s.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-main)" }}>{s.name}</div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                    {s.scores.map((score, i) => (
                      <div key={i} style={{ 
                        width: "16px", height: "16px", borderRadius: "4px", 
                        background: score >= 85 ? "var(--secondary)" : score >= 70 ? "var(--warning)" : "var(--danger)",
                        opacity: 0.8
                      }} title={`${score}%`} />
                    ))}
                  </div>
                </div>
                <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-main)" }}>
                  {s.avg}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderPractice() {
    const revisionItems = homeworks
      .filter((homework) => homework.student_status === "submitted")
      .map((homework, index) => ({
        id: homework.id,
        title: homework.title,
        subject: homework.subject,
        score: homework.latest_percentage ?? (index === 0 ? 84 : 92),
        focus: (homework.latest_percentage ?? 100) < 80 ? "Xatolarni qayta ishlash" : "Mustahkamlash",
      }));
    const revisionList = revisionItems.length
      ? revisionItems
      : [
          { id: "rev_quad", title: "Kvadrat tenglamalar", subject: "Matematika", score: 84, focus: "Xatolarni qayta ishlash" },
          { id: "rev_linear", title: "Chiziqli tenglamalar", subject: "Matematika", score: 92, focus: "Mustahkamlash" },
        ];

    // Screen 8: Practice Question
    if (studentPracticeStep === "question") {
      const handleNumpad = (val: string) => {
        if (val === "back") {
          setStudentPracticeInput(prev => prev.slice(0, -1));
        } else {
          setStudentPracticeInput(prev => prev + val);
        }
      };

      return (
        <div className="animate-fade-in pb-20">
          {/* Header row */}
          <div className="flex-between" style={{ marginBottom: "1rem" }}>
            <button
              className="icon-btn"
              style={{ border: "none", background: "rgba(0,0,0,0.05)", width: "32px", height: "32px", borderRadius: "50%", display: "grid", placeItems: "center" }}
              onClick={() => setStudentPracticeStep("list")}
            >
              <X size={16} color="var(--text-main)" />
            </button>
            <div className="flex-start" style={{ gap: "10px" }}>
              <div className="flex-start" style={{ gap: "4px", color: "var(--danger)" }}>
                <Flame size={18} fill="var(--danger)" />
                <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{studentStreak} kun</span>
              </div>
              <span className="badge badge-green" style={{ fontSize: "0.75rem", fontWeight: 800 }}>+15 XP</span>
            </div>
          </div>

          {/* Segmented step progress */}
          <div style={{ display: "flex", gap: "4px", marginBottom: "1.2rem" }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((step) => {
              let bg = "var(--border)";
              if (step < 3) bg = "var(--green)";
              if (step === 3) bg = "var(--primary)";
              return (
                <div key={step} style={{ flex: 1, height: "6px", background: bg, borderRadius: "3px" }}></div>
              );
            })}
          </div>
          <div className="flex-between" style={{ marginBottom: "1rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700 }}>
            <span>Mavzu: Kvadrat tenglamalar</span>
            <span>Takrorlash: 3 / 10</span>
          </div>

          {/* Math question card */}
          <div className="card" style={{ padding: "1.8rem 1.5rem", borderRadius: "18px", border: "1px solid var(--border)", textAlign: "center", marginBottom: "1.2rem", background: "white" }}>
            <p style={{ margin: "0 0 8px", fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>TENGLAMANING ILDIZLARINI TOPING</p>
            <div className="math-formula">
              2x<sup>2</sup> - 5x - 3 = 0
            </div>
            <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--primary)", fontWeight: 700 }}>Kichik ildizini kiriting</p>
          </div>

          {/* Answer input */}
          <div style={{ margin: "0 auto 1.5rem", maxWidth: "240px", position: "relative" }}>
            <input
              type="text"
              readOnly
              value={studentPracticeInput}
              placeholder="Javob"
              style={{ width: "100%", padding: "12px", borderRadius: "12px", border: "2px solid var(--primary)", fontSize: "1.4rem", fontWeight: 800, textAlign: "center", background: "white", color: "var(--text-main)" }}
            />
            {studentPracticeInput && (
              <button
                onClick={() => setStudentPracticeInput("")}
                style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", border: "none", background: "none", fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}
              >
                Tozalash
              </button>
            )}
          </div>

          {/* Custom numpad */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", maxWidth: "320px", margin: "0 auto 1.5rem" }}>
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "-", "0", "."].map((val) => (
              <button
                key={val}
                type="button"
                className="btn btn-outline"
                style={{ height: "48px", borderRadius: "10px", fontSize: "1.1rem", fontWeight: 800, border: "1px solid var(--border)", background: "white" }}
                onClick={() => handleNumpad(val)}
              >
                {val}
              </button>
            ))}
            <button
              type="button"
              className="btn btn-outline"
              style={{ gridColumn: "span 3", height: "44px", borderRadius: "10px", fontSize: "0.9rem", fontWeight: 800, border: "1px solid var(--border)", background: "#fee2e2", color: "var(--danger)" }}
              onClick={() => handleNumpad("back")}
            >
              O'chirish
            </button>
          </div>

          {/* Submit */}
          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.8rem" }}
            onClick={() => setStudentPracticeStep("complete")}
          >
            Tekshirish
          </button>
        </div>
      );
    }

    // Screen 9: Practice Session Complete
    if (studentPracticeStep === "complete") {
      const handleFinishPractice = () => {
        setStudentXP(prev => prev + 15);
        setStudentStreak(prev => prev + 1);
        setStudentPracticeStep("list");
      };

      return (
        <div className="animate-fade-in pb-20 flex-center" style={{ flexDirection: "column", minHeight: "85vh", textAlign: "center", padding: "1rem" }}>
          <div style={{ position: "relative", marginBottom: "1.5rem" }}>
            <div style={{ width: "90px", height: "90px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.1)", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <Trophy size={48} color="var(--warning)" />
            </div>
            <div style={{ position: "absolute", top: -5, right: -5, animation: "bounce 2s infinite" }}>
              <Star size={18} color="var(--warning)" fill="var(--warning)" />
            </div>
          </div>

          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, margin: "0 0 6px", color: "var(--text-main)" }}>Takrorlash yakunlandi!</h2>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 1.5rem" }}>Oldin ishlangan misollar qayta mustahkamlandi</p>

          {/* Stats grid */}
          <div className="stat-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", width: "100%", marginBottom: "1.5rem" }}>
            <div className="card" style={{ padding: "10px", margin: 0, border: "1px solid var(--border)", background: "white" }}>
              <CheckCircle size={18} color="var(--green)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: "1rem", fontWeight: 800 }}>8 / 10</div>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>To'g'ri</span>
            </div>
            <div className="card" style={{ padding: "10px", margin: 0, border: "1px solid var(--border)", background: "white" }}>
              <Star size={18} color="var(--warning)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: "1rem", fontWeight: 800 }}>+15 XP</div>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>Tajriba</span>
            </div>
            <div className="card" style={{ padding: "10px", margin: 0, border: "1px solid var(--border)", background: "white" }}>
              <Flame size={18} color="var(--danger)" style={{ margin: "0 auto 4px" }} />
              <div style={{ fontSize: "1rem", fontWeight: 800 }}>13 kun</div>
              <span style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 600 }}>Streak</span>
            </div>
          </div>

          {/* Badge Achievement Card */}
          <div className="card" style={{ padding: "14px 16px", borderRadius: "14px", border: "1px solid rgba(59, 130, 246, 0.2)", background: "rgba(59, 130, 246, 0.03)", display: "flex", gap: "12px", alignItems: "center", textAlign: "left", width: "100%", marginBottom: "1.5rem" }}>
            <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "white", display: "grid", placeItems: "center", fontSize: "1.1rem" }}>
              <Trophy size={20} />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 800 }}>Yangi Yutuq!</h4>
              <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>Siz <strong>'Kvadratlar qiroli'</strong> nishonini qo'lga kiritdingiz!</p>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center", fontWeight: 800, padding: "0.75rem", marginBottom: "10px" }}
            onClick={handleFinishPractice}
          >
            Davom etish
          </button>
          <button
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", fontWeight: 700, padding: "0.75rem" }}
            onClick={handleFinishPractice}
          >
            Darslarga qaytish
          </button>
        </div>
      );
    }

    // Screen 7: Revision Home
    return (
      <div className="animate-fade-in pb-20">
        <div className="section-title">
          <h2>Takrorlash</h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
            Oldin ishlangan misollarni qayta mustahkamlash
          </p>
        </div>

        {/* Continue card */}
        <div className="card" style={{ background: "linear-gradient(135deg, var(--secondary), #10b981)", color: "white", border: "none", padding: "1.2rem", borderRadius: "16px", marginBottom: "1.2rem" }}>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.8)", fontSize: "0.7rem", margin: 0, fontWeight: 700 }}>QAYTA ISHLASH</p>
          <h3 style={{ color: "white", fontSize: "1.15rem", margin: "6px 0 4px", fontWeight: 700 }}>{revisionList[0]?.title || "Kvadrat tenglamalar"}</h3>
          <div className="flex-between" style={{ fontSize: "0.75rem", margin: "8px 0 4px", opacity: 0.9 }}>
            <span>Oxirgi natija: {revisionList[0]?.score ?? 84}%</span>
            <span>{revisionList[0]?.subject || "Matematika"}</span>
          </div>
          <div style={{ width: "100%", height: "6px", background: "rgba(255,255,255,0.25)", borderRadius: "3px", overflow: "hidden", marginBottom: "12px" }}>
            <div style={{ width: "80%", height: "100%", background: "white" }}></div>
          </div>
          <button className="btn" style={{ background: "white", color: "var(--secondary)", fontWeight: 800, fontSize: "0.8rem", padding: "6px 12px", borderRadius: "8px" }} onClick={() => setStudentPracticeStep("question")}>
            Qayta ishlash
          </button>
        </div>

        <h3 style={{ fontSize: "0.9rem", fontWeight: 800, margin: "0 0 10px", color: "var(--text-muted)", textTransform: "uppercase" }}>
          Oldin ishlangan misollar
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {revisionList.map((item) => {
            const meta = getSubjectMeta(item.subject);
            const needsWork = item.score < 80;
            return (
              <div className="card" key={item.id} style={{ padding: "14px", border: needsWork ? "1px solid rgba(239,68,68,0.22)" : "1px solid var(--border)", position: "relative" }} onClick={() => setStudentPracticeStep("question")}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <span className={`badge ${needsWork ? "badge-orange" : "badge-green"}`} style={{ fontSize: "0.65rem", padding: "2px 6px" }}>{item.focus}</span>
                  <span style={{ fontSize: "0.7rem", color: meta.color, fontWeight: 800 }}>{item.score}%</span>
                </div>
                <div className="flex-start" style={{ gap: "10px" }}>
                  <span style={{ width: 36, height: 36, borderRadius: "10px", background: meta.bg, color: meta.color, display: "grid", placeItems: "center", flexShrink: 0 }}>{meta.icon}</span>
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "0.95rem", fontWeight: 800 }}>{item.title}</h4>
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)" }}>{item.subject} bo'yicha qayta ishlash</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  function renderTutor() {
    const tutorInsights = buildProgressInsights(homeworks, studentSubmissionsByHomework);
    const tutorMistakes = tutorInsights.mistakes.length
      ? tutorInsights.mistakes
      : [
          {
            label: "Diskriminantda ishora xatosi",
            suggestion: "c manfiy bo'lsa, -4ac musbat qiymat beradi. Shuning uchun D = 25 - (-24) = 49 bo'ladi.",
            count: 1,
            homeworks: ["Chiziqli tenglamalar sistemasi"],
            problems: ["3"],
          },
        ];
    const activeMistake = tutorMistakes[0];

    const handleSendTutor = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !studentTutorInput.trim()) return;

      const messageText = studentTutorInput.trim();
      const history = studentTutorChat.map(({ sender, text }) => ({ sender, text })).slice(-6);
      const newUserMsg = { sender: "user" as const, text: messageText, time: "Hozir" };
      setStudentTutorChat(prev => [...prev, newUserMsg]);
      setStudentTutorInput("");
      setBusyAction("student-tutor");
      setError("");

      try {
        const reply = await sendTutorMessage(user.id, {
          message: messageText,
          homeworkId: studentSelectedHomeworkId || undefined,
          history,
        });
        setStudentTutorChat(prev => [
          ...prev,
          {
            sender: "ai" as const,
            text: reply.answer || `${activeMistake.label}: ${activeMistake.suggestion || "Bu xatoni qayta yechishda har bir amalni alohida yozib chiqing."}`,
            time: "Hozir"
          }
        ]);
      } catch (caught) {
        const tutorError = getErrorMessage(caught);
        setError(tutorError);
        setStudentTutorChat(prev => [
          ...prev,
          {
            sender: "ai" as const,
            text: `AI tutor hozir javob bera olmadi: ${tutorError}. Backend ishlayotganini va GROQ_API_KEY kiritilganini tekshiring.`,
            time: "Hozir"
          }
        ]);
      } finally {
        setBusyAction(null);
      }
    };

    return (
      <div className="animate-fade-in pb-20" style={{ height: "calc(100vh - 80px)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "12px 16px", background: "white", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px", position: "sticky", top: 0, zIndex: 10 }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--primary)", display: "grid", placeItems: "center", color: "white" }}>
            <MessageCircle size={20} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>AI izoh</h2>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--secondary)", fontWeight: 600 }}>Uy vazifa xatolari</p>
          </div>
        </div>

        {/* Message body */}
        <div style={{ flex: 1, padding: "16px", overflowY: "auto", background: "var(--background)", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Math feedback context header */}
          <div className="card" style={{ padding: "12px 14px", border: "1px solid rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.03)", borderRadius: "12px" }}>
            <h4 style={{ margin: "0 0 6px", fontSize: "0.85rem", fontWeight: 800, color: "var(--danger)", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={14} /> {activeMistake.label}
            </h4>
            <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Vazifa: <strong>{activeMistake.homeworks[0] || "Uy vazifa"}</strong> <br/>
              Masala: <strong>{activeMistake.problems[0] || "aniqlangan xato"}</strong> <br/>
              Izoh: {activeMistake.suggestion || "Xatoni bosqichma-bosqich qayta ko'rib chiqamiz."}
            </p>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            {tutorMistakes.slice(0, 3).map((mistake) => (
              <div key={`${mistake.label}-${mistake.count}`} style={{ background: "white", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px 12px" }}>
                <div className="flex-between" style={{ gap: "8px" }}>
                  <strong style={{ fontSize: "0.82rem", color: "var(--text-main)" }}>{mistake.label}</strong>
                  <span style={{ fontSize: "0.7rem", color: "var(--danger)", fontWeight: 800 }}>{mistake.count} marta</span>
                </div>
                <p style={{ margin: "5px 0 0", color: "var(--text-muted)", fontSize: "0.76rem", lineHeight: 1.4 }}>
                  {mistake.homeworks.slice(0, 2).join(", ")}
                </p>
              </div>
            ))}
          </div>

          {studentTutorChat.map((msg, index) => {
            const isUser = msg.sender === "user";
            return (
              <div key={index} style={{ alignSelf: isUser ? "flex-end" : "flex-start", maxWidth: "85%" }}>
                <div
                  style={{
                    background: isUser ? "var(--primary)" : "white",
                    color: isUser ? "white" : "var(--text-main)",
                    padding: "12px 16px",
                    borderRadius: "16px",
                    borderBottomLeftRadius: isUser ? "16px" : "4px",
                    borderBottomRightRadius: isUser ? "4px" : "16px",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.02)",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word"
                  }}
                >
                  {msg.text}
                </div>
                <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", marginTop: "4px", marginLeft: "4px", marginRight: "4px", textAlign: isUser ? "right" : "left" }}>
                  {msg.time || "10:30 AM"}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input box */}
        <form onSubmit={handleSendTutor} style={{ padding: "12px 16px", background: "white", borderTop: "1px solid var(--border)", position: "sticky", bottom: "60px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={studentTutorInput}
              onChange={(e) => setStudentTutorInput(e.target.value)}
              placeholder="Xato bo'yicha savol yozing..."
              disabled={busyAction === "student-tutor"}
              style={{ flex: 1, padding: "12px 16px", borderRadius: "24px", border: "1px solid var(--border)", background: "var(--background)", fontSize: "0.9rem" }}
            />
            <button type="submit" disabled={busyAction === "student-tutor"} style={{ width: "45px", height: "45px", borderRadius: "50%", background: "var(--primary)", color: "white", border: "none", display: "grid", placeItems: "center", opacity: busyAction === "student-tutor" ? 0.7 : 1 }}>
              {busyAction === "student-tutor" ? <RefreshCcw size={18} style={{ animation: "spin 1.5s linear infinite" }} /> : <Send size={18} style={{ marginLeft: "-2px" }} />}
            </button>
          </div>
        </form>
      </div>
    );
  }


  function renderProgress() {
    const completedHomeworks = homeworks.filter(h => h.student_status === "submitted");
    let totalScore = 0;
    completedHomeworks.forEach(hw => totalScore += (hw.latest_score || 0));
    const avg = completedHomeworks.length ? Math.round((totalScore / (completedHomeworks.length * 10)) * 100) : 84;

    return (
      <div className="animate-fade-in pb-20">
        <h2 style={{ margin: "0 0 1.2rem", fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)" }}>O'zlashtirish</h2>

        {/* Summary stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.2rem" }}>
          {[
            { label: "O'rtacha ball", val: `${avg}%`, color: avg >= 80 ? "var(--secondary)" : avg >= 60 ? "var(--warning)" : "var(--danger)", bg: avg >= 80 ? "rgba(16,185,129,0.08)" : "rgba(245,158,11,0.08)" },
            { label: "Bajarilgan", val: `${completedHomeworks.length} ta`, color: "var(--primary)", bg: "rgba(59,130,246,0.08)" },
            { label: "XP darajasi", val: `${studentXP} XP`, color: "#8b5cf6", bg: "rgba(139,92,246,0.08)" },
            { label: "Streak", val: `${studentStreak} kun 🔥`, color: "var(--danger)", bg: "rgba(239,68,68,0.08)" },
          ].map(s => (
            <div key={s.label} style={{ background: s.bg, borderRadius: "14px", padding: "14px", border: "1px solid var(--border)" }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontWeight: 700, marginBottom: "6px", textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: "1.2rem", fontWeight: 900, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ background: "white", borderRadius: "16px", padding: "16px", border: "1px solid var(--border)", marginBottom: "1.2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
            <span style={{ fontWeight: 800, fontSize: "0.88rem" }}>Umumiy o'zlashtirish</span>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--primary)" }}>{avg}%</span>
          </div>
          <div style={{ width: "100%", height: "10px", background: "#f1f5f9", borderRadius: "5px", overflow: "hidden" }}>
            <div style={{ width: `${avg}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), #4f86f7)", borderRadius: "5px", transition: "width 0.8s ease" }} />
          </div>
          <p style={{ margin: "8px 0 0", fontSize: "0.72rem", color: "var(--text-muted)" }}>
            O'tgan haftaga nisbatan +5% o'sish 📈
          </p>
        </div>

        {/* Achievements */}
        <h3 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Yutuqlar</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "1.2rem" }}>
          {[
            { emoji: "🏆", label: "Ishtiyoqchi", sub: "10 ta mashq", done: true },
            { emoji: "⚡", label: "Muntazam", sub: "7 kun ketma-ket", done: true },
            { emoji: "🎯", label: "Perfeksionist", sub: "90%+ aniqlik", done: false },
          ].map(a => (
            <div key={a.label} style={{ background: a.done ? "white" : "#f8fafc", borderRadius: "14px", padding: "14px 10px", border: `1px solid ${a.done ? "var(--border)" : "#e2e8f0"}`, textAlign: "center", opacity: a.done ? 1 : 0.5 }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "6px" }}>{a.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: "0.78rem", color: "var(--text-main)", marginBottom: "2px" }}>{a.label}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text-muted)" }}>{a.sub}</div>
            </div>
          ))}
        </div>

        {/* AI recommendation */}
        <div style={{ background: "rgba(59,130,246,0.04)", borderRadius: "16px", padding: "16px", border: "1px solid rgba(59,130,246,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
            <span style={{ fontSize: "1.1rem" }}>🤖</span>
            <span style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--primary)" }}>AI tavsiyasi</span>
          </div>
          <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-main)", lineHeight: 1.5 }}>
            Diskriminant hisoblashda xato ko'p uchramoqda. Belgilar bilan ishlashni mashq qiling. Qo'shimcha 5 ta mashq tavsiya qilinadi.
          </p>
          <button
            onClick={() => navigateTo("practice")}
            style={{ marginTop: "12px", background: "var(--primary)", color: "white", border: "none", borderRadius: "10px", padding: "8px 16px", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
          >
            Mashqlarni boshlash →
          </button>
        </div>
      </div>
    );
  }

  function renderLegacyStudentProfilePreview() {
    const completedHomeworks = homeworks.filter(h => h.student_status === "submitted");
    const level = Math.floor(studentXP / 200) + 1;
    const xpForNextLevel = level * 200;
    const xpProgress = Math.round((studentXP / xpForNextLevel) * 100);

    return (
      <div className="animate-fade-in pb-20">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.4rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 900, color: "var(--text-main)" }}>Profil</h2>
          <button style={{ width: 36, height: 36, borderRadius: "10px", background: "var(--surface)", border: "1px solid var(--border)", display: "grid", placeItems: "center", cursor: "pointer" }}>
            <Settings size={18} color="var(--text-muted)" />
          </button>
        </div>

        {/* Avatar + name card */}
        <div style={{ background: "white", borderRadius: "20px", padding: "20px", border: "1px solid var(--border)", marginBottom: "1.2rem", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #8b5cf6)", display: "grid", placeItems: "center", margin: "0 auto 12px", overflow: "hidden", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }}>
            {user?.photo_url
              ? <img src={user.photo_url} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <span style={{ fontWeight: 900, fontSize: "1.5rem", color: "white" }}>{initials(user?.full_name || "M")}</span>
            }
          </div>
          <h3 style={{ margin: "0 0 3px", fontSize: "1.1rem", fontWeight: 900 }}>{user?.full_name || "Malika To'rayeva"}</h3>
          <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
            {user?.telegram_username ? `@${user.telegram_username}` : "o'quvchi@edu.uz"}
          </p>

          {/* XP progress */}
          <div style={{ background: "#f1f5f9", borderRadius: "10px", padding: "10px 14px", textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-main)" }}>Daraja {level}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{studentXP} / {xpForNextLevel} XP</span>
            </div>
            <div style={{ width: "100%", height: "8px", background: "#e2e8f0", borderRadius: "4px", overflow: "hidden" }}>
              <div style={{ width: `${xpProgress}%`, height: "100%", background: "linear-gradient(90deg, var(--primary), #8b5cf6)", borderRadius: "4px" }} />
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "1.2rem" }}>
          {[
            { label: "Daraja", val: String(level), icon: "⭐", color: "var(--warning)" },
            { label: "Topshiriqlar", val: `${completedHomeworks.length}`, icon: "📋", color: "var(--primary)" },
            { label: "O'tacha natija", val: "4.3/5.0", icon: "📊", color: "var(--secondary)" },
            { label: "Seriya", val: `${studentStreak} kun`, icon: "🔥", color: "var(--danger)" },
            { label: "Bajarilgan", val: `${completedHomeworks.length}`, icon: "✅", color: "var(--secondary)" },
            { label: "XP", val: `${studentXP}`, icon: "💎", color: "#8b5cf6" },
          ].map(s => (
            <div key={s.label} style={{ background: "white", borderRadius: "14px", padding: "12px 8px", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: "1.1rem", marginBottom: "4px" }}>{s.icon}</div>
              <div style={{ fontWeight: 900, fontSize: "1rem", color: s.color, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: "0.62rem", color: "var(--text-muted)", marginTop: "3px" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Achievements */}
        <h3 style={{ margin: "0 0 10px", fontSize: "0.78rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Yutuqlar</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "1.4rem" }}>
          {[
            { emoji: "🏆", label: "Ishtiyoqchi", sub: "10 ta mashq", done: true },
            { emoji: "⚡", label: "Muntazam", sub: "7 kun ketma-ket", done: true },
            { emoji: "🎯", label: "Perfeksionist", sub: "90%+ aniqlik", done: false },
            { emoji: "🌟", label: "Yulduz", sub: "100 XP yig'ing", done: false },
          ].map(a => (
            <div key={a.label} style={{ background: a.done ? "white" : "#f8fafc", borderRadius: "14px", padding: "14px", border: `1px solid ${a.done ? "var(--border)" : "#e2e8f0"}`, display: "flex", alignItems: "center", gap: "12px", opacity: a.done ? 1 : 0.55 }}>
              <div style={{ fontSize: "1.5rem", flexShrink: 0 }}>{a.emoji}</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: "0.85rem", color: "var(--text-main)" }}>{a.label}</div>
                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{a.sub}</div>
              </div>
            </div>
          ))}
        </div>

      </div>
    );
  }

  void renderStudentHomework;
  void renderProgressAnalyticsLegacy;
  void renderLegacyStudentProfilePreview;
}


