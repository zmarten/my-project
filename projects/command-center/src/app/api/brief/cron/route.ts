import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getOAuth2Client } from "@/lib/google";
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

  // Get all users (single-user app in practice)
  const { data: users, error } = await supabase.auth.admin.listUsers();
  if (error || !users.users.length) {
    return NextResponse.json({ error: "No users found" }, { status: 404 });
  }

  const today = new Date().toISOString().split("T")[0];
  const results = [];

  for (const user of users.users) {
    try {
      // Get the user's stored Google refresh token from their session
      const { data: sessions } = await supabase
        .from("user_sessions")
        .select("provider_refresh_token")
        .eq("user_id", user.id)
        .single();

      if (!sessions?.provider_refresh_token) continue;

      // Exchange refresh token for access token
      const oauth2 = getOAuth2Client();
      oauth2.setCredentials({ refresh_token: sessions.provider_refresh_token });
      const { credentials } = await oauth2.refreshAccessToken();

      if (!credentials.access_token) continue;

      const rawData = await gatherBriefData(user.id, credentials.access_token);
      const brief = await synthesizeBrief(rawData);

      await supabase.from("daily_briefs").upsert({
        user_id: user.id,
        brief_date: today,
        brief_data: brief,
        raw_context: rawData,
        generated_at: new Date().toISOString(),
      });

      results.push({ user_id: user.id, success: true });
    } catch (err) {
      results.push({
        user_id: user.id,
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ date: today, results });
}
