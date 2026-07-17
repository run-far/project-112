/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultState } from "../data/defaults";
import { loadState, saveState } from "../services/storage";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState(() => loadState(defaultState));

  useEffect(() => saveState(state), [state]);

  const api = useMemo(
    () => ({
      state,
      setState,
      upsertReview: (id, review) =>
        setState((current) => ({
          ...current,
          reviews: { ...current.reviews, [id]: review },
        })),
      setActivities: (activities) =>
        setState((current) => ({ ...current, activities })),
      addActivity: (activity) =>
        setState((current) => ({
          ...current,
          activities: [activity, ...current.activities],
        })),
    }),
    [state],
  );

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp muss innerhalb des AppProvider verwendet werden.");
  return context;
}
