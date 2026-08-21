import type { Proposal } from "../inbox/proposal.js";

export interface SyncMessage {
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
  analyze(message: SyncMessage): Promise<MessageAnalysis>;
}
export interface GmailGateway {
  listMessageIds(start: string, end: string): Promise<string[]>;
  getMessage(id: string): Promise<SyncMessage>;
  getSourceMessage(id: string): Promise<SyncMessage>;
}
export interface SyncStore {
  createActivity(start: string, end: string): Promise<string>;
  isProcessed(gmailMessageId: string): Promise<boolean>;
  recordProcessed(
    gmailMessageId: string,
    outcome: "recruiting" | "non_recruiting",
    proposal?: unknown,
    confidence?: number,
    rationale?: string,
  ): Promise<unknown>;
  updateActivity(id: string, update: Record<string, unknown>): Promise<void>;
  matchCandidates?(): Promise<NonNullable<SyncMessage["candidates"]>>;
}
