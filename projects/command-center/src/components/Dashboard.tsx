"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import StatsBar from "./StatsBar";
import CalendarPanel from "./CalendarPanel";
import TasksPanel from "./TasksPanel";
import InboxPanel from "./InboxPanel";
import GoalsPanel from "./GoalsPanel";
export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [eventCount, setEventCount] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);

  // Fetch today's event count for stats
  useEffect(() => {
    fetch("/api/calendar?range=today")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEventCount(data.length);
      })
      .catch(() => {});
  }, []);

  const handleTaskCount = useCallback((count: number) => {
    setOpenTasks(count);
  }, []);

  const handleUnread = useCallback((count: number) => {
    setUnreadEmails(count);
  }, []);

  const handleGoalProgress = useCallback((avg: number) => {
    setGoalProgress(avg);
  }, []);

  return (
    <div className="min-h-screen relative z-10">
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-4">
        <h1 className="font-display text-xl font-bold">Command Center</h1>
        <div className="flex items-center gap-3">
          <span className="text-xs text-text-secondary hidden sm:block">
            {user?.email}
          </span>
          <button
            onClick={signOut}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="px-4 lg:px-6 pb-6 space-y-4">
        <StatsBar
          eventCount={eventCount}
          openTasks={openTasks}
          unreadEmails={unreadEmails}
          goalProgress={goalProgress}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="min-h-[400px]">
            <CalendarPanel />
          </div>
          <div className="min-h-[400px]">
            <TasksPanel onTaskCountChange={handleTaskCount} />
          </div>
          <div className="min-h-[400px]">
            <InboxPanel onUnreadChange={handleUnread} />
          </div>
          <div className="min-h-[400px]">
            <GoalsPanel onProgressChange={handleGoalProgress} />
          </div>
        </div>
      </main>
    </div>
  );
}
