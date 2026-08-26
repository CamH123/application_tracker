import { describe, expect, it } from "vitest";

import {
  eventInputSchema,
  manualApplicationInputSchema,
} from "../../src/modules/tracking/schemas.js";
import { proposalSchema } from "../../src/modules/inbox/proposal.js";

describe("Application Event request validation", () => {
  it("rejects impossible calendar dates", () => {
    expect(
      eventInputSchema.safeParse({
        eventType: "rejected",
        occurredOn: "2027-02-31",
      }).success,
    ).toBe(false);
  });

  it("allows round labels only on assessment and interview events", () => {
    expect(
      eventInputSchema.safeParse({
        eventType: "rejected",
        occurredOn: "2027-02-10",
        roundLabel: "Final",
      }).success,
    ).toBe(false);
    expect(
      eventInputSchema.safeParse({
        eventType: "assessment_completed",
        occurredOn: "2027-02-10",
        roundLabel: "Technical 1",
      }).success,
    ).toBe(true);
  });

  it("lets a proposed Application Event target exactly one existing or new Application", () => {
    const event = { eventType: "rejected", occurredOn: "2027-02-10" };
    expect(
      proposalSchema.safeParse({ action: "create_event", event }).success,
    ).toBe(false);
    expect(
      proposalSchema.safeParse({
        action: "create_event",
        event,
        newApplication: {
          companyName: "Google",
          roleTitle: "SWE Intern",
          recruitingCycle: { season: "Summer", year: 2027 },
          submissionDate: "2027-01-12",
        },
      }).success,
    ).toBe(true);
  });
});

describe("Manual Application request validation", () => {
  const input = {
    companyName: "Google",
    recruitingCycle: { season: "Summer", year: 2027 },
    roleTitle: "SWE Intern",
    submissionDate: "2027-01-12",
  };

  it("accepts a valid Recruiting Cycle identity", () => {
    expect(manualApplicationInputSchema.safeParse(input).success).toBe(true);
  });

  it("rejects invalid Recruiting Cycle values", () => {
    expect(
      manualApplicationInputSchema.safeParse({
        ...input,
        recruitingCycle: { season: "Autumn", year: 1999 },
      }).success,
    ).toBe(false);
  });
});
