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
  "#4ade80",
  "#2dd4bf",
  "#60a5fa",
  "#f59e0b",
  "#ef4444",
  "#a78bfa",
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

export default function CalendarPanel() {
  const [activeTab, setActiveTab] = useState<string>("Today");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?range=${RANGE_MAP[activeTab]}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setEvents(data);
        else setEvents([]);
      })
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [activeTab]);

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
        <div className="flex gap-1 bg-bg rounded-lg p-0.5">
          {TABS.map((tab) => (
            <button
              key={tab}
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
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-accent-green/30 border-t-accent-green rounded-full animate-spin" />
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
        className="w-1 rounded-full shrink-0"
        style={{ backgroundColor: color }}
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
      </div>
    </div>
  );
}
