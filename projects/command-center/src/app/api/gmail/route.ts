import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getGmailClient } from "@/lib/google";
import type { GmailThread } from "@/types";

function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function GET() {
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

  try {
    const gmail = getGmailClient(session.provider_token);

    // Get important/starred messages
    const list = await gmail.users.messages.list({
      userId: "me",
      q: "is:important OR is:starred",
      maxResults: 10,
    });

    const threads: GmailThread[] = [];

    for (const msg of list.data.messages || []) {
      const full = await gmail.users.messages.get({
        userId: "me",
        id: msg.id!,
        format: "metadata",
        metadataHeaders: ["Subject", "From", "Date"],
      });

      const headers = full.data.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const senderMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
      const sender = senderMatch ? senderMatch[1].replace(/"/g, "") : fromRaw;
      const senderEmail = senderMatch ? senderMatch[2] : fromRaw;

      threads.push({
        id: msg.id!,
        subject: getHeader(headers, "Subject") || "(No subject)",
        sender,
        senderEmail,
        preview: full.data.snippet || "",
        date: getHeader(headers, "Date"),
        unread: (full.data.labelIds || []).includes("UNREAD"),
        labels: full.data.labelIds || [],
      });
    }

    return NextResponse.json(threads);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Gmail";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
