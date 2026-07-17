import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";

const categories = ["Schuhe", "Laufband", "Rudergerät", "Weste", "Stirnlampe", "Sonstiges"];

export default function Equipment() {
  const { state, setState } = useApp();
  const [category, setCategory] = useState("Schuhe");

  function add() {
    const name = window.prompt(`${category}-Name?`);
    if (!name?.trim()) return;

    const usesKilometers = ["Schuhe", "Laufband"].includes(category);
    setState((current) => ({
      ...current,
      equipment: [
        ...current.equipment,
        {
          id: crypto.randomUUID(),
          name: name.trim(),
          category,
          km: usesKilometers ? 0 : null,
          uses: usesKilometers ? null : 0,
          limit: category === "Schuhe" ? 800 : null,
          archived: false,
        },
      ],
    }));
  }

  function archive(id) {
    setState((current) => ({
      ...current,
      equipment: current.equipment.map((item) =>
        item.id === id ? { ...item, archived: true } : item,
      ),
    }));
  }

  const activeEquipment = state.equipment.filter((item) => !item.archived);

  return (
    <>
      <PageTitle eyebrow="Equipment Intelligence" title="Ausrüstung">
        <div className="page-actions">
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item}>{item}</option>)}
          </select>
          <button onClick={add}>+ Hinzufügen</button>
        </div>
      </PageTitle>

      {activeEquipment.length === 0 ? (
        <Card>
          <h2>Noch keine Ausrüstung</h2>
          <p className="muted">Lege deine echten Schuhe, dein Laufband oder dein Rudergerät an.</p>
        </Card>
      ) : (
        <div className="grid">
          {activeEquipment.map((item) => {
            const value = item.km ?? item.uses ?? 0;
            const unit = item.km != null ? "km" : "Einsätze";
            const progress = item.limit ? Math.min(100, (value / item.limit) * 100) : 0;

            return (
              <Card key={item.id}>
                <p className="eyebrow">{item.category}</p>
                <h2>{item.name}</h2>
                <strong className="big">{value} {unit}</strong>
                {item.limit ? <div className="progress"><i style={{ width: `${progress}%` }} /></div> : null}
                <button onClick={() => archive(item.id)}>Archivieren</button>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
