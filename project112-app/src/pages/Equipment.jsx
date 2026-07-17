import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";

const categories = ["Schuhe", "Laufband", "Rudergerät", "Weste", "Stirnlampe", "Sonstiges"];
const emptyItem = { name: "", category: "Schuhe", limit: "800" };

export default function Equipment() {
  const { state, setState } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [item, setItem] = useState(emptyItem);

  function change(event) {
    const { name, value } = event.target;
    setItem((current) => ({
      ...current,
      [name]: value,
      ...(name === "category" ? { limit: value === "Schuhe" ? "800" : "" } : {}),
    }));
  }

  function add(event) {
    event.preventDefault();
    if (!item.name.trim()) return;
    const usesKilometers = ["Schuhe", "Laufband"].includes(item.category);
    setState((current) => ({
      ...current,
      equipment: [...current.equipment, {
        id: crypto.randomUUID(),
        name: item.name.trim(),
        category: item.category,
        km: usesKilometers ? 0 : null,
        uses: usesKilometers ? null : 0,
        limit: item.limit === "" ? null : Number(item.limit),
        archived: false,
      }],
    }));
    setItem(emptyItem);
    setShowForm(false);
  }

  function archive(id) {
    setState((current) => ({
      ...current,
      equipment: current.equipment.map((entry) => entry.id === id ? { ...entry, archived: !entry.archived } : entry),
    }));
  }

  function remove(id) {
    if (!window.confirm("Diesen Ausrüstungsgegenstand endgültig löschen?")) return;
    setState((current) => ({ ...current, equipment: current.equipment.filter((entry) => entry.id !== id) }));
  }

  const activeEquipment = state.equipment.filter((entry) => !entry.archived);
  const archivedEquipment = state.equipment.filter((entry) => entry.archived);

  function renderItem(entry, archived = false) {
    const value = entry.km ?? entry.uses ?? 0;
    const unit = entry.km != null ? "km" : "Einsätze";
    const progress = entry.limit ? Math.min(100, (value / entry.limit) * 100) : 0;
    return <Card key={entry.id}>
      <p className="eyebrow">{entry.category}</p>
      <h2>{entry.name}</h2>
      <strong className="big">{value} {unit}</strong>
      {entry.limit ? <><div className="progress"><i style={{ width: `${progress}%` }} /></div><p className="muted">Limit: {entry.limit} {unit}</p></> : null}
      <div className="event-actions"><button onClick={() => archive(entry.id)}>{archived ? "Reaktivieren" : "Archivieren"}</button><button className="danger-button" onClick={() => remove(entry.id)}>Löschen</button></div>
    </Card>;
  }

  return <>
    <PageTitle eyebrow="Equipment Intelligence" title="Ausrüstung">
      <button onClick={() => setShowForm((value) => !value)}>+ Ausrüstung</button>
    </PageTitle>

    {showForm && <Card className="wide">
      <form className="editor-form equipment-editor" onSubmit={add}>
        <label>Typ<select name="category" value={item.category} onChange={change}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Name<input name="name" value={item.name} onChange={change} placeholder={item.category === "Schuhe" ? "Brooks Adrenaline GTS 25" : item.category} required /></label>
        <label>Limit {item.category === "Schuhe" ? "(km)" : "(optional)"}<input name="limit" type="number" min="0" value={item.limit} onChange={change} placeholder="Optional" /></label>
        <button className="primary" type="submit">Speichern</button>
        <button type="button" onClick={() => setShowForm(false)}>Abbrechen</button>
      </form>
    </Card>}

    <div className="grid">
      {activeEquipment.length === 0 && <Card className="wide empty-state"><h2>Noch keine Ausrüstung</h2><p>Lege Schuhe, Laufband, Rudergerät oder anderes Equipment an.</p></Card>}
      {activeEquipment.map((entry) => renderItem(entry))}
      {archivedEquipment.length > 0 && <Card className="wide">
        <div className="archive-heading"><div><p className="eyebrow">Archiv</p><h2>Archivierte Ausrüstung</h2></div><button onClick={() => setShowArchived((value) => !value)}>{showArchived ? "Ausblenden" : `Anzeigen (${archivedEquipment.length})`}</button></div>
        {showArchived && <div className="archive-grid">{archivedEquipment.map((entry) => renderItem(entry, true))}</div>}
      </Card>}
    </div>
  </>;
}
