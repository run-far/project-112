import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import { fmtDate, pace, hours } from "../utils/format";
import ReviewModal from "../components/ReviewModal";
import { fetchActivities, mapRunningActivities } from "../services/strava";
import WeekPlan from "../components/WeekPlan";

function formatSyncTime(value) {
  if (!value) return "Noch nicht synchronisiert";

  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function Training() {
  const { state, setState, addActivity } = useApp();
  const [selected, setSelected] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const activities = useMemo(
    () =>
      [...state.activities].sort(
        (a, b) => new Date(b.startDateLocal || b.date) - new Date(a.startDateLocal || a.date),
      ),
    [state.activities],
  );

  function addManualActivity() {
    const name = window.prompt("Name des Trainings?");
    if (!name) return;

    const distance = Number(window.prompt("Distanz in km?") || 0);
    const duration = Number(window.prompt("Dauer in Minuten?") || 0);

    addActivity({
      id: crypto.randomUUID(),
      name,
      date: new Date().toISOString().slice(0, 10),
      distance,
      duration,
      durationSeconds: duration * 60,
      elevation: 0,
      avgHr: null,
      type: "Run",
      temperature: null,
      source: "manual",
    });
  }

  async function syncStrava() {
    if (!state.strava.connected || !state.strava.token) {
      setMessage("Verbinde Strava zuerst unter Settings.");
      return;
    }

    setSyncing(true);
    setMessage("Läufe werden aus Strava geladen …");

    try {
      const rawActivities = await fetchActivities(state.strava.token);
      const runningActivities = mapRunningActivities(rawActivities);

      setState((current) => ({
        ...current,
        activities: runningActivities,
        strava: {
          ...current.strava,
          lastSyncAt: new Date().toISOString(),
        },
      }));

      setMessage(
        `${runningActivities.length} Lauf${runningActivities.length === 1 ? "" : "e"} synchronisiert.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <>
      <PageTitle eyebrow="Training" title="Deine Läufe">
        <div className="page-actions">
          {state.strava.connected && (
            <button className="strava" onClick={syncStrava} disabled={syncing}>
              {syncing ? "Synchronisiere …" : "↻ Strava synchronisieren"}
            </button>
          )}
          <button onClick={addManualActivity}>+ Manuell</button>
        </div>
      </PageTitle>

      <Card>
        <div className="training-toolbar">
          <div>
            <strong>{activities.length} Läufe</strong>
            <span>
              {state.strava.connected
                ? `Letzter Sync: ${formatSyncTime(state.strava.lastSyncAt)}`
                : "Strava ist noch nicht verbunden"}
            </span>
          </div>
          {message && <p>{message}</p>}
        </div>

        {activities.length === 0 ? (
          <div className="empty-state">
            <h2>Noch keine Läufe</h2>
            <p>Verbinde Strava oder füge ein Training manuell hinzu.</p>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => (
              <button
                className="activity"
                key={activity.id}
                onClick={() => setSelected(activity)}
              >
                <div>
                  <b>{activity.name}</b>
                  <span>
                    {fmtDate(activity.date)} · {activity.source === "strava" ? "Strava" : "Manuell"}
                  </span>
                </div>

                <div className="activity-metrics">
                  <strong>{activity.distance.toLocaleString("de-DE")} km</strong>
                  <span>
                    {hours(activity.duration)} · {pace(activity.distance, activity.duration)}
                  </span>
                </div>

                <div className="activity-secondary">
                  <strong>{activity.elevation || 0} hm</strong>
                  <span>{activity.avgHr ? `Ø ${activity.avgHr} bpm` : "Kein Puls"}</span>
                </div>

                <em>{state.reviews[activity.id] ? "✓ Review" : "Review öffnen"}</em>
              </button>
            ))}
          </div>
        )}
      </Card>

      <WeekPlan />

      {selected && (
        <ReviewModal activity={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
