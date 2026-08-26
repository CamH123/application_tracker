import type { Database } from "../../platform/database/client.js";
import { LOCAL_OWNER_ID } from "../../platform/database/client.js";
import {
  normalizeCompanyName,
  normalizeRoleTitle,
  projectApplicationState,
  type ApplicationEvent,
  type CurrentStatus,
  type EventType,
} from "./domain.js";

export interface Company {
  id: string;
  name: string;
  normalizedName: string;
  candidatePortalUrl: string | null;
}

export interface RecruitingCycle {
  id: string;
  season: "Spring" | "Summer" | "Fall" | "Winter";
  year: number;
}

export interface EventRecord {
  id: string;
  applicationId: string;
  eventType: EventType;
  occurredOn: string;
  scheduledTime: string | null;
  timeZone: string | null;
  roundLabel: string | null;
  notes: string | null;
  recordedAt: string;
  inboxItemId: string | null;
}

export interface ApplicationRecord {
  id: string;
  company: Company;
  recruitingCycle: RecruitingCycle;
  roleTitle: string;
  submissionDate: string;
  applicationUrl: string | null;
  externalApplicationId: string | null;
  location: string | null;
  workArrangement: "remote" | "hybrid" | "on-site" | null;
  isReferred: boolean;
  notes: string | null;
  inboxItemId: string | null;
  events: EventRecord[];
  currentStatus: CurrentStatus;
  completion: "active" | "completed";
}

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

export interface ManualApplicationInput extends Omit<
  ApplicationInput,
  "companyId" | "recruitingCycleId"
> {
  companyName: string;
  recruitingCycle: Pick<RecruitingCycle, "season" | "year">;
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

export interface EventInput {
  eventType: EventType;
  occurredOn: string;
  scheduledTime?: string | null | undefined;
  timeZone?: string | null | undefined;
  roundLabel?: string | null | undefined;
  notes?: string | null | undefined;
  inboxItemId?: string | null | undefined;
}

export class EventRepository {
  constructor(private readonly database: Database) {}

  async create(applicationId: string, input: EventInput): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO application_events (
        application_id,event_type,occurred_on,scheduled_time,time_zone,round_label,notes,inbox_item_id
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [
        applicationId,
        input.eventType,
        input.occurredOn,
        input.scheduledTime ?? null,
        input.timeZone ?? null,
        input.roundLabel ?? null,
        input.notes ?? null,
        input.inboxItemId ?? null,
      ],
    );
    return result.rows[0]!.id;
  }

  async findApplicationId(id: string): Promise<string | null> {
    const result = await this.database.query<{ application_id: string }>(
      "SELECT application_id FROM application_events WHERE id=$1",
      [id],
    );
    return result.rows[0]?.application_id ?? null;
  }

  async update(id: string, input: EventInput): Promise<boolean> {
    const result = await this.database.query(
      `UPDATE application_events SET event_type=$2, occurred_on=$3, scheduled_time=$4,
       time_zone=$5, round_label=$6, notes=$7, inbox_item_id=COALESCE($8,inbox_item_id) WHERE id=$1`,
      [
        id,
        input.eventType,
        input.occurredOn,
        input.scheduledTime ?? null,
        input.timeZone ?? null,
        input.roundLabel ?? null,
        input.notes ?? null,
        input.inboxItemId ?? null,
      ],
    );
    return result.rowCount === 1;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.database.query(
      "DELETE FROM application_events WHERE id=$1",
      [id],
    );
    return result.rowCount === 1;
  }
}

interface CompanyRow {
  id: string;
  name: string;
  normalized_name: string;
  candidate_portal_url: string | null;
}

const mapCompany = (row: CompanyRow): Company => ({
  id: row.id,
  name: row.name,
  normalizedName: row.normalized_name,
  candidatePortalUrl: row.candidate_portal_url,
});

export class CompanyRepository {
  constructor(private readonly database: Database) {}

  async get(id: string): Promise<Company | null> {
    const result = await this.database.query<CompanyRow>(
      "SELECT id,name,normalized_name,candidate_portal_url FROM companies WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, id],
    );
    return result.rows[0] ? mapCompany(result.rows[0]) : null;
  }

  async list(): Promise<Company[]> {
    const result = await this.database.query<CompanyRow>(
      "SELECT id,name,normalized_name,candidate_portal_url FROM companies WHERE owner_id=$1 ORDER BY name",
      [LOCAL_OWNER_ID],
    );
    return result.rows.map(mapCompany);
  }

  async findByName(name: string): Promise<Company | null> {
    const result = await this.database.query<CompanyRow>(
      `SELECT id,name,normalized_name,candidate_portal_url FROM companies
       WHERE owner_id=$1 AND normalized_name=$2`,
      [LOCAL_OWNER_ID, normalizeCompanyName(name)],
    );
    return result.rows[0] ? mapCompany(result.rows[0]) : null;
  }

  async create(
    name: string,
    candidatePortalUrl: string | null,
  ): Promise<Company> {
    const result = await this.database.query<CompanyRow>(
      `INSERT INTO companies (owner_id,name,normalized_name,candidate_portal_url)
       VALUES ($1,$2,$3,$4) RETURNING id,name,normalized_name,candidate_portal_url`,
      [
        LOCAL_OWNER_ID,
        name.trim(),
        normalizeCompanyName(name),
        candidatePortalUrl,
      ],
    );
    return mapCompany(result.rows[0]!);
  }

  async createOrFind(
    name: string,
    candidatePortalUrl: string | null,
  ): Promise<Company> {
    const created = await this.database.query<CompanyRow>(
      `INSERT INTO companies (owner_id,name,normalized_name,candidate_portal_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (owner_id, normalized_name) DO NOTHING
       RETURNING id,name,normalized_name,candidate_portal_url`,
      [
        LOCAL_OWNER_ID,
        name.trim(),
        normalizeCompanyName(name),
        candidatePortalUrl,
      ],
    );
    if (created.rows[0]) return mapCompany(created.rows[0]);
    const company = await this.findByName(name);
    if (!company) throw new Error("Company was not available after creation");
    return company;
  }

  async update(
    id: string,
    name: string,
    candidatePortalUrl: string | null,
  ): Promise<Company | null> {
    const result = await this.database.query<CompanyRow>(
      `UPDATE companies SET name=$3,normalized_name=$4,candidate_portal_url=$5,updated_at=now()
       WHERE owner_id=$1 AND id=$2 RETURNING id,name,normalized_name,candidate_portal_url`,
      [
        LOCAL_OWNER_ID,
        id,
        name.trim(),
        normalizeCompanyName(name),
        candidatePortalUrl,
      ],
    );
    return result.rows[0] ? mapCompany(result.rows[0]) : null;
  }

  async delete(id: string): Promise<"deleted" | "in_use" | "not_found"> {
    const used = await this.database.query(
      "SELECT 1 FROM applications WHERE owner_id=$1 AND company_id=$2 LIMIT 1",
      [LOCAL_OWNER_ID, id],
    );
    if (used.rowCount) return "in_use";
    const result = await this.database.query(
      "DELETE FROM companies WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, id],
    );
    return result.rowCount ? "deleted" : "not_found";
  }

  async merge(sourceId: string, survivorId: string): Promise<void> {
    await this.database.query(
      "UPDATE applications SET company_id=$3,updated_at=now() WHERE owner_id=$1 AND company_id=$2",
      [LOCAL_OWNER_ID, sourceId, survivorId],
    );
    await this.database.query(
      "DELETE FROM companies WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, sourceId],
    );
  }
}

interface CycleRow {
  id: string;
  season: RecruitingCycle["season"];
  year: number;
}

export class RecruitingCycleRepository {
  constructor(private readonly database: Database) {}

  async list(): Promise<RecruitingCycle[]> {
    const result = await this.database.query<CycleRow>(
      `SELECT id,season,year FROM recruiting_cycles WHERE owner_id=$1
       ORDER BY year, array_position(ARRAY['Spring','Summer','Fall','Winter'], season)`,
      [LOCAL_OWNER_ID],
    );
    return result.rows;
  }

  async find(
    season: RecruitingCycle["season"],
    year: number,
  ): Promise<RecruitingCycle | null> {
    const result = await this.database.query<CycleRow>(
      "SELECT id,season,year FROM recruiting_cycles WHERE owner_id=$1 AND season=$2 AND year=$3",
      [LOCAL_OWNER_ID, season, year],
    );
    return result.rows[0] ?? null;
  }

  async create(
    season: RecruitingCycle["season"],
    year: number,
  ): Promise<RecruitingCycle> {
    const result = await this.database.query<CycleRow>(
      `INSERT INTO recruiting_cycles(owner_id,season,year) VALUES($1,$2,$3)
       RETURNING id,season,year`,
      [LOCAL_OWNER_ID, season, year],
    );
    return result.rows[0]!;
  }

  async createOrFind(
    season: RecruitingCycle["season"],
    year: number,
  ): Promise<RecruitingCycle> {
    const created = await this.database.query<CycleRow>(
      `INSERT INTO recruiting_cycles(owner_id,season,year) VALUES($1,$2,$3)
       ON CONFLICT (owner_id, season, year) DO NOTHING
       RETURNING id,season,year`,
      [LOCAL_OWNER_ID, season, year],
    );
    if (created.rows[0]) return created.rows[0];
    const cycle = await this.find(season, year);
    if (!cycle)
      throw new Error("Recruiting Cycle was not available after creation");
    return cycle;
  }

  async update(
    id: string,
    season: RecruitingCycle["season"],
    year: number,
  ): Promise<RecruitingCycle | null> {
    const result = await this.database.query<CycleRow>(
      `UPDATE recruiting_cycles SET season=$3,year=$4,updated_at=now()
       WHERE owner_id=$1 AND id=$2 RETURNING id,season,year`,
      [LOCAL_OWNER_ID, id, season, year],
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<"deleted" | "in_use" | "not_found"> {
    const used = await this.database.query(
      "SELECT 1 FROM applications WHERE owner_id=$1 AND recruiting_cycle_id=$2 LIMIT 1",
      [LOCAL_OWNER_ID, id],
    );
    if (used.rowCount) return "in_use";
    const result = await this.database.query(
      "DELETE FROM recruiting_cycles WHERE owner_id=$1 AND id=$2",
      [LOCAL_OWNER_ID, id],
    );
    return result.rowCount ? "deleted" : "not_found";
  }
}
