import { useMemo, useState } from "react";
import { Card, PageTitle } from "../components/UI";
import { useApp } from "../context/AppContext";
import { getCurrentPosition } from "../services/weather";
import { dateForDay, fetchWeeklyForecast, generateWeekPlan, isoDate, startOfWeek, workoutTypes } from "../services/plannerEngine";
import { downloadCalendar } from "../services/calendar";
import "./Planner.css";

const dayFormatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" });

function createBlank(weekStart) {
  const date = dateForDay(weekStart, 1);
  return { id: crypto.randomUUID(), date: isoDate(date), day: "Dienstag", time: "18:00", title: "", type: "Easy Run", distance: 0, duration: 60, notes: "", optional: false, completed: false, source: "planner", archived: false };
}

export default function Planner() {
  const { state, setState } = useApp();
  const [offsetWeeks, setOffsetWeeks] = useState(0);
  const [forecast, setForecast] = useState([]);
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const weekStart = useMemo(() => startOfWeek(new Date(), offsetWeeks), [offsetWeeks]);
  const weekEnd = dateForDay(weekStart, 6);
  const weekPlan = useMemo(() => state.plan.filter((item) => {
    const value = item.date || "";
    return value >= isoDate(weekStart) && value <= isoDate(weekEnd) && !item.archived;
  }).sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)), [state.plan, weekStart, weekEnd]);
  const plannedKm = weekPlan.reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const completedKm = weekPlan.filter((item) => item.completed).reduce((sum, item) => sum + Number(item.distance || 0), 0);
  const config = state.planner || {};

  function patchConfig(patch) {
    setState((current) => ({ ...current, planner: { ...current.planner, ...patch } }));
  }

  async function generate() {
    setStatus("Plane Woche …");
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
    const generated = generateWeekPlan({ activities: state.activities, mission: state.mission, config, forecast: weather, offsetWeeks });
    setState((current) => ({
      ...current,
      plan: [
        ...current.plan.filter((item) => item.date < isoDate(weekStart) || item.date > isoDate(weekEnd) || item.source !== "planner-engine"),
        ...generated.plan,
      ],
      planner: { ...current.planner, lastGeneratedAt: new Date().toISOString(), lastTarget: generated.target },
    }));
    setStatus(`Woche erstellt: ${generated.target} km Ziel, Basis Ø ${generated.recentAverage} km aus den letzten vier Wochen.`);
  }

  function saveWorkout(event) {
    event.preventDefault();
    if (!editing?.title.trim()) return;
    const date = new Date(`${editing.date}T12:00:00`);
    const next = { ...editing, day: new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date), distance: Number(editing.distance || 0), duration: Number(editing.duration || 60), title: editing.title.trim() };
    setState((current) => ({ ...current, plan: current.plan.some((item) => item.id === next.id) ? current.plan.map((item) => item.id === next.id ? next : item) : [...current.plan, next] }));
    setEditing(null);
  }

  function updateWorkout(id, patch) {
    setState((current) => ({ ...current, plan: current.plan.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  }

  function removeWorkout(id) {
    setState((current) => ({ ...current, plan: current.plan.filter((item) => item.id !== id) }));
  }

  return <>
    <PageTitle eyebrow="Wochenplaner" title="Deine Woche">
      <div className="page-actions">
        <button onClick={() => downloadCalendar(weekPlan)}>Kalender laden</button>
        <button className="primary planner-generate" onClick={generate}>✦ Woche intelligent planen</button>
      </div>
    </PageTitle>

    <div className="planner-week-nav">
      <button onClick={() => { setOffsetWeeks((v) => v - 1); setForecast([]); }}>←</button>
      <div><strong>{dayFormatter.format(weekStart)} – {dayFormatter.format(weekEnd)}</strong><span>{offsetWeeks === 0 ? "Aktuelle Woche" : offsetWeeks === 1 ? "Nächste Woche" : "Trainingswoche"}</span></div>
      <button onClick={() => { setOffsetWeeks((v) => v + 1); setForecast([]); }}>→</button>
    </div>

    <Card className="wide planner-rules">
      <div><p className="eyebrow">Fixe Leitplanken</p><h2>Montag Fußball · Mittwoch ORC Run · Samstag ORC Track optional</h2><p className="muted">Die Engine baut Easy Runs, Longrun, Stabi oder Rudern darum herum und wechselt bei Hitze, Sturm oder Gewitter aufs Laufband.</p></div>
      <div className="planner-settings">
        <label>Wochenziel<input type="number" value={config.weeklyTarget || state.mission.weeklyTarget || 70} onChange={(e) => patchConfig({ weeklyTarget: Number(e.target.value) })} /><span>km</span></label>
        <label>Max. Außentemperatur<input type="number" value={config.maxOutdoorTemperature || 29} onChange={(e) => patchConfig({ maxOutdoorTemperature: Number(e.target.value) })} /><span>°C</span></label>
        <label>Max. Böen<input type="number" value={config.maxWindGust || 55} onChange={(e) => patchConfig({ maxWindGust: Number(e.target.value) })} /><span>km/h</span></label>
        <label>Donnerstag<select value={config.thursdayAlternative || "Stabi"} onChange={(e) => patchConfig({ thursdayAlternative: e.target.value })}><option>Stabi</option><option>Rudern</option></select></label>
      </div>
    </Card>

    {status && <p className="planner-status">{status}</p>}

    <section className="planner-summary">
      <div><span>Geplant</span><strong>{plannedKm} km</strong></div>
      <div><span>Erledigt</span><strong>{completedKm} km</strong></div>
      <div><span>Einheiten</span><strong>{weekPlan.length}</strong></div>
      <button onClick={() => setEditing(createBlank(weekStart))}>+ Einheit hinzufügen</button>
    </section>

    <div className="planner-days">
      {Array.from({ length: 7 }, (_, index) => {
        const date = dateForDay(weekStart, index);
        const dateKey = isoDate(date);
        const entries = weekPlan.filter((item) => item.date === dateKey);
        const dayWeather = forecast.find((item) => item.date === dateKey);
        return <article className="planner-day" key={dateKey}>
          <header><div><span>{dayFormatter.format(date)}</span><strong>{new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(date)}</strong></div>{dayWeather && <small>{dayWeather.maxTemp}° · Böen {dayWeather.maxGust} · Regen {dayWeather.rainChance}%</small>}</header>
          {entries.length === 0 ? <button className="planner-empty" onClick={() => setEditing({ ...createBlank(weekStart), date: dateKey })}>+ frei</button> : entries.map((item) => <div className={`planner-workout ${item.completed ? "completed" : ""}`} key={item.id}>
            <button className="planner-check" onClick={() => updateWorkout(item.id, { completed: !item.completed })}>{item.completed ? "✓" : ""}</button>
            <div className="planner-workout-main"><div><span>{item.time} · {item.optional ? "OPTIONAL" : "PFLICHT"}</span>{item.weatherAdjusted && <em>WETTER</em>}</div><h3>{item.title}</h3><p>{item.type}{item.distance ? ` · ${item.distance} km` : ""}{item.duration ? ` · ${item.duration} min` : ""}</p>{item.notes && <small>{item.notes}</small>}</div>
            <div className="planner-actions"><button onClick={() => setEditing(item)}>Bearbeiten</button><button onClick={() => updateWorkout(item.id, { archived: true })}>Archiv</button><button onClick={() => removeWorkout(item.id)}>Löschen</button></div>
          </div>)}
        </article>;
      })}
    </div>

    {editing && <div className="modal-backdrop"><form className="modal planner-modal" onSubmit={saveWorkout}><button type="button" className="close" onClick={() => setEditing(null)}>×</button><p className="eyebrow">Einheit</p><h2>{state.plan.some((item) => item.id === editing.id) ? "Training bearbeiten" : "Training hinzufügen"}</h2><div className="form-grid">
      <label>Datum<input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></label>
      <label>Uhrzeit<input type="time" value={editing.time} onChange={(e) => setEditing({ ...editing, time: e.target.value })} /></label>
      <label>Titel<input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} required /></label>
      <label>Typ<select value={editing.type} onChange={(e) => setEditing({ ...editing, type: e.target.value })}>{workoutTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
      <label>Distanz in km<input type="number" min="0" step="0.1" value={editing.distance} onChange={(e) => setEditing({ ...editing, distance: e.target.value })} /></label>
      <label>Dauer in Minuten<input type="number" min="0" value={editing.duration} onChange={(e) => setEditing({ ...editing, duration: e.target.value })} /></label>
    </div><label>Notiz<textarea value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></label><label className="planner-optional"><input type="checkbox" checked={editing.optional} onChange={(e) => setEditing({ ...editing, optional: e.target.checked })} /> Einheit ist optional</label><button className="primary" type="submit">Speichern</button></form></div>}
  </>;
}
