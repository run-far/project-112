import { useEffect, useMemo, useState } from "react";
import "./WorkoutReview.css";

const STORAGE_KEY = "project112-workout-reviews";

const emptyReview = {
  date: new Date().toISOString().slice(0, 10),
  title: "",
  type: "Easy Run",
  plannedDistance: "",
  actualDistance: "",
  duration: "",
  effort: "5",
  legs: "7",
  energy: "7",
  stomach: "8",
  reason: "",
  learning: "",
};

function loadReviews() {
  const savedReviews = localStorage.getItem(STORAGE_KEY);

  if (!savedReviews) {
    return [];
  }

  try {
    return JSON.parse(savedReviews);
  } catch {
    return [];
  }
}

function WorkoutReview() {
  const [reviews, setReviews] = useState(loadReviews);
  const [review, setReview] = useState(emptyReview);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
  }, [reviews]);

  const totalDistance = useMemo(
    () =>
      reviews.reduce(
        (sum, currentReview) =>
          sum + Number(currentReview.actualDistance || 0),
        0
      ),
    [reviews]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setReview((currentReview) => ({
      ...currentReview,
      [name]: value,
    }));
  }

  function addReview(event) {
    event.preventDefault();

    if (!review.title.trim()) {
      return;
    }

    const newReview = {
      id: crypto.randomUUID(),
      date: review.date,
      title: review.title.trim(),
      type: review.type,
      plannedDistance: Number(review.plannedDistance) || 0,
      actualDistance: Number(review.actualDistance) || 0,
      duration: Number(review.duration) || 0,
      effort: Number(review.effort),
      legs: Number(review.legs),
      energy: Number(review.energy),
      stomach: Number(review.stomach),
      reason: review.reason.trim(),
      learning: review.learning.trim(),
      createdAt: new Date().toISOString(),
    };

    setReviews((currentReviews) => [
      newReview,
      ...currentReviews,
    ]);

    setReview({
      ...emptyReview,
      date: new Date().toISOString().slice(0, 10),
    });
  }

  function deleteReview(reviewId) {
    setReviews((currentReviews) =>
      currentReviews.filter(
        (currentReview) => currentReview.id !== reviewId
      )
    );
  }

  function formatDate(dateString) {
    return new Intl.DateTimeFormat("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(`${dateString}T00:00:00`));
  }

  function getDistanceDifference(currentReview) {
    return (
      currentReview.actualDistance -
      currentReview.plannedDistance
    ).toFixed(1);
  }

  function getReviewStatus(currentReview) {
    if (currentReview.effort >= 9 || currentReview.legs <= 3) {
      return "🔴 Sehr hohe Belastung";
    }

    if (currentReview.effort >= 7 || currentReview.legs <= 5) {
      return "🟡 Belastung beobachten";
    }

    return "🟢 Gut vertragen";
  }

  return (
    <article className="card wide workout-review">
      <div className="workout-review-header">
        <div>
          <p className="label">Coach Review</p>
          <h2>Training auswerten</h2>
        </div>

        <div className="workout-review-summary">
          <strong>{totalDistance.toFixed(1)} km</strong>
          <span>{reviews.length} Reviews</span>
        </div>
      </div>

      <form
        className="workout-review-form"
        onSubmit={addReview}
      >
        <div className="workout-review-field">
          <label htmlFor="review-date">Datum</label>
          <input
            id="review-date"
            name="date"
            type="date"
            value={review.date}
            onChange={handleChange}
            required
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="review-title">Einheit</label>
          <input
            id="review-title"
            name="title"
            type="text"
            value={review.title}
            onChange={handleChange}
            placeholder="Long Run"
            required
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="review-type">Typ</label>
          <select
            id="review-type"
            name="type"
            value={review.type}
            onChange={handleChange}
          >
            <option>Easy Run</option>
            <option>Long Run</option>
            <option>Intervalle</option>
            <option>Backyard Training</option>
            <option>ORC Run</option>
            <option>Fußball</option>
            <option>Stabi</option>
            <option>Rudern</option>
            <option>Radfahren</option>
            <option>Wettkampf</option>
          </select>
        </div>

        <div className="workout-review-field">
          <label htmlFor="plannedDistance">
            Geplant in km
          </label>
          <input
            id="plannedDistance"
            name="plannedDistance"
            type="number"
            min="0"
            step="0.1"
            value={review.plannedDistance}
            onChange={handleChange}
            placeholder="20"
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="actualDistance">
            Tatsächlich in km
          </label>
          <input
            id="actualDistance"
            name="actualDistance"
            type="number"
            min="0"
            step="0.1"
            value={review.actualDistance}
            onChange={handleChange}
            placeholder="22.5"
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="duration">
            Dauer in Minuten
          </label>
          <input
            id="duration"
            name="duration"
            type="number"
            min="0"
            value={review.duration}
            onChange={handleChange}
            placeholder="145"
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="effort">
            Anstrengung: {review.effort}/10
          </label>
          <input
            id="effort"
            name="effort"
            type="range"
            min="1"
            max="10"
            value={review.effort}
            onChange={handleChange}
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="legs">
            Beine: {review.legs}/10
          </label>
          <input
            id="legs"
            name="legs"
            type="range"
            min="1"
            max="10"
            value={review.legs}
            onChange={handleChange}
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="energy">
            Energie: {review.energy}/10
          </label>
          <input
            id="energy"
            name="energy"
            type="range"
            min="1"
            max="10"
            value={review.energy}
            onChange={handleChange}
          />
        </div>

        <div className="workout-review-field">
          <label htmlFor="stomach">
            Magen: {review.stomach}/10
          </label>
          <input
            id="stomach"
            name="stomach"
            type="range"
            min="1"
            max="10"
            value={review.stomach}
            onChange={handleChange}
          />
        </div>

        <div className="workout-review-field workout-review-wide">
          <label htmlFor="reason">
            Grund für Abweichung
          </label>
          <input
            id="reason"
            name="reason"
            type="text"
            value={review.reason}
            onChange={handleChange}
            placeholder="Mehr Reserve als erwartet"
          />
        </div>

        <div className="workout-review-field workout-review-wide">
          <label htmlFor="learning">Learning</label>
          <input
            id="learning"
            name="learning"
            type="text"
            value={review.learning}
            onChange={handleChange}
            placeholder="Früher trinken und erstes Gel nach 45 Minuten"
          />
        </div>

        <button
          className="workout-review-button"
          type="submit"
        >
          Review speichern
        </button>
      </form>

      <div className="workout-review-list">
        {reviews.length === 0 ? (
          <p className="workout-review-empty">
            Noch keine Trainingsreviews gespeichert.
          </p>
        ) : (
          reviews.map((savedReview) => (
            <div
              className="workout-review-entry"
              key={savedReview.id}
            >
              <div className="workout-review-entry-main">
                <span className="workout-review-date">
                  {formatDate(savedReview.date)}
                </span>

                <h3>{savedReview.title}</h3>

                <p>
                  {savedReview.type} · geplant{" "}
                  {savedReview.plannedDistance} km · tatsächlich{" "}
                  {savedReview.actualDistance} km
                </p>

                <p>
                  Differenz:{" "}
                  {getDistanceDifference(savedReview)} km · Dauer:{" "}
                  {savedReview.duration} Minuten
                </p>

                <p>
                  Anstrengung {savedReview.effort}/10 · Beine{" "}
                  {savedReview.legs}/10 · Energie{" "}
                  {savedReview.energy}/10 · Magen{" "}
                  {savedReview.stomach}/10
                </p>

                <strong className="workout-review-status">
                  {getReviewStatus(savedReview)}
                </strong>

                {savedReview.reason && (
                  <p>
                    <strong>Abweichung:</strong>{" "}
                    {savedReview.reason}
                  </p>
                )}

                {savedReview.learning && (
                  <p>
                    <strong>Learning:</strong>{" "}
                    {savedReview.learning}
                  </p>
                )}
              </div>

              <button
                className="workout-review-delete"
                type="button"
                onClick={() =>
                  deleteReview(savedReview.id)
                }
              >
                Löschen
              </button>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default WorkoutReview;