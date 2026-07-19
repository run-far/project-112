/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { defaultState } from "../data/defaults";
import { loadState, saveState } from "../services/storage";
import { loadCloudState, saveCloudState, signOut, supabase } from "../services/supabase";
import { fetchStravaConnectionStatus, mapStravaActivities, mergeStravaActivities, syncStravaActivities } from "../services/strava";
import { fetchIntervalsStatus, mapIntervalsActivities, mergeIntervalsActivities, syncIntervalsActivities } from "../services/intervals";

const AppContext = createContext(null);

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeInventory(activities, items, reviews) {
  const trackingStart = new Date().toISOString().slice(0, 10);
  const fuel = asArray(items).map((item) => ({
    ...item,
    stockTrackedFrom: item.stockTrackedFrom || trackingStart,
  }));
  const fuelById = new Map(fuel.map((item) => [item.id, item]));
  const activityById = new Map(asArray(activities).map((activity) => [activity.id, activity]));
  const restored = {};
  const normalizedReviews = Object.fromEntries(Object.entries(reviews || {}).map(([activityId, review]) => {
    const activity = activityById.get(activityId);
    const activityDay = String(activity?.startDateLocal || activity?.date || "").slice(0, 10);
    const nutritionItems = asArray(review?.nutritionItems).map((item) => {
      if (typeof item.affectsInventory === "boolean") return item;
      const product = fuelById.get(item.fuelItemId);
      if (!product) return { ...item, affectsInventory: false };
      const affectsInventory = !activityDay || activityDay >= product.stockTrackedFrom;
      if (!affectsInventory) {
        restored[product.id] = (restored[product.id] || 0) + (Number(item.quantity) || 0);
      }
      return { ...item, affectsInventory };
    });
    return [activityId, { ...review, nutritionItems }];
  }));

  return {
    fuel: fuel.map((item) => restored[item.id]
      ? { ...item, quantity: Number(item.quantity || 0) + Number(restored[item.id] || 0) }
      : item),
    reviews: normalizedReviews,
  };
}

function mergeState(localState = {}, cloudState = {}) {
  const local = localState || {};
  const cloud = cloudState || {};
  const activities = asArray(cloud.activities, asArray(local.activities));
  const reviews = { ...(local.reviews || {}), ...(cloud.reviews || {}) };
  const inventory = normalizeInventory(activities, cloud.fuel ?? local.fuel, reviews);
  return {
    ...defaultState,
    ...local,
    ...cloud,
    activities,
    plan: asArray(cloud.plan, asArray(local.plan)),
    equipment: asArray(cloud.equipment, asArray(local.equipment)),
    fuel: inventory.fuel,
    healthCheckins: asArray(cloud.healthCheckins, asArray(local.healthCheckins)),
    reviews: inventory.reviews,
    mission: {
      ...defaultState.mission,
      ...(local.mission || {}),
      ...(cloud.mission || {}),
      milestones: asArray(cloud.mission?.milestones, asArray(local.mission?.milestones, defaultState.mission.milestones)),
    },
    planner: { ...defaultState.planner, ...(local.planner || {}), ...(cloud.planner || {}) },
    garmin: { ...defaultState.garmin, ...(local.garmin || {}), ...(cloud.garmin || {}) },
    calendar: { ...defaultState.calendar, ...(local.calendar || {}), ...(cloud.calendar || {}) },
    intervals: { ...defaultState.intervals, ...(local.intervals || {}), ...(cloud.intervals || {}) },
    strava: {
      ...defaultState.strava,
      ...(local.strava || {}),
      ...(cloud.strava || {}),
      // OAuth tokens stay on the current device. They are not written to the shared JSON state.
      token: local.strava?.token || null,
      refreshToken: local.strava?.refreshToken || null,
    },
  };
}

function stateForCloud(state) {
  return {
    ...state,
    strava: {
      ...state.strava,
      token: null,
      refreshToken: null,
    },
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useState(() => mergeState(loadState(defaultState), {}));
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState("local");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState(null);
  const [calendarToken, setCalendarToken] = useState(null);
  const [stravaSyncStatus, setStravaSyncStatus] = useState("idle");
  const [intervalsSyncStatus, setIntervalsSyncStatus] = useState("idle");
  const cloudHydrated = useRef(false);
  const skipNextCloudSave = useRef(false);
  const stravaAutoSyncStarted = useRef(false);
  const intervalsAutoSyncStarted = useRef(false);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session || null);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
      if (!nextSession) {
        cloudHydrated.current = false;
        setCloudStatus("local");
        setCalendarToken(null);
        stravaAutoSyncStarted.current = false;
        intervalsAutoSyncStarted.current = false;
        setStravaSyncStatus("idle");
        setIntervalsSyncStatus("idle");
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user?.id || cloudHydrated.current) return;
    let cancelled = false;
    async function hydrate() {
      setCloudStatus("loading");
      try {
        const cloud = await loadCloudState(session.user.id);
        if (cancelled) return;
        if (cloud?.app_data && Object.keys(cloud.app_data).length > 0) {
          skipNextCloudSave.current = true;
          setState((local) => mergeState(local, cloud.app_data));
          setCalendarToken(cloud.calendar_token);
          setCloudUpdatedAt(cloud.updated_at);
        } else {
          const saved = await saveCloudState(session.user.id, stateForCloud(state));
          if (cancelled) return;
          setCalendarToken(saved.calendar_token);
          setCloudUpdatedAt(saved.updated_at);
        }
        cloudHydrated.current = true;
        setCloudStatus("synced");
      } catch (error) {
        console.error("Supabase hydration failed", error);
        setCloudStatus("error");
      }
    }
    hydrate();
    return () => { cancelled = true; };
  }, [session, state]);

  useEffect(() => {
    if (!session?.user?.id || !cloudHydrated.current) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }
    setCloudStatus("saving");
    const timer = window.setTimeout(async () => {
      try {
        const saved = await saveCloudState(session.user.id, stateForCloud(state));
        setCalendarToken(saved.calendar_token);
        setCloudUpdatedAt(saved.updated_at);
        setCloudStatus("synced");
      } catch (error) {
        console.error("Supabase save failed", error);
        setCloudStatus("error");
      }
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [state, session]);



  async function syncIntervalsNow({ silent = false } = {}) {
    if (!session?.user?.id) return { added: 0, duplicates: 0 };
    if (!silent) setIntervalsSyncStatus("syncing");
    try {
      const dates = state.activities.map((activity) => activity.date).filter(Boolean).sort();
      const latest = dates.at(-1);
      const firstIntervalsSync = !state.intervals?.lastSyncAt;
      const afterDate = firstIntervalsSync
        ? new Date(`${state.intervals?.importFrom || "2025-01-01"}T00:00:00Z`)
        : latest ? new Date(`${latest}T00:00:00Z`) : new Date("2025-01-01T00:00:00Z");
      if (!firstIntervalsSync) afterDate.setUTCDate(afterDate.getUTCDate() - 2);
      const result = await syncIntervalsActivities(afterDate.toISOString().slice(0, 10));
      const imported = mapIntervalsActivities(Array.isArray(result.activities) ? result.activities : []);
      const merged = mergeIntervalsActivities(state.activities, imported);
      const syncedAt = result.syncedAt || new Date().toISOString();
      setState((current) => ({
        ...current,
        activities: mergeIntervalsActivities(current.activities, imported).activities,
        intervals: {
          ...current.intervals,
          connected: true,
          configured: true,
          lastSyncAt: syncedAt,
        },
      }));
      setIntervalsSyncStatus("synced");
      return { added: merged.added, duplicates: merged.duplicates, total: imported.length };
    } catch (error) {
      setIntervalsSyncStatus("error");
      if (!silent) throw error;
      console.warn("Automatic Intervals.icu sync failed", error);
      return { added: 0, duplicates: 0, error };
    }
  }

  useEffect(() => {
    if (!session?.user?.id || cloudStatus !== "synced" || intervalsAutoSyncStarted.current) return;
    intervalsAutoSyncStarted.current = true;
    let cancelled = false;
    async function checkAndSync() {
      try {
        const status = await fetchIntervalsStatus();
        if (cancelled) return;
        setState((current) => ({
          ...current,
          intervals: {
            ...current.intervals,
            configured: Boolean(status.configured),
            connected: Boolean(status.connected),
          },
        }));
        if (!status.connected) return;
        const lastSync = state.intervals?.lastSyncAt ? new Date(state.intervals.lastSyncAt).getTime() : 0;
        if (Date.now() - lastSync > 15 * 60_000) await syncIntervalsNow({ silent: true });
      } catch (error) {
        console.warn("Intervals.icu status check failed", error);
      }
    }
    checkAndSync();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, cloudStatus]);

  async function syncStravaNow({ silent = false } = {}) {
    if (!session?.user?.id) return { added: 0, duplicates: 0 };
    if (!silent) setStravaSyncStatus("syncing");
    try {
      const dates = state.activities.map((activity) => activity.date).filter(Boolean).sort();
      const latest = dates.at(-1);
      const afterDate = latest ? new Date(`${latest}T00:00:00Z`) : new Date("2025-01-01T00:00:00Z");
      afterDate.setUTCDate(afterDate.getUTCDate() - 2);
      const result = await syncStravaActivities(afterDate.toISOString().slice(0, 10));
      const imported = mapStravaActivities(Array.isArray(result.activities) ? result.activities : []);
      const merged = mergeStravaActivities(state.activities, imported);
      const syncedAt = result.syncedAt || new Date().toISOString();
      setState((current) => ({
        ...current,
        activities: mergeStravaActivities(current.activities, imported).activities,
        strava: {
          ...current.strava,
          connected: true,
          athlete: result.athlete || current.strava.athlete || null,
          lastSyncAt: syncedAt,
        },
      }));
      setStravaSyncStatus("synced");
      return { added: merged.added, duplicates: merged.duplicates, total: imported.length };
    } catch (error) {
      setStravaSyncStatus("error");
      if (!silent) throw error;
      console.warn("Automatic Strava sync failed", error);
      return { added: 0, duplicates: 0, error };
    }
  }

  useEffect(() => {
    if (!session?.user?.id || cloudStatus !== "synced" || stravaAutoSyncStarted.current) return;
    stravaAutoSyncStarted.current = true;
    let cancelled = false;
    async function checkAndSync() {
      try {
        const status = await fetchStravaConnectionStatus();
        if (cancelled) return;
        if (!status.connected) {
          setState((current) => ({ ...current, strava: { ...current.strava, connected: false, athlete: null } }));
          return;
        }
        setState((current) => ({ ...current, strava: { ...current.strava, connected: true, athlete: status.athlete || current.strava.athlete } }));
        const lastSync = state.strava?.lastSyncAt ? new Date(state.strava.lastSyncAt).getTime() : 0;
        if (Date.now() - lastSync > 15 * 60_000) await syncStravaNow({ silent: true });
      } catch (error) {
        console.warn("Strava status check failed", error);
      }
    }
    checkAndSync();
    return () => { cancelled = true; };
  // The cloud status marks the point at which the shared state is ready.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, cloudStatus]);

  async function uploadLocalState() {
    if (!session?.user?.id) return;
    setCloudStatus("saving");
    const saved = await saveCloudState(session.user.id, stateForCloud(state));
    setCalendarToken(saved.calendar_token);
    setCloudUpdatedAt(saved.updated_at);
    setCloudStatus("synced");
  }

  async function reloadCloudState() {
    if (!session?.user?.id) return;
    setCloudStatus("loading");
    const cloud = await loadCloudState(session.user.id);
    if (cloud?.app_data) {
      skipNextCloudSave.current = true;
      setState((local) => mergeState(local, cloud.app_data));
      setCalendarToken(cloud.calendar_token);
      setCloudUpdatedAt(cloud.updated_at);
    }
    setCloudStatus("synced");
  }

  const api = {
    state,
    setState,
    session,
    authLoading,
    cloudStatus,
    cloudUpdatedAt,
    calendarToken,
    stravaSyncStatus,
    intervalsSyncStatus,
    syncIntervalsNow,
    syncStravaNow,
    uploadLocalState,
    reloadCloudState,
    logout: signOut,
    upsertReview: (id, review) => setState((current) => {
      const usage = (items) => (Array.isArray(items) ? items : []).reduce((result, item) => {
        if (!item.fuelItemId || item.affectsInventory === false) return result;
        result[item.fuelItemId] = (result[item.fuelItemId] || 0) + (Number(item.quantity) || 0);
        return result;
      }, {});
      const previousUsage = usage(current.reviews[id]?.nutritionItems);
      const nextUsage = usage(review.nutritionItems);
      const fuel = current.fuel.map((item) => {
        const restored = Number(previousUsage[item.id] || 0);
        const consumed = Number(nextUsage[item.id] || 0);
        if (!restored && !consumed) return item;
        return { ...item, quantity: Math.max(0, Number(item.quantity || 0) + restored - consumed) };
      });
      return { ...current, fuel, reviews: { ...current.reviews, [id]: review } };
    }),
    setActivities: (activities) => setState((current) => ({ ...current, activities })),
    addActivity: (activity) => setState((current) => ({ ...current, activities: [activity, ...current.activities] })),
    updateActivity: (id, changes) => setState((current) => ({
      ...current,
      activities: current.activities.map((activity) => activity.id === id ? { ...activity, ...changes } : activity),
    })),
  };

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp muss innerhalb des AppProvider verwendet werden.");
  return context;
}
