import { NextRequest, NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;
function getClient() {
  if (!_client) _client = new Anthropic();
  return _client;
}

const TAG_OPTIONS = ["covey", "home", "health", "deloitte", "new"] as const;
type TaskTag = (typeof TAG_OPTIONS)[number];

interface ParsedTask {
  text: string;
  tag: TaskTag;
  assigned_date: string | null;
}

export async function POST(request: NextRequest) {
  const session = await getApiSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { text?: string; today?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { text, today } = body;
  if (!text?.trim()) {
    return NextResponse.json({ error: "No text provided" }, { status: 400 });
  }
  if (text.length > 500) {
    return NextResponse.json({ error: "Text too long" }, { status: 400 });
  }

  const todayStr = today || new Date().toISOString().split("T")[0];
  const todayDate = new Date(todayStr + "T12:00:00");
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = dayNames[todayDate.getDay()];

  let message;
  try {
    message = await getClient().messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      system: `You parse natural language task input into structured task data. Today is ${todayStr} (${todayDayName}).

Return ONLY valid JSON with this shape:
{
  "text": "cleaned up task description (sentence case, imperative)",
  "tag": one of ["covey", "home", "health", "deloitte", "new"],
  "assigned_date": "YYYY-MM-DD or null"
}

Tag rules:
- "covey" = personal productivity / time management / planning
- "home" = house, family, errands, chores, kids
- "health" = medical, fitness, crossfit, nutrition, wellness
- "deloitte" = work, professional, meetings, deliverables
- "new" = default / unclear

Date rules:
- "today" → ${todayStr}
- "tomorrow" → next day
- "Friday" / "this Friday" → next upcoming ${dayNames[5]} (${getNextWeekday(todayDate, 5)})
- "Monday" → ${getNextWeekday(todayDate, 1)}
- "next week" → 7 days from today
- No date mentioned → null`,
      messages: [{ role: "user", content: text }],
    });
  } catch (err) {
    console.error("Claude parse error:", err);
    return NextResponse.json({ text: text.trim(), tag: "new", assigned_date: null });
  }

  const raw = message.content[0].type === "text" ? message.content[0].text : "";
  let parsed: ParsedTask;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return NextResponse.json({ text: text.trim(), tag: "new", assigned_date: null });
  }

  // Validate tag
  if (!TAG_OPTIONS.includes(parsed.tag)) parsed.tag = "new";

  return NextResponse.json(parsed);
}

function getNextWeekday(from: Date, targetDay: number): string {
  const d = new Date(from);
  const current = d.getDay();
  let diff = targetDay - current;
  if (diff <= 0) diff += 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
