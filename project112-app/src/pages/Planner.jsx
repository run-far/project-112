import { useEffect, useMemo, useState } from "react";
import { Card, PageTitle } from "../components/UI";
import { useApp } from "../context/AppContext";
import { getCurrentPosition } from "../services/weather";
import {
  dateForDay,
  fetchWeeklyForecast,
  generateWeekPlan,
  isoDate,
  reviewGuidance,
  startOfWeek,
  workoutTypes,
} from "../services/plannerEngine";
import { downloadCalendar } from "../services/calendar";
import { preferredActivities } from "../services/activityUtils";
import { publishIntervalsWeek } from "../services/intervals";
import "./Planner.css";

const dayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
const reasonOptions = ["Keine Zeit", "Müde", "Schmerzen", "Krankheit", "Wetter", "Verschoben", "Bewusst ausgelassen", "Aktivität nicht erkannt", "Sonstiges"];
const plannerDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function planFingerprint(plan) {
  return JSON.stringify(plan.map((item) => ({
    id: item.id,
    date: item.date,
    time: item.time,
    title: item.title,
    type: item.type,
    distance: Number(item.distance || 0),
    duration: Number(item.duration || 0),
    optional: Boolean(item.optional),
    notes: item.notes || "",
  })).sort((a, b) => `${a.date}${a.time}${a.id}`.localeCompare(`${b.date}${b.time}${b.id}`)));
}

function createBlank(weekStart) {
  const date = dateForDay(weekStart, 1);
  return {
    id: crypto.randomUUID(),
    date: isoDate(date),
    day: "Dienstag",
    time: "18:00",
    title: "",
    type: "Easy Run",
    distance: 0,
    duration: 60,
    notes: "",
    optional: false,
    completed: false,
    source: "planner",
    archived: false,
  };
}

function activityDate(activity) {
  return String(activity.startDateLocal || activity.date || "").slice(0, 10);
}

function activityTime(activity) {
  const raw = activity.startDateLocal || activity.date;
  if (!raw || !String(raw).includes("T")) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function normalizedType(value = "") {
  const type = String(value).toLowerCase();
  if (type.includes("football") || type.includes("soccer") || type.includes("fußball")) return "football";
  if (type.includes("row") || type.includes("rud")) return "rowing";
  if (type.includes("bike") || type.includes("cycl") || type.includes("rad")) return "cycling";
  if (type.includes("strength") || type.includes("stabi") || type.includes("workout")) return "strength";
  if (type.includes("run") || type.includes("lauf") || type.includes("treadmill") || type.includes("orc") || type.includes("backyard") || type.includes("interval") || type.includes("schwelle")) return "running";
  return type;
}

function isRunningActivity(activity) {
  return normalizedType(activity.type || activity.sportType || activity.name) === "running";
}

function compatible(plan, activity) {
  const planType = normalizedType(`${plan.type} ${plan.title}`);
  const activityType = normalizedType(`${activity.type || ""} ${activity.sportType || ""} ${activity.name || ""}`);
  return planType === activityType || (planType === "running" && activityType === "running");
}

function matchScore(plan, activity) {
  if (plan.date !== activityDate(activity) || !compatible(plan, activity)) return -1;
  let score = 10;
  const planText = `${plan.title} ${plan.type}`.toLowerCase();
  const actualText = `${activity.name || ""} ${activity.type || ""} ${activity.sportType || ""}`.toLowerCase();
  if (planText.includes("orc") && actualText.includes("orc")) score += 8;
  const plannedDistance = Number(plan.distance || 0);
  const actualDistance = Number(activity.distance || 0);
  if (plannedDistance && actualDistance) score += Math.max(0, 6 - Math.abs(plannedDistance - actualDistance));
  const plannedDuration = Number(plan.duration || 0);
  const actualDuration = Number(activity.duration || 0);
  if (plannedDuration && actualDuration) score += Math.max(0, 4 - Math.abs(plannedDuration - actualDuration) / 15);
  return score;
}

function findMatches(plan, activities) {
  const used = new Set();
  const matches = new Map();
  [...plan].sort((a, b) => `${a.date}${a.time || ""}`.localeCompare(`${b.date}${b.time || ""}`)).forEach((item) => {
    let best = null;
    let bestScore = -1;
    activities.forEach((activity) => {
      if (used.has(activity.id)) return;
      const score = matchScore(item, activity);
      if (score > bestScore) {
        best = activity;
        bestScore = score;
      }
    });
    if (best && bestScore >= 10) {
      matches.set(item.id, best);
      used.add(best.id);
    }
  });
  return matches;
}

function recentReasonCounts(plan, weekStart) {
  const since = new Date(weekStart);
  since.setDate(since.getDate() - 21);
  return plan.reduce((result, item) => {
    const date = new Date(`${item.date || "1970-01-01"}T12:00:00`);
    if (date < since || date >= weekStart) return result;
    if (item.missedReason === "Müde") result.fatigue += 1;
    if (item.missedReason === "Schmerzen") result.pain += 1;
    if (item.missedReason === "Krankheit") result.illness += 1;
    return result;
  }, { fatigue: 0, pain: 0, illness: 0 });
}

export default function Planner() {
  const { state, setState } = useApp();
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const [forecast, setForecast] = useState([]);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [missedEditing, setMissedEditing] = useState(null);
  const [planningOpen, setPlanningOpen] = useState(false);
  const [planningDraft, setPlanningDraft] = useState(null);
  const [overwriteConfirmOpen, setOverwriteConfirmOpen] = useState(false);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);

  const weekStart = useMemo(() => startOfWeek(new Date(), offsetWeeks), [offsetWeeks]);
  const weekEnd = dateForDay(weekStart, 6);
  const canonicalActivities = useMemo(() => preferredActivities(state.activities), [state.activities]);
  const activityById = useMemo(() => new Map(canonicalActivities.map((activity) => [activity.id, activity])), [canonicalActivities]);
  const weekPlan = useMemo(() => state.plan.filter((item) => {
    const value = item.date || "";
    return value >= isoDate(weekStart) && value <= isoDate(weekEnd) && !item.archived;
  }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [state.plan, weekStart, weekEnd]);
  const weekActivities = useMemo(() => canonicalActivities.filter((activity) => {
    const value = activityDate(activity);
    return value >= isoDate(weekStart) && value <= isoDate(weekEnd);
  }).sort((a, b) => String(a.startDateLocal || a.date).localeCompare(String(b.startDateLocal || b.date))), [canonicalActivities, weekStart, weekEnd]);
  const matches = useMemo(() => findMatches(weekPlan, weekActivities), [weekPlan, weekActivities]);
  const matchedActivityIds = useMemo(() => new Set([...matches.values()].map((activity) => activity.id)), [matches]);
  const todayKey = isoDate(new Date());
  const missed = weekPlan.filter((item) => item.date < todayKey && !item.completed && !matches.has(item.id) && !item.missedReason);
  const actualRunningKm = weekActivities.filter(isRunningActivity).reduce((sum, activity) => sum + Number(activity.distance || 0), 0);
  const plannedKm = weekPlan.filter((item) => !item.completed && !item.missedReason).reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const completedKm = actualRunningKm || weekPlan.filter((item) => item.completed).reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const previousWeekHasPlan = useMemo(() => {
    const previousStart = startOfWeek(new Date(), offsetWeeks - 1);
    const previousEnd = dateForDay(previousStart, 6);
    return state.plan.some((item) => !item.archived && item.date >= isoDate(previousStart) && item.date <= isoDate(previousEnd));
  }, [state.plan, offsetWeeks]);
  const config = state.planner || {};
  const reasonCounts = useMemo(() => recentReasonCounts(state.plan, weekStart), [state.plan, weekStart]);
  const coachReviewReference = useMemo(() => offsetWeeks === 0 ? new Date(Date.now() + 86400000) : weekStart, [offsetWeeks, weekStart]);
  const coachGuidance = useMemo(() => reviewGuidance(canonicalActivities, state.reviews, coachReviewReference), [canonicalActivities, state.reviews, coachReviewReference]);
  const replaceableCurrentEntries = weekPlan.filter((item) => item.source === "planner-engine" && !item.completed && !item.missedReason && item.date >= todayKey);
  const publishablePlan = useMemo(() => weekPlan.filter((item) => !item.completed && !item.missedReason && (offsetWeeks > 0 || item.date >= todayKey)), [weekPlan, offsetWeeks, todayKey]);
  const weekKey = isoDate(weekStart);
  const currentPlanFingerprint = useMemo(() => planFingerprint(publishablePlan), [publishablePlan]);
  const publishedWeek = config.intervalSync?.[weekKey] || null;
  const planChangedAfterPublish = Boolean(publishedWeek && publishedWeek.fingerprint !== currentPlanFingerprint);

  useEffect(() => {
    const updates = [...matches.entries()].filter(([id, activity]) => {
      const item = state.plan.find((entry) => entry.id === id);
      return item && (!item.completed || item.matchedActivityId !== activity.id);
    });
    if (!updates.length) return;
    const byId = new Map(updates);
    setState((current) => ({
      ...current,
      plan: current.plan.map((item) => {
        const activity = byId.get(item.id);
        if (!activity) return item;
        return {
          ...item,
          completed: true,
          completedAt: activity.startDateLocal || activity.date,
          matchedActivityId: activity.id,
          actualTitle: activity.name || activity.title,
          actualDistance: Number(activity.distance || 0),
          actualDuration: Number(activity.duration || 0),
          actualSource: activity.source || "Garmin",
          missedReason: "",
        };
      }),
    }));
  }, [matches, setState, state.plan]);

  function patchConfig(patch) {
    setState((current) => ({ ...current, planner: { ...current.planner, ...patch } }));
  }

  function requestPlanning() {
    if (offsetWeeks === 0 && replaceableCurrentEntries.length > 0) {
      setOverwriteConfirmOpen(true);
      return;
    }
    openPlanning();
  }

  function openPlanning() {
    const lastCheckin = state.healthCheckins?.[0]?.checkin || config.checkin || {};
    setPlanningDraft({
      stabiCount: Number(config.stabiCount ?? 2),
      stabiDays: config.stabiDays?.length ? config.stabiDays : ["Dienstag", "Donnerstag"],
      rowingCount: Number(config.rowingCount ?? 1),
      rowingDays: config.rowingDays?.length ? config.rowingDays : ["Freitag"],
      runDays: config.runDays?.length ? config.runDays : ["Dienstag", "Mittwoch", "Freitag", "Samstag", "Sonntag"],
      doubleTrainingDays: config.doubleTrainingDays || ["Dienstag", "Freitag"],
      checkin: {
        energy: Number(lastCheckin.energy || 4),
        fatigue: reasonCounts.fatigue ? "unchanged" : "none",
        fatigueCause: "",
        pain: reasonCounts.pain ? "unchanged" : "none",
        painLevel: Number(lastCheckin.painLevel || 0),
        painArea: lastCheckin.painArea || "",
        illness: reasonCounts.illness ? "recovering" : (lastCheckin.illness || "healthy"),
        notes: "",
      },
    });
    setPlanningOpen(true);
  }

  function toggleDay(field, day) {
    setPlanningDraft((current) => ({
      ...current,
      [field]: current[field].includes(day)
        ? current[field].filter((value) => value !== day)
        : [...current[field], day],
    }));
  }

  function updateCheckin(field, value) {
    setPlanningDraft((current) => ({ ...current, checkin: { ...current.checkin, [field]: value } }));
  }

  async function generate(overrideConfig = null) {
    setStatus("Plane Woche aus Mission, Trainingshistorie und Check-in …");
    let weather = forecast;
    try {
      if (!weather.length) {
        const position = await getCurrentPosition();
        weather = await fetchWeeklyForecast(position.latitude, position.longitude, weekStart);
        setForecast(weather);
      }
    } catch {
      setStatus("Standort/Wetter nicht verfügbar – Plan wird ohne Wetteranpassung erstellt.");
    }

    const effectiveConfig = { ...config, ...(overrideConfig || {}) };
    const generated = generateWeekPlan({
      activities: canonicalActivities,
      reviews: state.reviews,
      planHistory: state.plan,
      mission: state.mission,
      config: effectiveConfig,
      forecast: weather,
      offsetWeeks,
      completedRunningKm: actualRunningKm,
    });

    const checkinRecord = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      weekStart: generated.weekStart,
      checkin: effectiveConfig.checkin,
    };

    setState((current) => ({
      ...current,
      plan: [
        ...current.plan.filter((item) => {
          const outsideWeek = item.date < isoDate(weekStart) || item.date > isoDate(weekEnd);
          const protectedEntry = item.source !== "planner-engine" || item.completed || item.missedReason || (offsetWeeks === 0 && item.date < todayKey);
          return outsideWeek || protectedEntry;
        }),
        ...generated.plan,
      ],
      healthCheckins: [checkinRecord, ...(current.healthCheckins || [])].slice(0, 20),
      planner: {
        ...current.planner,
        ...effectiveConfig,
        lastGeneratedAt: new Date().toISOString(),
        lastTarget: generated.target,
        lastPhase: generated.phase.label,
        lastCycleWeek: generated.cycleWeek,
        lastRecoveryWeek: generated.recoveryWeek,
      },
    }));

    const loadLabel = generated.recoveryWeek ? "Entlastungswoche" : `Aufbauwoche ${generated.cycleWeek}/3`;
    const readinessNotes = generated.readiness.notes.length ? ` ${generated.readiness.notes.join(" ")}` : "";
    setStatus(`${generated.phase.label} · ${loadLabel} · berechneter Laufrahmen ${generated.target} km. Bereits gelaufen: ${actualRunningKm.toFixed(1)} km.${readinessNotes}`);
    setPlanningOpen(false);
  }

  async function publishWeek() {
    setPublishBusy(true);
    setStatus("Übertrage den bestätigten Wochenplan an Intervals.icu …");
    try {
      const result = await publishIntervalsWeek({
        weekStart: isoDate(weekStart),
        weekEnd: isoDate(weekEnd),
        plan: publishablePlan,
      });
      const publishedAt = result.publishedAt || new Date().toISOString();
      setState((current) => ({
        ...current,
        plan: current.plan.map((item) => publishablePlan.some((entry) => entry.id === item.id)
          ? { ...item, intervalsPublishedAt: publishedAt }
          : item),
        planner: {
          ...current.planner,
          intervalSync: {
            ...(current.planner?.intervalSync || {}),
            [weekKey]: {
              publishedAt,
              fingerprint: currentPlanFingerprint,
              uploaded: Number(result.uploaded || publishablePlan.length),
              guided: Number(result.guided || 0),
              notes: Number(result.notes || 0),
            },
          },
        },
      }));
      setStatus(`${Number(result.uploaded || publishablePlan.length)} Einheiten an Intervals.icu gesendet · ${Number(result.guided || 0)} geführte Garmin-Workouts · ${Number(result.notes || 0)} Kalendereinträge.`);
      setPublishConfirmOpen(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error));
    } finally {
      setPublishBusy(false);
    }
  }

  function requestPublish() {
    if (!state.intervals?.connected) {
      setStatus("Intervals.icu ist noch nicht verbunden. Bitte zuerst unter Einstellungen die Verbindung prüfen.");
      return;
    }
    setPublishConfirmOpen(true);
  }

  function saveWorkout(event) {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    const date = new Date(`${editing.date}T12:00:00`);
    const next = {
      ...editing,
      day: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date),
      distance: Number(editing.distance || 0),
      duration: Number(editing.duration || 60),
      title: editing.title.trim(),
    };
    setState((current) => ({
      ...current,
      plan: current.plan.some((item) => item.id === next.id)
        ? current.plan.map((item) => item.id === next.id ? next : item)
        : [...current.plan, next],
    }));
    setEditing(null);
  }

  function updateWorkout(id, patch) {
    setState((current) => ({ ...current, plan: current.plan.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function removeWorkout(id) {
    if (!window.confirm("Diese geplante Einheit endgültig löschen?")) return;
    setState((current) => ({ ...current, plan: current.plan.filter((item) => item.id !== id) }));
  }

  function saveMissed(event) {
    event.preventDefault();
    if (!missedEditing?.reason) return;
    if (missedEditing.reason === "Verschoben" && missedEditing.newDate) {
      updateWorkout(missedEditing.id, { date: missedEditing.newDate, completed: false, missedReason: "", missedNote: missedEditing.note || "", matchedActivityId: null });
    } else if (missedEditing.reason === "Aktivität nicht erkannt" && missedEditing.activityId) {
      const activity = canonicalActivities.find((entry) => String(entry.id) === String(missedEditing.activityId));
      if (activity) {
        updateWorkout(missedEditing.id, {
          completed: true,
          matchedActivityId: activity.id,
          actualTitle: activity.name || activity.title,
          actualDistance: Number(activity.distance || 0),
          actualDuration: Number(activity.duration || 0),
          actualSource: activity.source || "Garmin",
          missedReason: "",
        });
      }
    } else {
      updateWorkout(missedEditing.id, {
        missedReason: missedEditing.reason,
        missedNote: missedEditing.note || "",
        missedMeta: {
          fatigueCause: missedEditing.fatigueCause || "",
          painArea: missedEditing.painArea || "",
          painLevel: Number(missedEditing.painLevel || 0),
        },
        completed: false,
      });
    }
    setMissedEditing(null);
  }

  function openMissed(item) {
    setMissedEditing({
      id: item.id,
      title: item.title,
      date: item.date,
      reason: item.missedReason || "",
      note: item.missedNote || "",
      newDate: "",
      activityId: "",
      fatigueCause: item.missedMeta?.fatigueCause || "",
      painArea: item.missedMeta?.painArea || "",
      painLevel: item.missedMeta?.painLevel || 0,
    });
  }

  return (
    <>
      <PageTitle eyebrow="Wochenplaner" title="Deine Woche">
        <div className="page-actions">
          <button onClick={() => downloadCalendar(weekPlan)}>Kalender laden</button>
          <button className={publishedWeek && !planChangedAfterPublish ? "intervals-published-button" : ""} onClick={requestPublish} disabled={publishBusy || (!publishedWeek && publishablePlan.length === 0)}>
            {publishBusy ? "Wird gesendet …" : publishedWeek ? (planChangedAfterPublish ? "Garmin-Plan aktualisieren" : "✓ An Garmin gesendet") : "Woche bestätigen & an Garmin senden"}
          </button>
          <button className="primary planner-generate" onClick={requestPlanning}>✦ Woche intelligent planen</button>
        </div>
      </PageTitle>

      <div className="planner-week-nav">
        <button disabled={offsetWeeks === 0 && !previousWeekHasPlan} title={offsetWeeks === 0 && !previousWeekHasPlan ? "Keine ältere geplante Woche vorhanden" : "Vorherige Woche"} onClick={() => { setOffsetWeeks((value) => value - 1); setForecast([]); }}>←</button>
        <div><strong>{dayFormatter.format(weekStart)} – {dayFormatter.format(weekEnd)}</strong><span>{offsetWeeks === 0 ? "Aktuelle Woche" : offsetWeeks === 1 ? "Nächste Woche" : "Trainingswoche"}</span></div>
        <button onClick={() => { setOffsetWeeks((value) => value + 1); setForecast([]); }}>→</button>
      </div>

      <Card className="wide planner-rules">
        <div>
          <p className="eyebrow">Planlogik</p>
          <h2>Mission → Historie → 3:1-Zyklus → Befinden → Wetter</h2>
          <p className="muted">Montag Fußball, Mittwoch ORC Run und Samstag ORC Track optional. Zwei Stabi-Einheiten und einmal Rudern sind ab nächster Woche voreingestellt. Den Kilometerrahmen berechnet Endurance Intelligence selbst.</p>
        </div>
        <div className="planner-settings">
          <label>Max. Außentemperatur<input type="number" value={config.maxOutdoorTemperature || 29} onChange={(event) => patchConfig({ maxOutdoorTemperature: Number(event.target.value) })} /><span>°C</span></label>
          <label>Max. Böen<input type="number" value={config.maxWindGust || 55} onChange={(event) => patchConfig({ maxWindGust: Number(event.target.value) })} /><span>km/h</span></label>
          <label>Letzte Phase<input readOnly value={config.lastPhase || "Noch nicht berechnet"} /></label>
          <label>Letzter Laufrahmen<input readOnly value={config.lastTarget ? `${config.lastTarget} km` : "Noch nicht berechnet"} /></label>
        </div>
      </Card>

      <Card className={`wide planner-coach-guidance ${coachGuidance.notes.length ? "active" : "stable"}`}>
        <div>
          <p className="eyebrow">Dynamischer Coach</p>
          <h2>{coachGuidance.notes.length ? "Der nächste Plan wird angepasst" : "Keine Warnsignale in den letzten Reviews"}</h2>
        </div>
        {coachGuidance.notes.length ? (
          <ul>{coachGuidance.notes.map((note) => <li key={note}>{note}</li>)}</ul>
        ) : <p className="muted">Umfang und Intensität bleiben innerhalb des missionsbasierten 3:1-Rahmens.</p>}
      </Card>

      {publishedWeek && (
        <Card className={`wide planner-sync-card ${planChangedAfterPublish ? "dirty" : "synced"}`}>
          <div>
            <p className="eyebrow">Intervals.icu → Garmin</p>
            <h2>{planChangedAfterPublish ? "Plan wurde nach der Übertragung geändert" : "Wochenplan ist veröffentlicht"}</h2>
            <p className="muted">{planChangedAfterPublish ? "Sende die Woche erneut, damit Intervals.icu und Garmin den aktuellen Stand erhalten." : `${publishedWeek.guided || 0} geführte Workouts und ${publishedWeek.notes || 0} Kalendereinträge wurden übertragen.`}</p>
          </div>
          <button onClick={requestPublish}>{planChangedAfterPublish ? "Jetzt aktualisieren" : "Erneut senden"}</button>
        </Card>
      )}

      {status && <p className="planner-status">{status}</p>}
      {missed.length > 0 && (
        <button className="planner-attention" onClick={() => openMissed(missed[0])}>
          <strong>{missed.length} offene Rückmeldung{missed.length > 1 ? "en" : ""}</strong>
          <span>{missed[0].title} vom {new Intl.DateTimeFormat("de-DE").format(new Date(`${missed[0].date}T12:00:00`))} wurde nicht erkannt. Grund angeben →</span>
        </button>
      )}

      <section className="planner-summary">
        <div><span>Noch geplant</span><strong>{plannedKm} km</strong></div>
        <div><span>Gelaufen</span><strong>{completedKm.toFixed(1)} km</strong></div>
        <div><span>Erledigte Einheiten</span><strong>{weekActivities.length}</strong></div>
        <button onClick={() => setEditing(createBlank(weekStart))}>+ Einheit hinzufügen</button>
      </section>

      <div className="planner-days">
        {Array.from({ length: 7 }, (_, index) => {
          const date = dateForDay(weekStart, index);
          const dateKey = isoDate(date);
          const entries = weekPlan.filter((item) => item.date === dateKey);
          const actuals = weekActivities.filter((activity) => activityDate(activity) === dateKey && !matchedActivityIds.has(activity.id));
          const dayWeather = forecast.find((item) => item.date === dateKey);
          return (
            <article className="planner-day" key={dateKey}>
              <header>
                <div><span>{dayFormatter.format(date)}</span><strong>{new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date)}</strong></div>
                {dayWeather && <small>{dayWeather.maxTemp}° · Böen {dayWeather.maxGust} · Regen {dayWeather.rainChance}%</small>}
              </header>

              {actuals.map((activity) => (
                <div className="planner-workout planner-actual completed" key={`actual-${activity.id}`}>
                  <div className="planner-check">✓</div>
                  <div className="planner-workout-main">
                    <div><span>{activityTime(activity) ? `${activityTime(activity)} · ` : ""}ERLEDIGT</span><em>{String(activity.source || "Garmin").toUpperCase()}</em></div>
                    <h3>{activity.name || activity.title || activity.type || "Training"}</h3>
                    <p>{activity.type || activity.sportType || "Einheit"}{Number(activity.distance || 0) ? ` · ${Number(activity.distance).toFixed(1)} km` : ""}{Number(activity.duration || 0) ? ` · ${Math.round(Number(activity.duration))} min` : ""}</p>
                  </div>
                </div>
              ))}

              {entries.length === 0 && actuals.length === 0 ? (
                <button className="planner-empty" onClick={() => setEditing({ ...createBlank(weekStart), date: dateKey })}>+ frei</button>
              ) : entries.map((item) => {
                const matched = matches.get(item.id) || (item.matchedActivityId ? activityById.get(item.matchedActivityId) : null);
                const isMissed = item.date < todayKey && !item.completed && !matched;
                const className = `planner-workout ${item.completed || matched ? "completed" : ""} ${isMissed ? "missed" : ""}`;
                return (
                  <div className={className} key={item.id}>
                    <button className="planner-check" onClick={() => updateWorkout(item.id, { completed: !item.completed, missedReason: "" })}>{item.completed || matched ? "✓" : isMissed ? "!" : ""}</button>
                    <div className="planner-workout-main">
                      <div>
                        <span>{item.time} · {matched ? "ERLEDIGT" : isMissed ? "NICHT ERLEDIGT" : item.optional ? "OPTIONAL" : "PFLICHT"}</span>
                        {item.weatherAdjusted && <em>WETTER</em>}
                        {item.intervalsPublishedAt && <em>INTERVALS</em>}
                        {matched && <em>{String(matched.source || item.actualSource || "Garmin").toUpperCase()}</em>}
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.type}{item.distance ? ` · ${item.distance} km geplant` : ""}{matched && Number(matched.distance || item.actualDistance || 0) ? ` · ${Number(matched.distance || item.actualDistance).toFixed(1)} km erledigt` : ""}{item.duration ? ` · ${item.duration} min` : ""}</p>
                      {matched && <small>{matched.name || item.actualTitle}</small>}
                      {item.missedReason && <small>Grund: {item.missedReason}{item.missedNote ? ` · ${item.missedNote}` : ""}</small>}
                      {item.notes && <small>{item.notes}</small>}
                    </div>
                    <div className="planner-actions">
                      {isMissed && <button className="danger" onClick={() => openMissed(item)}>Grund angeben</button>}
                      <button onClick={() => setEditing(item)}>Bearbeiten</button>
                      <button onClick={() => updateWorkout(item.id, { archived: true })}>Archiv</button>
                      <button onClick={() => removeWorkout(item.id)}>Löschen</button>
                    </div>
                  </div>
                );
              })}
            </article>
          );
        })}
      </div>

      {publishConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal planner-publish-modal">
            <button type="button" className="close" onClick={() => setPublishConfirmOpen(false)}>×</button>
            <p className="eyebrow">Woche bestätigen</p>
            <h2>Plan an Intervals.icu senden?</h2>
            <p><strong>{publishablePlan.length}</strong> zukünftige Einheit{publishablePlan.length === 1 ? "" : "en"} werden für {dayFormatter.format(weekStart)} bis {dayFormatter.format(weekEnd)} veröffentlicht.</p>
            <div className="planner-protection-list">
              <span>✓ Lauf- und Radeinheiten werden als strukturierte Workouts angelegt</span>
              <span>✓ Fußball, Stabi, Mobility und Rudern bleiben reine Kalendereinträge</span>
              <span>✓ Erneutes Senden aktualisiert bestehende Einträge statt Duplikate anzulegen</span>
              <span>✓ Entfernte Einheiten werden auch aus dieser Intervals-Woche entfernt</span>
            </div>
            <p className="muted">In Intervals.icu muss unter Garmin „Upload planned workouts“ aktiviert sein.</p>
            <div className="modal-actions">
              <button type="button" onClick={() => setPublishConfirmOpen(false)}>Abbrechen</button>
              <button type="button" className="primary" disabled={publishBusy} onClick={publishWeek}>{publishBusy ? "Wird gesendet …" : "Bestätigen und senden"}</button>
            </div>
          </div>
        </div>
      )}

      {overwriteConfirmOpen && (
        <div className="modal-backdrop">
          <div className="modal planner-overwrite-modal">
            <button type="button" className="close" onClick={() => setOverwriteConfirmOpen(false)}>×</button>
            <p className="eyebrow">Aktuelle Woche schützen</p>
            <h2>Aktuelle Woche wirklich neu planen?</h2>
            <p>Es gibt noch <strong>{replaceableCurrentEntries.length}</strong> zukünftige, automatisch geplante Einheit{replaceableCurrentEntries.length === 1 ? "" : "en"}. Diese werden neu berechnet.</p>
            <div className="planner-protection-list">
              <span>✓ Vergangene Tage bleiben unverändert</span>
              <span>✓ Erledigte und manuell angelegte Einheiten bleiben erhalten</span>
              <span>✓ Offene Rückmeldungen werden nicht gelöscht</span>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setOverwriteConfirmOpen(false)}>Abbrechen</button>
              <button type="button" className="primary" onClick={() => { setOverwriteConfirmOpen(false); openPlanning(); }}>Ja, zukünftige Einheiten neu planen</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-backdrop">
          <form className="modal planner-modal" onSubmit={saveWorkout}>
            <button type="button" className="close" onClick={() => setEditing(null)}>×</button>
            <p className="eyebrow">Einheit</p>
            <h2>{state.plan.some((item) => item.id === editing.id) ? "Training bearbeiten" : "Training hinzufügen"}</h2>
            <div className="form-grid">
              <label>Datum<input type="date" value={editing.date} onChange={(event) => setEditing({ ...editing, date: event.target.value })} /></label>
              <label>Uhrzeit<input type="time" value={editing.time} onChange={(event) => setEditing({ ...editing, time: event.target.value })} /></label>
              <label>Titel<input value={editing.title} onChange={(event) => setEditing({ ...editing, title: event.target.value })} required /></label>
              <label>Typ<select value={editing.type} onChange={(event) => setEditing({ ...editing, type: event.target.value })}>{workoutTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
              <label>Distanz in km<input type="number" min="0" step="0.1" value={editing.distance} onChange={(event) => setEditing({ ...editing, distance: event.target.value })} /></label>
              <label>Dauer in Minuten<input type="number" min="0" value={editing.duration} onChange={(event) => setEditing({ ...editing, duration: event.target.value })} /></label>
            </div>
            <label>Notiz<textarea value={editing.notes} onChange={(event) => setEditing({ ...editing, notes: event.target.value })} /></label>
            <label className="planner-optional"><input type="checkbox" checked={editing.optional} onChange={(event) => setEditing({ ...editing, optional: event.target.checked })} /> Einheit ist optional</label>
            <button className="primary" type="submit">Speichern</button>
          </form>
        </div>
      )}

      {planningOpen && planningDraft && (
        <div className="modal-backdrop">
          <form className="modal planner-modal planner-setup" onSubmit={(event) => { event.preventDefault(); generate(planningDraft); }}>
            <button type="button" className="close" onClick={() => setPlanningOpen(false)}>×</button>
            <p className="eyebrow">Intelligente Wochenplanung</p>
            <h2>Wie geht es dir – und wann hast du Zeit?</h2>
            <p className="muted">Der Kilometerrahmen kommt aus deinem Hauptziel, den letzten Trainingswochen, dem 3:1-Zyklus und diesem Check-in.</p>

            {(reasonCounts.fatigue > 0 || reasonCounts.pain > 0 || reasonCounts.illness > 0) && (
              <div className="planner-history-alert">
                <strong>Rückfragen aus den letzten drei Wochen</strong>
                {reasonCounts.fatigue > 0 && <span>{reasonCounts.fatigue} × Müdigkeit: Ist sie inzwischen besser?</span>}
                {reasonCounts.pain > 0 && <span>{reasonCounts.pain} × Schmerzen: Sind sie abgeklungen?</span>}
                {reasonCounts.illness > 0 && <span>{reasonCounts.illness} × Krankheit: Fühlst du dich wieder zu 100 % fit?</span>}
              </div>
            )}

            <div className="form-grid">
              <label>Energie heute
                <select value={planningDraft.checkin.energy} onChange={(event) => updateCheckin("energy", Number(event.target.value))}>
                  <option value="1">1 – sehr niedrig</option><option value="2">2 – niedrig</option><option value="3">3 – mittel</option><option value="4">4 – gut</option><option value="5">5 – sehr gut</option>
                </select>
              </label>
              <label>Müdigkeit
                <select value={planningDraft.checkin.fatigue} onChange={(event) => updateCheckin("fatigue", event.target.value)}>
                  <option value="none">Keine</option><option value="better">Besser</option><option value="unchanged">Unverändert</option><option value="worse">Schlechter</option>
                </select>
              </label>
              <label>Schmerzen
                <select value={planningDraft.checkin.pain} onChange={(event) => updateCheckin("pain", event.target.value)}>
                  <option value="none">Keine</option><option value="better">Besser</option><option value="unchanged">Unverändert</option><option value="worse">Schlechter</option>
                </select>
              </label>
              <label>Krankheit
                <select value={planningDraft.checkin.illness} onChange={(event) => updateCheckin("illness", event.target.value)}>
                  <option value="healthy">100 % fit</option><option value="recovering">Noch etwas angeschlagen</option><option value="symptoms">Noch Symptome</option>
                </select>
              </label>
              {planningDraft.checkin.fatigue !== "none" && <label>Warum müde?<select value={planningDraft.checkin.fatigueCause} onChange={(event) => updateCheckin("fatigueCause", event.target.value)}><option value="">Bitte auswählen</option><option>Schlaf</option><option>Arbeit/Stress</option><option>Training</option><option>Familie/Alltag</option><option>Unklar</option></select></label>}
              {planningDraft.checkin.pain !== "none" && <label>Schmerzstärke<input type="number" min="0" max="10" value={planningDraft.checkin.painLevel} onChange={(event) => updateCheckin("painLevel", Number(event.target.value))} /></label>}
              {planningDraft.checkin.pain !== "none" && <label>Wo?<input value={planningDraft.checkin.painArea} onChange={(event) => updateCheckin("painArea", event.target.value)} placeholder="z. B. linke Wade" /></label>}
              <label>Stabi-Einheiten<input type="number" min="0" max="7" value={planningDraft.stabiCount} onChange={(event) => setPlanningDraft({ ...planningDraft, stabiCount: Number(event.target.value) })} /></label>
              <label>Ruder-Einheiten<input type="number" min="0" max="7" value={planningDraft.rowingCount} onChange={(event) => setPlanningDraft({ ...planningDraft, rowingCount: Number(event.target.value) })} /></label>
            </div>

            <div className="planner-day-picker"><strong>An welchen Tagen kannst du laufen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.runDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("runDays", day)} key={`run-${day}`}>{day.slice(0, 2)}</button>)}</div></div>
            <div className="planner-day-picker"><strong>Stabi an welchen Tagen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.stabiDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("stabiDays", day)} key={`stabi-${day}`}>{day.slice(0, 2)}</button>)}</div></div>
            <div className="planner-day-picker"><strong>Rudern an welchen Tagen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.rowingDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("rowingDays", day)} key={`row-${day}`}>{day.slice(0, 2)}</button>)}</div></div>
            <div className="planner-day-picker"><strong>Welche Tage dürfen Doppeltraining enthalten?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.doubleTrainingDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("doubleTrainingDays", day)} key={`double-${day}`}>{day.slice(0, 2)}</button>)}</div><small>Die Engine nutzt Doppeltraining nur, wenn der berechnete Umfang es nötig macht.</small></div>
            <label>Zusätzliche Notiz<textarea value={planningDraft.checkin.notes} onChange={(event) => updateCheckin("notes", event.target.value)} placeholder="Reise, wenig Zeit, besondere Termine …" /></label>
            <button className="primary" type="submit">Plan berechnen</button>
          </form>
        </div>
      )}

      {missedEditing && (
        <div className="modal-backdrop">
          <form className="modal planner-modal" onSubmit={saveMissed}>
            <button type="button" className="close" onClick={() => setMissedEditing(null)}>×</button>
            <p className="eyebrow">Offene Rückmeldung</p>
            <h2>Warum wurde „{missedEditing.title}“ nicht gemacht?</h2>
            <div className="planner-reasons">{reasonOptions.map((reason) => <button type="button" className={missedEditing.reason === reason ? "selected" : ""} onClick={() => setMissedEditing({ ...missedEditing, reason })} key={reason}>{reason}</button>)}</div>
            {missedEditing.reason === "Müde" && <label>Warum warst du müde?<select value={missedEditing.fatigueCause} onChange={(event) => setMissedEditing({ ...missedEditing, fatigueCause: event.target.value })}><option value="">Bitte auswählen</option><option>Schlaf</option><option>Arbeit/Stress</option><option>Training</option><option>Familie/Alltag</option><option>Unklar</option></select></label>}
            {missedEditing.reason === "Schmerzen" && <div className="form-grid"><label>Wo waren die Schmerzen?<input value={missedEditing.painArea} onChange={(event) => setMissedEditing({ ...missedEditing, painArea: event.target.value })} /></label><label>Stärke 0–10<input type="number" min="0" max="10" value={missedEditing.painLevel} onChange={(event) => setMissedEditing({ ...missedEditing, painLevel: event.target.value })} /></label></div>}
            {missedEditing.reason === "Verschoben" && <label>Neues Datum<input type="date" min={todayKey} value={missedEditing.newDate} onChange={(event) => setMissedEditing({ ...missedEditing, newDate: event.target.value })} required /></label>}
            {missedEditing.reason === "Aktivität nicht erkannt" && <label>Aktivität zuordnen<select value={missedEditing.activityId} onChange={(event) => setMissedEditing({ ...missedEditing, activityId: event.target.value })} required><option value="">Bitte auswählen</option>{weekActivities.map((activity) => <option value={activity.id} key={activity.id}>{activityDate(activity)} · {activity.name || activity.type} {Number(activity.distance || 0) ? `(${Number(activity.distance).toFixed(1)} km)` : ""}</option>)}</select></label>}
            <label>Notiz (optional)<textarea value={missedEditing.note} onChange={(event) => setMissedEditing({ ...missedEditing, note: event.target.value })} /></label>
            <button className="primary" type="submit" disabled={!missedEditing.reason}>Rückmeldung speichern</button>
          </form>
        </div>
      )}
    </>
  );
}
