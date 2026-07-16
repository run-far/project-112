import HeroCard from "./components/HeroCard";
import MissionCard from "./components/MissionCard";
import AthleteStatusCard from "./components/AthleteStatusCard";
import NextWorkoutCard from "./components/NextWorkoutCard";

import dashboard from "./data/dashboard";

function App() {
  return (
    <main className="app-shell">
      <HeroCard mission={dashboard.mission} />

      <section className="dashboard-grid">
        <MissionCard mission={dashboard.mission} />

        <AthleteStatusCard athlete={dashboard.athlete} />

        <NextWorkoutCard workout={dashboard.nextWorkout} />
      </section>
    </main>
  );
}

export default App;