function NextWorkoutCard({ workout }) {
  return (
    <article className="card wide">
      <p className="label">Nächste Einheit</p>

      <h2>{workout.title}</h2>

      <p className="muted">
        {workout.description}
      </p>
    </article>
  );
}

export default NextWorkoutCard;