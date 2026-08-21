import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiUrl } from "../lib/api";
import type { Company, RecruitingCycle, SyncActivity } from "../lib/types";

export function meta() {
  return [{ title: "Settings · Job Tracker" }];
}

export default function Settings() {
  const [companies, setCompanies] = useState<Company[]>([]),
    [cycles, setCycles] = useState<RecruitingCycle[]>([]),
    [activities, setActivities] = useState<SyncActivity[]>([]);
  const [connection, setConnection] = useState<{ gmailAddress: string } | null>(
      null,
    ),
    [configured, setConfigured] = useState(false),
    [ollama, setOllama] = useState<{
      available: boolean;
      message?: string;
    } | null>(null),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const [companyData, cycleData, syncData, gmailData, health] =
        await Promise.all([
          api<{ companies: Company[] }>("/companies"),
          api<{ recruitingCycles: RecruitingCycle[] }>("/recruiting-cycles"),
          api<{ syncActivities: SyncActivity[] }>("/syncs"),
          api<{
            connection: { gmailAddress: string } | null;
            initialSyncConfigured: boolean;
          }>("/gmail/connection"),
          api<{ available: boolean; message?: string }>(
            "/integrations/ollama/health",
          ),
        ]);
      setCompanies(companyData.companies);
      setCycles(cycleData.recruitingCycles);
      setActivities(syncData.syncActivities);
      setConnection(gmailData.connection);
      setConfigured(gmailData.initialSyncConfigured);
      setOllama(health);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load Settings",
      );
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!activities.some((item) => item.state === "running")) return;
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [activities, load]);
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LOCAL CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Manage integrations and reusable recruiting data.</p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
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
                  await api("/gmail/connection", { method: "DELETE" });
                  await load();
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
            <a className="button" href={apiUrl("/gmail/oauth/start")}>
              Connect Gmail read-only
            </a>
          </div>
        )}
        {connection && <SyncForm configured={configured} onStarted={load} />}
        <h3>Sync Activity</h3>
        {!configured && (
          <p className="muted">
            No initial sync configured. Choose an inclusive date range above.
          </p>
        )}
        {activities.map((activity) => (
          <article className="sync-row" key={activity.id}>
            <div>
              <strong>
                {activity.requestedStart} → {activity.requestedEnd}
              </strong>
              <small>{activity.state.replaceAll("_", " ")}</small>
              <small>
                Started {new Date(activity.startedAt).toLocaleString()}
              </small>
              <small>
                {activity.finishedAt
                  ? `Finished ${new Date(activity.finishedAt).toLocaleString()}`
                  : "Not finished"}
              </small>
            </div>
            <div className="progress-block">
              {activity.state === "running" && (
                <progress
                  aria-label={`Sync in progress; ${activity.scannedCount} messages scanned`}
                />
              )}
              <span aria-live="polite">
                {activity.scannedCount} scanned ·{" "}
                {activity.createdInboxItemCount} new Inbox Items ·{" "}
                {activity.skippedProcessedCount} skipped
              </span>
              {activity.failureMessage && (
                <span className="error-text">{activity.failureMessage}</span>
              )}
            </div>
          </article>
        ))}
      </section>
      <section className="settings-grid">
        <Companies companies={companies} reload={load} />
        <Cycles cycles={cycles} reload={load} />
      </section>
    </main>
  );
}

function SyncForm({
  configured,
  onStarted,
}: {
  configured: boolean;
  onStarted: () => Promise<void>;
}) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form
      className="inline-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        await api("/syncs", {
          method: "POST",
          body: JSON.stringify({
            start: data.get("start"),
            end: data.get("end"),
          }),
        });
        await onStarted();
      }}
    >
      <h3>
        {configured ? "Manual Gmail Sync Window" : "Initial Gmail Sync Window"}
      </h3>
      <label>
        Inclusive start
        <input required type="date" name="start" max={today} />
      </label>
      <label>
        Inclusive end
        <input
          required
          type="date"
          name="end"
          max={today}
          defaultValue={today}
        />
      </label>
      <button>Start background sync</button>
    </form>
  );
}

function Companies({
  companies,
  reload,
}: {
  companies: Company[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="settings-card">
      <h2>Companies</h2>
      <form
        className="stack-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await api("/companies", {
            method: "POST",
            body: JSON.stringify({
              name: data.get("name"),
              candidatePortalUrl: data.get("url") || null,
            }),
          });
          event.currentTarget.reset();
          await reload();
        }}
      >
        <label>
          Name
          <input required name="name" />
        </label>
        <label>
          Candidate-portal URL
          <input type="url" name="url" />
        </label>
        <button>Add Company</button>
      </form>
      {companies.map((company) => (
        <CompanyRow
          key={company.id}
          company={company}
          companies={companies}
          reload={reload}
        />
      ))}
    </section>
  );
}

function CompanyRow({
  company,
  companies,
  reload,
}: {
  company: Company;
  companies: Company[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="management-row">
      {editing ? (
        <form
          className="stack-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await api(`/companies/${company.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                name: data.get("name"),
                candidatePortalUrl: data.get("url") || null,
              }),
            });
            setEditing(false);
            await reload();
          }}
        >
          <label>
            Name
            <input name="name" required defaultValue={company.name} />
          </label>
          <label>
            Candidate-portal URL
            <input
              name="url"
              type="url"
              defaultValue={company.candidatePortalUrl ?? ""}
            />
          </label>
          <div className="actions">
            <button>Save</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <strong>{company.name}</strong>
            <small>
              {company.candidatePortalUrl ?? "No candidate-portal URL"}
            </small>
          </div>
          <div className="row-actions">
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <select
              aria-label={`Merge ${company.name} into another Company`}
              defaultValue=""
              onChange={async (event) => {
                if (!event.target.value) return;
                const survivor = companies.find(
                  (item) => item.id === event.target.value,
                )!;
                if (
                  window.confirm(
                    `Merge ${company.name} into ${survivor.name}? All Applications will move to the survivor.`,
                  )
                ) {
                  await api(`/companies/${company.id}/merge`, {
                    method: "POST",
                    body: JSON.stringify({ survivorId: survivor.id }),
                  });
                  await reload();
                }
              }}
            >
              <option value="">Merge into…</option>
              {companies
                .filter((item) => item.id !== company.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button
              className="text-button danger"
              onClick={async () => {
                if (window.confirm(`Permanently delete ${company.name}?`)) {
                  await api(`/companies/${company.id}`, { method: "DELETE" });
                  await reload();
                }
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}

function Cycles({
  cycles,
  reload,
}: {
  cycles: RecruitingCycle[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="settings-card">
      <h2>Recruiting Cycles</h2>
      <form
        className="inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await api("/recruiting-cycles", {
            method: "POST",
            body: JSON.stringify({
              season: data.get("season"),
              year: Number(data.get("year")),
            }),
          });
          await reload();
        }}
      >
        <label>
          Season
          <select name="season">
            {["Spring", "Summer", "Fall", "Winter"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Year
          <input
            name="year"
            type="number"
            min="2000"
            max="2200"
            required
            defaultValue={new Date().getFullYear() + 1}
          />
        </label>
        <button>Add cycle</button>
      </form>
      {cycles.map((cycle) => (
        <CycleRow key={cycle.id} cycle={cycle} reload={reload} />
      ))}
    </section>
  );
}

function CycleRow({
  cycle,
  reload,
}: {
  cycle: RecruitingCycle;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="management-row">
      {editing ? (
        <form
          className="inline-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await api(`/recruiting-cycles/${cycle.id}`, {
              method: "PATCH",
              body: JSON.stringify({
                season: data.get("season"),
                year: Number(data.get("year")),
              }),
            });
            setEditing(false);
            await reload();
          }}
        >
          <select name="season" defaultValue={cycle.season}>
            {["Spring", "Summer", "Fall", "Winter"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
          <input name="year" type="number" defaultValue={cycle.year} />
          <button>Save</button>
        </form>
      ) : (
        <>
          <strong>
            {cycle.season} {cycle.year}
          </strong>
          <div className="row-actions">
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              className="text-button danger"
              onClick={async () => {
                if (
                  window.confirm(
                    `Delete ${cycle.season} ${cycle.year}? Applications must be moved first.`,
                  )
                ) {
                  await api(`/recruiting-cycles/${cycle.id}`, {
                    method: "DELETE",
                  });
                  await reload();
                }
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}
