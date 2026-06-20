import { api } from "./api";
import type { Faculty } from "../types/faculty.types";

export const facultyService = {
  list: () => api.get<Faculty[]>("/faculties"),
};
