function MilestoneCard({ milestone }) {
  if (!milestone) {
    return null;
  }

  return (
    <article className="card">
      <p className="label">Nächstes Zwischenziel</p>

      <h2>{milestone.title}</h2>

      <strong className="big-number">
        {milestone.daysLeft}
      </strong>

      <p className="muted">Tage bis zum Backyard</p>
    </article>
  );
}

export default MilestoneCard;