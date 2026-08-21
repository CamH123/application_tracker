import type { GmailMessage } from "../sync/types.js";

export interface RecruitingSignals {
  classification: "recruiting" | "non_recruiting" | "ambiguous";
  externalApplicationId: string | null;
  atsSignal: string | null;
  rationale: string;
}

const recruitingTerms =
  /\b(application received|thank you for applying|interview|assessment|offer|recruiter|candidacy|unfortunately)\b/i;
const nonRecruitingTerms =
  /\b(job alert|jobs you may like|weekly jobs|career newsletter|recommended jobs)\b/i;
const atsNames = [
  "greenhouse",
  "lever",
  "workday",
  "icims",
  "ashby",
  "smartrecruiters",
];

export const detectRecruitingSignals = (
  message: GmailMessage,
): RecruitingSignals => {
  const content = `${message.from}\n${message.subject}\n${message.text}`;
  const atsSignal =
    atsNames.find((ats) => content.toLocaleLowerCase("en-US").includes(ats)) ??
    null;
  const externalApplicationId =
    content.match(
      /\b(?:application|candidate|requisition|job)\s*(?:id|number|#|ref(?:erence)?)?\s*[:#-]\s*([a-z0-9][a-z0-9-]{3,})\b/i,
    )?.[1] ?? null;
  if (recruitingTerms.test(content) || atsSignal || externalApplicationId) {
    return {
      classification: "recruiting",
      externalApplicationId,
      atsSignal,
      rationale: [
        recruitingTerms.test(content) ? "recruiting milestone language" : null,
        atsSignal ? `${atsSignal} ATS signal` : null,
        externalApplicationId ? "external Application ID" : null,
      ]
        .filter(Boolean)
        .join(", "),
    };
  }
  if (nonRecruitingTerms.test(content)) {
    return {
      classification: "non_recruiting",
      externalApplicationId: null,
      atsSignal: null,
      rationale: "generic job marketing or alert",
    };
  }
  return {
    classification: "ambiguous",
    externalApplicationId: null,
    atsSignal: null,
    rationale: "no deterministic recruiting signal",
  };
};
