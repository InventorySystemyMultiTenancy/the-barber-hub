import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ApiClientError,
  type BirthdayDiscount,
  clearStoredSession,
  getFriendlyErrorMessage,
  getStoredSessionUser,
  login,
  me,
  register,
  SESSION_TOKEN_KEY,
  setStoredSession,
  type SessionUser,
} from "@/lib/api";

type AuthError = {
  message: string;
  code?: string;
};

interface AuthContextType {
  user: SessionUser | null;
  birthdayDiscount: BirthdayDiscount;
  isAdmin: boolean;
  loading: boolean;
  signUp: (input: { fullName: string; phone: string; birthDate: string; password: string; email?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (phone: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthError(error: unknown): AuthError {
  if (error instanceof ApiClientError) {
    return {
      message: getFriendlyErrorMessage(error),
      code: error.code,
    };
  }

  return {
    message: "Nao foi possivel concluir a operacao.",
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [birthdayDiscount, setBirthdayDiscount] = useState<BirthdayDiscount>({ active: false });
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  const refreshSession = async () => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setBirthdayDiscount({ active: false });
      return;
    }

    try {
      const sessionInfo = await me();
      setUser(sessionInfo.user);
      setBirthdayDiscount(sessionInfo.birthdayDiscount);
      setStoredSession({ token, user: sessionInfo.user });
    } catch {
      clearStoredSession();
      setUser(null);
      setBirthdayDiscount({ active: false });
    }
  };

  useEffect(() => {
    const boot = async () => {
      const storedUser = getStoredSessionUser();
      if (storedUser) {
        setUser(storedUser);
      }

      await refreshSession();
      setLoading(false);
    };

    boot();
  }, []);

  const signUp = async (input: { fullName: string; phone: string; birthDate: string; password: string; email?: string }) => {
    try {
      await register(input);
      const session = await login({ phone: input.phone, password: input.password });
      setStoredSession(session);
      setUser(session.user);
      await refreshSession();
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signIn = async (phone: string, password: string) => {
    try {
      const session = await login({ phone, password });
      setStoredSession(session);
      setUser(session.user);
      await refreshSession();
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signOut = async () => {
    clearStoredSession();
    setUser(null);
    setBirthdayDiscount({ active: false });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        birthdayDiscount,
        isAdmin,
        loading,
        signUp,
        signIn,
        signOut,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
