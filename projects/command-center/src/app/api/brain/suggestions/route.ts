import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { BrainSuggestion } from "@/types";

export async function GET() {
  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
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

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Brain lives in the same Supabase project — use the service role client
  const brain = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Fetch recent thoughts that have action items, from the last 14 days
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await brain
    .from("thoughts")
    .select("id, action_items, summary, created_at")
    .eq("archived", false)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ suggestions: [], error: "Brain unavailable" });
  }

  const suggestions: BrainSuggestion[] = [];
  for (const thought of data || []) {
    for (const action of (thought.action_items as string[]) || []) {
      if (action?.trim()) {
        suggestions.push({
          action: action.trim(),
          source_summary: thought.summary,
          thought_id: thought.id,
          created_at: thought.created_at,
        });
      }
    }
  }

  // Deduplicate by action text (case-insensitive)
  const seen = new Set<string>();
  const deduped = suggestions.filter((s) => {
    const key = s.action.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ suggestions: deduped.slice(0, 15) });
}
