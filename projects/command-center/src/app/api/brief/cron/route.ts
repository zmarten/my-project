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

  // Use a SECURITY DEFINER function to access auth.sessions (not exposed via PostgREST)
  const { data: sessions, error } = await supabase.rpc("get_active_provider_tokens");

  if (error) {
    console.error("Cron: failed to fetch sessions", error.message);
    return NextResponse.json({ error: "Failed to fetch sessions" }, { status: 500 });
  }

  if (!sessions?.length) {
    return NextResponse.json({ date: today, results: [], message: "No active sessions with provider tokens" });
  }

  // SQL DISTINCT ON (user_id) already deduplicates — process directly
  const entries = (sessions as { user_id: string; provider_token: string }[])
    .filter((s) => s.provider_token);

  // Process users in parallel batches to avoid Vercel function timeout
  const BATCH_SIZE = 3;
  const results: { user_id: string; success: boolean; error?: string }[] = [];

  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.allSettled(
      batch.map(async ({ user_id: userId, provider_token: providerToken }) => {
        const rawData = await gatherBriefData(userId, providerToken);
        const brief = await synthesizeBrief(rawData);
        await supabase.from("daily_briefs").upsert({
          user_id: userId,
          brief_date: today,
          brief_data: brief,
          raw_context: rawData,
          generated_at: new Date().toISOString(),
        });
        return userId;
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        results.push({ user_id: result.value, success: true });
      } else {
        const err = result.reason;
        const userId = batch[batchResults.indexOf(result)]?.user_id ?? "unknown";
        console.error(`Cron: failed for user ${userId}:`, err instanceof Error ? err.message : err);
        results.push({ user_id: userId, success: false, error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
  }

  return NextResponse.json({ date: today, results });
}
