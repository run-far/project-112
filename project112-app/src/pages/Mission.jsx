import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle, Metric } from "../components/UI";
import { daysUntil, fmtDate } from "../utils/format";
import { buildEventAdvice, fetchEventForecast } from "../services/eventWeather";

const emptyEvent = {
  name: "",
  date: "",
  location: "",
  targetKm: "",
  weeklyTarget: "",
  isMainTarget: false,
};

export default function Mission() {
  const { state, setState } = useApp();
  const [draft, setDraft] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [forecasts, setForecasts] = useState({});
  const [showArchived, setShowArchived] = useState(false);
  const total = state.activities.reduce((sum, activity) => sum + Number(activity.distance || 0), 0);

  const milestones = useMemo(
    () => Array.isArray(state.mission.milestones) ? state.mission.milestones : [],
    [state.mission.milestones],
  );
  const activeMilestones = milestones.filter((item) => !item.archived);
  const archivedMilestones = milestones.filter((item) => item.archived);

  function change(event) {
    const { name, value, type, checked } = event.target;
    setDraft((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  }

  function save(event) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.date) return;

    setState((current) => {
      const currentMilestones = Array.isArray(current.mission.milestones)
        ? current.mission.milestones
        : [];
      const id = editingId || crypto.randomUUID();
      const savedEvent = {
        id,
        name: draft.name.trim(),
        date: draft.date,
        location: draft.location.trim(),
        targetKm: draft.targetKm === "" ? null : Number(draft.targetKm),
        weeklyTarget: draft.weeklyTarget === "" ? null : Number(draft.weeklyTarget),
        isMainTarget: Boolean(draft.isMainTarget),
        archived: false,
      };

      let next = editingId
        ? currentMilestones.map((item) => item.id === editingId ? { ...item, ...savedEvent } : item)
        : [...currentMilestones, savedEvent];

      if (savedEvent.isMainTarget) {
        next = next.map((item) => ({ ...item, isMainTarget: item.id === id }));
      }

      const mainTarget = next.find((item) => item.isMainTarget && !item.archived)
        || next.find((item) => !item.archived)
        || savedEvent;

      return {
        ...current,
        mission: {
          ...current.mission,
          id: mainTarget.id,
          name: mainTarget.name,
          date: mainTarget.date,
          location: mainTarget.location || "",
          targetKm: Number(mainTarget.targetKm) || 0,
          weeklyTarget: Number(mainTarget.weeklyTarget) || Number(current.mission.weeklyTarget) || 0,
          milestones: next,
        },
      };
    });

    setDraft(emptyEvent);
    setEditingId(null);
  }

  function edit(item) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      date: item.date,
      location: item.location || "",
      targetKm: item.targetKm ?? "",
      weeklyTarget: item.weeklyTarget ?? "",
      isMainTarget: Boolean(item.isMainTarget),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function archive(id) {
    setState((current) => {
      let next = current.mission.milestones.map((item) =>
        item.id === id ? { ...item, archived: !item.archived, isMainTarget: item.id === id ? false : item.isMainTarget } : item,
      );
      const currentMain = next.find((item) => item.isMainTarget && !item.archived);
      if (!currentMain) {
        const replacement = next.find((item) => !item.archived);
        if (replacement) next = next.map((item) => ({ ...item, isMainTarget: item.id === replacement.id }));
      }
      const mainTarget = next.find((item) => item.isMainTarget && !item.archived);
      return {
        ...current,
        mission: {
          ...current.mission,
          ...(mainTarget ? {
            id: mainTarget.id,
            name: mainTarget.name,
            date: mainTarget.date,
            location: mainTarget.location || "",
            targetKm: Number(mainTarget.targetKm) || 0,
            weeklyTarget: Number(mainTarget.weeklyTarget) || 0,
          } : {}),
          milestones: next,
        },
      };
    });
  }

  function remove(id) {
    if (!window.confirm("Diesen Eintrag endgültig löschen?")) return;
    setState((current) => {
      let next = current.mission.milestones.filter((item) => item.id !== id);
      if (!next.some((item) => item.isMainTarget && !item.archived)) {
        const replacement = next.find((item) => !item.archived);
        if (replacement) next = next.map((item) => ({ ...item, isMainTarget: item.id === replacement.id }));
      }
      const mainTarget = next.find((item) => item.isMainTarget && !item.archived);
      return {
        ...current,
        mission: {
          ...current.mission,
          ...(mainTarget ? {
            id: mainTarget.id,
            name: mainTarget.name,
            date: mainTarget.date,
            location: mainTarget.location || "",
            targetKm: Number(mainTarget.targetKm) || 0,
            weeklyTarget: Number(mainTarget.weeklyTarget) || 0,
          } : {}),
          milestones: next,
        },
      };
    });
  }

  async function loadForecast(item) {
    setForecasts((current) => ({ ...current, [item.id]: { loading: true } }));
    try {
      const forecast = await fetchEventForecast(item.location, item.date);
      setForecasts((current) => ({ ...current, [item.id]: forecast }));
    } catch (error) {
      setForecasts((current) => ({ ...current, [item.id]: { error: error.message } }));
    }
  }

  function eventCard(item, archived = false) {
    const forecast = forecasts[item.id];
    return <Card key={item.id} className={item.isMainTarget ? "main-target-card" : ""}>
      <div className="card-heading-row">
        <div><p className="eyebrow">{item.isMainTarget ? "Hauptziel" : archived ? "Archiviert" : "Meilenstein"}</p><h2>{item.name}</h2></div>
        {item.isMainTarget && <span className="main-target-badge">Hauptziel</span>}
      </div>
      <p>{fmtDate(item.date)} · noch {daysUntil(item.date)} Tage</p>
      <p className="muted">{item.location || "Noch kein Ort hinterlegt"}</p>
      {item.targetKm ? <p><strong>Ziel:</strong> {item.targetKm} km</p> : null}
      <div className="event-actions">
        {!archived && <button onClick={() => edit(item)}>Bearbeiten</button>}
        <button onClick={() => archive(item.id)}>{archived ? "Reaktivieren" : "Archivieren"}</button>
        <button className="danger-button" onClick={() => remove(item.id)}>Löschen</button>
        {!archived && item.location && <button onClick={() => loadForecast(item)}>Wetter prüfen</button>}
      </div>
      {forecast?.loading && <p className="muted">Wetter wird geladen …</p>}
      {forecast?.error && <p className="bad">{forecast.error}</p>}
      {forecast?.unavailable && <div className="event-weather"><b>Wetterprognose</b><p>{forecast.reason}</p></div>}
      {forecast && !forecast.loading && !forecast.error && !forecast.unavailable && <div className="event-weather"><b>Prognose für {forecast.place}</b><p>{forecast.condition} · {forecast.min}–{forecast.max} °C · Regen {forecast.rainChance}% · Wind {forecast.wind} km/h</p><p><strong>Planung:</strong> {buildEventAdvice(forecast)}</p></div>}
    </Card>;
  }

  return <>
    <PageTitle eyebrow="Mission Control" title={state.mission.name} />
    <div className="grid">
      <Card className="hero wide"><div className="hero-stats"><Metric label="Ziel" value={`${state.mission.targetKm || 0} km`} /><Metric label="Countdown" value={`${daysUntil(state.mission.date)} Tage`} sub={fmtDate(state.mission.date)} /><Metric label="Trainings-km" value={`${total.toFixed(0)} km`} /></div></Card>
      <Card className="wide">
        <p className="eyebrow">Meilensteine & Events</p>
        <form className="editor-form mission-editor" onSubmit={save}>
          <label>Event<input name="name" value={draft.name} onChange={change} placeholder="Backyard Ultra" required /></label>
          <label>Datum<input name="date" type="date" value={draft.date} onChange={change} required /></label>
          <label>Ort<input name="location" value={draft.location} onChange={change} placeholder="Fulda, Deutschland" /></label>
          <label>Zieldistanz (km)<input name="targetKm" type="number" min="0" step="0.1" value={draft.targetKm} onChange={change} /></label>
          <label>Wochenziel (km)<input name="weeklyTarget" type="number" min="0" step="1" value={draft.weeklyTarget} onChange={change} /></label>
          <label className="checkbox-label"><input name="isMainTarget" type="checkbox" checked={draft.isMainTarget} onChange={change} /> Als Hauptziel markieren</label>
          <button className="primary" type="submit">{editingId ? "Änderung speichern" : "Event hinzufügen"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyEvent); }}>Abbrechen</button>}
        </form>
      </Card>

      {activeMilestones.map((item) => eventCard(item))}

      {archivedMilestones.length > 0 && <Card className="wide">
        <div className="archive-heading"><div><p className="eyebrow">Archiv</p><h2>Archivierte Events</h2></div><button onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Ausblenden" : `Anzeigen (${archivedMilestones.length})`}</button></div>
        {showArchived && <div className="archive-grid">{archivedMilestones.map((item) => eventCard(item, true))}</div>}
      </Card>}
    </div>
  </>;
}
