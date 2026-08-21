import { describe, expect, it } from "vitest";

import { rankApplicationMatches } from "./matching.js";

describe("Application matching", () => {
  const candidates = [
    {
      id: "google",
      companyName: "Google",
      roleTitle: "SWE Intern",
      externalApplicationId: "G-123",
      submissionDate: "2027-01-10",
    },
    {
      id: "alphabet",
      companyName: "Alphabet",
      roleTitle: "Software Intern",
      externalApplicationId: null,
      submissionDate: "2027-01-12",
    },
  ];

  it("ranks an exact external Application ID above every fuzzy signal", () => {
    const result = rankApplicationMatches(candidates, {
      externalApplicationId: "G-123",
      companyName: "Alphabet",
      roleTitle: "Software Intern",
      occurredOn: "2027-01-12",
      sender: "jobs@alphabet.com",
    });
    expect(result[0]).toMatchObject({ applicationId: "google", confidence: 1 });
    expect(result[0]!.rationale).toContain("exact external Application ID");
  });

  it("exposes low confidence and rationale when Company and role signals are ambiguous", () => {
    const result = rankApplicationMatches(candidates, {
      companyName: "Google",
      roleTitle: "Software Intern",
      occurredOn: "2027-01-11",
      sender: "recruiting@google.com",
    });
    expect(result[0]!.confidence).toBeLessThan(0.9);
    expect(result[0]!.rationale).toContain("Company");
  });
});
