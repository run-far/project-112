const DATA_PATH = "data";

async function fetchJson(fileName) {
  const response = await fetch(`${DATA_PATH}/${fileName}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `Die Datei ${fileName} konnte nicht geladen werden: ${response.status}`
    );
  }

  return response.json();
}

export async function loadProjectData() {
  const [
    athlete,
    week,
    missions,
    fuel,
    performance,
    statistics,
    equipment,
  ] = await Promise.all([
    fetchJson("athlete.json"),
    fetchJson("week.json"),
    fetchJson("missions.json"),
    fetchJson("fuel.json"),
    fetchJson("performance.json"),
    fetchJson("statistics.json"),
    fetchJson("equipment.json"),
  ]);

  return {
    athlete,
    week,
    missions,
    fuel,
    performance,
    statistics,
    equipment,
  };
}