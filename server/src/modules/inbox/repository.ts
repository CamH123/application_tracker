import type { Database } from "../../platform/database/client.js";
import { LOCAL_OWNER_ID } from "../../platform/database/client.js";
import type { Proposal } from "./proposal.js";

export interface InboxItem {
  id: string;
  gmailMessageId: string;
  proposal: Proposal;
  state: "active" | "accepted" | "dismissed";
  confidence: number | null;
  rationale: string;
  editedBeforeAcceptance: boolean;
  targetApplicationId: string | null;
  acceptedAt: string | null;
  dismissedAt: string | null;
  createdAt: string;
}
interface InboxRow {
  id: string;
  gmail_message_id: string;
  proposal: Proposal;
  state: InboxItem["state"];
  confidence: string | null;
  rationale: string;
  edited_before_acceptance: boolean;
  target_application_id: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}
const mapInbox = (row: InboxRow): InboxItem => ({
  id: row.id,
  gmailMessageId: row.gmail_message_id,
  proposal: row.proposal,
  state: row.state,
  confidence: row.confidence === null ? null : Number(row.confidence),
  rationale: row.rationale,
  editedBeforeAcceptance: row.edited_before_acceptance,
  targetApplicationId: row.target_application_id,
  acceptedAt: row.accepted_at,
  dismissedAt: row.dismissed_at,
  createdAt: row.created_at,
});

export class InboxRepository {
  constructor(private readonly database: Database) {}
  async list(tab: "active" | "history"): Promise<InboxItem[]> {
    const stateClause =
      tab === "active" ? "state='active'" : "state IN ('accepted','dismissed')";
    const result = await this.database.query<InboxRow>(
      `SELECT * FROM inbox_items WHERE owner_id=$1 AND ${stateClause} ORDER BY created_at DESC`,
      [LOCAL_OWNER_ID],
    );
    return result.rows.map(mapInbox);
  }
  async get(id: string, forUpdate = false): Promise<InboxItem | null> {
    const result = await this.database.query<InboxRow>(
      `SELECT * FROM inbox_items WHERE owner_id=$1 AND id=$2${forUpdate ? " FOR UPDATE" : ""}`,
      [LOCAL_OWNER_ID, id],
    );
    return result.rows[0] ? mapInbox(result.rows[0]) : null;
  }
  async countActive(): Promise<number> {
    const result = await this.database.query<{ count: string }>(
      "SELECT count(*)::text count FROM inbox_items WHERE owner_id=$1 AND state='active'",
      [LOCAL_OWNER_ID],
    );
    return Number(result.rows[0]?.count ?? 0);
  }
  async create(
    gmailMessageId: string,
    proposal: Proposal,
    confidence: number,
    rationale: string,
  ): Promise<void> {
    const targetApplicationId =
      proposal.action === "create_application"
        ? null
        : (proposal.targetApplicationId ?? null);
    await this.database.query(
      `INSERT INTO inbox_items(owner_id,gmail_message_id,proposal,original_proposal,confidence,rationale,target_application_id)
      VALUES($1,$2,$3,$3,$4,$5,$6) ON CONFLICT(owner_id,gmail_message_id) DO NOTHING`,
      [
        LOCAL_OWNER_ID,
        gmailMessageId,
        JSON.stringify(proposal),
        confidence,
        rationale,
        targetApplicationId,
      ],
    );
  }
  async updateProposal(
    id: string,
    proposal: Proposal,
  ): Promise<InboxItem | null> {
    const targetApplicationId =
      proposal.action === "create_application"
        ? null
        : (proposal.targetApplicationId ?? null);
    const result = await this.database.query<InboxRow>(
      `UPDATE inbox_items SET proposal=$3,target_application_id=$4,updated_at=now()
      WHERE owner_id=$1 AND id=$2 AND state='active' RETURNING *`,
      [LOCAL_OWNER_ID, id, JSON.stringify(proposal), targetApplicationId],
    );
    return result.rows[0] ? mapInbox(result.rows[0]) : null;
  }
  async accept(id: string): Promise<void> {
    await this.database.query(
      `UPDATE inbox_items SET state='accepted',accepted_at=now(),updated_at=now(),
      edited_before_acceptance=(proposal <> original_proposal) WHERE owner_id=$1 AND id=$2`,
      [LOCAL_OWNER_ID, id],
    );
  }
  async dismiss(id: string): Promise<boolean> {
    const result = await this.database.query(
      `UPDATE inbox_items SET state='dismissed',dismissed_at=now(),updated_at=now()
      WHERE owner_id=$1 AND id=$2 AND state='active'`,
      [LOCAL_OWNER_ID, id],
    );
    return result.rowCount === 1;
  }
}
