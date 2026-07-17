const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const publicCalendarUrl = "https://run-far.github.io/project-112/calendar/stridehq.ics";

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function startOfCurrentWeek() {
  const now = new Date();
  const monday = new Date(now);
  const day = now.getDay() || 7;
  monday.setDate(now.getDate() - day + 1);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

function dateForWeekday(dayName, time = "18:00", exactDate = null) {
  if (exactDate) {
    const selected = new Date(`${exactDate}T00:00:00`);
    const [hours, minutes] = String(time || "18:00").split(":").map(Number);
    selected.setHours(hours || 0, minutes || 0, 0, 0);
    return selected;
  }
  const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const target = names.indexOf(dayName);
  const monday = startOfCurrentWeek();
  const offset = target === 0 ? 6 : Math.max(0, target - 1);
  monday.setDate(monday.getDate() + offset);
  const [hours, minutes] = String(time || "18:00").split(":").map(Number);
  monday.setHours(hours || 0, minutes || 0, 0, 0);
  return monday;
}

function formatIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendar(plan) {
  const stamp = formatIcsDate(new Date());
  const events = (Array.isArray(plan) ? plan : []).map((item) => {
    const start = dateForWeekday(item.day, item.time, item.date);
    const end = new Date(start.getTime() + Math.max(30, Number(item.duration || 60)) * 60_000);
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
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcs(`StrideHQ – ${item.title || item.type || "Training"}`)}`,
      `DESCRIPTION:${escapeIcs(description)}`,
      "END:VEVENT",
    ].join("\r\n");
  });

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

export function downloadCalendar(plan) {
  const content = buildCalendar(plan);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "stridehq.ics";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getCalendarUrl(calendarId) {
  if (apiBaseUrl && calendarId) {
    return `${apiBaseUrl}/api/calendar/${encodeURIComponent(calendarId)}.ics`;
  }
  return publicCalendarUrl;
}

export async function syncCalendar(calendarId, plan) {
  if (!apiBaseUrl) {
    downloadCalendar(plan);
    return {
      ok: true,
      count: Array.isArray(plan) ? plan.length : 0,
      updatedAt: new Date().toISOString(),
      mode: "download",
    };
  }

  const response = await fetch(`${apiBaseUrl}/api/calendar/${encodeURIComponent(calendarId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Kalender konnte nicht synchronisiert werden.");
  return data;
}
