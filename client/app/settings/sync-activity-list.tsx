import type { SyncActivity } from "../lib/types";

export function SyncActivityList({
  activities,
  configured,
}: {
  activities: SyncActivity[];
  configured: boolean;
}) {
  return (
    <>
      <h3>Sync Activity</h3>
      {!configured && (
        <p className="muted">
          No initial sync configured. Choose an inclusive date range above.
        </p>
      )}
      {activities.map((activity) => (
        <article className="sync-row" key={activity.id}>
          <div>
            <strong>
              {activity.requestedStart} → {activity.requestedEnd}
            </strong>
            <small>{activity.state.replaceAll("_", " ")}</small>
            <small>
              Started {new Date(activity.startedAt).toLocaleString()}
            </small>
            <small>
              {activity.finishedAt
                ? `Finished ${new Date(activity.finishedAt).toLocaleString()}`
                : "Not finished"}
            </small>
          </div>
          <div className="progress-block">
            {activity.state === "running" && (
              <progress
                aria-label={`Sync in progress; ${activity.scannedCount} messages scanned`}
              />
            )}
            <span aria-live="polite">
              {activity.scannedCount} scanned · {activity.createdInboxItemCount}{" "}
              new Inbox Items · {activity.skippedProcessedCount} skipped
            </span>
            {activity.failureMessage && (
              <span className="error-text">{activity.failureMessage}</span>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
