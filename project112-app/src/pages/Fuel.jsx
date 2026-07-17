import { useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";

const categories = ["Gel", "Drink Mix", "Elektrolyte", "Riegel", "Recovery", "Kapseln", "Sonstiges"];
const emptyProduct = { brand: "", name: "", category: "Gel", carbs: "", caffeine: "", quantity: "1" };

export default function Fuel() {
  const { state, setState } = useApp();
  const [product, setProduct] = useState(emptyProduct);
  const [showForm, setShowForm] = useState(false);

  function change(event) {
    const { name, value } = event.target;
    setProduct((current) => ({ ...current, [name]: value }));
  }

  function add(event) {
    event.preventDefault();
    if (!product.name.trim()) return;
    setState((current) => ({
      ...current,
      fuel: [
        ...current.fuel,
        {
          id: crypto.randomUUID(),
          brand: product.brand.trim(),
          name: product.name.trim(),
          category: product.category,
          carbs: Number(product.carbs) || 0,
          caffeine: Number(product.caffeine) || 0,
          quantity: Number(product.quantity) || 0,
          archived: false,
          rating: 0,
          tolerance: 0,
        },
      ],
    }));
    setProduct(emptyProduct);
    setShowForm(false);
  }

  function qty(id, delta) {
    setState((current) => ({
      ...current,
      fuel: current.fuel.map((item) => item.id === id ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item),
    }));
  }

  function archive(id) {
    setState((current) => ({
      ...current,
      fuel: current.fuel.map((item) => item.id === id ? { ...item, archived: !item.archived } : item),
    }));
  }

  const active = state.fuel.filter((item) => !item.archived);
  const archived = state.fuel.filter((item) => item.archived);

  return <>
    <PageTitle eyebrow="Fuel Intelligence" title="Fuel Lab">
      <button onClick={() => setShowForm((value) => !value)}>+ Produkt</button>
    </PageTitle>

    {showForm && <Card className="wide">
      <form className="editor-form" onSubmit={add}>
        <label>Marke<input name="brand" value={product.brand} onChange={change} placeholder="Maurten" /></label>
        <label>Produktname<input name="name" value={product.name} onChange={change} placeholder="Gel 100" required /></label>
        <label>Kategorie<select name="category" value={product.category} onChange={change}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Kohlenhydrate (g)<input name="carbs" type="number" min="0" value={product.carbs} onChange={change} /></label>
        <label>Koffein (mg)<input name="caffeine" type="number" min="0" value={product.caffeine} onChange={change} /></label>
        <label>Bestand<input name="quantity" type="number" min="0" value={product.quantity} onChange={change} /></label>
        <button className="primary" type="submit">Produkt speichern</button>
      </form>
    </Card>}

    <div className="grid">
      {active.length === 0 && <Card className="wide empty-state"><h2>Noch keine Produkte</h2><p>Lege Gel, Drink Mix, Elektrolyte, Riegel oder andere Produkte an.</p></Card>}
      {active.map((item) => <Card key={item.id}>
        <p className="eyebrow">{item.category}</p><h2>{item.brand ? `${item.brand} ${item.name}` : item.name}</h2>
        <div className="fuel-stats"><b>{item.carbs} g Carbs</b><span>{item.caffeine} mg Koffein</span></div>
        <div className="qty"><button onClick={() => qty(item.id, -1)}>−</button><strong>{item.quantity}</strong><button onClick={() => qty(item.id, 1)}>+</button></div>
        <button onClick={() => archive(item.id)}>Archivieren</button>
      </Card>)}
      {archived.length > 0 && <Card className="wide"><p className="eyebrow">Archiv</p>{archived.map((item) => <div className="list-row" key={item.id}><span>{item.brand ? `${item.brand} ${item.name}` : item.name} · {item.category}</span><button onClick={() => archive(item.id)}>Reaktivieren</button></div>)}</Card>}
    </div>
  </>;
}
