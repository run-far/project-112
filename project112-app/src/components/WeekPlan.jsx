import { useEffect, useMemo, useState } from "react";
import "./WeekPlan.css";

const STORAGE_KEY = "project112-week-plan";

const emptyWorkout = {
  day: "Montag",
  title: "",
  type: "Easy Run",
  distance: "",
  notes: "",
};

function loadWorkouts() {
  const savedWorkouts = localStorage.getItem(STORAGE_KEY);

  if (!savedWorkouts) {
    return [];
  }

  try {
    return JSON.parse(savedWorkouts);
  } catch {
    return [];
  }
}

function WeekPlan() {
  const [workouts, setWorkouts] = useState(loadWorkouts);
  const [workout, setWorkout] = useState(emptyWorkout);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workouts));
  }, [workouts]);

  const plannedKilometers = useMemo(
    () =>
      workouts.reduce(
        (sum, currentWorkout) =>
          sum + Number(currentWorkout.distance || 0),
        0
      ),
    [workouts]
  );

  const completedKilometers = useMemo(
    () =>
      workouts
        .filter((currentWorkout) => currentWorkout.completed)
        .reduce(
          (sum, currentWorkout) =>
            sum + Number(currentWorkout.distance || 0),
          0
        ),
    [workouts]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      [name]: value,
    }));
  }

  function addWorkout(event) {
    event.preventDefault();

    if (!workout.title.trim()) {
      return;
    }

    const newWorkout = {
      id: crypto.randomUUID(),
      day: workout.day,
      title: workout.title.trim(),
      type: workout.type,
      distance: Number(workout.distance) || 0,
      notes: workout.notes.trim(),
      completed: false,
    };

    setWorkouts((currentWorkouts) => [
      ...currentWorkouts,
      newWorkout,
    ]);

    setWorkout(emptyWorkout);
  }

  function toggleWorkout(workoutId) {
    setWorkouts((currentWorkouts) =>
      currentWorkouts.map((currentWorkout) =>
        currentWorkout.id === workoutId
          ? {
              ...currentWorkout,
              completed: !currentWorkout.completed,
            }
          : currentWorkout
      )
    );
  }

  function deleteWorkout(workoutId) {
    setWorkouts((currentWorkouts) =>
      currentWorkouts.filter(
        (currentWorkout) => currentWorkout.id !== workoutId
      )
    );
  }

  return (
    <article className="card wide week-plan">
      <div className="week-plan-header">
        <div>
          <p className="label">Training</p>
          <h2>Wochenplan</h2>
        </div>

        <div className="week-plan-summary">
          <strong>
            {completedKilometers} / {plannedKilometers} km
          </strong>
          <span>erledigt</span>
        </div>
      </div>

      <form className="week-plan-form" onSubmit={addWorkout}>
        <div className="week-plan-field">
          <label htmlFor="workout-day">Tag</label>
          <select
            id="workout-day"
            name="day"
            value={workout.day}
            onChange={handleChange}
          >
            <option>Montag</option>
            <option>Dienstag</option>
            <option>Mittwoch</option>
            <option>Donnerstag</option>
            <option>Freitag</option>
            <option>Samstag</option>
            <option>Sonntag</option>
          </select>
        </div>

        <div className="week-plan-field">
          <label htmlFor="workout-title">Einheit</label>
          <input
            id="workout-title"
            name="title"
            type="text"
            value={workout.title}
            onChange={handleChange}
            placeholder="10 km locker"
            required
          />
        </div>

        <div className="week-plan-field">
          <label htmlFor="workout-type">Typ</label>
          <select
            id="workout-type"
            name="type"
            value={workout.type}
            onChange={handleChange}
          >
            <option>Easy Run</option>
            <option>Long Run</option>
            <option>Intervalle</option>
            <option>Backyard Training</option>
            <option>ORC Run</option>
            <option>Fußball</option>
            <option>Stabi</option>
            <option>Rudern</option>
            <option>Radfahren</option>
            <option>Ruhetag</option>
          </select>
        </div>

        <div className="week-plan-field">
          <label htmlFor="workout-distance">Distanz in km</label>
          <input
            id="workout-distance"
            name="distance"
            type="number"
            min="0"
            step="0.1"
            value={workout.distance}
            onChange={handleChange}
            placeholder="10"
          />
        </div>

        <div className="week-plan-field week-plan-notes">
          <label htmlFor="workout-notes">Notiz</label>
          <input
            id="workout-notes"
            name="notes"
            type="text"
            value={workout.notes}
            onChange={handleChange}
            placeholder="Sehr locker, keine Pace erzwingen"
          />
        </div>

        <button className="week-plan-add-button" type="submit">
          Einheit hinzufügen
        </button>
      </form>

      <div className="week-plan-list">
        {workouts.length === 0 ? (
          <p className="week-plan-empty">
            Noch keine Einheiten geplant.
          </p>
        ) : (
          workouts.map((plannedWorkout) => (
            <div
              className={`week-plan-workout ${
                plannedWorkout.completed ? "completed" : ""
              }`}
              key={plannedWorkout.id}
            >
              <button
                className="week-plan-check"
                type="button"
                onClick={() => toggleWorkout(plannedWorkout.id)}
                aria-label="Einheit als erledigt markieren"
              >
                {plannedWorkout.completed ? "✓" : ""}
              </button>

              <div className="week-plan-workout-info">
                <span className="week-plan-day">
                  {plannedWorkout.day}
                </span>

                <h3>{plannedWorkout.title}</h3>

                <p>
                  {plannedWorkout.type}
                  {plannedWorkout.distance > 0 &&
                    ` · ${plannedWorkout.distance} km`}
                </p>

                {plannedWorkout.notes && (
                  <p className="week-plan-workout-notes">
                    {plannedWorkout.notes}
                  </p>
                )}
              </div>

              <button
                className="week-plan-delete"
                type="button"
                onClick={() => deleteWorkout(plannedWorkout.id)}
              >
                Löschen
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default WeekPlan;