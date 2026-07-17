function MissionCard({ mission }) {
  return (
    <article className="card">
      <p className="label">{mission.title}</p>

      <strong className="big-number">
        {mission.daysLeft}
      </strong>

      <p className="muted">Tage bis zum Start</p>
    </article>
  );
}

export default MissionCard;