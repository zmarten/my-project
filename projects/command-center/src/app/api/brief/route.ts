import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { gatherBriefData } from "@/lib/brief/gather";
import { synthesizeBrief } from "@/lib/brief/synthesize";

export async function GET(request: NextRequest) {
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

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // provider_token is dropped from the cookie on session refresh — prefer client-supplied header
  const providerToken =
    request.headers.get("x-provider-token") ?? session.provider_token;

  if (!providerToken) {
    return NextResponse.json(
      { error: "Google token unavailable — please sign out and sign back in" },
      { status: 401 }
    );
  }

  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];
  const forceRefresh =
    request.nextUrl.searchParams.get("refresh") === "true";

  // Return cached brief unless force refresh
  if (!forceRefresh) {
    const { data: cached } = await serviceClient
      .from("daily_briefs")
      .select("brief_data, generated_at")
      .eq("user_id", session.user.id)
      .eq("brief_date", today)
      .single();

    if (cached) {
      return NextResponse.json({
        brief: cached.brief_data,
        cached: true,
        generated_at: cached.generated_at,
        date: today,
      });
    }
  }

  try {
    const rawData = await gatherBriefData(session.user.id, providerToken);

    const brief = await synthesizeBrief(rawData);

    await serviceClient.from("daily_briefs").upsert({
      user_id: session.user.id,
      brief_date: today,
      brief_data: brief,
      raw_context: rawData,
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      brief,
      cached: false,
      generated_at: new Date().toISOString(),
      date: today,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to generate brief";
    console.error("Brief generation error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
