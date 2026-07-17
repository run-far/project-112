import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import "./WeekPlan.css";

const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const types = ["Easy Run", "Long Run", "Intervalle", "Backyard Training", "ORC Run", "Fußball", "Stabi", "Rudern", "Radfahren", "Ruhetag"];

const emptyWorkout = {
  day: "Montag",
  time: "18:00",
  title: "",
  type: "Easy Run",
  distance: "",
  notes: "",
  optional: false,
};

export default function WeekPlan() {
  const { state, setState } = useApp();
  const [workout, setWorkout] = useState(emptyWorkout);

  const plannedKilometers = useMemo(
    () => state.plan.reduce((sum, item) => sum + Number(item.distance || 0), 0),
    [state.plan],
  );
  const completedKilometers = useMemo(
    () => state.plan.filter((item) => item.completed).reduce((sum, item) => sum + Number(item.distance || 0), 0),
    [state.plan],
  );

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setWorkout((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function addWorkout(event) {
    event.preventDefault();
    if (!workout.title.trim()) return;

    const item = {
      id: crypto.randomUUID(),
      ...workout,
      title: workout.title.trim(),
      notes: workout.notes.trim(),
      distance: Number(workout.distance) || 0,
      completed: false,
      source: "planner",
    };

    setState((current) => ({ ...current, plan: [...current.plan, item] }));
    setWorkout(emptyWorkout);
  }

  function updateWorkout(id, patch) {
    setState((current) => ({
      ...current,
      plan: current.plan.map((item) => item.id === id ? { ...item, ...patch } : item),
    }));
  }

  function deleteWorkout(id) {
    setState((current) => ({ ...current, plan: current.plan.filter((item) => item.id !== id) }));
  }

  return (
    <article className="card wide week-plan">
      <div className="week-plan-header">
        <div><p className="label">Training</p><h2>Aktuelle Woche</h2></div>
        <div className="week-plan-summary"><strong>{completedKilometers} / {plannedKilometers} km</strong><span>erledigt</span></div>
      </div>

      <form className="week-plan-form" onSubmit={addWorkout}>
        <div className="week-plan-field"><label htmlFor="workout-day">Tag</label><select id="workout-day" name="day" value={workout.day} onChange={handleChange}>{days.map((day) => <option key={day}>{day}</option>)}</select></div>
        <div className="week-plan-field"><label htmlFor="workout-time">Uhrzeit</label><input id="workout-time" name="time" type="time" value={workout.time} onChange={handleChange} /></div>
        <div className="week-plan-field"><label htmlFor="workout-title">Einheit</label><input id="workout-title" name="title" value={workout.title} onChange={handleChange} placeholder="10 km locker" required /></div>
        <div className="week-plan-field"><label htmlFor="workout-type">Typ</label><select id="workout-type" name="type" value={workout.type} onChange={handleChange}>{types.map((type) => <option key={type}>{type}</option>)}</select></div>
        <div className="week-plan-field"><label htmlFor="workout-distance">Distanz in km</label><input id="workout-distance" name="distance" type="number" min="0" step="0.1" value={workout.distance} onChange={handleChange} /></div>
        <div className="week-plan-field week-plan-notes"><label htmlFor="workout-notes">Notiz</label><input id="workout-notes" name="notes" value={workout.notes} onChange={handleChange} placeholder="Locker, keine Pace erzwingen" /></div>
        <label className="week-plan-field"><span>Priorität</span><span><input name="optional" type="checkbox" checked={workout.optional} onChange={handleChange} /> Optional</span></label>
        <button className="week-plan-add-button" type="submit">Einheit hinzufügen</button>
      </form>

      <div className="week-plan-list">
        {state.plan.length === 0 ? <p className="week-plan-empty">Noch keine Einheiten geplant.</p> : state.plan.map((item) => (
          <div className={`week-plan-workout ${item.completed ? "completed" : ""}`} key={item.id}>
            <button className="week-plan-check" type="button" onClick={() => updateWorkout(item.id, { completed: !item.completed })}>{item.completed ? "✓" : ""}</button>
            <div className="week-plan-workout-info">
              <span className="week-plan-day">{item.day}{item.time ? ` · ${item.time}` : ""} · {item.optional ? "Optional" : "Pflicht"}</span>
              <h3>{item.title}</h3>
              <p>{item.type}{item.distance > 0 ? ` · ${item.distance} km` : ""}</p>
              {item.notes ? <p className="week-plan-workout-notes">{item.notes}</p> : null}
            </div>
            <button className="week-plan-delete" type="button" onClick={() => deleteWorkout(item.id)}>Löschen</button>
          </div>
        ))}
      </div>
    </article>
  );
}
