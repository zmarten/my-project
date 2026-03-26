import { NextResponse } from "next/server";
import { getApiSession } from "@/lib/api-auth";
import { getGmailClient } from "@/lib/google";
import type { GmailThread } from "@/types";

function getHeader(headers: { name?: string | null; value?: string | null }[], name: string): string {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";
}

export async function GET() {
  const session = await getApiSession();
  if (!session?.provider_token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const gmail = getGmailClient(session.provider_token);

    const list = await gmail.users.messages.list({
      userId: "me",
      q: "is:important OR is:starred",
      maxResults: 10,
    });

    // Fetch all message details in parallel (fixes N+1 pattern)
    const messageDetails = await Promise.allSettled(
      (list.data.messages || []).map((msg) =>
        gmail.users.messages.get({
          userId: "me",
          id: msg.id!,
          format: "metadata",
          metadataHeaders: ["Subject", "From", "Date"],
        })
      )
    );

    const threads: GmailThread[] = [];
    for (const result of messageDetails) {
      if (result.status !== "fulfilled") continue;
      const full = result.value;
      const headers = full.data.payload?.headers || [];
      const fromRaw = getHeader(headers, "From");
      const senderMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
      const sender = senderMatch ? senderMatch[1].replace(/"/g, "") : fromRaw;
      const senderEmail = senderMatch ? senderMatch[2] : fromRaw;

      threads.push({
        id: full.data.id!,
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
