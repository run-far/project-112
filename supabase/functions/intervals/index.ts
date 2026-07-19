import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function requiredSecret(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} ist in Supabase nicht gesetzt.`);
  return value;
}

async function authenticatedUser(request: Request) {
  const supabaseUrl = requiredSecret("SUPABASE_URL");
  const serviceRole = requiredSecret("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  const authorization = request.headers.get("Authorization") || "";
  const accessJwt = authorization.replace(/^Bearer\s+/i, "");
  if (!accessJwt) return null;
  const { data, error } = await admin.auth.getUser(accessJwt);
  if (error || !data.user) return null;
  return data.user;
}

function intervalsAuthorization(apiKey: string) {
  return `Basic ${btoa(`API_KEY:${apiKey}`)}`;
}

async function intervalsGet(path: string, apiKey: string) {
  const response = await fetch(`https://intervals.icu/api/v1${path}`, {
    headers: {
      Authorization: intervalsAuthorization(apiKey),
      Accept: "application/json",
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof data?.error === "string" ? data.error : data?.message;
    throw new Error(message || `Intervals.icu-Anfrage fehlgeschlagen (${response.status}).`);
  }
  return data;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ message: "Nur POST ist erlaubt." }, 405);

  try {
    const user = await authenticatedUser(request);
    if (!user) return json({ message: "Nicht angemeldet." }, 401);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || "status");
    const apiKey = Deno.env.get("INTERVALS_API_KEY") || "";
    const athleteId = encodeURIComponent(Deno.env.get("INTERVALS_ATHLETE_ID") || "0");

    if (action === "status") {
      if (!apiKey) return json({ configured: false, connected: false, message: "INTERVALS_API_KEY fehlt." });
      try {
        const newestDate = new Date();
        newestDate.setDate(newestDate.getDate() + 1);
        const oldestDate = new Date();
        oldestDate.setDate(oldestDate.getDate() - 30);
        const query = new URLSearchParams({
          oldest: oldestDate.toISOString().slice(0, 10),
          newest: newestDate.toISOString().slice(0, 10),
          limit: "1",
        });
        const latest = await intervalsGet(`/athlete/${athleteId}/activities?${query.toString()}`, apiKey);
        return json({ configured: true, connected: true, activityCount: Array.isArray(latest) ? latest.length : 0 });
      } catch (error) {
        return json({ configured: true, connected: false, message: error instanceof Error ? error.message : String(error) });
      }
    }

    if (!apiKey) return json({ message: "INTERVALS_API_KEY ist in Supabase noch nicht gesetzt." }, 400);

    if (action === "sync") {
      const after = String(body.after || "2025-01-01");
      const oldestDate = /^\d{4}-\d{2}-\d{2}$/.test(after) ? after : "2025-01-01";
      const newestDate = new Date();
      newestDate.setDate(newestDate.getDate() + 1);
      const newest = newestDate.toISOString().slice(0, 10);
      const query = new URLSearchParams({ oldest: oldestDate, newest, limit: "2000" });
      const activities = await intervalsGet(`/athlete/${athleteId}/activities?${query.toString()}`, apiKey);
      if (!Array.isArray(activities)) throw new Error("Intervals.icu hat kein gültiges Aktivitäten-Array geliefert.");
      return json({ activities, syncedAt: new Date().toISOString() });
    }

    return json({ message: "Unbekannte Intervals.icu-Aktion." }, 400);
  } catch (error) {
    console.error(error);
    return json({ message: error instanceof Error ? error.message : String(error) }, 500);
  }
});
