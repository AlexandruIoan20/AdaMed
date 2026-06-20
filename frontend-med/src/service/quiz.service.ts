import { api } from "./api";
import type { AnswerResult, Question, SessionResult } from "../types/quiz.types";

export const quizService = {
  startSession: (subjectId: string) =>
    api.post<SessionResult>("/quiz/sessions", { subjectId }),

  getSession: (sessionId: string) =>
    api.get<SessionResult>(`/quiz/sessions/${sessionId}`),

  // 204 (nicio grilă rămasă) -> api întoarce undefined; normalizăm la null.
  getNextQuestion: async (sessionId: string): Promise<Question | null> => {
    const q = await api.get<Question | undefined>(`/quiz/sessions/${sessionId}/next`);
    return q ?? null;
  },

  submitAnswer: (sessionId: string, questionId: string, selectedAnswerIds: string[]) =>
    api.post<AnswerResult>(`/quiz/sessions/${sessionId}/answers`, {
      questionId,
      selectedAnswerIds,
    }),

  finishSession: (sessionId: string) =>
    api.post<SessionResult>(`/quiz/sessions/${sessionId}/finish`),
};
