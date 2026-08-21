import type { Proposal } from "../http/validation.js";

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  text: string;
  candidates?: Array<{
    id: string;
    companyName: string;
    roleTitle: string;
    externalApplicationId: string | null;
    submissionDate: string;
    events: Array<{ id: string; eventType: string; occurredOn: string }>;
  }>;
  deterministicSignals?: {
    externalApplicationId: string | null;
    atsSignal: string | null;
    rationale: string;
  };
}

export interface MessageAnalysis {
  recruiting: boolean;
  proposal?: Proposal;
  confidence: number;
  rationale: string;
}

export interface AnalysisGateway {
  health(): Promise<{ available: boolean; message?: string }>;
  analyze(message: GmailMessage): Promise<MessageAnalysis>;
}
