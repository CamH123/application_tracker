import {
  normalizeCompanyName,
  normalizeRoleTitle,
} from "../../tracking/domain.js";
export interface MatchCandidate {
  id: string;
  companyName: string;
  roleTitle: string;
  externalApplicationId: string | null;
  submissionDate: string;
  events?: Array<{ id: string; eventType: string; occurredOn: string }>;
}
export interface MatchSignals {
  externalApplicationId?: string | null;
  companyName?: string | null;
  roleTitle?: string | null;
  occurredOn?: string | null;
  sender?: string | null;
}
export interface RankedMatch {
  applicationId: string;
  confidence: number;
  rationale: string;
}
const tokens = (value: string): Set<string> =>
  new Set(
    normalizeRoleTitle(value)
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
const similarity = (left: string, right: string): number => {
  const a = tokens(left);
  const b = tokens(right);
  return (
    [...a].filter((token) => b.has(token)).length / Math.max(a.size, b.size, 1)
  );
};
export const rankApplicationMatches = (
  candidates: readonly MatchCandidate[],
  signals: MatchSignals,
): RankedMatch[] =>
  candidates
    .map((candidate) => {
      if (
        signals.externalApplicationId &&
        candidate.externalApplicationId === signals.externalApplicationId
      )
        return {
          applicationId: candidate.id,
          confidence: 1,
          rationale: "Matched exact external Application ID",
        };
      let score = 0;
      const reasons: string[] = [];
      const normalizedCompany = normalizeCompanyName(candidate.companyName);
      if (
        signals.companyName &&
        normalizeCompanyName(signals.companyName) === normalizedCompany
      ) {
        score += 40;
        reasons.push("exact Company identity");
      }
      if (
        signals.sender &&
        signals.sender
          .toLocaleLowerCase("en-US")
          .includes(normalizedCompany.replace(/\s/g, ""))
      ) {
        score += 25;
        reasons.push("sender/ATS signal");
      }
      if (signals.roleTitle) {
        const roleScore = Math.round(
          similarity(candidate.roleTitle, signals.roleTitle) * 20,
        );
        if (roleScore) reasons.push("normalized role text");
        score += roleScore;
      }
      if (signals.occurredOn) {
        const distance =
          Math.abs(
            Date.parse(signals.occurredOn) -
              Date.parse(candidate.submissionDate),
          ) / 86_400_000;
        const temporalScore = Math.max(0, 15 - Math.floor(distance / 7));
        if (temporalScore) reasons.push("temporal proximity");
        score += temporalScore;
      }
      return {
        applicationId: candidate.id,
        confidence: Math.min(score / 100, 0.89),
        rationale: reasons.length
          ? `Matched ${reasons.join(", ")}`
          : "No strong matching signal",
      };
    })
    .sort(
      (left, right) =>
        right.confidence - left.confidence ||
        left.applicationId.localeCompare(right.applicationId),
    );
