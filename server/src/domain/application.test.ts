import { describe, expect, it } from "vitest";

import {
  normalizeCompanyName,
  normalizeRoleTitle,
  projectApplicationState,
  requiresReopenAcknowledgement,
  type ApplicationEvent,
} from "./application.js";

const event = (
  id: string,
  eventType: ApplicationEvent["eventType"],
  occurredOn: string,
  recordedAt: string,
): ApplicationEvent => ({ id, eventType, occurredOn, recordedAt });

describe("Application projections", () => {
  it("starts as Applied and active from the Submitted Application Event", () => {
    expect(
      projectApplicationState([
        event("1", "submitted", "2027-01-10", "2027-01-10T10:00:00Z"),
      ]),
    ).toEqual({ currentStatus: "Applied", completion: "active" });
  });

  it("uses occurrence date, recorded-at, and ID to resolve same-day events", () => {
    expect(
      projectApplicationState([
        event("b", "interview_scheduled", "2027-02-02", "2027-02-01T09:00:00Z"),
        event("a", "interview_completed", "2027-02-02", "2027-02-01T10:00:00Z"),
      ]),
    ).toEqual({ currentStatus: "Awaiting response", completion: "active" });
  });

  it("keeps an interview stage after an earlier completed assessment", () => {
    expect(
      projectApplicationState([
        event(
          "1",
          "assessment_completed",
          "2027-02-01",
          "2027-02-01T10:00:00Z",
        ),
        event("2", "interview_scheduled", "2027-02-03", "2027-02-02T10:00:00Z"),
      ]).currentStatus,
    ).toBe("Interviewing");
  });

  it("allows a later terminal correction to override an earlier terminal event", () => {
    expect(
      projectApplicationState([
        event("1", "rejected", "2027-02-04", "2027-02-04T10:00:00Z"),
        event("2", "offer_accepted", "2027-02-05", "2027-02-05T10:00:00Z"),
      ]),
    ).toEqual({ currentStatus: "Offer accepted", completion: "completed" });
  });

  it("recalculates from the remaining sequence when the latest event is deleted", () => {
    const events = [
      event("1", "interview_scheduled", "2027-02-02", "2027-02-01T09:00:00Z"),
      event("2", "rejected", "2027-02-03", "2027-02-03T09:00:00Z"),
    ];
    expect(projectApplicationState(events.slice(0, 1)).currentStatus).toBe(
      "Interviewing",
    );
  });

  it("requires explicit acknowledgement for a non-terminal event after completion", () => {
    expect(
      requiresReopenAcknowledgement(
        [event("1", "rejected", "2027-02-03", "2027-02-03T09:00:00Z")],
        "interview_scheduled",
      ),
    ).toBe(true);
    expect(
      requiresReopenAcknowledgement(
        [event("1", "rejected", "2027-02-03", "2027-02-03T09:00:00Z")],
        "withdrawn",
      ),
    ).toBe(false);
  });
});

describe("duplicate normalization", () => {
  it("normalizes case and whitespace without removing meaningful punctuation", () => {
    expect(normalizeCompanyName("  ACME   Labs  ")).toBe("acme labs");
    expect(normalizeRoleTitle("  Software  Engineer, Intern ")).toBe(
      "software engineer, intern",
    );
  });
});
