import HeroCard from "./components/HeroCard";
import MissionCard from "./components/MissionCard";
import MilestoneCard from "./components/MilestoneCard";
import AthleteStatusCard from "./components/AthleteStatusCard";
import NextWorkoutCard from "./components/NextWorkoutCard";
import MissionTimeline from "./components/MissionTimeline";
import WeekPlan from "./components/WeekPlan";
import WorkoutReview from "./components/WorkoutReview";
import FuelInventory from "./components/FuelInventory";

import { getDashboard } from "./services/dashboardService";

function App() {
  const dashboard = getDashboard();

  return (
    <main className="app-shell">
      <HeroCard mission={dashboard.mission} />

      <section className="dashboard-grid">
        <MissionCard mission={dashboard.mission} />

        <MilestoneCard
          milestone={dashboard.mission.nextMilestone}
        />

        <AthleteStatusCard athlete={dashboard.athlete} />

        <NextWorkoutCard workout={dashboard.nextWorkout} />

        <MissionTimeline events={dashboard.events} />

        <WeekPlan />

        <WorkoutReview />

        <FuelInventory />
      </section>
    </main>
  );
}

export default App;