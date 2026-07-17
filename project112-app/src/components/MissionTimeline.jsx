function MissionTimeline({ events }) {
  return (
    <article className="card wide">
      <p className="label">Mission Timeline</p>

      <div className="timeline">
        <p>🏃 Heute</p>

        {events.map((event) => (
          <div key={event.id} className="timeline-item">
            <p>⬇</p>

            <h3>{event.title}</h3>

            <p>{event.date}</p>

            <strong>{event.daysLeft} Tage</strong>
          </div>
        ))}
      </div>
    </article>
  );
}

export default MissionTimeline;