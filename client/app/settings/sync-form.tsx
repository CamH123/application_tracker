import { startSync } from "./settings-api";

export function SyncForm({
  configured,
  onStarted,
}: {
  configured: boolean;
  onStarted: () => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      className="inline-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await startSync({ start: data.get("start"), end: data.get("end") });
        await onStarted();
      }}
    >
      <h3>
        {configured ? "Manual Gmail Sync Window" : "Initial Gmail Sync Window"}
      </h3>
      <label>
        Inclusive start
        <input required type="date" name="start" max={today} />
      </label>
      <label>
        Inclusive end
        <input
          required
          type="date"
          name="end"
          max={today}
          defaultValue={today}
        />
      </label>
      <button>Start background sync</button>
    </form>
  );
}
