"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, ApiError, getToken, setToken } from "./api";

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: "admin" | "usher";
  churchName?: string | null;
  // True only for the handful of platform-operator accounts created via
  // `npm run seed:platform-admin` — completely separate from a church's own
  // `role: "admin"`. Routes the person to /platform instead of /admin.
  isPlatformAdmin?: boolean;
};

export type SignupInput = {
  churchName: string;
  adminName: string;
  username: string;
  password: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ error?: string; user?: AuthUser }>;
  signup: (input: SignupInput) => Promise<{ error?: string }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<{ user: AuthUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/api/auth/login", {
        username,
        password,
      });
      setToken(res.token);
      setUser(res.user);
      // Return the freshly-fetched user directly (not just via state) so a
      // caller can branch on it in the same tick — `setUser` above won't be
      // reflected in `user` from this closure until the next render.
      return { user: res.user };
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : "Couldn't sign in — try again." };
    }
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/api/churches/signup", input);
      setToken(res.token);
      setUser(res.user);
      return {};
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : "Couldn't create your church account — try again." };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
