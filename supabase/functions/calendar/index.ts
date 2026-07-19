import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeIcs(value: unknown) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function utcStamp(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function compactLocal(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function localRange(item: Record<string, unknown>) {
  const date = String(item.date || "");
  const time = String(item.time || "18:00");
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (!year || !month || !day) return null;

  // UTC is used here only for calendar arithmetic. The generated value is a
  // floating Europe/Berlin wall-clock time through the TZID parameter below.
  const start = new Date(Date.UTC(year, month - 1, day, hours || 0, minutes || 0, 0));
  const end = new Date(start.getTime() + Math.max(30, Number(item.duration || 60)) * 60_000);
  return { start: compactLocal(start), end: compactLocal(end) };
}

function buildCalendar(plan: Record<string, unknown>[]) {
  const stamp = utcStamp();
  const events = plan
    .filter((item) => !item.archived && item.date)
    .map((item) => {
      const range = localRange(item);
      if (!range) return "";
      const description = [
        item.type,
        item.distance ? `${item.distance} km` : "",
        item.optional ? "Optional" : "Pflicht",
        item.notes || "",
      ].filter(Boolean).join(" · ");
      return [
        "BEGIN:VEVENT",
        `UID:${escapeIcs(item.id || crypto.randomUUID())}@stridehq`,
        `DTSTAMP:${stamp}`,
        `DTSTART;TZID=Europe/Berlin:${range.start}`,
        `DTEND;TZID=Europe/Berlin:${range.end}`,
        `SUMMARY:${escapeIcs(`StrideHQ – ${item.title || item.type || "Training"}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StrideHQ//Training Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:StrideHQ Trainingsplan",
    "X-WR-TIMEZONE:Europe/Berlin",
    ...events,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("Kalender-Token fehlt.", { status: 400, headers });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data, error } = await client
    .from("stridehq_data")
    .select("app_data")
    .eq("calendar_token", token)
    .maybeSingle();

  if (error || !data) return new Response("Kalender nicht gefunden.", { status: 404, headers });

  const plan = Array.isArray(data.app_data?.plan) ? data.app_data.plan : [];
  return new Response(buildCalendar(plan), {
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="stridehq.ics"',
      "Cache-Control": "public, max-age=300",
    },
  });
});
