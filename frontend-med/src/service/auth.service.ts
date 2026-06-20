import { api } from "./api";
import type { LoginPayload, RegisterPayload, User } from "../types/auth.types";

export const authService = {
  register: (payload: RegisterPayload) => api.post<User>("/auth/register", payload),
  login: (payload: LoginPayload) => api.post<User>("/auth/login", payload),
  logout: () => api.post<void>("/auth/logout"),
  me: () => api.get<User>("/auth/me"),
};
