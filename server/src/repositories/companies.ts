import type { Database } from "../database/client.js";
import { LOCAL_OWNER_ID } from "../database/client.js";
import { normalizeCompanyName } from "../domain/application.js";
import type { Company } from "./types.js";

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
