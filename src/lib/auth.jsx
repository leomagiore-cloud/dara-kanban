import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "./supabase";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}

export function traduzErro(err) {
  const m = (err?.message || "").toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar (veja sua caixa de entrada).";
  if (m.includes("user already registered")) return "Este e-mail já está cadastrado.";
  if (m.includes("password should be at least")) return "A senha precisa ter pelo menos 8 caracteres.";
  if (m.includes("same password") || m.includes("different from the old")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("rate limit") || m.includes("too many")) return "Muitas tentativas. Aguarde alguns minutos e tente de novo.";
  if (m.includes("network") || m.includes("failed to fetch")) return "Sem conexão com o servidor. Verifique sua internet.";
  if (m.includes("expired") || (m.includes("invalid") && m.includes("token"))) return "Link expirado ou inválido. Peça um novo.";
  return err?.message || "Ocorreu um erro. Tente novamente.";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null);
      setProfileReady(true);
      return;
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, is_active")
      .eq("id", userId)
      .maybeSingle();
    if (error) console.error("profile:", error.message);
    setProfile(data || null);
    setProfileReady(true);
  }, []);

  useEffect(() => {
    let alive = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!alive) return;
      setSession(data.session);
      await loadProfile(data.session?.user?.id);
      if (alive) setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(sess);
      if (sess?.user) setProfileReady(false);
      setTimeout(() => loadProfile(sess?.user?.id), 0);
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = (email, password) =>
    supabase.auth.signInWithPassword({ email: email.trim(), password });

  const signUp = (name, email, password) =>
    supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { name: name.trim() },
        emailRedirectTo: window.location.origin,
      },
    });

  const sendResetEmail = (email) =>
    supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });

  const updatePassword = async (password) => {
    const res = await supabase.auth.updateUser({ password });
    if (!res.error) setRecovery(false);
    return res;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRecovery(false);
  };

  /**
   * Convida um membro por e-mail.
   * Usa a Edge Function `invite-member` (service role) para criar o usuário
   * já marcado como is_active=true e com a role informada.
   * O Supabase envia o e-mail de convite automaticamente.
   */
const inviteMember = async (email, role = "editor", name = "") => {
  const { data, error } = await supabase.functions.invoke("invite-member", {
    body: {
      email: email.trim().toLowerCase(),
      role,
      name: name.trim(),
    },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
};

  const value = {
    session,
    profile,
    loading: loading || (!!session && !profileReady),
    recovery,
    cancelRecovery: () => setRecovery(false),
    refreshProfile: () => loadProfile(session?.user?.id),
    signIn,
    signUp,
    sendResetEmail,
    updatePassword,
    signOut,
    inviteMember,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}