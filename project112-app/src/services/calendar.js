const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";

export function getCalendarUrl(calendarId) {
  if (!apiBaseUrl || !calendarId) return "";
  return `${apiBaseUrl}/api/calendar/${encodeURIComponent(calendarId)}.ics`;
}

export async function syncCalendar(calendarId, plan) {
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL fehlt.");
  const response = await fetch(`${apiBaseUrl}/api/calendar/${encodeURIComponent(calendarId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || "Kalender konnte nicht synchronisiert werden.");
  return data;
}
