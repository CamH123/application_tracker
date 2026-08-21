import type pg from "pg";

import { inTransaction } from "../database/client.js";
import { proposalSchema } from "../http/validation.js";
import { ProcessedMessageRepository } from "../repositories/gmail.js";
import { InboxRepository } from "../repositories/inbox.js";
import { SyncActivityRepository } from "../repositories/sync-activities.js";
import { ApplicationRepository } from "../repositories/applications.js";
import type { SyncStore } from "../sync/sync.js";

export class PostgresSyncStore implements SyncStore {
  constructor(private readonly pool: pg.Pool) {}
  createActivity(start: string, end: string) {
    return new SyncActivityRepository(this.pool).create(start, end);
  }
  isProcessed(gmailMessageId: string) {
    return new ProcessedMessageRepository(this.pool).has(gmailMessageId);
  }
  updateActivity(id: string, update: Record<string, unknown>) {
    return new SyncActivityRepository(this.pool).update(id, update);
  }
  async matchCandidates() {
    return (await new ApplicationRepository(this.pool).list()).map(
      (application) => ({
        id: application.id,
        companyName: application.company.name,
        roleTitle: application.roleTitle,
        externalApplicationId: application.externalApplicationId,
        submissionDate: application.submissionDate,
        events: application.events.map((event) => ({
          id: event.id,
          eventType: event.eventType,
          occurredOn: event.occurredOn,
        })),
      }),
    );
  }

  async recordProcessed(
    gmailMessageId: string,
    outcome: "recruiting" | "non_recruiting",
    proposal?: unknown,
    confidence = 0,
    rationale = "",
  ): Promise<void> {
    await inTransaction(this.pool, async (database) => {
      if (outcome === "recruiting") {
        const parsed = proposalSchema.parse(proposal);
        await new InboxRepository(database).create(
          gmailMessageId,
          parsed,
          confidence,
          rationale,
        );
      }
      await new ProcessedMessageRepository(database).add(
        gmailMessageId,
        outcome,
      );
    });
  }
}
