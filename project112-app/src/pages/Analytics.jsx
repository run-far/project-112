import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Card, Metric, PageTitle } from "../components/UI";

const SPORT_GROUPS = [
  { key: "running", label: "Laufen", types: ["Run", "TrailRun", "VirtualRun"] },
  { key: "soccer", label: "Fußball", types: ["Soccer"] },
  { key: "cycling", label: "Radfahren", types: ["Ride", "MountainBikeRide", "VirtualRide"] },
  { key: "swimming", label: "Schwimmen", types: ["Swim"] },
  { key: "rowing", label: "Rudern", types: ["Rowing"] },
  { key: "walking", label: "Wandern & Gehen", types: ["Walk", "Hike"] },
  { key: "strength", label: "Kraft & Workout", types: ["WeightTraining", "Workout"] },
];

function sportBreakdown(activities) {
  const knownTypes = new Set(SPORT_GROUPS.flatMap((group) => group.types));
  const groups = SPORT_GROUPS.map((group) => ({
    ...group,
    count: activities.filter((activity) => group.types.includes(activity.type)).length,
  })).filter((group) => group.count > 0);

  const otherCount = activities.filter((activity) => !knownTypes.has(activity.type)).length;
  if (otherCount > 0) groups.push({ key: "other", label: "Sonstige", count: otherCount });
  return groups;
}

function yearStats(activities, year) {
  const filtered = activities.filter((activity) => Number(activity.date?.slice(0, 4)) === year);
  const longest = filtered.reduce((current, activity) => (
    Number(activity.distance || 0) > Number(current?.distance || 0) ? activity : current
  ), null);

  return {
    count: filtered.length,
    distance: filtered.reduce((sum, activity) => sum + Number(activity.distance || 0), 0),
    duration: filtered.reduce((sum, activity) => sum + Number(activity.duration || 0), 0),
    elevation: filtered.reduce((sum, activity) => sum + Number(activity.elevation || 0), 0),
    longest,
    sports: sportBreakdown(filtered),
  };
}

export default function Analytics() {
  const { state } = useApp();
  const stats2025 = useMemo(() => yearStats(state.activities, 2025), [state.activities]);
  const stats2026 = useMemo(() => yearStats(state.activities, 2026), [state.activities]);

  if (state.activities.length === 0) {
    return <><PageTitle eyebrow="Analytics" title="Zahlen mit Bedeutung" /><Card><h2>Noch keine Daten</h2><p className="muted">Importiere Garmin oder synchronisiere Strava, um deine Statistik ab 2025 aufzubauen.</p></Card></>;
  }

  return (
    <>
      <PageTitle eyebrow="Analytics" title="2025 vs. 2026" />
      <div className="grid">
        {[{ year: 2025, stats: stats2025 }, { year: 2026, stats: stats2026 }].map(({ year, stats }) => (
          <Card className="wide" key={year}>
            <p className="eyebrow">{year}</p>
            <div className="hero-stats">
              <Metric label="Einheiten" value={stats.count} />
              <Metric label="Gesamtdistanz" value={`${stats.distance.toFixed(1)} km`} />
              <Metric label="Zeit" value={`${Math.round(stats.duration / 60)} h`} />
              <Metric label="Höhenmeter" value={`${Math.round(stats.elevation)} hm`} />
              <Metric
                label="Längste Einheit"
                value={`${Number(stats.longest?.distance || 0).toFixed(1)} km`}
                sub={stats.longest?.name || "–"}
              />
            </div>

            <div className="sport-breakdown" aria-label={`Sportarten ${year}`}>
              {stats.sports.map((sport) => (
                <div className="sport-breakdown-item" key={sport.key}>
                  <span>{sport.label}</span>
                  <strong>{sport.count}</strong>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
