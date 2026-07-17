const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
export const STRAVA_IMPORT_FROM = "2025-01-01";

function requireApiBaseUrl() {
  if (!apiBaseUrl) throw new Error("VITE_API_BASE_URL fehlt.");
}

async function readJson(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || "Unbekannte Serverantwort" };
  }
}

export function connectStrava() {
  const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
  if (!clientId) throw new Error("VITE_STRAVA_CLIENT_ID fehlt.");

  const redirectUri =
    import.meta.env.VITE_STRAVA_REDIRECT_URI ||
    `${window.location.origin}${import.meta.env.BASE_URL}settings`;

  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    approval_prompt: "auto",
    scope: "read,activity:read_all",
  });

  window.location.assign(`https://www.strava.com/oauth/authorize?${params}`);
}

export async function exchangeCode(code) {
  requireApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/strava/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data?.stravaResponse?.message || data?.message || "Token-Austausch fehlgeschlagen.");
  }
  return data;
}

export async function fetchActivities(accessToken, importFrom = STRAVA_IMPORT_FROM) {
  requireApiBaseUrl();
  if (!accessToken) throw new Error("Strava Access Token fehlt.");

  const after = Math.floor(new Date(`${importFrom}T00:00:00Z`).getTime() / 1000);
  const response = await fetch(
    `${apiBaseUrl}/api/strava/activities/all?after=${after}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Aktivitäten konnten nicht geladen werden.");
  }
  return Array.isArray(data) ? data : data.activities || [];
}

export function isRunningActivity(activity) {
  const type = activity?.sport_type || activity?.type;
  return ["Run", "TrailRun", "VirtualRun"].includes(type);
}

export function mapStravaActivity(activity) {
  const durationSeconds = Number(activity.moving_time || 0);
  return {
    id: String(activity.id),
    name: activity.name || "Strava Run",
    date: activity.start_date_local?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    startDateLocal: activity.start_date_local || null,
    distance: Number((Number(activity.distance || 0) / 1000).toFixed(2)),
    duration: Math.round(durationSeconds / 60),
    durationSeconds,
    elapsedSeconds: Number(activity.elapsed_time || durationSeconds),
    elevation: Math.round(Number(activity.total_elevation_gain || 0)),
    avgHr: activity.average_heartrate ? Math.round(Number(activity.average_heartrate)) : null,
    maxHr: activity.max_heartrate ? Math.round(Number(activity.max_heartrate)) : null,
    averageSpeed: Number(activity.average_speed || 0),
    type: activity.sport_type || activity.type || "Run",
    workoutType: activity.workout_type ?? null,
    gearId: activity.gear_id || null,
    source: "strava",
  };
}

export function mapRunningActivities(activities) {
  return activities
    .filter(isRunningActivity)
    .map(mapStravaActivity)
    .sort((a, b) => new Date(b.startDateLocal || b.date) - new Date(a.startDateLocal || a.date));
}
