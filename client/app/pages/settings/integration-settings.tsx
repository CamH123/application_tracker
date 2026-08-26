import {
  disconnectGmail,
  gmailOAuthStartUrl,
  type GmailConnection,
  type OllamaHealth,
} from "./settings-api";
import { SyncActivityList } from "./sync-activity-list";
import { SyncForm } from "./sync-form";
import type { SyncActivity } from "../../lib/types";

export function IntegrationSettings({
  activities,
  configured,
  connection,
  ollama,
  reload,
}: {
  activities: SyncActivity[];
  configured: boolean;
  connection: GmailConnection;
  ollama: OllamaHealth | null;
  reload: () => Promise<void>;
}) {
  return (
    <section className="settings-card">
      <div className="section-heading">
        <div>
          <h2>Gmail & Ollama</h2>
          <p>
            Read-only Gmail proposals are analyzed locally with llama3.2:3b.
          </p>
        </div>
        <span className={`health ${ollama?.available ? "good" : "bad"}`}>
          {ollama?.available ? "Ollama ready" : "Ollama unavailable"}
        </span>
      </div>
      {!ollama?.available && (
        <div className="warning">
          {ollama?.message ?? "Ollama unavailable"}. Manual tracking remains
          fully available.
        </div>
      )}
      {connection ? (
        <div className="connection">
          <div>
            <strong>{connection.gmailAddress}</strong>
            <small>Connected with Gmail read-only access</small>
          </div>
          <button
            className="danger secondary"
            onClick={async () => {
              if (window.confirm("Disconnect this Gmail account?")) {
                await disconnectGmail();
                await reload();
              }
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="empty compact">
          <strong>Gmail not connected</strong>
          <p>Connect one account to create reviewable Inbox Items.</p>
          <a className="button" href={gmailOAuthStartUrl()}>
            Connect Gmail read-only
          </a>
        </div>
      )}
      {connection && <SyncForm configured={configured} onStarted={reload} />}
      <SyncActivityList activities={activities} configured={configured} />
    </section>
  );
}
