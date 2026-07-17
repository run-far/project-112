import { useEffect, useState } from "react";
import "./FuelInventory.css";

const PRODUCT_STORAGE_KEY = "project112-fuel-inventory";
const TEST_STORAGE_KEY = "project112-fuel-tests";

const emptyProduct = {
  brand: "",
  name: "",
  category: "Gel",
  carbohydrates: "",
  caffeine: "",
  quantity: "",
};

const emptyTest = {
  productId: "",
  amount: "1",
  timing: "Während des Laufs",
  stomach: "8",
  energy: "8",
  notes: "",
};

function loadStorage(key) {
  const savedData = localStorage.getItem(key);

  if (!savedData) {
    return [];
  }

  try {
    return JSON.parse(savedData);
  } catch {
    return [];
  }
}

function FuelInventory() {
  const [products, setProducts] = useState(() =>
    loadStorage(PRODUCT_STORAGE_KEY)
  );

  const [tests, setTests] = useState(() =>
    loadStorage(TEST_STORAGE_KEY)
  );

  const [product, setProduct] = useState(emptyProduct);
  const [fuelTest, setFuelTest] = useState(emptyTest);

  useEffect(() => {
    localStorage.setItem(
      PRODUCT_STORAGE_KEY,
      JSON.stringify(products)
    );
  }, [products]);

  useEffect(() => {
    localStorage.setItem(TEST_STORAGE_KEY, JSON.stringify(tests));
  }, [tests]);

  function handleProductChange(event) {
    const { name, value } = event.target;

    setProduct((currentProduct) => ({
      ...currentProduct,
      [name]: value,
    }));
  }

  function handleTestChange(event) {
    const { name, value } = event.target;

    setFuelTest((currentTest) => ({
      ...currentTest,
      [name]: value,
    }));
  }

  function addProduct(event) {
    event.preventDefault();

    if (!product.name.trim()) {
      return;
    }

    const newProduct = {
      id: crypto.randomUUID(),
      brand: product.brand.trim(),
      name: product.name.trim(),
      category: product.category,
      carbohydrates: Number(product.carbohydrates) || 0,
      caffeine: Number(product.caffeine) || 0,
      quantity: Number(product.quantity) || 0,
    };

    setProducts((currentProducts) => [
      ...currentProducts,
      newProduct,
    ]);

    setProduct(emptyProduct);
  }

  function addFuelTest(event) {
    event.preventDefault();

    if (!fuelTest.productId) {
      return;
    }

    const selectedProduct = products.find(
      (currentProduct) =>
        currentProduct.id === fuelTest.productId
    );

    if (!selectedProduct) {
      return;
    }

    const newTest = {
      id: crypto.randomUUID(),
      productId: selectedProduct.id,
      productName: selectedProduct.brand
        ? `${selectedProduct.brand} ${selectedProduct.name}`
        : selectedProduct.name,
      amount: Number(fuelTest.amount) || 1,
      timing: fuelTest.timing,
      stomach: Number(fuelTest.stomach),
      energy: Number(fuelTest.energy),
      notes: fuelTest.notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setTests((currentTests) => [
      newTest,
      ...currentTests,
    ]);

    setFuelTest(emptyTest);
  }

  function deleteProduct(productId) {
    setProducts((currentProducts) =>
      currentProducts.filter(
        (currentProduct) => currentProduct.id !== productId
      )
    );
  }

  function deleteTest(testId) {
    setTests((currentTests) =>
      currentTests.filter(
        (currentTest) => currentTest.id !== testId
      )
    );
  }

  function changeQuantity(productId, amount) {
    setProducts((currentProducts) =>
      currentProducts.map((currentProduct) => {
        if (currentProduct.id !== productId) {
          return currentProduct;
        }

        return {
          ...currentProduct,
          quantity: Math.max(
            0,
            currentProduct.quantity + amount
          ),
        };
      })
    );
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(dateString));
  }

  return (
    <>
      <article className="card wide fuel-inventory">
        <div className="fuel-header">
          <div>
            <p className="label">Fuel Lab</p>
            <h2>Fuel Inventory</h2>
          </div>

          <span className="fuel-count">
            {products.length} Produkte
          </span>
        </div>

        <form className="fuel-form" onSubmit={addProduct}>
          <div className="fuel-field">
            <label htmlFor="brand">Marke</label>
            <input
              id="brand"
              name="brand"
              type="text"
              value={product.brand}
              onChange={handleProductChange}
              placeholder="Maurten"
            />
          </div>

          <div className="fuel-field">
            <label htmlFor="name">Produktname</label>
            <input
              id="name"
              name="name"
              type="text"
              value={product.name}
              onChange={handleProductChange}
              placeholder="Gel 100"
              required
            />
          </div>

          <div className="fuel-field">
            <label htmlFor="category">Kategorie</label>
            <select
              id="category"
              name="category"
              value={product.category}
              onChange={handleProductChange}
            >
              <option>Gel</option>
              <option>Drink Mix</option>
              <option>Riegel</option>
              <option>Elektrolyte</option>
              <option>Recovery</option>
              <option>Sonstiges</option>
            </select>
          </div>

          <div className="fuel-field">
            <label htmlFor="carbohydrates">
              Kohlenhydrate in g
            </label>
            <input
              id="carbohydrates"
              name="carbohydrates"
              type="number"
              min="0"
              value={product.carbohydrates}
              onChange={handleProductChange}
              placeholder="25"
            />
          </div>

          <div className="fuel-field">
            <label htmlFor="caffeine">Koffein in mg</label>
            <input
              id="caffeine"
              name="caffeine"
              type="number"
              min="0"
              value={product.caffeine}
              onChange={handleProductChange}
              placeholder="0"
            />
          </div>

          <div className="fuel-field">
            <label htmlFor="quantity">Bestand</label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min="0"
              value={product.quantity}
              onChange={handleProductChange}
              placeholder="10"
            />
          </div>

          <button className="fuel-add-button" type="submit">
            Produkt hinzufügen
          </button>
        </form>

        <div className="fuel-product-list">
          {products.length === 0 ? (
            <p className="fuel-empty">
              Noch keine Produkte vorhanden.
            </p>
          ) : (
            products.map((fuelProduct) => (
              <div
                className="fuel-product"
                key={fuelProduct.id}
              >
                <div className="fuel-product-info">
                  <span className="fuel-category">
                    {fuelProduct.category}
                  </span>

                  <h3>
                    {fuelProduct.brand
                      ? `${fuelProduct.brand} ${fuelProduct.name}`
                      : fuelProduct.name}
                  </h3>

                  <p>
                    {fuelProduct.carbohydrates} g Kohlenhydrate
                    {" · "}
                    {fuelProduct.caffeine} mg Koffein
                  </p>
                </div>

                <div className="fuel-product-actions">
                  <div className="fuel-quantity">
                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(fuelProduct.id, -1)
                      }
                    >
                      −
                    </button>

                    <strong>{fuelProduct.quantity}</strong>

                    <button
                      type="button"
                      onClick={() =>
                        changeQuantity(fuelProduct.id, 1)
                      }
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="fuel-delete-button"
                    type="button"
                    onClick={() =>
                      deleteProduct(fuelProduct.id)
                    }
                  >
                    Löschen
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </article>

      <article className="card wide fuel-inventory">
        <div className="fuel-header">
          <div>
            <p className="label">Fuel Lab</p>
            <h2>Fuel Test speichern</h2>
          </div>

          <span className="fuel-count">
            {tests.length} Tests
          </span>
        </div>

        {products.length === 0 ? (
          <p className="fuel-empty">
            Lege zuerst mindestens ein Produkt an.
          </p>
        ) : (
          <form className="fuel-form" onSubmit={addFuelTest}>
            <div className="fuel-field">
              <label htmlFor="productId">Produkt</label>
              <select
                id="productId"
                name="productId"
                value={fuelTest.productId}
                onChange={handleTestChange}
                required
              >
                <option value="">Produkt auswählen</option>

                {products.map((fuelProduct) => (
                  <option
                    key={fuelProduct.id}
                    value={fuelProduct.id}
                  >
                    {fuelProduct.brand
                      ? `${fuelProduct.brand} ${fuelProduct.name}`
                      : fuelProduct.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="fuel-field">
              <label htmlFor="amount">Menge</label>
              <input
                id="amount"
                name="amount"
                type="number"
                min="1"
                value={fuelTest.amount}
                onChange={handleTestChange}
              />
            </div>

            <div className="fuel-field">
              <label htmlFor="timing">Zeitpunkt</label>
              <select
                id="timing"
                name="timing"
                value={fuelTest.timing}
                onChange={handleTestChange}
              >
                <option>Vor dem Lauf</option>
                <option>Während des Laufs</option>
                <option>Nach dem Lauf</option>
              </select>
            </div>

            <div className="fuel-field">
              <label htmlFor="stomach">
                Magen: {fuelTest.stomach}/10
              </label>
              <input
                id="stomach"
                name="stomach"
                type="range"
                min="1"
                max="10"
                value={fuelTest.stomach}
                onChange={handleTestChange}
              />
            </div>

            <div className="fuel-field">
              <label htmlFor="energy">
                Energie: {fuelTest.energy}/10
              </label>
              <input
                id="energy"
                name="energy"
                type="range"
                min="1"
                max="10"
                value={fuelTest.energy}
                onChange={handleTestChange}
              />
            </div>

            <div className="fuel-field">
              <label htmlFor="notes">Notiz</label>
              <input
                id="notes"
                name="notes"
                type="text"
                value={fuelTest.notes}
                onChange={handleTestChange}
                placeholder="Ab Stunde 4 noch gut vertragen"
              />
            </div>

            <button className="fuel-add-button" type="submit">
              Fuel Test speichern
            </button>
          </form>
        )}

        <div className="fuel-product-list">
          {tests.length === 0 ? (
            <p className="fuel-empty">
              Noch keine Fuel Tests gespeichert.
            </p>
          ) : (
            tests.map((test) => (
              <div className="fuel-test" key={test.id}>
                <div className="fuel-product-info">
                  <span className="fuel-category">
                    {formatDate(test.createdAt)}
                  </span>

                  <h3>{test.productName}</h3>

                  <p>
                    {test.amount} Stück · {test.timing}
                  </p>

                  <p>
                    Magen {test.stomach}/10 · Energie{" "}
                    {test.energy}/10
                  </p>

                  {test.notes && (
                    <p className="fuel-test-note">
                      {test.notes}
                    </p>
                  )}
                </div>

                <button
                  className="fuel-delete-button"
                  type="button"
                  onClick={() => deleteTest(test.id)}
                >
                  Löschen
                </button>
              </div>
            ))
          )}
        </div>
      </article>
    </>
  );
}

export default FuelInventory;