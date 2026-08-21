import type pg from "pg";
import {
  inTransaction,
  type Database,
  LOCAL_OWNER_ID,
} from "../../platform/database/client.js";
import { InboxRepository } from "../inbox/repository.js";
import { proposalSchema } from "../inbox/proposal.js";
import type { TrackingService } from "../tracking/service.js";
import { ProcessedMessageRepository } from "../gmail/repository.js";
import type { SyncStore } from "./contracts.js";

export interface SyncActivity {
  id: string;
  requestedStart: string;
  requestedEnd: string;
  startedAt: string;
  finishedAt: string | null;
  state: "running" | "succeeded" | "partial_failure" | "failed";
  scannedCount: number;
  createdInboxItemCount: number;
  skippedProcessedCount: number;
  checkpoint: string | null;
  failureMessage: string | null;
}
interface SyncRow {
  id: string;
  requested_start: string;
  requested_end: string;
  started_at: string;
  finished_at: string | null;
  state: SyncActivity["state"];
  scanned_count: number;
  created_inbox_item_count: number;
  skipped_processed_count: number;
  checkpoint: string | null;
  failure_message: string | null;
}
const map = (row: SyncRow): SyncActivity => ({
  id: row.id,
  requestedStart: row.requested_start,
  requestedEnd: row.requested_end,
  startedAt: row.started_at,
  finishedAt: row.finished_at,
  state: row.state,
  scannedCount: row.scanned_count,
  createdInboxItemCount: row.created_inbox_item_count,
  skippedProcessedCount: row.skipped_processed_count,
  checkpoint: row.checkpoint,
  failureMessage: row.failure_message,
});
export class SyncActivityRepository {
  constructor(private readonly database: Database) {}
  async create(start: string, end: string): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO sync_activities(owner_id,requested_start,requested_end) VALUES($1,$2,$3) RETURNING id`,
      [LOCAL_OWNER_ID, start, end],
    );
    return result.rows[0]!.id;
  }
  async list(): Promise<SyncActivity[]> {
    const result = await this.database.query<SyncRow>(
      "SELECT * FROM sync_activities WHERE owner_id=$1 ORDER BY started_at DESC",
      [LOCAL_OWNER_ID],
    );
    return result.rows.map(map);
  }
  async get(id: string): Promise<SyncActivity | null> {
    const result = await this.database.query<SyncRow>(
      "SELECT * FROM sync_activities WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, id],
    );
    return result.rows[0] ? map(result.rows[0]) : null;
  }
  async lastCheckpoint(): Promise<string | null> {
    const result = await this.database.query<{ checkpoint: string }>(
      `SELECT checkpoint FROM sync_activities WHERE owner_id=$1 AND state='succeeded' AND checkpoint IS NOT NULL ORDER BY finished_at DESC LIMIT 1`,
      [LOCAL_OWNER_ID],
    );
    return result.rows[0]?.checkpoint ?? null;
  }
  async update(id: string, update: Record<string, unknown>): Promise<void> {
    await this.database.query(
      `UPDATE sync_activities SET state=COALESCE($3,state),scanned_count=COALESCE($4,scanned_count), created_inbox_item_count=COALESCE($5,created_inbox_item_count), skipped_processed_count=COALESCE($6,skipped_processed_count),checkpoint=COALESCE($7,checkpoint), failure_message=COALESCE($8,failure_message),finished_at=COALESCE($9,finished_at) WHERE owner_id=$1 AND id=$2`,
      [
        LOCAL_OWNER_ID,
        id,
        update.state ?? null,
        update.scannedCount ?? null,
        update.createdInboxItemCount ?? null,
        update.skippedProcessedCount ?? null,
        update.checkpoint ?? null,
        update.failureMessage ?? null,
        update.finishedAt ?? null,
      ],
    );
  }
}

export class PostgresSyncStore implements SyncStore {
  constructor(
    private readonly pool: pg.Pool,
    private readonly tracking: TrackingService,
  ) {}
  createActivity(start: string, end: string) {
    return new SyncActivityRepository(this.pool).create(start, end);
  }
  isProcessed(gmailMessageId: string) {
    return new ProcessedMessageRepository(this.pool).has(gmailMessageId);
  }
  updateActivity(id: string, update: Record<string, unknown>) {
    return new SyncActivityRepository(this.pool).update(id, update);
  }
  matchCandidates() {
    return this.tracking.listMatchCandidates();
  }
  async recordProcessed(
    gmailMessageId: string,
    outcome: "recruiting" | "non_recruiting",
    proposal?: unknown,
    confidence = 0,
    rationale = "",
  ): Promise<void> {
    await inTransaction(this.pool, async (database) => {
      if (outcome === "recruiting")
        await new InboxRepository(database).create(
          gmailMessageId,
          proposalSchema.parse(proposal),
          confidence,
          rationale,
        );
      await new ProcessedMessageRepository(database).add(
        gmailMessageId,
        outcome,
      );
    });
  }
}
