import dashboard from "../data/dashboard";

function daysUntil(dateString) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const eventDate = new Date(`${dateString}T00:00:00`);
  eventDate.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
  );
}

export function getDashboard() {
  const events = dashboard.events.map((event) => ({
    ...event,
    daysLeft: daysUntil(event.date),
  }));

  const primaryEvent = events.find((event) => event.type === "primary");
  const nextMilestone = events
    .filter((event) => event.type === "milestone" && event.daysLeft > 0)
    .sort((a, b) => a.daysLeft - b.daysLeft)[0];

  return {
    ...dashboard,
    events,
    mission: {
      ...primaryEvent,
      nextMilestone,
    },
  };
}