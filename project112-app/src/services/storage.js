const KEY = "stridehq.v2";
const LEGACY_KEY = "stridehq.v1";

function isDemoEntry(entry) {
  return entry?.source === "demo" || /^[defp]\d+$/.test(String(entry?.id || ""));
}

function normalizeMission(storedMission, defaultMission) {
  const mission = { ...defaultMission, ...(storedMission || {}) };
  let milestones = Array.isArray(storedMission?.milestones)
    ? storedMission.milestones
    : [];

  const hasMainTarget = milestones.some((item) => item.isMainTarget);
  if (!hasMainTarget) {
    const mainTarget = {
      id: mission.id || crypto.randomUUID(),
      name: mission.name,
      date: mission.date,
      location: mission.location || "",
      targetKm: Number(mission.targetKm) || 0,
      weeklyTarget: Number(mission.weeklyTarget) || 0,
      isMainTarget: true,
      archived: false,
    };

    const legacyMilestone = storedMission?.milestone;
    const remaining = milestones.length
      ? milestones
      : legacyMilestone
        ? [{ ...legacyMilestone, id: legacyMilestone.id || crypto.randomUUID() }]
        : [];

    milestones = [mainTarget, ...remaining.filter((item) => item.id !== mainTarget.id)];
  }

  milestones = milestones.map((item) => ({
    archived: false,
    isMainTarget: false,
    targetKm: null,
    weeklyTarget: null,
    ...item,
  }));

  const mainTarget = milestones.find((item) => item.isMainTarget && !item.archived)
    || milestones.find((item) => !item.archived)
    || milestones[0];

  return {
    ...mission,
    ...(mainTarget ? {
      id: mainTarget.id,
      name: mainTarget.name,
      date: mainTarget.date,
      location: mainTarget.location || "",
      targetKm: Number(mainTarget.targetKm) || Number(mission.targetKm) || 0,
      weeklyTarget: Number(mainTarget.weeklyTarget) || Number(mission.weeklyTarget) || 0,
    } : {}),
    milestones,
  };
}

function sanitizeState(state, defaults) {
  return {
    ...defaults,
    ...state,
    activities: Array.isArray(state?.activities)
      ? state.activities.filter((activity) => !isDemoEntry(activity))
      : [],
    plan: Array.isArray(state?.plan)
      ? state.plan.filter((item) => !isDemoEntry(item))
      : [],
    equipment: Array.isArray(state?.equipment)
      ? state.equipment.filter((item) => !isDemoEntry(item)).map((item) => ({ archived: false, ...item }))
      : [],
    fuel: Array.isArray(state?.fuel)
      ? state.fuel.filter((item) => !isDemoEntry(item)).map((item) => ({ archived: false, ...item }))
      : [],
    reviews: state?.reviews && typeof state.reviews === "object" ? state.reviews : {},
    strava: { ...defaults.strava, ...(state?.strava || {}) },
    mission: normalizeMission(state?.mission, defaults.mission),
    calendar: { ...defaults.calendar, ...(state?.calendar || {}) },
  };
}

export function loadState(defaults) {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored) return sanitizeState(JSON.parse(stored), defaults);

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = sanitizeState(JSON.parse(legacy), defaults);
      localStorage.setItem(KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_KEY);
      return migrated;
    }
  } catch {
    // Fall through to clean defaults.
  }

  return defaults;
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function resetState() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LEGACY_KEY);
  location.reload();
}
