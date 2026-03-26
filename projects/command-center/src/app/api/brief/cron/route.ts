import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gatherBriefData } from "@/lib/brief/gather";
import { synthesizeBrief } from "@/lib/brief/synthesize";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  // Pull provider tokens from auth.sessions (Supabase stores them here with service role)
  // Each row has user_id and provider_token for users who have active sessions
  const { data: sessions, error } = await supabase
    .from("sessions")
    .select("user_id, provider_token")
    .not("provider_token", "is", null);

  if (error) {
    console.error("Cron: failed to fetch sessions", error.message);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  if (!sessions?.length) {
    return NextResponse.json({ date: today, results: [], message: "No active sessions with provider tokens" });
  }

  // Deduplicate by user_id — take the most recent session per user
  const userTokenMap = new Map<string, string>();
  for (const s of sessions) {
    if (s.provider_token && !userTokenMap.has(s.user_id)) {
      userTokenMap.set(s.user_id, s.provider_token);
    }
  }

  const results = [];

  for (const [userId, providerToken] of Array.from(userTokenMap.entries())) {
    try {
      const rawData = await gatherBriefData(userId, providerToken);
      const brief = await synthesizeBrief(rawData);

      await supabase.from("daily_briefs").upsert({
        user_id: userId,
        brief_date: today,
        brief_data: brief,
        raw_context: rawData,
        generated_at: new Date().toISOString(),
      });

      results.push({ user_id: userId, success: true });
    } catch (err) {
      console.error(`Cron: failed for user ${userId}:`, err instanceof Error ? err.message : err);
      results.push({
        user_id: userId,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ date: today, results });
}
