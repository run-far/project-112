import { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import { Card, PageTitle } from "../components/UI";
import { coachInsight, hydration } from "../services/insights";
import {
  activityDate,
  activityTimestamp,
  preferredActivities,
  reviewKind,
  reviewKindLabel,
} from "../services/activityUtils";
import ReviewModal from "../components/ReviewModal";
import { activitiesWithGroups } from "../services/activityGroups";
import { fmtDate } from "../utils/format";

const monthFormatter = new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric" });

export default function Coach() {
  const { state } = useApp();
  const [selected, setSelected] = useState(null);
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const canonicalActivities = useMemo(() => preferredActivities(state.activities), [state.activities]);
  const reviewActivities = useMemo(() => activitiesWithGroups(canonicalActivities, state.activityGroups), [canonicalActivities, state.activityGroups]);
  const monthReviewable = useMemo(() => reviewActivities
    .filter((activity) => reviewKind(activity) && activityDate(activity).startsWith(currentMonth))
    .sort((a, b) => activityTimestamp(b) - activityTimestamp(a)), [reviewActivities, currentMonth]);
  const openReviews = monthReviewable.filter((activity) => !state.reviews[activity.id]);
  const reviewed = monthReviewable.filter((activity) => state.reviews[activity.id]);
  const learned = reviewed
    .map((activity) => ({ activity, hydration: hydration(activity, state.reviews[activity.id]) }))
    .filter((item) => item.hydration);

  return (
    <>
      <PageTitle eyebrow="Coach Engine" title="Was deine Einheiten lehren" />
      <div className="grid">
        <Card className="wide insight"><p className="eyebrow">Aktuelle Empfehlung</p><h2>{coachInsight(canonicalActivities, state.reviews)}</h2></Card>
        <Card><p className="eyebrow">Review-Fokus</p><h2>{openReviews.length} offen</h2><p className="muted">Nur relevante Einheiten aus {monthFormatter.format(now)} werden aktiv eingefordert.</p></Card>
        <Card><p className="eyebrow">Datenqualität im Monat</p><h2>{reviewed.length}/{monthReviewable.length} Reviews</h2><p className="muted">Laufen, Rennrad, Rudern, Stabi und Mobility erhalten passende Review-Typen.</p></Card>
        <Card><p className="eyebrow">Hydration-Muster</p><h2>{learned.length} verwertbare Tests</h2><p className="muted">{learned.length ? `Ø ${Math.round(learned.reduce((sum, item) => sum + item.hydration.rate, 0) / learned.length)} ml Schweißrate pro Stunde.` : "Noch keine vollständigen Trinkdaten in diesem Monat."}</p></Card>

        <Card className="wide">
          <div className="card-heading-row"><div><p className="eyebrow">Offene Reviews</p><h2>{monthFormatter.format(now)}</h2></div><span>{openReviews.length}</span></div>
          {openReviews.length === 0 ? <p className="muted">Alle relevanten Einheiten dieses Monats sind bewertet.</p> : (
            <div className="coach-review-list">
              {openReviews.map((activity) => (
                <button key={activity.id} onClick={() => setSelected(activity)}>
                  <div><strong>{activity.name}</strong><span>{fmtDate(activityDate(activity))} · {reviewKindLabel(activity)}{Number(activity.distance || 0) ? ` · ${Number(activity.distance).toFixed(1)} km` : ""}</span></div>
                  <em>Review öffnen →</em>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
      {selected && <ReviewModal activity={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
