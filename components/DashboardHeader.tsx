type DashboardHeaderProps = {
  healthStatus: "checking" | "ok" | "error";
};

export default function DashboardHeader({
  healthStatus,
}: DashboardHeaderProps) {
  const text =
    healthStatus === "ok"
      ? "API: OK"
      : healthStatus === "error"
        ? "API: Error"
        : "API: Checking...";

  return (
    <header className="dashboard-header">
      <h1>GPX/TCX to Map Silhouette API</h1>
      <div className={`health-label health-${healthStatus}`}>{text}</div>
    </header>
  );
}
