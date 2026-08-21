import type { Database } from "../../platform/database/client.js";
import { LOCAL_OWNER_ID } from "../../platform/database/client.js";
export interface GmailConnection {
  gmailAddress: string;
  connectedAt: string;
}
export class GmailRepository {
  constructor(private readonly database: Database) {}
  async get(): Promise<GmailConnection | null> {
    const result = await this.database.query<{
      gmail_address: string;
      connected_at: string;
    }>(
      "SELECT gmail_address,connected_at FROM gmail_connections WHERE owner_id=$1",
      [LOCAL_OWNER_ID],
    );
    const row = result.rows[0];
    return row
      ? { gmailAddress: row.gmail_address, connectedAt: row.connected_at }
      : null;
  }
  async getEncryptedToken(): Promise<string | null> {
    const result = await this.database.query<{
      encrypted_refresh_token: string;
    }>(
      "SELECT encrypted_refresh_token FROM gmail_connections WHERE owner_id=$1",
      [LOCAL_OWNER_ID],
    );
    return result.rows[0]?.encrypted_refresh_token ?? null;
  }
  async save(encryptedToken: string, gmailAddress: string): Promise<void> {
    await this.database.query(
      `INSERT INTO gmail_connections(owner_id,encrypted_refresh_token,gmail_address) VALUES($1,$2,$3) ON CONFLICT(owner_id) DO UPDATE SET encrypted_refresh_token=EXCLUDED.encrypted_refresh_token,gmail_address=EXCLUDED.gmail_address,connected_at=now(),updated_at=now()`,
      [LOCAL_OWNER_ID, encryptedToken, gmailAddress],
    );
  }
  async disconnect(): Promise<void> {
    await this.database.query(
      "DELETE FROM gmail_connections WHERE owner_id=$1",
      [LOCAL_OWNER_ID],
    );
  }
}
export class ProcessedMessageRepository {
  constructor(private readonly database: Database) {}
  async has(gmailMessageId: string): Promise<boolean> {
    const result = await this.database.query(
      "SELECT 1 FROM processed_gmail_messages WHERE owner_id=$1 AND gmail_message_id=$2",
      [LOCAL_OWNER_ID, gmailMessageId],
    );
    return Boolean(result.rowCount);
  }
  async add(
    gmailMessageId: string,
    outcome: "recruiting" | "non_recruiting",
  ): Promise<void> {
    await this.database.query(
      `INSERT INTO processed_gmail_messages(owner_id,gmail_message_id,classification_outcome) VALUES($1,$2,$3) ON CONFLICT(owner_id,gmail_message_id) DO NOTHING`,
      [LOCAL_OWNER_ID, gmailMessageId, outcome],
    );
  }
}
