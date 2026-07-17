import { api } from "./api";
import type {
  AdminFaculty,
  AdminFacultyDetail,
  AdminFacultySubject,
  AdminQuestion,
  AdminSubject,
  AdminUser,
  AttachSubjectPayload,
  FacultyPayload,
  FacultySubjectPayload,
  PageResult,
  QuestionImage,
  QuestionPayload,
  SubjectPayload,
  UpdateUserPayload,
} from "../types/admin.types";

function pageQuery(page: number, size: number, search?: string) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (search && search.trim()) params.set("search", search.trim());
  return params.toString();
}

export const adminService = {
  // Useri
  listUsers: (page: number, size: number, search?: string) =>
    api.get<PageResult<AdminUser>>(`/admin/users?${pageQuery(page, size, search)}`),
  updateUser: (id: string, payload: UpdateUserPayload) =>
    api.patch<AdminUser>(`/admin/users/${id}`, payload),

  // Facultăți
  listFaculties: (page: number, size: number, search?: string) =>
    api.get<PageResult<AdminFaculty>>(`/admin/faculties?${pageQuery(page, size, search)}`),
  getFaculty: (id: string) => api.get<AdminFacultyDetail>(`/admin/faculties/${id}`),
  createFaculty: (payload: FacultyPayload) => api.post<AdminFaculty>("/admin/faculties", payload),
  updateFaculty: (id: string, payload: FacultyPayload) =>
    api.put<AdminFaculty>(`/admin/faculties/${id}`, payload),
  deleteFaculty: (id: string) => api.del<void>(`/admin/faculties/${id}`),

  // Materii per facultate (legături)
  listFacultySubjects: (facultyId: string, page: number, size: number) =>
    api.get<PageResult<AdminFacultySubject>>(`/admin/faculties/${facultyId}/subjects?${pageQuery(page, size)}`),
  attachSubject: (facultyId: string, payload: AttachSubjectPayload) =>
    api.post<AdminFacultySubject>(`/admin/faculties/${facultyId}/subjects`, payload),
  getFacultySubject: (facultySubjectId: string) =>
    api.get<AdminFacultySubject>(`/admin/faculty-subjects/${facultySubjectId}`),
  updateFacultySubject: (facultySubjectId: string, payload: FacultySubjectPayload) =>
    api.put<AdminFacultySubject>(`/admin/faculty-subjects/${facultySubjectId}`, payload),
  detachSubject: (facultySubjectId: string) =>
    api.del<void>(`/admin/faculty-subjects/${facultySubjectId}`),

  // Catalog global de materii
  listSubjects: (page: number, size: number, search?: string) =>
    api.get<PageResult<AdminSubject>>(`/admin/subjects?${pageQuery(page, size, search)}`),
  createSubject: (payload: SubjectPayload) => api.post<AdminSubject>("/admin/subjects", payload),
  updateSubject: (id: string, payload: SubjectPayload) =>
    api.put<AdminSubject>(`/admin/subjects/${id}`, payload),
  deleteSubject: (id: string) => api.del<void>(`/admin/subjects/${id}`),

  // Grile
  listQuestions: (facultySubjectId: string, page: number, size: number) =>
    api.get<PageResult<AdminQuestion>>(`/admin/faculty-subjects/${facultySubjectId}/questions?${pageQuery(page, size)}`),
  getQuestion: (id: string) => api.get<AdminQuestion>(`/admin/questions/${id}`),
  createQuestion: (facultySubjectId: string, payload: QuestionPayload) =>
    api.post<AdminQuestion>(`/admin/faculty-subjects/${facultySubjectId}/questions`, payload),
  updateQuestion: (id: string, payload: QuestionPayload) =>
    api.put<AdminQuestion>(`/admin/questions/${id}`, payload),
  deleteQuestion: (id: string) => api.del<void>(`/admin/questions/${id}`),

  // Imagini grilă (R2)
  listImages: (questionId: string) =>
    api.get<QuestionImage[]>(`/questions/${questionId}/images`),
  uploadImage: (questionId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return api.postForm<QuestionImage>(`/questions/${questionId}/images`, formData);
  },
  deleteImage: (questionId: string, imageId: string) =>
    api.del<void>(`/questions/${questionId}/images/${imageId}`),
};
