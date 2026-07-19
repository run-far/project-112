import { reviewKind } from "./activityUtils";

export function hydration(activity, review) {
  if (!review || reviewKind(activity) !== "endurance") return null;
  const hours = Number(activity.duration || 0) / 60;
  if (!hours) return null;
  const drunk = Number(review.drinkMl || 0);
  let loss;
  if (review.weightBefore && review.weightAfter) {
    loss = (Number(review.weightBefore) - Number(review.weightAfter)) * 1000 + drunk - Number(review.urineMl || 0);
  } else {
    const temp = activity.temperature || 18;
    const effort = Number(review.rpe || 5);
    loss = hours * (420 + Math.max(0, temp - 15) * 22 + effort * 28);
  }
  const rate = Math.max(0, loss / hours);
  const deficit = loss - drunk;
  return {
    loss: Math.round(loss),
    rate: Math.round(rate),
    deficit: Math.round(deficit),
    recommendedLow: Math.round(rate * 0.75 / 50) * 50,
    recommendedHigh: Math.round(rate * 0.9 / 50) * 50,
  };
}

function highZoneShare(activity) {
  const zones = activity?.heartRateZones?.zones || [];
  return zones
    .filter((zone) => Number(zone.zone) >= 4)
    .reduce((sum, zone) => sum + Number(zone.percentage || 0), 0);
}

export function coachInsight(activities, reviews) {
  const recent = activities.slice(0, 8);
  const reviewed = recent.map((activity) => ({ activity, review: reviews[activity.id] })).filter((item) => item.review);
  if (!recent.length) return "Verbinde Intervals.icu oder importiere Garmin-Daten, damit Endurance Intelligence lernen kann.";

  const strengthLoad = reviewed.filter(({ review }) => review.reviewType === "strength" && (
    Number(review.upperBodySoreness || 0) >= 6
    || Number(review.backSoreness || 0) >= 5
    || review.impactOnRunning === "deutlich"
  )).length;
  if (strengthLoad >= 1) return "Oberkörper oder Rücken sind nach Rudern/Stabi noch belastet. Die nächste Kraft- oder Rudereinheit sollte kürzer und ohne schweres Doppeltraining sein.";

  const lowHydration = reviewed.filter(({ activity, review }) => {
    if (review.reviewType === "strength" || Number(activity.duration || 0) <= 90) return false;
    return Number(review.drinkMl || 0) / Math.max(0.5, Number(activity.duration || 0) / 60) < 500;
  }).length;
  if (lowHydration >= 2) return "Du lagst bei mehreren längeren Ausdauereinheiten unter 500 ml pro Stunde. Plane beim nächsten Longrun eine zusätzliche Softflask ein.";

  const tired = reviewed.filter(({ review }) => review.reviewType !== "strength" && (
    Number(review.legs || 5) <= 4 || Number(review.energy || 5) <= 4
  )).length;
  if (tired >= 2) return "Beine oder Energie waren zuletzt mehrfach niedrig. Die nächste Woche sollte etwas ruhiger starten und keine zusätzliche harte Einheit enthalten.";

  const unexpectedlyHighHr = reviewed.filter(({ activity, review }) => {
    const text = `${activity.name || ""} ${activity.type || ""}`.toLowerCase();
    const intendedEasy = /locker|easy|recovery|longrun|long run|orc run/.test(text) && !/intervall|schwelle|tempo|race|wettkampf/.test(text);
    return intendedEasy && highZoneShare(activity) >= 25 && Number(review.rpe || 5) >= 6;
  }).length;
  if (unexpectedlyHighHr >= 1) return "Mindestens ein eigentlich lockerer Lauf war bei Herzfrequenz und Anstrengung auffällig hoch. Der Coach reduziert zunächst Qualität und prüft die nächsten lockeren Einheiten.";

  return "Deine letzten bewerteten Einheiten wirken stabil. Der Plan kann kontrolliert weiter aufgebaut werden, ohne den Umfang sprunghaft zu erhöhen.";
}

export function recovery(reviews, activities) {
  const values = activities.slice(0, 5).map((activity) => reviews[activity.id]).filter(Boolean);
  if (!values.length) return { label: "Unbekannt", tone: "neutral" };
  const score = values.reduce((sum, review) => {
    if (review.reviewType === "strength") {
      return sum + Number(review.energy || 5) + Number(review.mobility || 5)
        - Number(review.rpe || 5)
        - Number(review.upperBodySoreness || 0) * 0.5
        - Number(review.backSoreness || 0) * 0.5;
    }
    return sum + Number(review.legs || 5) + Number(review.energy || 5) - Number(review.rpe || 5);
  }, 0) / values.length;
  return score >= 8 ? { label: "Ready", tone: "good" } : score >= 4 ? { label: "Caution", tone: "warn" } : { label: "Recover", tone: "bad" };
}
