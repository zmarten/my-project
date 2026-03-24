"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import type { DailyBrief } from "@/lib/brief/synthesize";
import BriefSkeleton from "@/components/brief/BriefSkeleton";
import BriefError from "@/components/brief/BriefError";
import Masthead from "@/components/brief/Masthead";
import Lead from "@/components/brief/Lead";
import WeatherStrip from "@/components/brief/WeatherStrip";
import FocusGrid from "@/components/brief/FocusGrid";
import Timeline from "@/components/brief/Timeline";
import GoalActions from "@/components/brief/GoalActions";
import IntelFeed from "@/components/brief/IntelFeed";
import Closing from "@/components/brief/Closing";
import Section from "@/components/brief/Section";

interface BriefResponse {
  brief: DailyBrief;
  cached: boolean;
  generated_at: string;
  date: string;
}

export default function BriefPage() {
  return (
    <AuthProvider>
      <BriefContent />
    </AuthProvider>
  );
}

function BriefContent() {
  const { loading: authLoading, providerToken } = useAuth();
  const [data, setData] = useState<BriefResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);

  const fetchBrief = async (refresh = false) => {
    if (refresh) setRegenerating(true);
    else setLoading(true);
    setError(null);

    try {
      const url = `/api/brief${refresh ? "?refresh=true" : ""}`;
      const headers: Record<string, string> = {};
      if (providerToken) {
        headers["x-provider-token"] = providerToken;
      }
      const res = await fetch(url, { headers });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to fetch brief");
      }

      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (!authLoading) fetchBrief();
  }, [authLoading, providerToken]);

  if (authLoading || loading) return <BriefSkeleton />;
  if (error) return <BriefError message={error} onRetry={() => fetchBrief()} />;
  if (!data) return null;

  const { brief, cached, generated_at, date } = data;

  const eventCount = brief.timeline.filter((t) => t.type === "event").length;
  const taskCount = brief.timeline.filter((t) => t.type === "task").length;
  const emailCount = brief.intel.length;
  const dayOfWeek = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
  });

  const generatedTime = new Date(generated_at).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return (
    <div className="min-h-screen relative z-10">
      {/* Nav bar */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-4 max-w-[720px] mx-auto">
        <Link
          href="/"
          className="flex items-center gap-2 text-text-muted hover:text-accent-green transition-colors group"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-mono text-xs tracking-wide">Command Center</span>
        </Link>
        <div className="flex items-center gap-4">
          {cached && (
            <span className="font-mono text-[10px] text-text-muted">
              Generated {generatedTime}
            </span>
          )}
          <button
            onClick={() => fetchBrief(true)}
            disabled={regenerating}
            className="font-mono text-xs text-text-muted hover:text-accent-green transition-colors disabled:opacity-40"
          >
            {regenerating ? "Generating…" : "↻ Regenerate"}
          </button>
        </div>
      </header>

      <main className="max-w-[720px] mx-auto px-5 pb-16 relative z-10">
        <Masthead
          date={date}
          dayOfWeek={dayOfWeek}
          eventCount={eventCount}
          openTasks={taskCount}
          emailCount={emailCount}
        />

        <Lead text={brief.lead} />

        <Section label="Conditions">
          <WeatherStrip weather={brief.weather} />
        </Section>

        <Section label="Today's Focus">
          <FocusGrid items={brief.focus} />
        </Section>

        <Section label="Timeline">
          <Timeline items={brief.timeline} />
        </Section>

        <Section label="Goal Steps — What moves the needle today">
          <GoalActions items={brief.goal_actions} />
        </Section>

        {brief.intel.length > 0 && (
          <Section label="Intel — News that matters to you">
            <IntelFeed items={brief.intel} />
          </Section>
        )}

        <Closing quote={brief.closing.quote} attribution={brief.closing.attribution} />
      </main>
    </div>
  );
}
