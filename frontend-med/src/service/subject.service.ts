import { api } from "./api";
import type { SubjectDetail, SubjectListItem } from "../types/quiz.types";

export const subjectService = {
  list: () => api.get<SubjectListItem[]>("/subjects"),
  get: (subjectId: string) => api.get<SubjectDetail>(`/subjects/${subjectId}`),
};
