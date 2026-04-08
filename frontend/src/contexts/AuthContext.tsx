import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ApiClientError,
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
  isAdmin: boolean;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string, phone: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
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
  const [loading, setLoading] = useState(true);

  const isAdmin = useMemo(() => user?.role === "admin", [user]);

  const refreshSession = async () => {
    const token = localStorage.getItem(SESSION_TOKEN_KEY);
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const freshUser = await me();
      setUser(freshUser);
      setStoredSession({ token, user: freshUser });
    } catch {
      clearStoredSession();
      setUser(null);
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

  const signUp = async (email: string, password: string, fullName: string, phone: string) => {
    try {
      await register({ email, password, fullName, phone });
      const session = await login({ email, password });
      setStoredSession(session);
      setUser(session.user);
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const session = await login({ email, password });
      setStoredSession(session);
      setUser(session.user);
      return { error: null };
    } catch (error) {
      return { error: toAuthError(error) };
    }
  };

  const signOut = async () => {
    clearStoredSession();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
