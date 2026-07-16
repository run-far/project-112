function HeroCard({ mission }) {
  return (
    <header className="hero-card">
      <p className="eyebrow">PROJECT 112</p>
      <h1>Road to Fulda</h1>
      <p className="subtitle">
        Viel arbeiten. Gesund bleiben. {mission.title} erfolgreich absolvieren.
      </p>
    </header>
  );
}

export default HeroCard;