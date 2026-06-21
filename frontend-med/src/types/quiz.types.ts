export type SessionStatus = "ACTIVE" | "FINISHED" | "ABANDONED";

export type SessionMode = "LEARNING" | "PRACTICE";

export const SESSION_MODES: SessionMode[] = ["LEARNING", "PRACTICE"];

export const MODE_LABELS: Record<SessionMode, string> = {
  LEARNING: "Învățare",
  PRACTICE: "Practică",
};

export interface SubjectListItem {
  subjectId: string;
  name: string;
  description: string | null;
  yearOfStudy: number | null;
  credits: number | null;
  totalQuestions: number;
  learningSolvedQuestions: number;
  practiceSolvedQuestions: number;
  learningActiveSessionId: string | null;
  practiceActiveSessionId: string | null;
}

export interface SessionResult {
  sessionId: string;
  subjectId: string | null;
  status: SessionStatus;
  mode: SessionMode;
  totalQuestions: number | null;
  correctAnswers: number | null;
  answeredQuestions: number | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface SubjectDetail {
  subjectId: string;
  name: string;
  description: string | null;
  yearOfStudy: number | null;
  credits: number | null;
  totalQuestions: number;
  learningSolvedQuestions: number;
  practiceSolvedQuestions: number;
  learningActiveSessionId: string | null;
  practiceActiveSessionId: string | null;
  sessions: SessionResult[];
}

export interface AnswerOption {
  id: string;
  text: string;
  imageUrl: string | null;
  position: number | null;
}

export interface Question {
  id: string;
  text: string;
  imageUrl: string | null;
  answers: AnswerOption[];
}

export interface AnswerResult {
  questionId: string;
  correctAnswerIds: string[];
  selectedAnswerIds: string[];
  wasCorrect: boolean;
  explanation: string | null;
}
