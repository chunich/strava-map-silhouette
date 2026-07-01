import type { StravaActivity } from "@/lib/api-types";
import {
  formatDistanceMiles,
  formatMovingTime,
  formatPace,
  formatStartDate,
  isRunningActivity,
} from "@/lib/activity-format";

type StravaActivityListProps = {
  activities: StravaActivity[];
  showRunningOnly: boolean;
  onToggleRunningOnly: (checked: boolean) => void;
  isLoading?: boolean;
  error?: string | null;
};

export default function StravaActivityList({
  activities,
  showRunningOnly,
  onToggleRunningOnly,
  isLoading = false,
  error = null,
}: StravaActivityListProps) {
  if (isLoading) {
    return <p className="empty-state loading-pulse">Loading activities...</p>;
  }

  if (error) {
    return <p className="empty-state section-error">{error}</p>;
  }

  if (activities.length === 0) {
    return (
      <p className="empty-state">
        No Strava activities loaded. Press <strong>Load Strava</strong> to
        fetch.
      </p>
    );
  }

  const visibleActivities = showRunningOnly
    ? activities.filter((activity) => isRunningActivity(activity))
    : activities;

  return (
    <section className="activity-section">
      <div className="activity-summary">
        <span>
          Showing {visibleActivities.length}
          {showRunningOnly && visibleActivities.length !== activities.length
            ? ` of ${activities.length}`
            : ""}{" "}
          activities
        </span>
        <label className="inline-control">
          <input
            type="checkbox"
            checked={showRunningOnly}
            onChange={(event) => onToggleRunningOnly(event.target.checked)}
          />
          Running only
        </label>
      </div>

      <div className="activity-grid">
        {visibleActivities.map((activity) => {
          const key = String(
            activity.id || `${activity.name}-${activity.start_date}`,
          );
          return (
            <article
              key={key}
              className={`activity-card ${isRunningActivity(activity) ? "activity-run" : ""}`}
            >
              <div className="activity-title">
                <strong>{activity.name || "Untitled Activity"}</strong>
                <span>{String(activity.type || "Unknown")}</span>
              </div>
              <p>
                Date:{" "}
                {formatStartDate(activity.start_date as string | undefined)}
              </p>
              <p>
                Distance:{" "}
                {formatDistanceMiles(activity.distance as number | undefined)}
              </p>
              <p>
                Moving Time:{" "}
                {formatMovingTime(activity.moving_time as number | undefined)}
              </p>
              <p>
                Pace:{" "}
                {formatPace(
                  activity.distance as number | undefined,
                  activity.moving_time as number | undefined,
                )}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}
