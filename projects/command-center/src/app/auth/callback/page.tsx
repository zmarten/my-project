"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabase } from "@/lib/supabase";

const AUTH_TIMEOUT_MS = 15_000;

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createBrowserSupabase();

    const timeout = setTimeout(() => {
      setError("Sign-in timed out. Please try again.");
    }, AUTH_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        clearTimeout(timeout);
        router.replace("/");
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center max-w-xs mx-4">
          <p className="text-text-primary font-medium mb-2">Authentication failed</p>
          <p className="text-text-secondary text-sm mb-4">{error}</p>
          <button
            onClick={() => router.replace("/")}
            className="bg-accent-green/15 text-accent-green px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-green/25 transition-colors"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3" role="status" aria-label="Signing in" />
        <p className="text-text-secondary text-sm">Signing in...</p>
      </div>
    </div>
  );
}
