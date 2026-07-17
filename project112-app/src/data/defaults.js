export const mission = {
  id: "hbu-2026",
  name: "Heartbeat Ultra Fulda",
  date: "2026-11-21",
  location: "Fulda, Deutschland",
  targetKm: 112,
  weeklyTarget: 70,
  milestone: {
    id: "backyard-2026",
    name: "Backyard Ultra",
    date: "2026-09-26",
    location: "",
  },
  milestones: [
    {
      id: "backyard-2026",
      name: "Backyard Ultra",
      date: "2026-09-26",
      location: "",
    },
  ],
};

export const defaultState = {
  activities: [],
  reviews: {},
  plan: [],
  equipment: [],
  fuel: [],
  mission,
  calendar: {
    id: crypto.randomUUID(),
    lastSyncAt: null,
  },
  garmin: {
    lastImportAt: null,
    fileName: null,
    imported: 0,
    duplicates: 0,
    importFrom: "2025-01-01",
  },
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
