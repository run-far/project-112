import { useApp } from "../context/AppContext";
import { Card, Metric, PageTitle } from "../components/UI";
import { coachInsight, recovery, hydration } from "../services/insights";
import { daysUntil, pace, hours } from "../utils/format";
import WeatherCard from "../components/WeatherCard";

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

export default function Briefing() {
  const { state } = useApp();
  const activities = [...state.activities].sort((a, b) => new Date(b.startDateLocal || b.date) - new Date(a.startDateLocal || a.date));
  const latestActivity = activities[0];
  const latestReview = latestActivity && state.reviews[latestActivity.id];
  const recoveryState = recovery(state.reviews, activities);
  const hydrationState = latestActivity && hydration(latestActivity, latestReview);
  const weekStart = startOfCurrentWeek();
  const weekDistance = activities
    .filter((activity) => new Date(activity.startDateLocal || `${activity.date}T12:00:00`) >= weekStart)
    .reduce((sum, activity) => sum + Number(activity.distance || 0), 0);

  return (
    <>
      <PageTitle eyebrow="Morning Briefing" title="Guten Morgen, Daniel."><span className="tagline">Every run teaches you something.</span></PageTitle>
      <div className="grid">
        <Card className="hero"><p className="eyebrow">Mission</p><h2>{state.mission.name}</h2><div className="hero-stats"><Metric label="Verbleibend" value={`${daysUntil(state.mission.date)} Tage`} /><Metric label="Diese Woche" value={`${weekDistance.toFixed(1)} / ${state.mission.weeklyTarget} km`} /></div><div className="progress"><i style={{ width: `${Math.min(100, weekDistance / state.mission.weeklyTarget * 100)}%` }} /></div></Card>
        <WeatherCard />
        <Card><p className="eyebrow">Recovery</p><h2 className={`status ${recoveryState.tone}`}>{recoveryState.label}</h2><p className="muted">Aus deinen letzten Reviews abgeleitet.</p></Card>
        <Card className="wide"><p className="eyebrow">Letzter Lauf</p>{latestActivity ? <><h2>{latestActivity.name}</h2><p className="runline">{latestActivity.distance} km · {hours(latestActivity.duration)} · {pace(latestActivity.distance, latestActivity.duration)} · {latestActivity.elevation} hm</p><p>{hydrationState ? `Getrunken ${latestReview.drinkMl} ml. Geschätztes Defizit: ${hydrationState.deficit} ml.` : "Review offen – Trinkmenge und Körpergefühl ergänzen."}</p></> : <p>Synchronisiere Strava, um deine echten Läufe zu sehen.</p>}</Card>
        <Card className="wide insight"><p className="eyebrow">Today's Briefing</p><h2>{coachInsight(activities, state.reviews)}</h2></Card>
        <Card><p className="eyebrow">Wochenplan</p>{state.plan.length ? state.plan.map((item) => <div className="list-row" key={item.id}><b>{item.day}</b><span>{item.title}{item.distance ? ` · ${item.distance} km` : ""}{item.optional ? " · optional" : ""}</span></div>) : <p className="muted">Noch kein Wochenplan erstellt.</p>}</Card>
        <Card><p className="eyebrow">Today's Lesson</p><blockquote>{hydrationState ? `Für ähnliche Bedingungen sind ungefähr ${hydrationState.recommendedLow}–${hydrationState.recommendedHigh} ml pro Stunde ein sinnvoller Startpunkt.` : "Je genauer du Trinkmenge und Gefühl protokollierst, desto persönlicher werden deine Empfehlungen."}</blockquote></Card>
      </div>
    </>
  );
}
