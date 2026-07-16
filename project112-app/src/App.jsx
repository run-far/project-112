import dashboard from "./data/dashboard";

function App() {
  return (
    <main className="app-shell">
      <header className="hero-card">
        <p className="eyebrow">PROJECT 112</p>
        <h1>Road to Fulda</h1>
        <p className="subtitle">
          Viel arbeiten. Gesund bleiben. {dashboard.mission.title} schaffen.
        </p>
      </header>

      <section className="dashboard-grid">
        <article className="card">
          <p className="label">{dashboard.mission.title}</p>
          <strong className="big-number">
            {dashboard.mission.daysLeft}
          </strong>
          <p className="muted">Tage bis zum Start</p>
        </article>

        <article className="card">
          <p className="label">Athletenstatus</p>
          <strong className="status">{dashboard.athlete.status}</strong>
          <p className="muted">{dashboard.athlete.statusText}</p>
        </article>

        <article className="card wide">
          <p className="label">Nächste Einheit</p>
          <h2>{dashboard.nextWorkout.title}</h2>
          <p className="muted">
            {dashboard.nextWorkout.description}
          </p>
        </article>
      </section>
    </main>
  );
}

export default App;