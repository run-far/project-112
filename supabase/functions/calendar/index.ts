import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function escapeIcs(value: unknown) {
  return String(value ?? "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function formatIcsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function dateForItem(item: Record<string, unknown>) {
  const exactDate = String(item.date || "");
  const time = String(item.time || "18:00");
  const [hours, minutes] = time.split(":").map(Number);
  if (exactDate) {
    const selected = new Date(`${exactDate}T00:00:00+02:00`);
    selected.setHours(hours || 0, minutes || 0, 0, 0);
    return selected;
  }
  const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay() || 7;
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(hours || 0, minutes || 0, 0, 0);
  const target = names.indexOf(String(item.day || ""));
  monday.setDate(monday.getDate() + (target === 0 ? 6 : Math.max(0, target - 1)));
  return monday;
}

function buildCalendar(plan: Record<string, unknown>[]) {
  const stamp = formatIcsDate(new Date());
  const events = plan.filter((item) => !item.archived).map((item) => {
    const start = dateForItem(item);
    const end = new Date(start.getTime() + Math.max(30, Number(item.duration || 60)) * 60_000);
    const description = [item.type, item.distance ? `${item.distance} km` : "", item.optional ? "Optional" : "Pflicht", item.notes || ""].filter(Boolean).join(" · ");
    return [
      "BEGIN:VEVENT",
      `UID:${escapeIcs(item.id || crypto.randomUUID())}@stridehq`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(`StrideHQ – ${item.title || item.type || "Training"}`)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT",
    ].join("\r\n");
  });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//StrideHQ//Training Calendar//DE", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:StrideHQ Trainingsplan", "X-WR-TIMEZONE:Europe/Berlin", ...events, "END:VCALENDAR", ""].join("\r\n");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const token = new URL(request.url).searchParams.get("token");
  if (!token) return new Response("Kalender-Token fehlt.", { status: 400, headers });

  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const client = createClient(url, serviceRole, { auth: { persistSession: false } });
  const { data, error } = await client.from("stridehq_data").select("app_data").eq("calendar_token", token).maybeSingle();
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
