import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Session } from "@supabase/supabase-js";

export async function getApiSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Cookie setting can fail in read-only contexts (Server Components)
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Expected in read-only contexts
          }
        },
      },
    }
  );

  // Validate the user with the Supabase Auth server (not just reading the cookie)
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Session is still needed for provider_token access
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}
