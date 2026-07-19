const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export const publicCalendarUrl = "https://run-far.github.io/project-112/calendar/stridehq.ics";

function escapeIcs(value) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function isoDateLocal(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateForWeekday(dayName) {
  const names = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
  const target = names.indexOf(dayName);
  const monday = new Date();
  const day = monday.getDay() || 7;
  monday.setDate(monday.getDate() - day + 1 + (target === 0 ? 6 : Math.max(0, target - 1)));
  return isoDateLocal(monday);
}

function compactLocal(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}${month}${day}T${hours}${minutes}00`;
}

function localRange(item) {
  const rawDate = item.date || dateForWeekday(item.day);
  const [year, month, day] = String(rawDate).split("-").map(Number);
  const [hours, minutes] = String(item.time || "18:00").split(":").map(Number);
  if (!year || !month || !day) return null;
  const start = new Date(Date.UTC(year, month - 1, day, hours || 0, minutes || 0, 0));
  const end = new Date(start.getTime() + Math.max(30, Number(item.duration || 60)) * 60_000);
  return { start: compactLocal(start), end: compactLocal(end) };
}

function formatUtcStamp(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildCalendar(plan) {
  const stamp = formatUtcStamp(new Date());
  const events = (Array.isArray(plan) ? plan : [])
    .filter((item) => !item.archived)
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
        `SUMMARY:${escapeIcs(`Endurance Intelligence – ${item.title || item.type || "Training"}`)}`,
        `DESCRIPTION:${escapeIcs(description)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .filter(Boolean);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Endurance Intelligence//Training Calendar//DE",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Endurance Intelligence Trainingsplan",
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
