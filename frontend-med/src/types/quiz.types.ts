export type SessionStatus = "ACTIVE" | "FINISHED" | "ABANDONED";

export interface SubjectListItem {
  subjectId: string;
  name: string;
  description: string | null;
  yearOfStudy: number | null;
  credits: number | null;
  totalQuestions: number;
  solvedQuestions: number;
  hasActiveSession: boolean;
  activeSessionId: string | null;
}

export interface SessionResult {
  sessionId: string;
  subjectId: string | null;
  status: SessionStatus;
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
  solvedQuestions: number;
  hasActiveSession: boolean;
  activeSessionId: string | null;
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
