import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle, Metric } from "../components/UI";
import { daysUntil, fmtDate } from "../utils/format";
import { buildEventAdvice, fetchEventForecast } from "../services/eventWeather";

const emptyEvent = { name: "", date: "", location: "" };

export default function Mission() {
  const { state, setState } = useApp();
  const [draft, setDraft] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [forecasts, setForecasts] = useState({});
  const total = state.activities.reduce((sum, activity) => sum + activity.distance, 0);
  const milestones = useMemo(() => {
    if (state.mission.milestones?.length) return state.mission.milestones;
    return state.mission.milestone ? [{ ...state.mission.milestone, id: state.mission.milestone.id || "legacy-milestone" }] : [];
  }, [state.mission]);

  function change(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  }

  function save(event) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.date) return;
    setState((current) => {
      const currentMilestones = current.mission.milestones?.length ? current.mission.milestones : milestones;
      const next = editingId
        ? currentMilestones.map((item) => item.id === editingId ? { ...item, ...draft, name: draft.name.trim(), location: draft.location.trim() } : item)
        : [...currentMilestones, { id: crypto.randomUUID(), ...draft, name: draft.name.trim(), location: draft.location.trim() }];
      return { ...current, mission: { ...current.mission, milestones: next, milestone: next[0] || null } };
    });
    setDraft(emptyEvent);
    setEditingId(null);
  }

  function edit(item) {
    setEditingId(item.id);
    setDraft({ name: item.name, date: item.date, location: item.location || "" });
  }

  function remove(id) {
    setState((current) => {
      const next = milestones.filter((item) => item.id !== id);
      return { ...current, mission: { ...current.mission, milestones: next, milestone: next[0] || null } };
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

  return <>
    <PageTitle eyebrow="Mission Control" title={state.mission.name} />
    <div className="grid">
      <Card className="hero wide"><div className="hero-stats"><Metric label="Ziel" value={`${state.mission.targetKm} km`} /><Metric label="Countdown" value={`${daysUntil(state.mission.date)} Tage`} sub={fmtDate(state.mission.date)} /><Metric label="Trainings-km" value={`${total.toFixed(0)} km`} /></div></Card>
      <Card className="wide">
        <p className="eyebrow">Meilensteine & Events</p>
        <form className="editor-form" onSubmit={save}>
          <label>Event<input name="name" value={draft.name} onChange={change} placeholder="Backyard Ultra" required /></label>
          <label>Datum<input name="date" type="date" value={draft.date} onChange={change} required /></label>
          <label>Ort<input name="location" value={draft.location} onChange={change} placeholder="Fulda, Deutschland" /></label>
          <button className="primary" type="submit">{editingId ? "Änderung speichern" : "Event hinzufügen"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setDraft(emptyEvent); }}>Abbrechen</button>}
        </form>
      </Card>

      {milestones.map((item) => {
        const forecast = forecasts[item.id];
        return <Card key={item.id}>
          <p className="eyebrow">Meilenstein</p><h2>{item.name}</h2>
          <p>{fmtDate(item.date)} · noch {daysUntil(item.date)} Tage</p>
          <p className="muted">{item.location || "Noch kein Ort hinterlegt"}</p>
          <div className="event-actions"><button onClick={() => edit(item)}>Bearbeiten</button><button onClick={() => remove(item.id)}>Entfernen</button>{item.location && <button onClick={() => loadForecast(item)}>Wetter prüfen</button>}</div>
          {forecast?.loading && <p className="muted">Wetter wird geladen …</p>}
          {forecast?.error && <p className="bad">{forecast.error}</p>}
          {forecast?.unavailable && <div className="event-weather"><b>Wetterprognose</b><p>{forecast.reason}</p></div>}
          {forecast && !forecast.loading && !forecast.error && !forecast.unavailable && <div className="event-weather"><b>Prognose für {forecast.place}</b><p>{forecast.condition} · {forecast.min}–{forecast.max} °C · Regen {forecast.rainChance}% · Wind {forecast.wind} km/h</p><p><strong>Planung:</strong> {buildEventAdvice(forecast)}</p></div>}
        </Card>;
      })}
    </div>
  </>;
}
