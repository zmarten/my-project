import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Validate user with Supabase Auth server (getSession only reads cookies without validation)
  const { data: { user } } = await supabase.auth.getUser();

  // Allow auth callback and public assets
  if (request.nextUrl.pathname.startsWith("/auth/callback")) {
    return response;
  }

  // Protect API routes (except cron which uses bearer token)
  if (request.nextUrl.pathname.startsWith("/api/")) {
    if (request.nextUrl.pathname === "/api/brief/cron") {
      return response;
    }
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return response;
  }

  // Protect pages — redirect unauthenticated users to root
  if (!user && request.nextUrl.pathname !== "/") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon-|manifest|sw.js).*)",
  ],
};
