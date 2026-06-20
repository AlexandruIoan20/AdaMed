import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { authService } from "../service/auth.service";
import { ApiError } from "../service/api";
import type { LoginPayload, RegisterPayload, User } from "../types/auth.types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authService
      .me()
      .then(setUser)
      .catch((err) => {
        // 401 = nicio sesiune validă (cookie absent/expirat) — nu e o eroare reală
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error("Failed to fetch current user", err);
        }
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(payload: LoginPayload) {
    const loggedInUser = await authService.login(payload);
    setUser(loggedInUser);
  }

  async function register(payload: RegisterPayload) {
    const registeredUser = await authService.register(payload);
    setUser(registeredUser);
  }

  async function logout() {
    await authService.logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
