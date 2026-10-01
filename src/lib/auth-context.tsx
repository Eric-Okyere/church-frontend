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
  // Where a password-reset link goes. Optional because every account that
  // existed before this field was added has none yet — null until they add
  // one from /admin/settings.
  email?: string | null;
};

export type SignupInput = {
  churchName: string;
  adminName: string;
  username: string;
  email: string;
  // Optional — the church's own contact number, so GraceTrack/Linkpii can
  // reach them (e.g. about payment or support). Not required at signup;
  // can be added/changed anytime from Settings.
  phone?: string;
  password: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
};

// A `status` discriminant (not a truthiness check on `error`) is what lets
// TypeScript actually narrow these unions in the pages that call them — an
// empty string is still a valid `string`, so `if (result.error)` alone
// can't prove a branch's other fields are present.
type SignupResult =
  | { status: "error"; error: string }
  | { status: "verification-required"; email: string; emailSendFailed: boolean };

type LoginResult =
  | { status: "error"; error: string }
  | { status: "ok"; user: AuthUser }
  // Correct username/password, but the account hasn't verified its email
  // yet (see routes/auth.js) — the login page offers an inline "enter your
  // code" form instead of just a dead-end error in this case.
  | { status: "verification-required"; email: string };

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<LoginResult>;
  signup: (input: SignupInput) => Promise<SignupResult>;
  // Confirms a 6-digit signup code and — on success — signs the account in
  // directly (same as login), since by that point we already know exactly
  // who they are.
  verifySignupCode: (email: string, code: string) => Promise<{ error?: string; user?: AuthUser }>;
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

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
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
      return { status: "ok", user: res.user };
    } catch (err) {
      if (err instanceof ApiError) {
        const data = err.data as { requiresVerification?: boolean; email?: string } | undefined;
        if (data?.requiresVerification && data.email) {
          return { status: "verification-required", email: data.email };
        }
        return { status: "error", error: err.message };
      }
      return { status: "error", error: "Couldn't sign in — try again." };
    }
  }, []);

  const signup = useCallback(async (input: SignupInput): Promise<SignupResult> => {
    try {
      const res = await api.post<{ requiresVerification: true; email: string; emailSendFailed: boolean }>(
        "/api/churches/signup",
        input
      );
      // No token yet — the account exists but can't sign in until its
      // email is verified (see routes/churches.js and routes/auth.js).
      return { status: "verification-required", email: res.email, emailSendFailed: res.emailSendFailed };
    } catch (err) {
      return {
        status: "error",
        error: err instanceof ApiError ? err.message : "Couldn't create your church account — try again.",
      };
    }
  }, []);

  const verifySignupCode = useCallback(async (email: string, code: string) => {
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/api/churches/verify-signup-code", {
        email,
        code,
      });
      setToken(res.token);
      setUser(res.user);
      return { user: res.user };
    } catch (err) {
      return { error: err instanceof ApiError ? err.message : "Couldn't verify that code — try again." };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, verifySignupCode, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
