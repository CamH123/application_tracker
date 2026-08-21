import { describe, expect, it } from "vitest";

import { detectRecruitingSignals } from "../../../src/modules/sync/domain/recruiting-signals.js";

describe("deterministic recruiting signals", () => {
  it("recognizes an ATS message and extracts an external Application ID", () => {
    expect(
      detectRecruitingSignals({
        id: "1",
        from: "notifications@greenhouse.io",
        subject: "Application received",
        text: "Application ID: G-12345",
      }),
    ).toMatchObject({
      classification: "recruiting",
      externalApplicationId: "G-12345",
      atsSignal: "greenhouse",
    });
  });

  it("suppresses a generic job alert before model analysis", () => {
    expect(
      detectRecruitingSignals({
        id: "2",
        from: "alerts@example.com",
        subject: "Your weekly jobs",
        text: "Jobs you may like",
      }).classification,
    ).toBe("non_recruiting");
  });
});
