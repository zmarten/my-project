import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCalendarClient } from "@/lib/google";
import type { CalendarEvent } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "today";

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();
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
    const calendar = getCalendarClient(session.provider_token);
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 50,
    });

    const events: CalendarEvent[] = (response.data.items || []).map((item) => ({
      id: item.id || "",
      summary: item.summary || "(No title)",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
      allDay: !item.start?.dateTime,
      location: item.location || undefined,
      color: item.colorId || undefined,
    }));

    return NextResponse.json(events);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
