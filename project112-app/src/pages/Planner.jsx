import { useEffect, useMemo, useState } from "react";
import { Card, PageTitle } from "../components/UI";
import { useApp } from "../context/AppContext";
import { getCurrentPosition } from "../services/weather";
import { dateForDay, fetchWeeklyForecast, generateWeekPlan, isoDate, startOfWeek, workoutTypes } from "../services/plannerEngine";
import { downloadCalendar } from "../services/calendar";
import "./Planner.css";

const dayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });
const reasonOptions = ["Keine Zeit", "Müde/Schmerzen", "Wetter", "Verschoben", "Bewusst ausgelassen", "Aktivität nicht erkannt", "Sonstiges"];
const plannerDays = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

function createBlank(weekStart) {
  const date = dateForDay(weekStart, 1);
  return { id: crypto.randomUUID(), date: isoDate(date), day: "Dienstag", time: "18:00", title: "", type: "Easy Run", distance: 0, duration: 60, notes: "", optional: false, completed: false, source: "planner", archived: false };
}

function activityDate(activity) { return String(activity.startDateLocal || activity.date || "").slice(0, 10); }
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
  if (type.includes("run") || type.includes("lauf") || type.includes("treadmill") || type.includes("orc") || type.includes("backyard") || type.includes("interval")) return "running";
  return type;
}
function isRunningActivity(activity) { return normalizedType(activity.type || activity.sportType || activity.name) === "running"; }
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
      if (score > bestScore) { best = activity; bestScore = score; }
    });
    if (best && bestScore >= 10) { matches.set(item.id, best); used.add(best.id); }
  });
  return matches;
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
  const weekStart = useMemo(() => startOfWeek(new Date(), offsetWeeks), [offsetWeeks]);
  const weekEnd = dateForDay(weekStart, 6);
  const weekPlan = useMemo(() => state.plan.filter((item) => {
    const value = item.date || "";
    return value >= isoDate(weekStart) && value <= isoDate(weekEnd) && !item.archived;
  }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [state.plan, weekStart, weekEnd]);
  const weekActivities = useMemo(() => state.activities.filter((activity) => {
    const value = activityDate(activity);
    return value >= isoDate(weekStart) && value <= isoDate(weekEnd);
  }).sort((a, b) => String(a.startDateLocal || a.date).localeCompare(String(b.startDateLocal || b.date))), [state.activities, weekStart, weekEnd]);
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

  useEffect(() => {
    const updates = [...matches.entries()].filter(([id, activity]) => {
      const item = state.plan.find((entry) => entry.id === id);
      return item && (!item.completed || item.matchedActivityId !== activity.id);
    });
    if (!updates.length) return;
    const byId = new Map(updates);
    setState((current) => ({ ...current, plan: current.plan.map((item) => {
      const activity = byId.get(item.id);
      if (!activity) return item;
      return { ...item, completed: true, completedAt: activity.startDateLocal || activity.date, matchedActivityId: activity.id, actualTitle: activity.name || activity.title, actualDistance: Number(activity.distance || 0), actualDuration: Number(activity.duration || 0), actualSource: activity.source || "Garmin", missedReason: "" };
    }) }));
  }, [matches, setState, state.plan]);

  function patchConfig(patch) { setState((current) => ({ ...current, planner: { ...current.planner, ...patch } })); }
  function openPlanning() {
    setPlanningDraft({
      weeklyTarget: Number(config.weeklyTarget || state.mission.weeklyTarget || 70),
      stabiCount: Number(config.stabiCount ?? 2),
      stabiDays: config.stabiDays?.length ? config.stabiDays : ["Donnerstag", "Sonntag"],
      rowingCount: Number(config.rowingCount ?? 1),
      rowingDays: config.rowingDays?.length ? config.rowingDays : ["Donnerstag"],
      extraRunCount: Number(config.extraRunCount || 0),
      extraRunDays: config.extraRunDays || [],
      extraRunDistance: Number(config.extraRunDistance || 6),
      doubleTrainingDays: config.doubleTrainingDays || [],
    });
    setPlanningOpen(true);
  }
  function toggleDay(field, day) {
    setPlanningDraft((current) => ({ ...current, [field]: current[field].includes(day) ? current[field].filter((value) => value !== day) : [...current[field], day] }));
  }
  async function generate(overrideConfig = null) {
    setStatus("Plane Woche …");
    let weather = forecast;
    try {
      if (!weather.length) { const position = await getCurrentPosition(); weather = await fetchWeeklyForecast(position.latitude, position.longitude, weekStart); setForecast(weather); }
    } catch { setStatus("Standort/Wetter nicht verfügbar – Plan wird ohne Wetteranpassung erstellt."); }
    const effectiveConfig = { ...config, ...(overrideConfig || {}) };
    const generated = generateWeekPlan({ activities: state.activities, mission: state.mission, config: effectiveConfig, forecast: weather, offsetWeeks, completedRunningKm: actualRunningKm });
    setState((current) => ({ ...current, plan: [...current.plan.filter((item) => {
      const outsideWeek = item.date < isoDate(weekStart) || item.date > isoDate(weekEnd);
      const protectedEntry = item.source !== "planner-engine" || item.completed || item.missedReason || (offsetWeeks === 0 && item.date < todayKey);
      return outsideWeek || protectedEntry;
    }), ...generated.plan], planner: { ...current.planner, ...effectiveConfig, lastGeneratedAt: new Date().toISOString(), lastTarget: generated.target } }));
    setStatus(`Woche erstellt: ${generated.target} km Ziel, davon ${actualRunningKm.toFixed(1)} km bereits gelaufen. Offen: ${generated.remainingTarget.toFixed(1)} km.`);
    setPlanningOpen(false);
  }
  function saveWorkout(event) {
    event.preventDefault(); if (!editing?.title.trim()) return;
    const date = new Date(`${editing.date}T12:00:00`);
    const next = { ...editing, day: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date), distance: Number(editing.distance || 0), duration: Number(editing.duration || 60), title: editing.title.trim() };
    setState((current) => ({ ...current, plan: current.plan.some((item) => item.id === next.id) ? current.plan.map((item) => item.id === next.id ? next : item) : [...current.plan, next] })); setEditing(null);
  }
  function updateWorkout(id, patch) { setState((current) => ({ ...current, plan: current.plan.map((item) => item.id === id ? { ...item, ...patch } : item) })); }
  function removeWorkout(id) { setState((current) => ({ ...current, plan: current.plan.filter((item) => item.id !== id) })); }
  function saveMissed(event) {
    event.preventDefault();
    if (!missedEditing?.reason) return;
    if (missedEditing.reason === "Verschoben" && missedEditing.newDate) {
      updateWorkout(missedEditing.id, { date: missedEditing.newDate, completed: false, missedReason: "", missedNote: missedEditing.note || "", matchedActivityId: null });
    } else if (missedEditing.reason === "Aktivität nicht erkannt" && missedEditing.activityId) {
      const activity = state.activities.find((entry) => String(entry.id) === String(missedEditing.activityId));
      if (activity) updateWorkout(missedEditing.id, { completed: true, matchedActivityId: activity.id, actualTitle: activity.name || activity.title, actualDistance: Number(activity.distance || 0), actualDuration: Number(activity.duration || 0), actualSource: activity.source || "Garmin", missedReason: "" });
    } else {
      updateWorkout(missedEditing.id, { missedReason: missedEditing.reason, missedNote: missedEditing.note || "", completed: false });
    }
    setMissedEditing(null);
  }

  return <>
    <PageTitle eyebrow="Wochenplaner" title="Deine Woche"><div className="page-actions"><button onClick={() => downloadCalendar(weekPlan)}>Kalender laden</button><button className="primary planner-generate" onClick={openPlanning}>✦ Woche intelligent planen</button></div></PageTitle>
    <div className="planner-week-nav"><button disabled={offsetWeeks === 0 && !previousWeekHasPlan} title={offsetWeeks === 0 && !previousWeekHasPlan ? "Keine ältere geplante Woche vorhanden" : "Vorherige Woche"} onClick={() => { setOffsetWeeks((v) => v - 1); setForecast([]); }}>←</button><div><strong>{dayFormatter.format(weekStart)} – {dayFormatter.format(weekEnd)}</strong><span>{offsetWeeks === 0 ? "Aktuelle Woche" : offsetWeeks === 1 ? "Nächste Woche" : "Trainingswoche"}</span></div><button onClick={() => { setOffsetWeeks((v) => v + 1); setForecast([]); }}>→</button></div>
    <Card className="wide planner-rules"><div><p className="eyebrow">Fixe Leitplanken</p><h2>Montag Fußball · Mittwoch ORC Run · Samstag ORC Track optional</h2><p className="muted">Ab nächster Woche gehören Stabi und Rudern fest dazu. Vor jeder Planung legst du Häufigkeit, Tage, Zusatzumfang und Doppeltraining fest.</p></div><div className="planner-settings"><label>Wochenziel<input type="number" value={config.weeklyTarget || state.mission.weeklyTarget || 70} onChange={(e) => patchConfig({ weeklyTarget: Number(e.target.value) })} /><span>km</span></label><label>Max. Außentemperatur<input type="number" value={config.maxOutdoorTemperature || 29} onChange={(e) => patchConfig({ maxOutdoorTemperature: Number(e.target.value) })} /><span>°C</span></label><label>Max. Böen<input type="number" value={config.maxWindGust || 55} onChange={(e) => patchConfig({ maxWindGust: Number(e.target.value) })} /><span>km/h</span></label><label>Donnerstag<select value={config.thursdayAlternative || "Stabi"} onChange={(e) => patchConfig({ thursdayAlternative: e.target.value })}><option>Stabi</option><option>Rudern</option></select></label></div></Card>
    {status && <p className="planner-status">{status}</p>}
    {missed.length > 0 && <button className="planner-attention" onClick={() => setMissedEditing({ id: missed[0].id, title: missed[0].title, date: missed[0].date, reason: "", note: "", newDate: "", activityId: "" })}><strong>{missed.length} offene Rückmeldung{missed.length > 1 ? "en" : ""}</strong><span>{missed[0].title} vom {new Intl.DateTimeFormat("de-DE").format(new Date(`${missed[0].date}T12:00:00`))} wurde nicht erkannt. Grund angeben →</span></button>}
    <section className="planner-summary"><div><span>Noch geplant</span><strong>{plannedKm} km</strong></div><div><span>Gelaufen</span><strong>{completedKm.toFixed(1)} km</strong></div><div><span>Erledigte Einheiten</span><strong>{weekActivities.length}</strong></div><button onClick={() => setEditing(createBlank(weekStart))}>+ Einheit hinzufügen</button></section>
    <div className="planner-days">{Array.from({ length: 7 }, (_, index) => {
      const date = dateForDay(weekStart, index); const dateKey = isoDate(date); const entries = weekPlan.filter((item) => item.date === dateKey); const actuals = weekActivities.filter((activity) => activityDate(activity) === dateKey && !matchedActivityIds.has(activity.id)); const dayWeather = forecast.find((item) => item.date === dateKey);
      return <article className="planner-day" key={dateKey}><header><div><span>{dayFormatter.format(date)}</span><strong>{new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date)}</strong></div>{dayWeather && <small>{dayWeather.maxTemp}° · Böen {dayWeather.maxGust} · Regen {dayWeather.rainChance}%</small>}</header>
        {actuals.map((activity) => <div className="planner-workout planner-actual completed" key={`actual-${activity.id}`}><div className="planner-check">✓</div><div className="planner-workout-main"><div><span>{activityTime(activity) ? `${activityTime(activity)} · ` : ""}ERLEDIGT</span><em>{String(activity.source || "Garmin").toUpperCase()}</em></div><h3>{activity.name || activity.title || activity.type || "Training"}</h3><p>{activity.type || activity.sportType || "Einheit"}{Number(activity.distance || 0) ? ` · ${Number(activity.distance).toFixed(1)} km` : ""}{Number(activity.duration || 0) ? ` · ${Math.round(Number(activity.duration))} min` : ""}</p></div></div>)}
        {entries.length === 0 && actuals.length === 0 ? <button className="planner-empty" onClick={() => setEditing({ ...createBlank(weekStart), date: dateKey })}>+ frei</button> : entries.map((item) => {
          const matched = matches.get(item.id) || (item.matchedActivityId ? state.activities.find((activity) => activity.id === item.matchedActivityId) : null); const isMissed = item.date < todayKey && !item.completed && !matched; const className = `planner-workout ${item.completed || matched ? "completed" : ""} ${isMissed ? "missed" : ""}`;
          return <div className={className} key={item.id}><button className="planner-check" onClick={() => updateWorkout(item.id, { completed: !item.completed, missedReason: "" })}>{item.completed || matched ? "✓" : isMissed ? "!" : ""}</button><div className="planner-workout-main"><div><span>{item.time} · {matched ? "ERLEDIGT" : isMissed ? "NICHT ERLEDIGT" : item.optional ? "OPTIONAL" : "PFLICHT"}</span>{item.weatherAdjusted && <em>WETTER</em>}{matched && <em>{String(matched.source || item.actualSource || "Garmin").toUpperCase()}</em>}</div><h3>{item.title}</h3><p>{item.type}{item.distance ? ` · ${item.distance} km geplant` : ""}{matched && Number(matched.distance || item.actualDistance || 0) ? ` · ${Number(matched.distance || item.actualDistance).toFixed(1)} km erledigt` : ""}{item.duration ? ` · ${item.duration} min` : ""}</p>{matched && <small>{matched.name || item.actualTitle}</small>}{item.missedReason && <small>Grund: {item.missedReason}{item.missedNote ? ` · ${item.missedNote}` : ""}</small>}{item.notes && <small>{item.notes}</small>}</div><div className="planner-actions">{isMissed && <button className="danger" onClick={() => setMissedEditing({ id: item.id, title: item.title, date: item.date, reason: item.missedReason || "", note: item.missedNote || "", newDate: "", activityId: "" })}>Grund angeben</button>}<button onClick={() => setEditing(item)}>Bearbeiten</button><button onClick={() => updateWorkout(item.id, { archived: true })}>Archiv</button><button onClick={() => removeWorkout(item.id)}>Löschen</button></div></div>;
        })}</article>;
    })}</div>
    {editing && <div className="modal-backdrop"><form className="modal planner-modal" onSubmit={saveWorkout}><button type="button" className="close" onClick={() => setEditing(null)}>×</button><p className="eyebrow">Einheit</p><h2>{state.plan.some((item) => item.id === editing.id) ? "Training bearbeiten" : "Training hinzufügen"}</h2><div className="form-grid"><label>Datum<input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label><label>Uhrzeit<input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} /></label><label>Titel<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></label><label>Typ<select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>{workoutTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label>Distanz in km<input type="number" min="0" step="0.1" value={editing.distance} onChange={(e) => setEditing({ ...editing, distance: e.target.value })} /></label><label>Dauer in Minuten<input type="number" min="0" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} /></label></div><label>Notiz<textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label><label className="planner-optional"><input type="checkbox" checked={editing.optional} onChange={(e) => setEditing({ ...editing, optional: e.target.checked })} /> Einheit ist optional</label><button className="primary" type="submit">Speichern</button></form></div>}

    {planningOpen && planningDraft && <div className="modal-backdrop"><form className="modal planner-modal planner-setup" onSubmit={(event) => { event.preventDefault(); generate(planningDraft); }}><button type="button" className="close" onClick={() => setPlanningOpen(false)}>×</button><p className="eyebrow">Wochenaufbau</p><h2>Wie soll diese Woche aussehen?</h2><p className="muted">Fußball am Montag und ORC Run am Mittwoch bleiben fix. ORC Track am Samstag bleibt optional.</p>
      <div className="form-grid"><label>Wochenziel<input type="number" min="20" value={planningDraft.weeklyTarget} onChange={(e) => setPlanningDraft({ ...planningDraft, weeklyTarget: Number(e.target.value) })} /><span>km</span></label><label>Stabi-Einheiten<input type="number" min="0" max="7" value={planningDraft.stabiCount} onChange={(e) => setPlanningDraft({ ...planningDraft, stabiCount: Number(e.target.value) })} /></label><label>Ruder-Einheiten<input type="number" min="0" max="7" value={planningDraft.rowingCount} onChange={(e) => setPlanningDraft({ ...planningDraft, rowingCount: Number(e.target.value) })} /></label><label>Zusätzliche Läufe<input type="number" min="0" max="5" value={planningDraft.extraRunCount} onChange={(e) => setPlanningDraft({ ...planningDraft, extraRunCount: Number(e.target.value) })} /></label>{planningDraft.extraRunCount > 0 && <label>Km je Zusatzlauf<input type="number" min="3" step="1" value={planningDraft.extraRunDistance} onChange={(e) => setPlanningDraft({ ...planningDraft, extraRunDistance: Number(e.target.value) })} /></label>}</div>
      <div className="planner-day-picker"><strong>Stabi an welchen Tagen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.stabiDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("stabiDays", day)} key={`stabi-${day}`}>{day.slice(0, 2)}</button>)}</div></div>
      <div className="planner-day-picker"><strong>Rudern an welchen Tagen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.rowingDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("rowingDays", day)} key={`row-${day}`}>{day.slice(0, 2)}</button>)}</div></div>
      {planningDraft.extraRunCount > 0 && <div className="planner-day-picker"><strong>Zusatzläufe an welchen Tagen?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.extraRunDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("extraRunDays", day)} key={`extra-${day}`}>{day.slice(0, 2)}</button>)}</div></div>}
      <div className="planner-day-picker"><strong>Welche Tage dürfen Doppeltraining enthalten?</strong><div>{plannerDays.map((day) => <button type="button" className={planningDraft.doubleTrainingDays.includes(day) ? "selected" : ""} onClick={() => toggleDay("doubleTrainingDays", day)} key={`double-${day}`}>{day.slice(0, 2)}</button>)}</div><small>Beispiel: morgens Stabi oder Rudern, abends Lauf/Fußball.</small></div>
      <button className="primary" type="submit">Plan erstellen</button></form></div>}
    {missedEditing && <div className="modal-backdrop"><form className="modal planner-modal" onSubmit={saveMissed}><button type="button" className="close" onClick={() => setMissedEditing(null)}>×</button><p className="eyebrow">Offene Rückmeldung</p><h2>Warum wurde „{missedEditing.title}“ nicht gemacht?</h2><div className="planner-reasons">{reasonOptions.map((reason) => <button type="button" className={missedEditing.reason === reason ? "selected" : ""} onClick={() => setMissedEditing({ ...missedEditing, reason })} key={reason}>{reason}</button>)}</div>{missedEditing.reason === "Verschoben" && <label>Neues Datum<input type="date" min={todayKey} value={missedEditing.newDate} onChange={(e) => setMissedEditing({ ...missedEditing, newDate: e.target.value })} required /></label>}{missedEditing.reason === "Aktivität nicht erkannt" && <label>Aktivität zuordnen<select value={missedEditing.activityId} onChange={(e) => setMissedEditing({ ...missedEditing, activityId: e.target.value })} required><option value="">Bitte auswählen</option>{weekActivities.map((activity) => <option value={activity.id} key={activity.id}>{activityDate(activity)} · {activity.name || activity.type} {Number(activity.distance || 0) ? `(${Number(activity.distance).toFixed(1)} km)` : ""}</option>)}</select></label>}<label>Notiz (optional)<textarea value={missedEditing.note} onChange={(e) => setMissedEditing({ ...missedEditing, note: e.target.value })} /></label><button className="primary" type="submit" disabled={!missedEditing.reason}>Rückmeldung speichern</button></form></div>}
  </>;
}
