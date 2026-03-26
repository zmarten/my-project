"use client";

import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import LoginScreen from "@/components/LoginScreen";

const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
});

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative z-10">
        <div className="text-center">
          <div
            className="w-8 h-8 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin mx-auto mb-3"
            role="status"
            aria-label="Loading"
          >
            <span className="sr-only">Loading</span>
          </div>
          <p className="text-text-secondary text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LoginScreen />;
}
