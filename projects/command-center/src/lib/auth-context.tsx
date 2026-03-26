"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createBrowserSupabase } from "./supabase";
import type { User, Session, SupabaseClient } from "@supabase/supabase-js";

interface AuthContext {
  user: User | null;
  session: Session | null;
  providerToken: string | null;
  supabase: SupabaseClient;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContext | null>(null);

const TOKEN_KEY = "provider_token";
const TOKEN_TS_KEY = "provider_token_ts";
const TOKEN_MAX_AGE_MS = 55 * 60 * 1000; // 55 minutes (buffer before 1hr expiry)

function storeProviderToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TS_KEY, Date.now().toString());
}

function loadProviderToken(): string | null {
  const stored = localStorage.getItem(TOKEN_KEY);
  const storedTs = localStorage.getItem(TOKEN_TS_KEY);
  const isValid =
    stored && storedTs && Date.now() - parseInt(storedTs) < TOKEN_MAX_AGE_MS;
  return isValid ? stored : null;
}

function clearProviderToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TS_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createBrowserSupabase());
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [providerToken, setProviderToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        storeProviderToken(session.provider_token);
        setProviderToken(session.provider_token);
      } else {
        setProviderToken(loadProviderToken());
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.provider_token) {
        storeProviderToken(session.provider_token);
        setProviderToken(session.provider_token);
      }
      if (event === "SIGNED_OUT") {
        clearProviderToken();
        setProviderToken(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        scopes:
          "https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/gmail.readonly",
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ user, session, providerToken, supabase, signIn, signOut, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
