/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { defaultState } from "../data/defaults";
import { loadState, saveState } from "../services/storage";
import { loadCloudState, saveCloudState, signOut, supabase } from "../services/supabase";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState(defaultState));
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState("local");
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState(null);
  const [calendarToken, setCalendarToken] = useState(null);
  const cloudHydrated = useRef(false);
  const skipNextCloudSave = useRef(false);

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
          setState((local) => ({ ...defaultState, ...local, ...cloud.app_data, strava: { ...defaultState.strava, ...cloud.app_data.strava, token: local.strava?.token || null, refreshToken: local.strava?.refreshToken || null } }));
          setCalendarToken(cloud.calendar_token);
          setCloudUpdatedAt(cloud.updated_at);
        } else {
          const saved = await saveCloudState(session.user.id, state);
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
        const saved = await saveCloudState(session.user.id, state);
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

  async function uploadLocalState() {
    if (!session?.user?.id) return;
    setCloudStatus("saving");
    const saved = await saveCloudState(session.user.id, state);
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
      setState((local) => ({ ...defaultState, ...local, ...cloud.app_data, strava: { ...defaultState.strava, ...cloud.app_data.strava, token: local.strava?.token || null, refreshToken: local.strava?.refreshToken || null } }));
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
    uploadLocalState,
    reloadCloudState,
    logout: signOut,
    upsertReview: (id, review) => setState((current) => ({ ...current, reviews: { ...current.reviews, [id]: review } })),
    setActivities: (activities) => setState((current) => ({ ...current, activities })),
    addActivity: (activity) => setState((current) => ({ ...current, activities: [activity, ...current.activities] })),
  };

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp muss innerhalb des AppProvider verwendet werden.");
  return context;
}
