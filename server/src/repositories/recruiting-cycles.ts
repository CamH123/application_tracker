import type { Database } from "../database/client.js";
import { LOCAL_OWNER_ID } from "../database/client.js";
import type { RecruitingCycle } from "./types.js";

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
