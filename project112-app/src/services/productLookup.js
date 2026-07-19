const OFF_PRODUCT_FIELDS = [
  "code",
  "product_name",
  "generic_name",
  "brands",
  "categories",
  "categories_tags",
  "quantity",
  "serving_quantity",
  "serving_size",
  "nutriments",
  "image_front_small_url",
  "image_front_url",
].join(",");

function asNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function cleanBarcode(value) {
  return String(value || "").replace(/\D/g, "");
}

function inferCategory(product) {
  const text = [
    product.product_name,
    product.generic_name,
    product.categories,
    ...(product.categories_tags || []),
  ].filter(Boolean).join(" ").toLowerCase();

  if (/gel|energy-gel|sport-gel/.test(text)) return "Gel";
  if (/electrolyt|electrolyte|isotonic|hydration|sports-drink/.test(text)) return "Elektrolyte";
  if (/drink mix|drink-mix|powder|pulver|carbohydrate drink/.test(text)) return "Drink Mix";
  if (/bar|riegel|energy-bar/.test(text)) return "Riegel";
  if (/recovery|protein/.test(text)) return "Recovery";
  if (/capsule|kapsel|tablet|tablette|salt/.test(text)) return "Kapseln";
  return "Sonstiges";
}

export function stockUnitForCategory(category) {
  if (category === "Drink Mix" || category === "Elektrolyte" || category === "Recovery") return "Portionen";
  if (category === "Kapseln") return "Tabletten";
  return "Stück";
}

function carbsPerServing(product) {
  const nutrients = product.nutriments || {};
  const direct = asNumber(nutrients.carbohydrates_serving);
  if (direct !== null) return Math.max(0, direct);

  const per100 = asNumber(nutrients.carbohydrates_100g);
  const serving = asNumber(product.serving_quantity);
  if (per100 !== null && serving !== null) return Math.max(0, per100 * serving / 100);
  return per100 === null ? 0 : Math.max(0, per100);
}

function caffeineMgPerServing(product) {
  const nutrients = product.nutriments || {};
  const direct = asNumber(nutrients.caffeine_serving);
  const per100 = asNumber(nutrients.caffeine_100g);
  const serving = asNumber(product.serving_quantity);
  let value = direct;
  if (value === null && per100 !== null && serving !== null) value = per100 * serving / 100;
  if (value === null) return 0;

  // Open Food Facts stores caffeine as grams. A few records use milligrams,
  // therefore values above 5 are treated as already being mg.
  return Math.max(0, value <= 5 ? value * 1000 : value);
}

export async function scanBarcodeFromImage(file) {
  if (!file) throw new Error("Bitte zuerst ein Foto auswählen.");
  const { BrowserMultiFormatReader } = await import("@zxing/browser");
  const reader = new BrowserMultiFormatReader();
  const objectUrl = URL.createObjectURL(file);
  try {
    const result = await reader.decodeFromImageUrl(objectUrl);
    const barcode = cleanBarcode(result.getText());
    if (!barcode) throw new Error("Auf dem Foto wurde kein Produktcode erkannt.");
    return barcode;
  } catch (error) {
    const message = String(error?.message || error || "");
    if (/NotFoundException|No MultiFormat Readers/i.test(message)) {
      throw new Error("Kein Barcode erkannt. Fotografiere den Code gerade, scharf und möglichst formatfüllend.", { cause: error });
    }
    throw error;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function lookupOpenFoodFactsProduct(rawBarcode) {
  const barcode = cleanBarcode(rawBarcode);
  if (!barcode) throw new Error("Bitte einen gültigen Barcode eingeben.");

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${encodeURIComponent(OFF_PRODUCT_FIELDS)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Produktdaten konnten nicht geladen werden (${response.status}).`);
  const payload = await response.json();
  if (payload.status !== 1 || !payload.product) {
    return { found: false, barcode };
  }

  const source = payload.product;
  const category = inferCategory(source);
  return {
    found: true,
    barcode,
    product: {
      barcode,
      brand: String(source.brands || "").split(",")[0].trim(),
      name: String(source.product_name || source.generic_name || "").trim(),
      category,
      carbs: Math.round(carbsPerServing(source) * 10) / 10,
      caffeine: Math.round(caffeineMgPerServing(source)),
      stockUnit: stockUnitForCategory(category),
      imageUrl: source.image_front_small_url || source.image_front_url || "",
      source: "Open Food Facts",
      packageSize: source.quantity || source.serving_size || "",
    },
  };
}
