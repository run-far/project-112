import { useMemo } from "react";
import { useApp } from "../context/AppContext";
import { Card, Metric, PageTitle } from "../components/UI";

function yearStats(activities, year) {
  const filtered = activities.filter((activity) => Number(activity.date?.slice(0, 4)) === year);
  return {
    count: filtered.length,
    distance: filtered.reduce((sum, activity) => sum + Number(activity.distance || 0), 0),
    duration: filtered.reduce((sum, activity) => sum + Number(activity.duration || 0), 0),
    elevation: filtered.reduce((sum, activity) => sum + Number(activity.elevation || 0), 0),
    longest: Math.max(0, ...filtered.map((activity) => Number(activity.distance || 0))),
  };
}

export default function Analytics() {
  const { state } = useApp();
  const stats2025 = useMemo(() => yearStats(state.activities, 2025), [state.activities]);
  const stats2026 = useMemo(() => yearStats(state.activities, 2026), [state.activities]);

  if (state.activities.length === 0) {
    return <><PageTitle eyebrow="Analytics" title="Zahlen mit Bedeutung" /><Card><h2>Noch keine Daten</h2><p className="muted">Synchronisiere Strava, um deine Statistik ab 2025 aufzubauen.</p></Card></>;
  }

  return (
    <>
      <PageTitle eyebrow="Analytics" title="2025 vs. 2026" />
      <div className="grid">
        {[{ year: 2025, stats: stats2025 }, { year: 2026, stats: stats2026 }].map(({ year, stats }) => (
          <Card className="wide" key={year}>
            <p className="eyebrow">{year}</p>
            <div className="hero-stats">
              <Metric label="Läufe" value={stats.count} />
              <Metric label="Distanz" value={`${stats.distance.toFixed(1)} km`} />
              <Metric label="Zeit" value={`${Math.round(stats.duration / 60)} h`} />
              <Metric label="Höhenmeter" value={`${Math.round(stats.elevation)} hm`} />
              <Metric label="Längster Lauf" value={`${stats.longest.toFixed(1)} km`} />
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
