export const mission = {
  id: "hbu-2026",
  name: "Heartbeat Ultra Fulda",
  date: "2026-11-21",
  location: "Fulda, Deutschland",
  targetKm: 112,
  weeklyTarget: 70,
  milestones: [
    {
      id: "hbu-2026",
      name: "Heartbeat Ultra Fulda",
      date: "2026-11-21",
      location: "Fulda, Deutschland",
      targetKm: 112,
      weeklyTarget: 70,
      isMainTarget: true,
      archived: false,
    },
    {
      id: "backyard-2026",
      name: "Backyard Ultra",
      date: "2026-09-26",
      location: "Rietberg",
      targetKm: null,
      weeklyTarget: null,
      isMainTarget: false,
      archived: false,
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
