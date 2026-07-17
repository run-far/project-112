export const mission = {
  id: "hbu-2026",
  name: "Heartbeat Ultra Fulda",
  date: "2026-11-21",
  targetKm: 112,
  weeklyTarget: 70,
  milestone: {
    name: "Backyard Ultra",
    date: "2026-09-26",
  },
};

export const defaultState = {
  activities: [],
  reviews: {},
  plan: [],
  equipment: [],
  fuel: [],
  mission,
  strava: {
    connected: false,
    athlete: null,
    token: null,
    refreshToken: null,
    expiresAt: null,
    lastSyncAt: null,
    importFrom: "2025-01-01",
  },
};
