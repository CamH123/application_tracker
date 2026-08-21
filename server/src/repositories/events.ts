import type { Database } from "../database/client.js";
import type { EventType } from "../domain/application.js";

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
