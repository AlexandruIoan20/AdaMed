import type { UserRole } from "./auth.types";

export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface AdminUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  emailVerified: boolean | null;
  facultyId: string | null;
  facultyName: string | null;
  yearOfStudy: number | null;
  role: UserRole;
  createdAt: string | null;
}

export interface UpdateUserPayload {
  username: string;
  role: UserRole;
}

export interface AdminFaculty {
  id: string;
  name: string;
  description: string | null;
  subjectCount: number;
  userCount: number;
}

export interface AdminFacultyDetail {
  id: string;
  name: string;
  description: string | null;
  subjectCount: number;
  userCount: number;
}

export interface FacultyPayload {
  name: string;
  description?: string | null;
}

export interface AdminSubject {
  id: string;
  name: string;
  description: string | null;
  facultyCount: number;
}

export interface SubjectPayload {
  name: string;
  description?: string | null;
}

export interface AdminFacultySubject {
  facultySubjectId: string;
  subjectId: string;
  name: string;
  description: string | null;
  yearOfStudy: number | null;
  credits: number | null;
  questionCount: number;
}

export interface AttachSubjectPayload {
  subjectId?: string | null;
  newSubject?: SubjectPayload | null;
  yearOfStudy?: number | null;
  credits?: number | null;
}

export interface FacultySubjectPayload {
  yearOfStudy?: number | null;
  credits?: number | null;
}

export interface AdminAnswer {
  id: string;
  text: string;
  imageUrl: string | null;
  isCorrect: boolean;
  position: number | null;
}

export interface QuestionImage {
  id: string;
  imageUrl: string;
  displayOrder: number;
}

export interface AdminQuestion {
  id: string;
  facultySubjectId: string;
  text: string;
  explanation: string | null;
  imageUrl: string | null;
  images: QuestionImage[];
  answers: AdminAnswer[];
  createdAt: string | null;
}

export interface AnswerPayload {
  id?: string | null;
  text: string;
  imageUrl?: string | null;
  isCorrect: boolean;
  position?: number | null;
}

export interface QuestionPayload {
  text: string;
  explanation?: string | null;
  answers: AnswerPayload[];
}
