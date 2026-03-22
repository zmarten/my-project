"use client";

import { useEffect, useState } from "react";
import type { GmailThread } from "@/types";

const AVATAR_GRADIENTS = [
  "from-green-500 to-teal-500",
  "from-blue-500 to-purple-500",
  "from-amber-500 to-red-500",
  "from-teal-500 to-blue-500",
  "from-purple-500 to-pink-500",
  "from-red-500 to-amber-500",
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
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/gmail")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setThreads(data);
          onUnreadChange?.(data.filter((t) => t.unread).length);
        }
      })
      .catch(() => setThreads([]))
      .finally(() => setLoading(false));
  }, [onUnreadChange]);

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Priority Inbox</h2>
        <span className="text-xs text-text-muted font-mono">
          {threads.filter((t) => t.unread).length} unread
        </span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 space-y-1">
        {loading ? (
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
              className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors cursor-pointer"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
