import type pg from "pg";
import { stringify } from "csv-stringify/sync";

import { inTransaction, type Database } from "../database/client.js";
import { requiresReopenAcknowledgement } from "../domain/application.js";
import {
  ApplicationRepository,
  type ApplicationInput,
} from "../repositories/applications.js";
import { CompanyRepository } from "../repositories/companies.js";
import { EventRepository, type EventInput } from "../repositories/events.js";
import { RecruitingCycleRepository } from "../repositories/recruiting-cycles.js";
import { createApplicationWithSubmittedEvent } from "./create-application.js";

export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class ReopenAcknowledgementError extends ConflictError {}

const nullable = (value: string | null | undefined): string | null =>
  value || null;

export class TrackerService {
  constructor(private readonly pool: pg.Pool) {}

  applications(database: Database = this.pool) {
    return new ApplicationRepository(database);
  }
  events(database: Database = this.pool) {
    return new EventRepository(database);
  }
  companies(database: Database = this.pool) {
    return new CompanyRepository(database);
  }
  cycles(database: Database = this.pool) {
    return new RecruitingCycleRepository(database);
  }

  async createApplication(input: ApplicationInput) {
    return inTransaction(this.pool, async (database) => {
      const applications = this.applications(database);
      const id = await createApplicationWithSubmittedEvent(database, input);
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
