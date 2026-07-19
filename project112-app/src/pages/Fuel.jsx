import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import { lookupOpenFoodFactsProduct, scanBarcodeFromImage, stockUnitForCategory } from "../services/productLookup";

const categories = ["Gel", "Drink Mix", "Elektrolyte", "Riegel", "Recovery", "Kapseln", "Sonstiges"];
const stockUnits = ["Stück", "Portionen", "Tabletten", "Beutel"];
const emptyProduct = {
  brand: "",
  name: "",
  category: "Gel",
  carbs: "",
  caffeine: "",
  quantity: "1",
  stockUnit: "Stück",
  barcode: "",
  imageUrl: "",
  packageSize: "",
  source: "",
};

export default function Fuel() {
  const { state, setState } = useApp();
  const [product, setProduct] = useState(emptyProduct);
  const [showForm, setShowForm] = useState(false);
  const [scanStatus, setScanStatus] = useState("idle");
  const [scanMessage, setScanMessage] = useState("");
  const photoInput = useRef(null);

  function change(event) {
    const { name, value } = event.target;
    setProduct((current) => {
      if (name !== "category") return { ...current, [name]: value };
      const currentDefault = stockUnitForCategory(current.category);
      return {
        ...current,
        category: value,
        stockUnit: current.stockUnit === currentDefault ? stockUnitForCategory(value) : current.stockUnit,
      };
    });
  }

  function applyLookup(result) {
    if (!result.found) {
      setProduct((current) => ({ ...current, barcode: result.barcode }));
      setScanStatus("not-found");
      setScanMessage("Barcode erkannt, aber das Produkt ist noch nicht in Open Food Facts. Ergänze die Felder kurz manuell.");
      return;
    }
    setProduct((current) => ({
      ...current,
      ...result.product,
      quantity: current.quantity || "1",
    }));
    setScanStatus("found");
    setScanMessage("Produkt erkannt. Prüfe die automatisch übernommenen Angaben und passe sie bei Bedarf an.");
  }

  async function lookupBarcode(barcode = product.barcode) {
    setScanStatus("loading");
    setScanMessage("Produktdaten werden gesucht …");
    try {
      applyLookup(await lookupOpenFoodFactsProduct(barcode));
    } catch (error) {
      setScanStatus("error");
      setScanMessage(error.message || "Produkt konnte nicht erkannt werden.");
    }
  }

  async function scanPhoto(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setShowForm(true);
    setScanStatus("loading");
    setScanMessage("Barcode wird aus dem Foto gelesen …");
    try {
      const barcode = await scanBarcodeFromImage(file);
      setProduct((current) => ({ ...current, barcode }));
      await lookupBarcode(barcode);
    } catch (error) {
      setScanStatus("error");
      setScanMessage(error.message || "Der Barcode konnte nicht gelesen werden.");
    }
  }

  function add(event) {
    event.preventDefault();
    if (!product.name.trim()) return;
    const quantity = Number(product.quantity) || 0;
    const normalizedBarcode = product.barcode.replace(/\D/g, "");

    setState((current) => {
      const match = normalizedBarcode
        ? current.fuel.find((item) => String(item.barcode || "").replace(/\D/g, "") === normalizedBarcode)
        : null;

      if (match) {
        return {
          ...current,
          fuel: current.fuel.map((item) => item.id === match.id ? {
            ...item,
            brand: product.brand.trim() || item.brand,
            name: product.name.trim() || item.name,
            category: product.category,
            carbs: Number(product.carbs) || 0,
            caffeine: Number(product.caffeine) || 0,
            quantity: Math.max(0, Number(item.quantity || 0) + quantity),
            stockUnit: product.stockUnit || item.stockUnit || "Stück",
            barcode: normalizedBarcode,
            imageUrl: product.imageUrl || item.imageUrl || "",
            packageSize: product.packageSize || item.packageSize || "",
            source: product.source || item.source || "",
            archived: false,
          } : item),
        };
      }

      return {
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
            quantity,
            stockUnit: product.stockUnit || "Stück",
            barcode: normalizedBarcode,
            imageUrl: product.imageUrl || "",
            packageSize: product.packageSize || "",
            source: product.source || "",
            archived: false,
            rating: 0,
            tolerance: 0,
          },
        ],
      };
    });
    setProduct(emptyProduct);
    setScanStatus("idle");
    setScanMessage("");
    setShowForm(false);
  }

  function qty(id, delta) {
    setState((current) => ({
      ...current,
      fuel: current.fuel.map((item) => item.id === id ? { ...item, quantity: Math.max(0, Number(item.quantity || 0) + delta) } : item),
    }));
  }

  function remove(id) {
    if (!window.confirm("Dieses Fuel-Produkt endgültig löschen? Bereits gespeicherte Reviews behalten ihren Text, verlieren aber die Bestandsverknüpfung.")) return;
    setState((current) => ({ ...current, fuel: current.fuel.filter((item) => item.id !== id) }));
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

    {showForm && <Card className="wide fuel-product-editor">
      <div className="fuel-photo-import">
        <div>
          <p className="eyebrow">Foto-Import</p>
          <h2>Barcode fotografieren</h2>
          <p className="muted">Fotografiere den Barcode auf Gel, Riegel oder Drink Mix. Endurance Intelligence sucht Produktname, Marke und Nährwerte automatisch.</p>
        </div>
        <div className="fuel-photo-actions">
          <input ref={photoInput} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={scanPhoto} />
          <button type="button" className="secondary" onClick={() => photoInput.current?.click()}>Foto aufnehmen / auswählen</button>
        </div>
      </div>

      {scanMessage && <div className={`fuel-scan-status ${scanStatus}`}><b>{scanStatus === "found" ? "Erkannt" : scanStatus === "loading" ? "Einen Moment" : "Hinweis"}</b><span>{scanMessage}</span></div>}

      <form className="editor-form fuel-editor-form" onSubmit={add}>
        <label className="fuel-barcode-field">Barcode
          <div className="inline-input-action">
            <input name="barcode" inputMode="numeric" value={product.barcode} onChange={change} placeholder="z. B. 7310865004712" />
            <button type="button" onClick={() => lookupBarcode()} disabled={!product.barcode || scanStatus === "loading"}>Suchen</button>
          </div>
        </label>
        <label>Marke<input name="brand" value={product.brand} onChange={change} placeholder="Maurten" /></label>
        <label>Produktname<input name="name" value={product.name} onChange={change} placeholder="Gel 100" required /></label>
        <label>Kategorie<select name="category" value={product.category} onChange={change}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Kohlenhydrate pro Einheit (g)<input name="carbs" type="number" min="0" step="0.1" value={product.carbs} onChange={change} /></label>
        <label>Koffein pro Einheit (mg)<input name="caffeine" type="number" min="0" step="1" value={product.caffeine} onChange={change} /></label>
        <label>Bestand<input name="quantity" type="number" min="0" step="0.1" value={product.quantity} onChange={change} /></label>
        <label>Bestandseinheit<select name="stockUnit" value={product.stockUnit} onChange={change}>{stockUnits.map((unit) => <option key={unit}>{unit}</option>)}</select></label>
        {product.packageSize && <label>Packungsangabe<input name="packageSize" value={product.packageSize} onChange={change} /></label>}
        <button className="primary" type="submit">{state.fuel.some((item) => item.barcode && item.barcode === product.barcode) ? "Bestand auffüllen" : "Produkt speichern"}</button>
      </form>
    </Card>}

    <div className="grid">
      {active.length === 0 && <Card className="wide empty-state"><h2>Noch keine Produkte</h2><p>Lege Gel, Drink Mix, Elektrolyte, Riegel oder andere Produkte manuell oder per Barcode-Foto an.</p></Card>}
      {active.map((item) => <Card key={item.id} className="fuel-product-card">
        {item.imageUrl && <img className="fuel-product-image" src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
        <div className="fuel-product-copy">
          <p className="eyebrow">{item.category}</p><h2>{item.brand ? `${item.brand} ${item.name}` : item.name}</h2>
          <div className="fuel-stats"><b>{item.carbs} g Carbs</b><span>{item.caffeine} mg Koffein</span></div>
          {item.barcode && <small className="fuel-barcode">Barcode {item.barcode}{item.source ? ` · ${item.source}` : ""}</small>}
          <div className="qty"><button onClick={() => qty(item.id, -1)}>−</button><strong>{item.quantity} <small>{item.stockUnit || "Stück"}</small></strong><button onClick={() => qty(item.id, 1)}>+</button></div>
          {Number(item.quantity || 0) <= 2 && <p className="fuel-low-stock">Bestand wird knapp.</p>}
          <div className="event-actions"><button onClick={() => archive(item.id)}>Archivieren</button><button className="danger-button" onClick={() => remove(item.id)}>Löschen</button></div>
        </div>
      </Card>)}
      {archived.length > 0 && <Card className="wide"><p className="eyebrow">Archiv</p>{archived.map((item) => <div className="list-row" key={item.id}><span>{item.brand ? `${item.brand} ${item.name}` : item.name} · {item.category}</span><div className="event-actions"><button onClick={() => archive(item.id)}>Reaktivieren</button><button className="danger-button" onClick={() => remove(item.id)}>Löschen</button></div></div>)}</Card>}
    </div>
  </>;
}
