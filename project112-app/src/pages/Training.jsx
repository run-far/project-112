import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import { fmtDate, pace, hours } from "../utils/format";
import ReviewModal from "../components/ReviewModal";
import ActivityNameModal from "../components/ActivityNameModal";
import { stravaOnlineReady } from "../services/strava";
import { intervalsOnlineReady } from "../services/intervals";
import {
  activityDate,
  activityTimestamp,
  isoDateLocal,
  isoWeekNumber,
  monthKey,
  preferredActivities,
  reviewKind,
  reviewKindLabel,
  sourceLabel,
  sportGroup,
  startOfIsoWeek,
} from "../services/activityUtils";

const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });
const shortDateFormatter = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" });

function formatSyncTime(value) {
  if (!value) return "Noch nicht synchronisiert";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function monthTitle(key) {
  const [year, month] = key.split("-").map(Number);
  return monthFormatter.format(new Date(year, month - 1, 1));
}

function weekLabel(key) {
  const start = new Date(`${key}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `KW ${isoWeekNumber(start)} · ${shortDateFormatter.format(start)}–${shortDateFormatter.format(end)}`;
}

function summaries(activities) {
  const map = new Map();
  activities.forEach((activity) => {
    const group = sportGroup(activity);
    const current = map.get(group.key) || { key: group.key, label: group.label, count: 0, distance: 0, duration: 0 };
    current.count += 1;
    current.distance += Number(activity.distance || 0);
    current.duration += Number(activity.duration || 0);
    map.set(group.key, current);
  });
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export default function Training() {
  const { state, addActivity, updateActivity, syncStravaNow, syncIntervalsNow, intervalsSyncStatus } = useApp();
  const [selected, setSelected] = useState(null);
  const [editingName, setEditingName] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const activities = useMemo(() => preferredActivities(state.activities), [state.activities]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthActivities = activities.filter((activity) => monthKey(activity) === currentMonth);
  const currentMonthSummary = useMemo(() => summaries(currentMonthActivities), [currentMonthActivities]);

  const grouped = useMemo(() => {
    const months = new Map();
    activities.forEach((activity) => {
      const mKey = monthKey(activity);
      const date = activityTimestamp(activity);
      const wKey = isoDateLocal(startOfIsoWeek(date));
      if (!months.has(mKey)) months.set(mKey, new Map());
      const weeks = months.get(mKey);
      if (!weeks.has(wKey)) weeks.set(wKey, []);
      weeks.get(wKey).push(activity);
    });
    return [...months.entries()].map(([key, weeks]) => ({
      key,
      summary: summaries([...weeks.values()].flat()),
      weeks: [...weeks.entries()].sort((a, b) => b[0].localeCompare(a[0])),
    }));
  }, [activities]);

  function addManualActivity() {
    const name = window.prompt("Name des Trainings?");
    if (!name) return;
    const distance = Number(window.prompt("Distanz in km?") || 0);
    const duration = Number(window.prompt("Dauer in Minuten?") || 0);
    addActivity({
      id: crypto.randomUUID(),
      name,
      sourceName: name,
      customName: null,
      nameOverride: false,
      date: new Date().toISOString().slice(0, 10),
      distance,
      duration,
      durationSeconds: duration * 60,
      elevation: 0,
      avgHr: null,
      type: "Run",
      category: "running",
      temperature: null,
      source: "manual",
    });
  }

  function saveActivityName(nextName) {
    if (!editingName) return;
    const sourceName = editingName.sourceName || editingName.name;
    updateActivity(editingName.id, {
      name: nextName,
      sourceName,
      customName: nextName === sourceName ? null : nextName,
      nameOverride: nextName !== sourceName,
    });
    if (selected?.id === editingName.id) setSelected((current) => ({ ...current, name: nextName, sourceName }));
    setEditingName(null);
  }

  async function syncStrava() {
    if (!stravaOnlineReady() || !state.strava.connected) {
      setMessage("Strava ist noch nicht verbunden. Öffne Settings → Strava.");
      return;
    }
    setSyncing(true);
    setMessage("Aktivitäten werden aus Strava geladen …");
    try {
      const result = await syncStravaNow();
      setMessage(`${result.added || 0} neue Aktivitäten geladen, ${result.duplicates || 0} vorhandene Einheiten ergänzt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setSyncing(false);
    }
  }

  async function syncIntervals() {
    if (!intervalsOnlineReady() || !state.intervals?.connected) {
      setMessage("Intervals.icu ist noch nicht eingerichtet. Öffne Settings → Intervals.icu.");
      return;
    }
    setMessage("Aktivitäten werden aus Intervals.icu geladen …");
    try {
      const result = await syncIntervalsNow();
      setMessage(`${result.added || 0} neue Aktivitäten geladen, ${result.duplicates || 0} vorhandene Einheiten ergänzt.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <PageTitle eyebrow="Training" title="Deine Einheiten">
        <div className="page-actions">
          {state.intervals?.connected && intervalsOnlineReady() && <button onClick={syncIntervals} disabled={intervalsSyncStatus === "syncing"}>{intervalsSyncStatus === "syncing" ? "Synchronisiere …" : "↻ Intervals.icu"}</button>}
          {state.strava.connected && stravaOnlineReady() && <button className="strava" onClick={syncStrava} disabled={syncing}>{syncing ? "Synchronisiere …" : "↻ Strava"}</button>}
          <button onClick={addManualActivity}>+ Manuell</button>
        </div>
      </PageTitle>

      <Card className="wide training-month-overview">
        <div className="card-heading-row">
          <div><p className="eyebrow">Dieser Monat</p><h2>{monthTitle(currentMonth)}</h2></div>
          <strong>{currentMonthActivities.length} Einheiten</strong>
        </div>
        <div className="training-sport-summary">
          {currentMonthSummary.map((item) => (
            <div key={item.key}>
              <span>{item.label}</span>
              <strong>{item.count}</strong>
              <small>{item.distance > 0 ? `${item.distance.toFixed(1)} km · ` : ""}{Math.round(item.duration / 60)} h</small>
            </div>
          ))}
          {currentMonthSummary.length === 0 && <p className="muted">Noch keine Einheiten in diesem Monat.</p>}
        </div>
      </Card>

      <Card>
        <div className="training-toolbar">
          <div>
            <strong>{activities.length} Einheiten</strong>
            <span>{state.intervals?.connected ? `Letzter Intervals.icu-Sync: ${formatSyncTime(state.intervals.lastSyncAt)}` : state.strava.connected ? `Letzter Strava-Sync: ${formatSyncTime(state.strava.lastSyncAt)}` : "Garmin-Import und Cloud sind aktiv"}</span>
          </div>
          {message && <p>{message}</p>}
        </div>

        {activities.length === 0 ? (
          <div className="empty-state"><h2>Noch keine Einheiten</h2><p>Verbinde Intervals.icu, importiere deinen Garmin-Export oder füge ein Training manuell hinzu.</p></div>
        ) : (
          <div className="training-history">
            {grouped.map((month) => (
              <section className="training-month" key={month.key}>
                <header className="training-month-header">
                  <div><span>Monat</span><h2>{monthTitle(month.key)}</h2></div>
                  <div className="training-month-chips">{month.summary.map((item) => <span key={item.key}>{item.label}: <b>{item.count}</b>{item.distance > 0 ? ` · ${item.distance.toFixed(1)} km` : ""}</span>)}</div>
                </header>
                {month.weeks.map(([weekKey, weekActivities]) => (
                  <div className="training-week" key={weekKey}>
                    <h3>{weekLabel(weekKey)}</h3>
                    <div className="activity-list">
                      {weekActivities.map((activity) => {
                        const kind = reviewKind(activity);
                        return (
                          <article className={`activity-row ${kind ? "reviewable" : "no-review"}`} key={activity.id}>
                            <button className="activity activity-main" onClick={() => kind && setSelected(activity)} disabled={!kind} title={kind ? `${reviewKindLabel(activity)} öffnen` : "Für diese Aktivität ist kein Review nötig"}>
                              <div><b>{activity.name}</b><span>{fmtDate(activityDate(activity))} · {sourceLabel(activity)} · {sportGroup(activity).label}</span></div>
                              <div className="activity-metrics"><strong>{Number(activity.distance || 0).toLocaleString("de-DE")} km</strong><span>{hours(activity.duration)} · {Number(activity.distance || 0) > 0 ? pace(activity.distance, activity.duration) : "–"}</span></div>
                              <div className="activity-secondary"><strong>{activity.elevation || 0} hm</strong><span>{activity.avgHr ? `Ø ${activity.avgHr} bpm` : "Kein Puls"}</span></div>
                              <em>{kind ? (state.reviews[activity.id] ? "✓ Review" : month.key === currentMonth ? "Review öffnen" : "Review optional") : "Kein Review nötig"}</em>
                            </button>
                            <button className="activity-edit-button" onClick={() => setEditingName(activity)} aria-label={`${activity.name} umbenennen`} title="Trainingsname ändern">✎</button>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            ))}
          </div>
        )}
      </Card>

      {selected && <ReviewModal activity={selected} onClose={() => setSelected(null)} />}
      {editingName && <ActivityNameModal activity={editingName} onSave={saveActivityName} onClose={() => setEditingName(null)} />}
    </>
  );
}
