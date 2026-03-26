"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import PanelErrorBoundary from "./PanelErrorBoundary";
import StatsBar from "./StatsBar";
import CalendarPanel from "./CalendarPanel";
import TasksPanel from "./TasksPanel";
import InboxPanel from "./InboxPanel";
import GoalsPanel from "./GoalsPanel";
import GoalsSummary from "./GoalsSummary";
import WeeklyReviewModal, { shouldShowWeeklyReview } from "./WeeklyReviewModal";

type Tab = "dashboard" | "goals";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [eventCount, setEventCount] = useState(0);
  const [openTasks, setOpenTasks] = useState(0);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [goalProgress, setGoalProgress] = useState(0);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);

  useEffect(() => {
    if (shouldShowWeeklyReview()) setShowWeeklyReview(true);
  }, []);

  const handleEventCount = useCallback((count: number) => {
    setEventCount(count);
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
      {showWeeklyReview && (
        <WeeklyReviewModal onClose={() => setShowWeeklyReview(false)} />
      )}
      {/* Header */}
      <header className="flex items-center justify-between px-4 lg:px-6 py-4">
        <div className="flex items-center gap-6">
          <h1 className="font-display text-xl font-bold">Command Center</h1>
          <nav
            aria-label="Main navigation"
            className="flex gap-1 bg-bg-card border border-border rounded-lg p-0.5"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={activeTab === "dashboard"}
              onClick={() => setActiveTab("dashboard")}
              className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "dashboard"
                  ? "bg-accent-green/15 text-accent-green font-medium"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Dashboard
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "goals"}
              onClick={() => setActiveTab("goals")}
              className={`text-sm px-4 py-1.5 rounded-md transition-colors ${
                activeTab === "goals"
                  ? "bg-accent-green/15 text-accent-green font-medium"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              Goals
            </button>
            <Link
              href="/brief"
              className="text-sm px-4 py-1.5 rounded-md transition-colors text-text-secondary hover:text-text-primary"
            >
              Brief
            </Link>
          </nav>
        </div>
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

      <main id="main-content" className="px-4 lg:px-6 pb-6 space-y-4">
        {activeTab === "dashboard" ? (
          <>
            <StatsBar
              eventCount={eventCount}
              openTasks={openTasks}
              unreadEmails={unreadEmails}
              goalProgress={goalProgress}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="min-h-[400px]" aria-label="Calendar">
                <PanelErrorBoundary fallbackTitle="Calendar unavailable">
                  <CalendarPanel onEventCountChange={handleEventCount} />
                </PanelErrorBoundary>
              </section>
              <section className="min-h-[400px]" aria-label="Tasks">
                <PanelErrorBoundary fallbackTitle="Tasks unavailable">
                  <TasksPanel onTaskCountChange={handleTaskCount} />
                </PanelErrorBoundary>
              </section>
              <section className="min-h-[400px]" aria-label="Priority inbox">
                <PanelErrorBoundary fallbackTitle="Inbox unavailable">
                  <InboxPanel onUnreadChange={handleUnread} />
                </PanelErrorBoundary>
              </section>
              <section className="min-h-[400px]" aria-label="Goals summary">
                <PanelErrorBoundary fallbackTitle="Goals unavailable">
                  <GoalsSummary
                    onProgressChange={handleGoalProgress}
                    onViewAll={() => setActiveTab("goals")}
                  />
                </PanelErrorBoundary>
              </section>
            </div>
          </>
        ) : (
          <GoalsPanel onProgressChange={handleGoalProgress} />
        )}
      </main>
    </div>
  );
}
