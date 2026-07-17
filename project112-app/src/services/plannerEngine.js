const DAY_NAMES = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

export const workoutTypes = [
  "Easy Run",
  "Long Run",
  "Intervalle",
  "Backyard Training",
  "ORC Run",
  "ORC Track",
  "Fußball",
  "Stabi",
  "Rudern",
  "Laufband",
  "Radfahren",
  "Ruhetag",
];

export function startOfWeek(input = new Date(), offsetWeeks = 0) {
  const date = new Date(input);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1 + offsetWeeks * 7);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateForDay(weekStart, index) {
  const date = new Date(weekStart);
  date.setDate(date.getDate() + index);
  return date;
}

function recentRunningKilometers(activities, weekStart) {
  const start = new Date(weekStart);
  start.setDate(start.getDate() - 28);
  return activities.reduce((sum, activity) => {
    const date = new Date(activity.startDateLocal || activity.date);
    const type = String(activity.type || "").toLowerCase();
    const isRun = type.includes("run") || type.includes("lauf") || type === "running";
    return date >= start && date < weekStart && isRun ? sum + Number(activity.distance || 0) : sum;
  }, 0) / 4;
}

function weatherForDate(forecast, date) {
  return forecast?.find((item) => item.date === isoDate(date)) || null;
}

function weatherDecision(weather, config) {
  if (!weather) return null;
  const tooHot = weather.maxTemp >= Number(config.maxOutdoorTemperature || 29);
  const tooWindy = weather.maxGust >= Number(config.maxWindGust || 55);
  const storm = weather.weatherCode >= 95;
  return { tooHot, tooWindy, storm, indoor: tooHot || tooWindy || storm };
}

function item(weekStart, dayIndex, values) {
  const date = dateForDay(weekStart, dayIndex);
  return {
    id: crypto.randomUUID(),
    date: isoDate(date),
    day: DAY_NAMES[date.getDay()],
    duration: 60,
    completed: false,
    source: "planner-engine",
    archived: false,
    ...values,
  };
}

export function generateWeekPlan({ activities = [], mission, config, forecast = [], offsetWeeks = 0 }) {
  const weekStart = startOfWeek(new Date(), offsetWeeks);
  const recentAverage = recentRunningKilometers(activities, weekStart);
  const configuredTarget = Number(config.weeklyTarget || mission?.weeklyTarget || 60);
  const target = Math.max(25, Math.round(recentAverage > 0 ? Math.min(configuredTarget, recentAverage * 1.12) : configuredTarget));
  const longRun = Math.max(14, Math.min(Math.round(target * 0.38), Number(config.maxLongRun || 36)));
  const wednesdayKm = Number(config.orcDistance || 10);
  const saturdayKm = Number(config.orcTrackDistance || 8);
  const footballEquivalent = Number(config.footballEquivalentKm || 7);
  const remaining = Math.max(12, target - longRun - wednesdayKm - footballEquivalent);
  const tuesdayKm = Math.max(6, Math.round(remaining * 0.48));
  const fridayKm = Math.max(5, remaining - tuesdayKm);

  const fridayWeather = weatherDecision(weatherForDate(forecast, dateForDay(weekStart, 4)), config);
  const sundayWeather = weatherDecision(weatherForDate(forecast, dateForDay(weekStart, 6)), config);

  const plan = [
    item(weekStart, 0, {
      time: config.footballTime || "19:00",
      title: "Fußball",
      type: "Fußball",
      distance: 0,
      notes: "Fixe intensive Einheit. Zählt als Belastung, aber nicht als Laufkilometer.",
      optional: false,
      fixed: true,
    }),
    item(weekStart, 1, {
      time: "18:00",
      title: `${tuesdayKm} km locker`,
      type: "Easy Run",
      distance: tuesdayKm,
      notes: "Locker laufen, keine Pace erzwingen.",
      optional: false,
    }),
    item(weekStart, 2, {
      time: config.orcTime || "19:00",
      title: "ORC Run",
      type: "ORC Run",
      distance: wednesdayKm,
      notes: "Fixer Gruppenlauf. Intensität an die Beine nach dem Fußball anpassen.",
      optional: false,
      fixed: true,
    }),
    item(weekStart, 3, {
      time: "18:30",
      title: config.thursdayAlternative === "Rudern" ? "Rudern locker" : "Stabi & Mobilität",
      type: config.thursdayAlternative === "Rudern" ? "Rudern" : "Stabi",
      distance: 0,
      duration: config.thursdayAlternative === "Rudern" ? 40 : 25,
      notes: config.thursdayAlternative === "Rudern" ? "Ruhige Grundlageneinheit ohne Laufbelastung." : "Rumpf, Rücken, Hüfte und Füße.",
      optional: false,
    }),
    item(weekStart, 4, {
      time: "18:00",
      title: fridayWeather?.indoor ? `${fridayKm} km Laufband` : `${fridayKm} km Recovery`,
      type: fridayWeather?.indoor ? "Laufband" : "Easy Run",
      distance: fridayKm,
      notes: fridayWeather?.indoor
        ? `Wetteranpassung: ${fridayWeather.tooHot ? "zu warm" : fridayWeather.tooWindy ? "stürmisch" : "Gewitterrisiko"}. Locker auf dem Laufband.`
        : "Sehr locker. Bei schweren Beinen kürzen oder auslassen.",
      optional: true,
      weatherAdjusted: Boolean(fridayWeather?.indoor),
    }),
    item(weekStart, 5, {
      time: config.orcTrackTime || "09:00",
      title: "ORC Track",
      type: "ORC Track",
      distance: saturdayKm,
      notes: "Optional. Nur mitnehmen, wenn die Beine frisch sind; sonst Ruhetag.",
      optional: true,
      fixed: true,
    }),
    item(weekStart, 6, {
      time: sundayWeather?.tooHot ? "07:00" : "09:00",
      title: `${longRun} km Longrun`,
      type: sundayWeather?.indoor ? "Laufband" : "Long Run",
      distance: longRun,
      notes: sundayWeather?.indoor
        ? `Wetteranpassung: ${sundayWeather.tooHot ? "früh starten oder Laufband" : "bei Sturm/Gewitter auf das Laufband wechseln"}. Fuel und Trinken testen.`
        : "Ruhig und kontrolliert. Fuel und Trinken für den Ultra testen.",
      optional: false,
      weatherAdjusted: Boolean(sundayWeather?.indoor),
    }),
  ];

  return { plan, target, recentAverage: Math.round(recentAverage), weekStart: isoDate(weekStart) };
}

export async function fetchWeeklyForecast(latitude, longitude, weekStart) {
  const start = isoDate(weekStart);
  const endDate = new Date(weekStart);
  endDate.setDate(endDate.getDate() + 6);
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    daily: "weather_code,temperature_2m_max,temperature_2m_min,wind_gusts_10m_max,precipitation_probability_max",
    timezone: "auto",
    start_date: start,
    end_date: isoDate(endDate),
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error("Wochenwetter konnte nicht geladen werden.");
  const data = await response.json();
  return (data.daily?.time || []).map((date, index) => ({
    date,
    weatherCode: data.daily.weather_code[index],
    maxTemp: Math.round(data.daily.temperature_2m_max[index]),
    minTemp: Math.round(data.daily.temperature_2m_min[index]),
    maxGust: Math.round(data.daily.wind_gusts_10m_max[index]),
    rainChance: Math.round(data.daily.precipitation_probability_max[index] || 0),
  }));
}
