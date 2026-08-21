import type pg from "pg";
import { stringify } from "csv-stringify/sync";

import {
  inTransaction,
  type Database,
} from "../../platform/database/client.js";
import {
  ConflictError,
  NotFoundError,
  ReopenAcknowledgementError,
} from "../../platform/http/errors.js";
import { requiresReopenAcknowledgement } from "./domain.js";
import {
  ApplicationRepository,
  CompanyRepository,
  EventRepository,
  RecruitingCycleRepository,
  type ApplicationInput,
  type EventInput,
} from "./repository.js";
import type { Proposal, ProposedApplicationFields } from "../inbox/proposal.js";

export { ConflictError, NotFoundError, ReopenAcknowledgementError };

const nullable = (value: string | null | undefined): string | null =>
  value || null;

export class TrackingService {
  constructor(private readonly pool: pg.Pool) {}

  private applications(database: Database = this.pool) {
    return new ApplicationRepository(database);
  }
  private events(database: Database = this.pool) {
    return new EventRepository(database);
  }
  private companies(database: Database = this.pool) {
    return new CompanyRepository(database);
  }
  private cycles(database: Database = this.pool) {
    return new RecruitingCycleRepository(database);
  }

  listApplications() {
    return this.applications().list();
  }
  async listMatchCandidates() {
    return (await this.listApplications()).map((application) => ({
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
    }));
  }
  getApplication(id: string) {
    return this.applications().get(id);
  }
  deleteApplication(id: string) {
    return this.applications().delete(id);
  }
  deleteEvent(id: string) {
    return this.events().delete(id);
  }
  listCompanies() {
    return this.companies().list();
  }
  createCompany(name: string, candidatePortalUrl: string | null) {
    return this.companies().create(name, candidatePortalUrl);
  }
  updateCompany(id: string, name: string, candidatePortalUrl: string | null) {
    return this.companies().update(id, name, candidatePortalUrl);
  }
  deleteCompany(id: string) {
    return this.companies().delete(id);
  }
  listCycles() {
    return this.cycles().list();
  }
  createCycle(season: "Spring" | "Summer" | "Fall" | "Winter", year: number) {
    return this.cycles().create(season, year);
  }
  updateCycle(
    id: string,
    season: "Spring" | "Summer" | "Fall" | "Winter",
    year: number,
  ) {
    return this.cycles().update(id, season, year);
  }
  deleteCycle(id: string) {
    return this.cycles().delete(id);
  }

  async createApplication(input: ApplicationInput) {
    return inTransaction(this.pool, async (database) => {
      const applications = this.applications(database);
      const id = await this.createApplicationWithSubmittedEvent(
        database,
        input,
      );
      return applications.get(id);
    });
  }

  async updateApplication(id: string, input: ApplicationInput) {
    if (!(await this.applications().update(id, input)))
      throw new NotFoundError("Application not found");
    return this.applications().get(id);
  }

  async createEvent(
    applicationId: string,
    input: EventInput & { acknowledgeReopen?: boolean | undefined },
  ) {
    const application = await this.applications().get(applicationId);
    if (!application) throw new NotFoundError("Application not found");
    if (
      requiresReopenAcknowledgement(application.events, input.eventType) &&
      !input.acknowledgeReopen
    ) {
      throw new ReopenAcknowledgementError(
        "A non-terminal event after a terminal outcome requires explicit correction/reopen acknowledgement",
      );
    }
    const id = await this.events().create(applicationId, input);
    return (await this.applications().get(applicationId))?.events.find(
      (event) => event.id === id,
    );
  }

  async updateEvent(
    id: string,
    input: EventInput & { acknowledgeReopen?: boolean | undefined },
  ) {
    const applicationId = await this.events().findApplicationId(id);
    if (!applicationId) throw new NotFoundError("Application Event not found");
    await this.events().update(id, input);
    return (await this.applications().get(applicationId))?.events.find(
      (event) => event.id === id,
    );
  }

  async mergeCompanies(sourceId: string, survivorId: string): Promise<void> {
    if (sourceId === survivorId)
      throw new ConflictError("A Company cannot be merged into itself");
    await inTransaction(this.pool, async (database) => {
      const companies = this.companies(database);
      if (
        !(await companies.get(sourceId)) ||
        !(await companies.get(survivorId))
      ) {
        throw new NotFoundError("Source or survivor Company not found");
      }
      await companies.merge(sourceId, survivorId);
    });
  }

  async exportCsv(): Promise<string> {
    const applications = await this.applications().list();
    const headers = [
      "application_id",
      "company",
      "role_title",
      "recruiting_cycle",
      "submission_date",
      "application_url",
      "external_application_id",
      "location",
      "work_arrangement",
      "is_referred",
      "application_notes",
      "current_status",
      "completion",
      "event_id",
      "event_type",
      "event_occurred_on",
      "event_scheduled_time",
      "event_time_zone",
      "event_round_label",
      "event_notes",
      "event_recorded_at",
    ];
    const rows = applications.flatMap((application) => {
      const events = application.events.length ? application.events : [null];
      return events.map((event) => [
        application.id,
        application.company.name,
        application.roleTitle,
        `${application.recruitingCycle.season} ${application.recruitingCycle.year}`,
        application.submissionDate,
        application.applicationUrl,
        application.externalApplicationId,
        application.location,
        application.workArrangement,
        application.isReferred,
        application.notes,
        application.currentStatus,
        application.completion,
        event?.id,
        event?.eventType,
        event?.occurredOn,
        event?.scheduledTime,
        event?.timeZone,
        event?.roundLabel,
        event?.notes,
        event?.recordedAt,
      ]);
    });
    return stringify([headers, ...rows], { record_delimiter: "\r\n" });
  }

  async applyInboxProposal(
    database: Database,
    inboxItemId: string,
    proposal: Proposal,
  ): Promise<void> {
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
    const applications = this.applications(database);
    const events = this.events(database);
    const application = targetApplicationId
      ? await applications.get(targetApplicationId)
      : null;
    if (!application)
      throw new NotFoundError("Proposed target Application not found");
    if (proposal.action === "create_event") {
      if (
        requiresReopenAcknowledgement(
          application.events,
          proposal.event.eventType,
        ) &&
        !proposal.event.acknowledgeReopen
      )
        throw new ReopenAcknowledgementError(
          "Inbox acceptance requires explicit reopen acknowledgement",
        );
      await events.create(application.id, { ...proposal.event, inboxItemId });
      return;
    }
    const eventApplicationId = await events.findApplicationId(
      proposal.targetEventId,
    );
    if (eventApplicationId !== application.id)
      throw new ConflictError(
        "Proposed Application Event does not belong to the target Application",
      );
    await events.update(proposal.targetEventId, {
      ...proposal.event,
      inboxItemId,
    });
  }

  private async createProposedApplication(
    database: Database,
    inboxItemId: string,
    proposal: ProposedApplicationFields,
  ): Promise<string> {
    const companies = this.companies(database);
    const cycles = this.cycles(database);
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
    return this.createApplicationWithSubmittedEvent(database, {
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

  private async createApplicationWithSubmittedEvent(
    database: Database,
    input: ApplicationInput,
  ): Promise<string> {
    const applicationId = await this.applications(database).create(input);
    await this.events(database).create(applicationId, {
      eventType: "submitted",
      occurredOn: input.submissionDate,
      inboxItemId: input.inboxItemId,
    });
    return applicationId;
  }
}

export const cleanApplicationInput = <T extends ApplicationInput>(
  input: T,
): ApplicationInput => ({
  ...input,
  applicationUrl: nullable(input.applicationUrl),
  externalApplicationId: nullable(input.externalApplicationId),
  location: nullable(input.location),
  notes: nullable(input.notes),
});
