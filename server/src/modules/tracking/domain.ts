export const EVENT_TYPES = [
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
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const TERMINAL_EVENT_TYPES = [
  "offer_accepted",
  "offer_declined",
  "rejected",
  "withdrawn",
] as const satisfies readonly EventType[];

export type CurrentStatus =
  | "Applied"
  | "Assessment pending"
  | "Awaiting response"
  | "Interviewing"
  | "Offer accepted"
  | "Offer declined"
  | "Rejected"
  | "Withdrawn";

export interface ApplicationEvent {
  id: string;
  eventType: EventType;
  occurredOn: string;
  recordedAt: string;
}

export interface ApplicationState {
  currentStatus: CurrentStatus;
  completion: "active" | "completed";
}

const statuses: Record<EventType, CurrentStatus> = {
  submitted: "Applied",
  assessment_scheduled: "Assessment pending",
  assessment_completed: "Awaiting response",
  recruiter_screen: "Interviewing",
  interview_scheduled: "Interviewing",
  interview_completed: "Awaiting response",
  offer_received: "Awaiting response",
  offer_accepted: "Offer accepted",
  offer_declined: "Offer declined",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  other: "Awaiting response",
};

export const normalizeCompanyName = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US");

export const normalizeRoleTitle = normalizeCompanyName;

export const isTerminalEvent = (eventType: EventType): boolean =>
  TERMINAL_EVENT_TYPES.includes(
    eventType as (typeof TERMINAL_EVENT_TYPES)[number],
  );

export const compareApplicationEvents = (
  left: ApplicationEvent,
  right: ApplicationEvent,
): number =>
  left.occurredOn.localeCompare(right.occurredOn) ||
  left.recordedAt.localeCompare(right.recordedAt) ||
  left.id.localeCompare(right.id);

export const projectApplicationState = (
  events: readonly ApplicationEvent[],
): ApplicationState => {
  const effectiveEvent = [...events].sort(compareApplicationEvents).at(-1);
  const currentStatus = effectiveEvent
    ? statuses[effectiveEvent.eventType]
    : "Applied";
  return {
    currentStatus,
    completion:
      effectiveEvent && isTerminalEvent(effectiveEvent.eventType)
        ? "completed"
        : "active",
  };
};

export const requiresReopenAcknowledgement = (
  events: readonly ApplicationEvent[],
  nextEventType: EventType,
): boolean =>
  projectApplicationState(events).completion === "completed" &&
  !isTerminalEvent(nextEventType);
