import type pg from "pg";

import { inTransaction, type Database } from "../database/client.js";
import { requiresReopenAcknowledgement } from "../domain/application.js";
import {
  proposalSchema,
  type Proposal,
  type ProposedApplicationFields,
} from "../http/validation.js";
import { ApplicationRepository } from "../repositories/applications.js";
import { CompanyRepository } from "../repositories/companies.js";
import { EventRepository } from "../repositories/events.js";
import { InboxRepository } from "../repositories/inbox.js";
import { RecruitingCycleRepository } from "../repositories/recruiting-cycles.js";
import {
  ConflictError,
  NotFoundError,
  ReopenAcknowledgementError,
} from "./tracker.js";
import { createApplicationWithSubmittedEvent } from "./create-application.js";

export class InboxService {
  constructor(private readonly pool: pg.Pool) {}

  async updateProposal(id: string, rawProposal: unknown) {
    const proposal = proposalSchema.parse(rawProposal);
    const item = await new InboxRepository(this.pool).updateProposal(
      id,
      proposal,
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
      const proposal = proposalSchema.parse(item.proposal);
      await this.applyProposal(database, item.id, proposal);
      await inbox.accept(item.id);
    });
  }

  private async applyProposal(
    database: Database,
    inboxItemId: string,
    proposal: Proposal,
  ) {
    const applications = new ApplicationRepository(database);
    const events = new EventRepository(database);
    if (proposal.action === "create_application") {
      await this.createProposedApplication(database, inboxItemId, proposal);
      return;
    }

    const targetApplicationId =
      proposal.action === "create_event" && proposal.newApplication
        ? await this.createProposedApplication(
            database,
            inboxItemId,
            proposal.newApplication,
          )
        : proposal.targetApplicationId;
    const application = targetApplicationId
      ? await applications.get(targetApplicationId)
      : null;
    if (!application)
      throw new NotFoundError("Proposed target Application not found");
    const event = proposal.event;
    if (proposal.action === "create_event") {
      if (
        requiresReopenAcknowledgement(application.events, event.eventType) &&
        !event.acknowledgeReopen
      ) {
        throw new ReopenAcknowledgementError(
          "Inbox acceptance requires explicit reopen acknowledgement",
        );
      }
      await events.create(application.id, { ...event, inboxItemId });
      return;
    }
    const eventApplicationId = await events.findApplicationId(
      proposal.targetEventId,
    );
    if (eventApplicationId !== application.id)
      throw new ConflictError(
        "Proposed Application Event does not belong to the target Application",
      );
    await events.update(proposal.targetEventId, { ...event, inboxItemId });
  }

  private async createProposedApplication(
    database: Database,
    inboxItemId: string,
    proposal: ProposedApplicationFields,
  ): Promise<string> {
    const companies = new CompanyRepository(database);
    const cycles = new RecruitingCycleRepository(database);
    const company =
      (await companies.findByName(proposal.companyName)) ??
      (await companies.create(
        proposal.companyName,
        proposal.candidatePortalUrl || null,
      ));
    const cycle =
      (await cycles.find(
        proposal.recruitingCycle.season,
        proposal.recruitingCycle.year,
      )) ??
      (await cycles.create(
        proposal.recruitingCycle.season,
        proposal.recruitingCycle.year,
      ));
    return createApplicationWithSubmittedEvent(database, {
      companyId: company.id,
      recruitingCycleId: cycle.id,
      roleTitle: proposal.roleTitle,
      submissionDate: proposal.submissionDate,
      applicationUrl: proposal.applicationUrl || null,
      externalApplicationId: proposal.externalApplicationId || null,
      location: proposal.location || null,
      workArrangement: proposal.workArrangement ?? null,
      isReferred: proposal.isReferred,
      notes: proposal.notes || null,
      inboxItemId,
    });
  }
}
