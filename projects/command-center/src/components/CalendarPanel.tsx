"use client";

import { useEffect, useState } from "react";
import type { CalendarEvent } from "@/types";

const TABS = ["Today", "Tomorrow", "This Week"] as const;
const RANGE_MAP: Record<string, string> = {
  Today: "today",
  Tomorrow: "tomorrow",
  "This Week": "week",
};

const EVENT_COLORS = [
  "bg-accent-green",
  "bg-accent-teal",
  "bg-accent-blue",
  "bg-accent-amber",
  "bg-accent-red",
  "bg-purple-400",
];

function formatTime(dateStr: string, allDay?: boolean): string {
  if (allDay) return "All day";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDateHeader(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function CalendarPanel({
  onEventCountChange,
}: {
  onEventCountChange?: (count: number) => void;
}) {
  const [activeTab, setActiveTab] = useState<string>("Today");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/calendar?range=${RANGE_MAP[activeTab]}`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 401 ? "Session expired — please sign out and back in" : "Failed to load calendar");
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setEvents(data);
          if (activeTab === "Today") onEventCountChange?.(data.length);
        } else {
          setEvents([]);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
    // onEventCountChange is a stable useCallback from parent — excluded to avoid unnecessary refetches
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, retryCount]);

  // Group events by date for week view
  const grouped: Record<string, CalendarEvent[]> = {};
  events.forEach((e) => {
    const key = new Date(e.start).toDateString();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  return (
    <div className="panel flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Calendar</h2>
        <div className="flex gap-1 bg-bg rounded-lg p-0.5" role="tablist" aria-label="Calendar range">
          {TABS.map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                activeTab === tab
                  ? "bg-accent-green/15 text-accent-green"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
        {error ? (
          <div className="text-center py-8">
            <p className="text-sm text-accent-red mb-2">{error}</p>
            <button onClick={() => setRetryCount((c) => c + 1)} className="text-xs text-accent-green hover:text-accent-green/80 transition-colors">Retry</button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-8" role="status" aria-label="Loading calendar">
            <div className="w-5 h-5 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">Loading</span>
          </div>
        ) : events.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-8">
            No events scheduled
          </p>
        ) : activeTab === "This Week" ? (
          Object.entries(grouped).map(([dateStr, dayEvents]) => (
            <div key={dateStr} className="mb-3">
              <p className="text-xs text-text-muted font-mono mb-1.5">
                {formatDateHeader(dateStr)}
              </p>
              {dayEvents.map((event, i) => (
                <EventRow
                  key={event.id}
                  event={event}
                  color={EVENT_COLORS[i % EVENT_COLORS.length]}
                />
              ))}
            </div>
          ))
        ) : (
          events.map((event, i) => (
            <EventRow
              key={event.id}
              event={event}
              color={EVENT_COLORS[i % EVENT_COLORS.length]}
            />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  color,
}: {
  event: CalendarEvent;
  color: string;
}) {
  return (
    <div className="flex items-stretch gap-3 p-2.5 rounded-lg hover:bg-bg-hover transition-colors group">
      <div
        className={`w-1 rounded-full shrink-0 ${color}`}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{event.summary}</p>
        <p className="text-xs text-text-secondary font-mono">
          {formatTime(event.start, event.allDay)}
          {!event.allDay && ` - ${formatTime(event.end)}`}
        </p>
        {event.location && (
          <p className="text-xs text-text-muted truncate mt-0.5">
            {event.location}
          </p>
        )}
        {event.calendarName && (
          <p className="text-[10px] font-mono text-text-muted/60 truncate mt-0.5">
            {event.calendarName}
          </p>
        )}
      </div>
    </div>
  );
}
