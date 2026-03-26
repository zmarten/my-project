"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import type { GmailThread } from "@/types";

const AVATAR_GRADIENTS = [
  "from-accent-green to-accent-teal",
  "from-accent-blue to-accent-teal",
  "from-accent-amber to-accent-red",
  "from-accent-teal to-accent-blue",
  "from-accent-green to-accent-blue",
  "from-accent-red to-accent-amber",
];

function getInitials(name: string): string {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function getGradient(name: string): string {
  const hash = name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 1) return `${Math.round(diffMs / (1000 * 60))}m ago`;
  if (diffHours < 24) return `${Math.round(diffHours)}h ago`;
  if (diffHours < 48) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function InboxPanel({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const { supabase, user } = useAuth();
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taskAdded, setTaskAdded] = useState<Record<string, boolean>>({});
  const [taskAdding, setTaskAdding] = useState<Record<string, boolean>>({});

  const addEmailAsTask = async (thread: GmailThread) => {
    if (!user || taskAdded[thread.id] || taskAdding[thread.id]) return;
    setTaskAdding((prev) => ({ ...prev, [thread.id]: true }));
    try {
      // Parse via NLP
      const parseRes = await fetch("/api/tasks/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `${thread.subject} — ${thread.preview}`.slice(0, 200),
          today: new Date().toISOString().split("T")[0],
        }),
      });
      const parsed = await parseRes.json();
      await supabase.from("tasks").insert({
        user_id: user.id,
        text: parsed.text || thread.subject,
        tag: parsed.tag || "new",
        completed: false,
        assigned_date: parsed.assigned_date || null,
        goal_id: null,
      });
      setTaskAdded((prev) => ({ ...prev, [thread.id]: true }));
    } catch {
      setTaskAdded((prev) => ({ ...prev, [thread.id]: false }));
    } finally {
      setTaskAdding((prev) => ({ ...prev, [thread.id]: false }));
    }
  };

  const fetchInbox = () => {
    setLoading(true);
    setError(null);
    fetch("/api/gmail")
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Session expired" : "Failed to load inbox");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setThreads(data);
          onUnreadChange?.(data.filter((t) => t.unread).length);
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load emails");
        setThreads([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchInbox();
    // onUnreadChange is intentionally excluded — it's a stable callback from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Priority Inbox</h2>
        <span className="text-xs text-text-muted font-mono">
          {threads.filter((t) => t.unread).length} unread
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {error ? (
          <div className="text-center py-8">
            <p className="text-sm text-accent-red mb-2">{error}</p>
            <button onClick={fetchInbox} className="text-xs text-accent-green hover:text-accent-green/80 transition-colors">Retry</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
          </div>
        ) : threads.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No priority emails
          </p>
        ) : (
          threads.map((thread) => (
            <div
              key={thread.id}
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors group cursor-pointer"
            >
              {/* Avatar */}
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${getGradient(
                  thread.sender
                )} flex items-center justify-center shrink-0`}
              >
                <span className="text-xs font-semibold text-white">
                  {getInitials(thread.sender)}
                </span>
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm truncate ${
                      thread.unread ? "font-semibold" : "text-text-secondary"
                    }`}
                  >
                    {thread.sender}
                  </span>
                  <span className="text-xs text-text-muted font-mono shrink-0">
                    {formatDate(thread.date)}
                  </span>
                  {thread.unread && (
                    <span className="w-2 h-2 rounded-full bg-accent-green shrink-0" />
                  )}
                </div>
                <p
                  className={`text-sm truncate ${
                    thread.unread ? "text-text-primary" : "text-text-secondary"
                  }`}
                >
                  {thread.subject}
                </p>
                <p className="text-xs text-text-muted truncate">
                  {thread.preview}
                </p>
              </div>

              {/* Email-to-task button */}
              <button
                onClick={(e) => { e.stopPropagation(); addEmailAsTask(thread); }}
                className={`shrink-0 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 transition-[color,opacity] p-1 rounded ${
                  taskAdded[thread.id]
                    ? "text-accent-green"
                    : "text-text-muted hover:text-accent-green hover:bg-accent-green/10"
                }`}
                title={taskAdded[thread.id] ? "Task added" : "Add as task"}
                disabled={taskAdded[thread.id] || taskAdding[thread.id]}
              >
                {taskAdding[thread.id] ? (
                  <span className="w-4 h-4 border border-accent-green/30 border-t-accent-green rounded-full animate-spin block" />
                ) : taskAdded[thread.id] ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                )}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
