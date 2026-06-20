export type UserRole = "USER" | "ADMIN";

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  facultyId: string;
  yearOfStudy: number;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  facultyId: string;
  yearOfStudy: number;
}
