const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

function formatAddress(item) {
  const address = item.address || {};
  const venue = item.name || address.amenity || address.leisure || address.building;
  const city = address.city || address.town || address.village || address.municipality;
  const region = address.state;
  const country = address.country;
  const parts = [venue, city, region, country].filter(Boolean);
  return parts.length ? [...new Set(parts)].join(", ") : item.display_name;
}

export async function searchPlaces(query, signal) {
  const value = query.trim();
  if (value.length < 3) return [];

  const params = new URLSearchParams({
    q: value,
    format: "jsonv2",
    addressdetails: "1",
    namedetails: "1",
    limit: "6",
    countrycodes: "de",
    "accept-language": "de",
  });

  const response = await fetch(`${NOMINATIM_URL}?${params}`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("Ortsvorschläge konnten nicht geladen werden.");

  const results = await response.json();
  return results.map((item) => ({
    id: `${item.osm_type}-${item.osm_id}`,
    name: item.namedetails?.name || item.name || item.display_name.split(",")[0],
    label: formatAddress(item),
    displayName: item.display_name,
    latitude: Number(item.lat),
    longitude: Number(item.lon),
    type: item.type || item.category || "Ort",
  }));
}
