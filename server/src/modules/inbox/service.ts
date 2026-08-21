import type pg from "pg";

import { inTransaction } from "../../platform/database/client.js";
import { NotFoundError } from "../../platform/http/errors.js";
import { TrackingService } from "../tracking/service.js";
import { proposalSchema } from "./proposal.js";
import { InboxRepository } from "./repository.js";

export class InboxService {
  constructor(
    private readonly pool: pg.Pool,
    private readonly tracking: TrackingService,
  ) {}
  async updateProposal(id: string, rawProposal: unknown) {
    const item = await new InboxRepository(this.pool).updateProposal(
      id,
      proposalSchema.parse(rawProposal),
    );
    if (!item) throw new NotFoundError("Active Inbox Item not found");
    return item;
  }
  async dismiss(id: string): Promise<void> {
    if (!(await new InboxRepository(this.pool).dismiss(id)))
      throw new NotFoundError("Active Inbox Item not found");
  }
  async accept(id: string): Promise<void> {
    await inTransaction(this.pool, async (database) => {
      const inbox = new InboxRepository(database);
      const item = await inbox.get(id, true);
      if (!item || item.state !== "active")
        throw new NotFoundError("Active Inbox Item not found");
      await this.tracking.applyInboxProposal(
        database,
        item.id,
        proposalSchema.parse(item.proposal),
      );
      await inbox.accept(item.id);
    });
  }
}
