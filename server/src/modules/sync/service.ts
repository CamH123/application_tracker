import { detectRecruitingSignals } from "./domain/recruiting-signals.js";
import type { AnalysisGateway, GmailGateway, SyncStore } from "./contracts.js";
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
      for (const gmailMessageId of await this.gmail.listMessageIds(
        start,
        end,
      )) {
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
import { ConflictError } from "../../platform/http/errors.js";
export class SyncAlreadyRunningError extends ConflictError {}
export class SyncCoordinator {
  private running = false;
  constructor(
    private readonly createActivity: (
      start: string,
      end: string,
    ) => Promise<string>,
    private readonly run: (
      start: string,
      end: string,
      activityId: string,
    ) => Promise<unknown>,
  ) {}
  async launch(start: string, end: string): Promise<string> {
    if (this.running)
      throw new SyncAlreadyRunningError(
        "A Gmail Sync Window is already running",
      );
    this.running = true;
    let activityId: string;
    try {
      activityId = await this.createActivity(start, end);
    } catch (error) {
      this.running = false;
      throw error;
    }
    void this.run(start, end, activityId).finally(() => {
      this.running = false;
    });
    return activityId;
  }
  get isRunning(): boolean {
    return this.running;
  }
}
