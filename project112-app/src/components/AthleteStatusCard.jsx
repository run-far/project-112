function AthleteStatusCard({ athlete }) {
  return (
    <article className="card">
      <p className="label">Athletenstatus</p>

      <strong className="status">
        {athlete.status}
      </strong>

      <p className="muted">
        {athlete.statusText}
      </p>
    </article>
  );
}

export default AthleteStatusCard;