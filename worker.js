const PP30_PREFIX = "/projects/MTNTOUGH PP30";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const decodedPath = decodeURIComponent(url.pathname);

    if (decodedPath.startsWith("/api/pp30/")) {
      const auth = await requireAuthenticatedUser(request, env);
      if (!auth.ok) return json({ error: auth.error }, 401);
      return handlePp30Api(request, env, decodedPath);
    }

    if (decodedPath.startsWith(PP30_PREFIX)) {
      const auth = await requireAuthenticatedUser(request, env);
      if (!auth.ok) return unauthorizedPage();
    }

    return env.ASSETS.fetch(request);
  }
};

async function requireAuthenticatedUser(request, env) {
  if (env.REQUIRE_ACCESS !== "true") return { ok: true };
  const hostname = new URL(request.url).hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return { ok: true };

  const token = request.headers.get("Cf-Access-Jwt-Assertion") || "";
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return { ok: false, error: "Cloudflare Access JWT validation is not configured" };
  }

  const verified = await verifyAccessJwt(token, env);
  if (!verified.ok) return verified;

  const email = verified.payload.email || request.headers.get("Cf-Access-Authenticated-User-Email") || "";
  const allowed = String(env.ALLOWED_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return { ok: false, error: "Cloudflare Access authentication required" };
  if (allowed.length && !allowed.includes(email.toLowerCase())) {
    return { ok: false, error: "This account is not allowed to view PP30" };
  }

  return { ok: true, email };
}

async function verifyAccessJwt(token, env) {
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
    if (!encodedHeader || !encodedPayload || !encodedSignature) {
      return { ok: false, error: "Cloudflare Access token required" };
    }

    const header = JSON.parse(base64UrlDecode(encodedHeader));
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const issuer = `https://${env.ACCESS_TEAM_DOMAIN}.cloudflareaccess.com`;
    const audiences = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

    if (payload.iss !== issuer) return { ok: false, error: "Invalid Access issuer" };
    if (!audiences.includes(env.ACCESS_AUD)) return { ok: false, error: "Invalid Access audience" };
    if (payload.exp && Date.now() / 1000 >= payload.exp) return { ok: false, error: "Access token expired" };

    const certsResponse = await fetch(`${issuer}/cdn-cgi/access/certs`);
    const certs = await certsResponse.json();
    const jwk = certs.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return { ok: false, error: "Access signing key not found" };

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"]
    );
    const data = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signature = base64UrlToBytes(encodedSignature);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, data);
    return valid ? { ok: true, payload } : { ok: false, error: "Invalid Access token signature" };
  } catch {
    return { ok: false, error: "Could not validate Access token" };
  }
}

function base64UrlDecode(value) {
  const binary = atob(normalizeBase64Url(value));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function base64UrlToBytes(value) {
  const binary = atob(normalizeBase64Url(value));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function normalizeBase64Url(value) {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
}

async function handlePp30Api(request, env, pathname) {
  if (!env.DB) return json({ error: "D1 binding DB is not configured" }, 500);

  if (request.method === "GET" && pathname === "/api/pp30/bootstrap") {
    const [workoutRows, logRows] = await Promise.all([
      env.DB.prepare("SELECT * FROM workouts ORDER BY sort_order").all(),
      env.DB.prepare("SELECT * FROM training_logs").all()
    ]);

    const workouts = workoutRows.results.map((row) => ({
      id: row.id,
      week: row.week,
      day: row.day,
      weekday: row.weekday,
      type: row.type,
      title: row.title,
      focus: row.focus,
      blocks: JSON.parse(row.blocks_json),
      track: JSON.parse(row.track_json),
      prescription: row.prescription
    }));

    const log = {};
    for (const row of logRows.results) {
      log[row.workout_id] = {
        complete: Boolean(row.complete),
        date: row.completed_date,
        result: row.result,
        metrics: JSON.parse(row.metrics_json || "{}"),
        rpe: row.rpe,
        trackLog: row.track_log,
        notes: row.notes
      };
    }

    return json({ workouts, log });
  }

  const logMatch = pathname.match(/^\/api\/pp30\/log\/([^/]+)$/);
  if (request.method === "PUT" && logMatch) {
    const workoutId = decodeURIComponent(logMatch[1]);
    const body = await request.json();
    await env.DB.prepare(`
      INSERT INTO training_logs (
        workout_id, complete, completed_date, result, metrics_json, rpe, track_log, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(workout_id) DO UPDATE SET
        complete = excluded.complete,
        completed_date = excluded.completed_date,
        result = excluded.result,
        metrics_json = excluded.metrics_json,
        rpe = excluded.rpe,
        track_log = excluded.track_log,
        notes = excluded.notes
    `).bind(
      workoutId,
      body.complete ? 1 : 0,
      String(body.date || ""),
      String(body.result || ""),
      JSON.stringify(body.metrics || {}),
      String(body.rpe || ""),
      String(body.trackLog || ""),
      String(body.notes || "")
    ).run();

    return json({ ok: true });
  }

  if (request.method === "DELETE" && pathname === "/api/pp30/log") {
    await env.DB.prepare("DELETE FROM training_logs").run();
    return json({ ok: true });
  }

  return json({ error: "Not found" }, 404);
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

function unauthorizedPage() {
  return new Response(`<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Authentication required</title></head>
<body><main style="font-family:system-ui,sans-serif;max-width:42rem;margin:12vh auto;padding:2rem;"><p>Private app</p><h1>Authentication required</h1><p>This MTNTOUGH tracker is protected by Cloudflare Access.</p></main></body>
</html>`, {
    status: 401,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
}
