import type { GmailMessage, AnalysisGateway } from "./types.js";
import { detectRecruitingSignals } from "../domain/recruiting-signals.js";

export interface GmailGateway {
  listMessageIds(start: string, end: string): Promise<string[]>;
  getMessage(id: string): Promise<GmailMessage>;
  getSourceMessage(id: string): Promise<GmailMessage>;
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
  matchCandidates?(): Promise<NonNullable<GmailMessage["candidates"]>>;
}

export class SyncRunner {
  constructor(
    private readonly store: SyncStore,
    private readonly gmail: GmailGateway,
    private readonly analysis: AnalysisGateway,
  ) {}

  async run(
    start: string,
    end: string,
    existingActivityId?: string,
  ): Promise<string> {
    const activityId =
      existingActivityId ?? (await this.store.createActivity(start, end));
    const health = await this.analysis.health();
    if (!health.available) {
      await this.store.updateActivity(activityId, {
        state: "failed",
        failureMessage: health.message ?? "Ollama is unavailable",
        finishedAt: new Date().toISOString(),
      });
      return activityId;
    }

    let scannedCount = 0;
    let createdInboxItemCount = 0;
    let skippedProcessedCount = 0;
    try {
      const messageIds = await this.gmail.listMessageIds(start, end);
      for (const gmailMessageId of messageIds) {
        scannedCount += 1;
        if (await this.store.isProcessed(gmailMessageId)) {
          skippedProcessedCount += 1;
          await this.progress(
            activityId,
            scannedCount,
            createdInboxItemCount,
            skippedProcessedCount,
          );
          continue;
        }
        const message = await this.gmail.getMessage(gmailMessageId);
        const signals = detectRecruitingSignals(message);
        if (signals.classification === "non_recruiting") {
          await this.store.recordProcessed(
            gmailMessageId,
            "non_recruiting",
            undefined,
            1,
            signals.rationale,
          );
          await this.progress(
            activityId,
            scannedCount,
            createdInboxItemCount,
            skippedProcessedCount,
          );
          continue;
        }
        message.deterministicSignals = {
          externalApplicationId: signals.externalApplicationId,
          atsSignal: signals.atsSignal,
          rationale: signals.rationale,
        };
        if (this.store.matchCandidates)
          message.candidates = await this.store.matchCandidates();
        const result = await this.analysis.analyze(message);
        const recruiting = result.recruiting && result.proposal !== undefined;
        await this.store.recordProcessed(
          gmailMessageId,
          recruiting ? "recruiting" : "non_recruiting",
          result.proposal,
          result.confidence,
          result.rationale,
        );
        if (recruiting) createdInboxItemCount += 1;
        await this.progress(
          activityId,
          scannedCount,
          createdInboxItemCount,
          skippedProcessedCount,
        );
      }
      await this.store.updateActivity(activityId, {
        state: "succeeded",
        scannedCount,
        createdInboxItemCount,
        skippedProcessedCount,
        checkpoint: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      });
    } catch (error) {
      await this.store.updateActivity(activityId, {
        state: "partial_failure",
        scannedCount,
        createdInboxItemCount,
        skippedProcessedCount,
        failureMessage:
          error instanceof Error ? error.message : "Synchronization failed",
        finishedAt: new Date().toISOString(),
      });
    }
    return activityId;
  }

  private progress(
    activityId: string,
    scannedCount: number,
    createdInboxItemCount: number,
    skippedProcessedCount: number,
  ) {
    return this.store.updateActivity(activityId, {
      scannedCount,
      createdInboxItemCount,
      skippedProcessedCount,
    });
  }
}
