import { useApp } from "../context/AppContext";
import { Card, Metric, PageTitle } from "../components/UI";
import { coachInsight, recovery, hydration } from "../services/insights";
import { daysUntil, pace, hours } from "../utils/format";
import WeatherCard from "../components/WeatherCard";
import { activityTimestamp, isRunningActivity, preferredActivities } from "../services/activityUtils";

function startOfCurrentWeek() {
  const date = new Date();
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  return date;
}

export default function Briefing() {
  const { state } = useApp();
  const activities = preferredActivities(state.activities)
    .sort((a, b) => activityTimestamp(b) - activityTimestamp(a));
  const runningActivities = activities.filter(isRunningActivity);
  const latestActivity = runningActivities[0];
  const latestReview = latestActivity && state.reviews[latestActivity.id];
  const recoveryState = recovery(state.reviews, runningActivities);
  const hydrationState = latestActivity && hydration(latestActivity, latestReview);
  const weekStart = startOfCurrentWeek();
  const weekDistance = runningActivities
    .filter((activity) => activityTimestamp(activity) >= weekStart)
    .reduce((sum, activity) => sum + Number(activity.distance || 0), 0);
  const calculatedTarget = Number(state.planner?.lastTarget || 0);

  const nextEvent = (state.mission.milestones || [])
    .filter((item) => !item.archived && !item.isMainTarget && new Date(`${item.date}T23:59:59`) >= new Date())
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  return (
    <>
      <PageTitle eyebrow="Morning Briefing" title="Guten Morgen, Daniel."><span className="tagline">Eat your miles.</span></PageTitle>
      <div className="grid">
        <Card className="hero">
          <p className="eyebrow">Mission</p>
          <h2>{state.mission.name}</h2>
          <div className="hero-stats">
            <Metric label="Verbleibend" value={`${daysUntil(state.mission.date)} Tage`} />
            <Metric label="Diese Woche" value={`${weekDistance.toFixed(1)} km`} />
            <Metric label="Berechneter Rahmen" value={calculatedTarget ? `${calculatedTarget} km` : "Noch offen"} sub={state.planner?.lastPhase || "Wochenplan erstellen"} />
          </div>
          {calculatedTarget > 0 && <div className="progress"><i style={{ width: `${Math.min(100, weekDistance / calculatedTarget * 100)}%` }} /></div>}
          {nextEvent && <div className="milestone-strip"><div><span>Nächstes Rennen</span><strong>{nextEvent.name}</strong><small>{nextEvent.location || "Ort noch offen"}</small></div><div className="milestone-count"><b>{daysUntil(nextEvent.date)}</b><span>Tage</span></div></div>}
        </Card>
        <WeatherCard />
        <Card><p className="eyebrow">Recovery</p><h2 className={`status ${recoveryState.tone}`}>{recoveryState.label}</h2><p className="muted">Aus deinen Reviews des aktuellen Zeitraums abgeleitet.</p></Card>
        <Card className="wide"><p className="eyebrow">Letzter Lauf</p>{latestActivity ? <><h2>{latestActivity.name}</h2><p className="runline">{latestActivity.distance} km · {hours(latestActivity.duration)} · {pace(latestActivity.distance, latestActivity.duration)} · {latestActivity.elevation} hm</p><p>{hydrationState ? `Getrunken ${latestReview.drinkMl} ml. Geschätztes Defizit: ${hydrationState.deficit} ml.` : "Review offen – Trinkmenge und Körpergefühl ergänzen."}</p></> : <p>Importiere Garmin, um deine echten Läufe zu sehen.</p>}</Card>
        <Card className="wide insight"><p className="eyebrow">Today's Briefing</p><h2>{coachInsight(runningActivities, state.reviews)}</h2></Card>
        <Card><p className="eyebrow">Wochenplan</p>{state.plan.length ? state.plan.filter((item) => !item.archived).slice(0, 8).map((item) => <div className="list-row" key={item.id}><b>{item.day}</b><span>{item.title}{item.distance ? ` · ${item.distance} km` : ""}{item.optional ? " · optional" : ""}</span></div>) : <p className="muted">Noch kein Wochenplan erstellt.</p>}</Card>
        <Card><p className="eyebrow">Today's Lesson</p><blockquote>{hydrationState ? `Für ähnliche Bedingungen sind ungefähr ${hydrationState.recommendedLow}–${hydrationState.recommendedHigh} ml pro Stunde ein sinnvoller Startpunkt.` : "Je genauer du Trinkmenge und Gefühl protokollierst, desto persönlicher werden deine Empfehlungen."}</blockquote></Card>
      </div>
    </>
  );
}
