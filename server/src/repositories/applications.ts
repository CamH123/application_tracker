import type { Database } from "../database/client.js";
import { LOCAL_OWNER_ID } from "../database/client.js";
import {
  normalizeRoleTitle,
  projectApplicationState,
  type ApplicationEvent,
} from "../domain/application.js";
import type { ApplicationRecord, EventRecord } from "./types.js";

interface ApplicationRow {
  id: string;
  company_id: string;
  company_name: string;
  normalized_name: string;
  candidate_portal_url: string | null;
  recruiting_cycle_id: string;
  season: "Spring" | "Summer" | "Fall" | "Winter";
  year: number;
  role_title: string;
  submission_date: string;
  application_url: string | null;
  external_application_id: string | null;
  location: string | null;
  work_arrangement: "remote" | "hybrid" | "on-site" | null;
  is_referred: boolean;
  notes: string | null;
  inbox_item_id: string | null;
}

interface EventRow {
  id: string;
  application_id: string;
  event_type: EventRecord["eventType"];
  occurred_on: string;
  scheduled_time: string | null;
  time_zone: string | null;
  round_label: string | null;
  notes: string | null;
  recorded_at: string;
  inbox_item_id: string | null;
}

const applicationSelect = `
  SELECT a.*, c.name company_name, c.normalized_name, c.candidate_portal_url,
         rc.season, rc.year
  FROM applications a
  JOIN companies c ON c.id = a.company_id
  JOIN recruiting_cycles rc ON rc.id = a.recruiting_cycle_id
  WHERE a.owner_id = $1`;

const mapEvent = (row: EventRow): EventRecord => ({
  id: row.id,
  applicationId: row.application_id,
  eventType: row.event_type,
  occurredOn: row.occurred_on,
  scheduledTime: row.scheduled_time,
  timeZone: row.time_zone,
  roundLabel: row.round_label,
  notes: row.notes,
  recordedAt: row.recorded_at,
  inboxItemId: row.inbox_item_id,
});

export interface ApplicationInput {
  companyId: string;
  recruitingCycleId: string;
  roleTitle: string;
  submissionDate: string;
  applicationUrl?: string | null | undefined;
  externalApplicationId?: string | null | undefined;
  location?: string | null | undefined;
  workArrangement?: "remote" | "hybrid" | "on-site" | null | undefined;
  isReferred?: boolean | undefined;
  notes?: string | null | undefined;
  inboxItemId?: string | null | undefined;
}

export class ApplicationRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<ApplicationRecord[]> {
    const result = await this.database.query<ApplicationRow>(
      `${applicationSelect} ORDER BY a.submission_date ASC, a.created_at ASC`,
      [LOCAL_OWNER_ID],
    );
    return this.hydrate(result.rows);
  }

  async get(id: string): Promise<ApplicationRecord | null> {
    const result = await this.database.query<ApplicationRow>(
      `${applicationSelect} AND a.id = $2`,
      [LOCAL_OWNER_ID, id],
    );
    return (await this.hydrate(result.rows))[0] ?? null;
  }

  async create(input: ApplicationInput): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO applications (
        owner_id, company_id, recruiting_cycle_id, role_title, normalized_role_title,
        submission_date, application_url, external_application_id, location,
        work_arrangement, is_referred, notes, inbox_item_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [
        LOCAL_OWNER_ID,
        input.companyId,
        input.recruitingCycleId,
        input.roleTitle.trim(),
        normalizeRoleTitle(input.roleTitle),
        input.submissionDate,
        input.applicationUrl ?? null,
        input.externalApplicationId ?? null,
        input.location ?? null,
        input.workArrangement ?? null,
        input.isReferred ?? false,
        input.notes ?? null,
        input.inboxItemId ?? null,
      ],
    );
    return result.rows[0]!.id;
  }

  async update(id: string, input: ApplicationInput): Promise<boolean> {
    const result = await this.database.query(
      `UPDATE applications SET company_id=$3, recruiting_cycle_id=$4, role_title=$5,
        normalized_role_title=$6, submission_date=$7, application_url=$8,
        external_application_id=$9, location=$10, work_arrangement=$11,
        is_referred=$12, notes=$13, updated_at=now()
       WHERE owner_id=$1 AND id=$2`,
      [
        LOCAL_OWNER_ID,
        id,
        input.companyId,
        input.recruitingCycleId,
        input.roleTitle.trim(),
        normalizeRoleTitle(input.roleTitle),
        input.submissionDate,
        input.applicationUrl ?? null,
        input.externalApplicationId ?? null,
        input.location ?? null,
        input.workArrangement ?? null,
        input.isReferred ?? false,
        input.notes ?? null,
      ],
    );
    return result.rowCount === 1;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.database.query(
      "DELETE FROM applications WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, id],
    );
    return result.rowCount === 1;
  }

  private async hydrate(rows: ApplicationRow[]): Promise<ApplicationRecord[]> {
    if (!rows.length) return [];
    const eventsResult = await this.database.query<EventRow>(
      `SELECT * FROM application_events WHERE application_id = ANY($1::uuid[])
       ORDER BY occurred_on, recorded_at, id`,
      [rows.map((row) => row.id)],
    );
    const eventsByApplication = new Map<string, EventRecord[]>();
    for (const event of eventsResult.rows.map(mapEvent)) {
      const events = eventsByApplication.get(event.applicationId) ?? [];
      events.push(event);
      eventsByApplication.set(event.applicationId, events);
    }
    return rows.map((row) => {
      const events = eventsByApplication.get(row.id) ?? [];
      const state = projectApplicationState(
        events.map((event): ApplicationEvent => ({
          id: event.id,
          eventType: event.eventType,
          occurredOn: event.occurredOn,
          recordedAt: event.recordedAt,
        })),
      );
      return {
        id: row.id,
        company: {
          id: row.company_id,
          name: row.company_name,
          normalizedName: row.normalized_name,
          candidatePortalUrl: row.candidate_portal_url,
        },
        recruitingCycle: {
          id: row.recruiting_cycle_id,
          season: row.season,
          year: row.year,
        },
        roleTitle: row.role_title,
        submissionDate: row.submission_date,
        applicationUrl: row.application_url,
        externalApplicationId: row.external_application_id,
        location: row.location,
        workArrangement: row.work_arrangement,
        isReferred: row.is_referred,
        notes: row.notes,
        inboxItemId: row.inbox_item_id,
        events,
        ...state,
      };
    });
  }
}
