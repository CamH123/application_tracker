import { useState } from "react";
import type { ApplicationEvent, EventType } from "../lib/types";
import type { EventInput } from "./dashboard-api";

const eventTypes: EventType[] = [
  "submitted",
  "assessment_scheduled",
  "assessment_completed",
  "recruiter_screen",
  "interview_scheduled",
  "interview_completed",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "rejected",
  "withdrawn",
  "other",
];

const terminalEventTypes: EventType[] = [
  "offer_accepted",
  "offer_declined",
  "rejected",
  "withdrawn",
];

export const eventTypeLabel = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export function EventForm({
  event,
  completed,
  onSave,
}: {
  event?: ApplicationEvent;
  completed: boolean;
  onSave: (body: EventInput) => Promise<void>;
}) {
  const [eventType, setEventType] = useState<EventType>(
    event?.eventType ?? "other",
  );

  return (
    <form
      className="form-grid"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        void onSave({
          eventType,
          occurredOn: String(data.get("occurredOn")),
          scheduledTime:
            eventType === "interview_scheduled"
              ? String(data.get("scheduledTime"))
              : null,
          timeZone:
            eventType === "interview_scheduled"
              ? String(data.get("timeZone"))
              : null,
          roundLabel: String(data.get("roundLabel")) || null,
          notes: String(data.get("notes")) || null,
          acknowledgeReopen: data.get("acknowledgeReopen") === "on",
        });
      }}
    >
      <label>
        Type
        <select
          value={eventType}
          onChange={(event) => setEventType(event.target.value as EventType)}
        >
          {eventTypes.map((type) => (
            <option key={type} value={type}>
              {eventTypeLabel(type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Occurrence date
        <input
          required
          type="date"
          name="occurredOn"
          defaultValue={event?.occurredOn}
        />
      </label>
      {eventType === "interview_scheduled" && (
        <>
          <label>
            Local time
            <input
              required
              type="time"
              name="scheduledTime"
              defaultValue={event?.scheduledTime ?? ""}
            />
          </label>
          <label>
            IANA time zone
            <input
              required
              name="timeZone"
              placeholder="America/Chicago"
              defaultValue={
                event?.timeZone ??
                Intl.DateTimeFormat().resolvedOptions().timeZone
              }
            />
          </label>
        </>
      )}
      {[
        "assessment_scheduled",
        "assessment_completed",
        "interview_scheduled",
        "interview_completed",
      ].includes(eventType) && (
        <label>
          Round label
          <input
            name="roundLabel"
            placeholder="Technical 1"
            defaultValue={event?.roundLabel ?? ""}
          />
        </label>
      )}
      <label className="full">
        Notes
        <textarea name="notes" defaultValue={event?.notes ?? ""} />
      </label>
      {!event && completed && !terminalEventTypes.includes(eventType) && (
        <label className="check full">
          <input type="checkbox" required name="acknowledgeReopen" /> I
          acknowledge this correction or reopening.
        </label>
      )}
      <button>Save Application Event</button>
    </form>
  );
}
