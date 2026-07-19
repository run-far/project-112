import { activitiesLikelySame } from "./activityUtils";
import { supabase, supabaseConfigured } from "./supabase";

async function invokeIntervals(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("intervals", {
    body: { action, ...payload },
  });
  if (error) {
    let detail = error.message || "Intervals.icu-Anfrage fehlgeschlagen.";
    try {
      const response = error.context;
      if (response?.json) {
        const body = await response.json();
        detail = body?.message || detail;
      }
    } catch {
      // Keep the original function error.
    }
    throw new Error(detail);
  }
  if (data?.message && action !== "status" && !Array.isArray(data?.activities)) throw new Error(data.message);
  return data || {};
}

export function intervalsOnlineReady() {
  return supabaseConfigured;
}

export async function fetchIntervalsStatus() {
  return invokeIntervals("status");
}

export async function syncIntervalsActivities(after = "2025-01-01") {
  return invokeIntervals("sync", { after });
}

export async function publishIntervalsWeek({ weekStart, weekEnd, plan }) {
  return invokeIntervals("publish-plan", { weekStart, weekEnd, plan });
}


function zoneData(activity) {
  const times = Array.isArray(activity.icu_hr_zone_times) ? activity.icu_hr_zone_times.map(Number) : [];
  if (!times.length) return null;
  const boundaries = Array.isArray(activity.icu_hr_zones) ? activity.icu_hr_zones.map(Number) : [];
  const totalSeconds = times.reduce((sum, seconds) => sum + (Number.isFinite(seconds) ? seconds : 0), 0);
  if (!totalSeconds) return null;
  return {
    source: "intervals.icu",
    totalSeconds,
    zones: times.map((seconds, index) => ({
      zone: index + 1,
      seconds: Number(seconds || 0),
      max: boundaries[index] || null,
      percentage: Number(((Number(seconds || 0) / totalSeconds) * 100).toFixed(1)),
    })),
  };
}

function isRunningType(type) {
  return ["Run", "TrailRun", "VirtualRun"].includes(type);
}

export function mapIntervalsActivity(activity) {
  const durationSeconds = Number(activity.moving_time || activity.icu_recording_time || activity.elapsed_time || 0);
  const sourceName = String(activity.name || "Intervals.icu Aktivität");
  const type = activity.type || "Workout";
  return {
    id: `intervals-${activity.id}`,
    intervalsId: String(activity.id || ""),
    externalId: activity.external_id ? String(activity.external_id) : null,
    name: sourceName,
    sourceName,
    customName: null,
    nameOverride: false,
    description: activity.description || "",
    date: activity.start_date_local?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    startDateLocal: activity.start_date_local || null,
    distance: Number((Number(activity.distance || 0) / 1000).toFixed(2)),
    duration: Math.round(durationSeconds / 60),
    durationSeconds,
    elapsedSeconds: Number(activity.elapsed_time || durationSeconds),
    elevation: Math.round(Number(activity.total_elevation_gain || 0)),
    avgHr: activity.average_heartrate ? Math.round(Number(activity.average_heartrate)) : null,
    maxHr: activity.max_heartrate ? Math.round(Number(activity.max_heartrate)) : null,
    heartRateZones: zoneData(activity),
    hasHeartRate: Boolean(activity.has_heartrate || activity.average_heartrate),
    averageSpeed: Number(activity.average_speed || 0),
    calories: activity.calories ? Math.round(Number(activity.calories)) : null,
    averageCadence: activity.average_cadence ? Number(activity.average_cadence) : null,
    trainingLoad: activity.icu_training_load ?? null,
    intensity: activity.icu_intensity ?? null,
    trimp: activity.trimp ?? null,
    ctl: activity.icu_ctl ?? null,
    atl: activity.icu_atl ?? null,
    perceivedExertion: activity.perceived_exertion ?? activity.icu_rpe ?? null,
    deviceName: activity.device_name || null,
    fileType: activity.file_type || null,
    race: Boolean(activity.race),
    officialEvent: Boolean(activity.race),
    type,
    sportType: activity.sport_type || type,
    subType: activity.sub_type || activity.icu_activity_type || activity.category || null,
    category: isRunningType(type) ? "running" : "cross-training",
    temperature: activity.average_temp ?? null,
    source: "intervals",
    sources: ["intervals"],
  };
}

export function mapIntervalsActivities(activities) {
  return activities
    .map(mapIntervalsActivity)
    .sort((a, b) => new Date(b.startDateLocal || b.date) - new Date(a.startDateLocal || a.date));
}


export function mergeIntervalsActivities(existing, imported) {
  const result = [...existing];
  let added = 0;
  let duplicates = 0;

  imported.forEach((intervalsActivity) => {
    const index = result.findIndex((activity) => activitiesLikelySame(activity, intervalsActivity));
    if (index === -1) {
      result.push(intervalsActivity);
      added += 1;
      return;
    }

    const current = result[index];
    const customName = current.customName || (current.nameOverride ? current.name : null);
    const latestSourceName = intervalsActivity.sourceName || intervalsActivity.name || current.sourceName || current.name;
    result[index] = {
      ...current,
      ...intervalsActivity,
      // Keep the existing internal id so reviews and matched plan entries survive.
      id: current.id || intervalsActivity.id,
      name: customName || latestSourceName,
      sourceName: latestSourceName,
      customName: customName || null,
      nameOverride: Boolean(customName),
      source: "intervals",
      intervalsId: intervalsActivity.intervalsId || current.intervalsId,
      externalId: current.externalId || intervalsActivity.externalId,
      avgHr: intervalsActivity.avgHr ?? current.avgHr,
      maxHr: intervalsActivity.maxHr ?? current.maxHr,
      heartRateZones: intervalsActivity.heartRateZones || current.heartRateZones || null,
      hasHeartRate: intervalsActivity.hasHeartRate ?? current.hasHeartRate,
      elevation: intervalsActivity.elevation || current.elevation,
      calories: intervalsActivity.calories ?? current.calories,
      averageCadence: intervalsActivity.averageCadence ?? current.averageCadence,
      trainingLoad: intervalsActivity.trainingLoad ?? current.trainingLoad,
      intensity: intervalsActivity.intensity ?? current.intensity,
      trimp: intervalsActivity.trimp ?? current.trimp,
      ctl: intervalsActivity.ctl ?? current.ctl,
      atl: intervalsActivity.atl ?? current.atl,
      race: current.race || intervalsActivity.race,
      officialEvent: current.officialEvent || intervalsActivity.officialEvent,
      sources: Array.from(new Set([...(current.sources || [current.source].filter(Boolean)), "intervals"])),
    };
    duplicates += 1;
  });

  // Intervals.icu is the primary source. Any leftover Strava twin is removed,
  // while a genuinely unique Strava activity remains available as fallback.
  const intervalRows = result.filter((activity) => activity.source === "intervals" || activity.intervalsId);
  const cleaned = result.filter((activity) => {
    if (String(activity.source || "").toLowerCase() !== "strava") return true;
    return !intervalRows.some((candidate) => candidate.id !== activity.id && activitiesLikelySame(candidate, activity));
  });

  cleaned.sort((a, b) => new Date(b.startDateLocal || b.date) - new Date(a.startDateLocal || a.date));
  return { activities: cleaned, added, duplicates };
}
