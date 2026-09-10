"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onIdTokenChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebase } from "@/lib/firebase";

export type Role = "teacher" | "student" | "admin" | null;

type AuthState = {
  user: User | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Força refresh do ID token e relê os custom claims (usar após finalizeSignup). */
  refreshClaims: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

function readRole(claims: Record<string, unknown>): Role {
  const r = claims.role;
  return r === "teacher" || r === "student" || r === "admin" ? r : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getFirebase() só roda aqui — nunca durante o render no servidor.
    const { auth } = getFirebase();
    return onIdTokenChanged(auth, async (u) => {
      setUser(u);
      setRole(u ? readRole((await u.getIdTokenResult()).claims) : null);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      role,
      loading,
      signIn: async (email, password) => {
        const { auth } = getFirebase();
        await signInWithEmailAndPassword(auth, email, password);
      },
      signOut: async () => {
        const { auth } = getFirebase();
        await firebaseSignOut(auth);
      },
      refreshClaims: async () => {
        const { auth } = getFirebase();
        if (!auth.currentUser) return;
        await auth.currentUser.getIdToken(true);
        setRole(readRole((await auth.currentUser.getIdTokenResult()).claims));
      },
    }),
    [user, role, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}
