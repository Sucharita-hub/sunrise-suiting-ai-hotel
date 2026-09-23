import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = not loaded yet
  const [role, setRole] = useState("guest");
  const [roleLoading, setRoleLoading] = useState(false);

  const loadRole = useCallback(async () => {
    setRoleLoading(true);
    try {
      const result = await api.bootstrapProfile();
      setRole(result.role || "guest");
    } catch {
      setRole("guest");
    } finally {
      setRoleLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadRole();
    else setRole("guest");
  }, [session, loadRole]);

  const value = {
    session,
    user: session?.user ?? null,
    role,
    roleLoading,
    isStaff: role === "staff",
    loading: session === undefined,
    signUp: (email, password) => supabase.auth.signUp({ email, password }),
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut()
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
