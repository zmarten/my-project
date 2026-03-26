import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { getCalendarClient } from "@/lib/google";
import type { CalendarEvent } from "@/types";

const CALENDAR_NAME_OVERRIDES: Record<string, string> = {
  "Amion - Hatch Pediatrics": "Sarah Work Schedule",
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "today";

  const session = await getApiSession();
  if (!session?.provider_token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  let timeMin: Date;
  let timeMax: Date;

  if (range === "today") {
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 1);
  } else if (range === "tomorrow") {
    timeMin = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 1);
  } else {
    // this week (Mon-Sun)
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    timeMin = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + mondayOffset
    );
    timeMax = new Date(timeMin);
    timeMax.setDate(timeMax.getDate() + 7);
  }

  try {
    const cal = getCalendarClient(session.provider_token);

    // Fetch all calendars the user has access to (primary + shared)
    const calendarList = await cal.calendarList.list({ minAccessRole: "reader" });
    const calendars = (calendarList.data.items || []).filter(
      (c) => c.selected !== false
    );

    // Fetch events from all calendars in parallel
    const results = await Promise.allSettled(
      calendars.map((c) =>
        cal.events.list({
          calendarId: c.id!,
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 50,
        }).then((res) => ({ res, calendarName: CALENDAR_NAME_OVERRIDES[c.summary || ""] ?? c.summary ?? "" }))
      )
    );

    const events: CalendarEvent[] = [];
    for (const result of results) {
      if (result.status !== "fulfilled") continue;
      const { res, calendarName } = result.value;
      for (const item of res.data.items || []) {
        events.push({
          id: item.id || "",
          summary: item.summary || "(No title)",
          start: item.start?.dateTime || item.start?.date || "",
          end: item.end?.dateTime || item.end?.date || "",
          allDay: !item.start?.dateTime,
          location: item.location || undefined,
          color: item.colorId || undefined,
          calendarName,
        });
      }
    }

    // Sort by start time
    events.sort((a, b) => a.start.localeCompare(b.start));

    return NextResponse.json(events);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
