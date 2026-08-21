import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Modal } from "../components/modal";
import { api } from "../lib/api";
import type { Application, InboxItem } from "../lib/types";

export function meta() {
  return [{ title: "Inbox · Job Tracker" }];
}

export default function Inbox() {
  const [tab, setTab] = useState<"active" | "history">("active"),
    [items, setItems] = useState<InboxItem[]>([]),
    [selected, setSelected] = useState<InboxItem | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const result = await api<{ inboxItems: InboxItem[] }>(
        `/inbox-items?tab=${tab}`,
      );
      setItems(result.inboxItems);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load Inbox",
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);
  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);
  useEffect(() => {
    if (tab !== "active") return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [tab, load]);
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REVIEW QUEUE</span>
          <h1>Inbox</h1>
          <p>Gmail proposals wait here until you decide.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "active"}
          onClick={() => setTab("active")}
        >
          Active
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="empty">Loading Inbox…</div>
      ) : !items.length ? (
        <div className="empty">
          <strong>
            {tab === "active"
              ? "No active Inbox Items"
              : "No Inbox History yet"}
          </strong>
          <p>
            {tab === "active"
              ? "New recruiting detections will wait here for review."
              : "Accepted and dismissed proposals will appear here."}
          </p>
        </div>
      ) : (
        <div className="card-list">
          {items.map((item) => (
            <button
              className="inbox-card"
              key={item.id}
              onClick={() => setSelected(item)}
            >
              <div>
                <span className={`state ${item.state}`}>{item.state}</span>
                <strong>
                  {String(item.proposal.action).replaceAll("_", " ")}
                </strong>
                <p>{item.rationale}</p>
              </div>
              <div>
                <span>
                  {item.confidence === null
                    ? "—"
                    : `${Math.round(item.confidence * 100)}%`}
                </span>
                {item.state === "accepted" && (
                  <small>
                    {item.editedBeforeAcceptance
                      ? "Edited before acceptance"
                      : "Accepted unchanged"}
                  </small>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      {selected && (
        <Review
          item={selected}
          active={selected.state === "active"}
          onClose={() => setSelected(null)}
          onChange={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </main>
  );
}

function Review({
  item,
  active,
  onClose,
  onChange,
}: {
  item: InboxItem;
  active: boolean;
  onClose: () => void;
  onChange: () => Promise<void>;
}) {
  const [source, setSource] = useState<{
      from: string;
      subject: string;
      text: string;
    } | null>(null),
    [error, setError] = useState(""),
    [proposal, setProposal] = useState(JSON.stringify(item.proposal, null, 2));
  const [applications, setApplications] = useState<Application[]>([]);
  useEffect(() => {
    if (!active) return;
    void api<{ applications: Application[] }>("/applications").then((result) =>
      setApplications(result.applications),
    );
  }, [active]);
  let parsedProposal: Record<string, any> | null = null;
  try {
    parsedProposal = JSON.parse(proposal) as Record<string, any>;
  } catch {
    // The raw editor remains available so the person can correct invalid JSON.
  }
  const updateParsedProposal = (
    update: (current: Record<string, any>) => void,
  ) => {
    if (!parsedProposal) return;
    const next = structuredClone(parsedProposal);
    update(next);
    setProposal(JSON.stringify(next, null, 2));
  };
  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    try {
      const parsed = JSON.parse(proposal);
      const result = await api<{ inboxItem: InboxItem }>(
        `/inbox-items/${item.id}/proposal`,
        { method: "PATCH", body: JSON.stringify(parsed) },
      );
      setProposal(JSON.stringify(result.inboxItem.proposal, null, 2));
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Proposal must be valid JSON",
      );
      throw reason;
    }
  };
  return (
    <Modal title="Review Inbox Item" onClose={onClose}>
      <div className="proposal-summary">
        <span className={`state ${item.state}`}>{item.state}</span>
        <span>
          {item.confidence === null
            ? "No confidence score"
            : `${Math.round(item.confidence * 100)}% confidence`}
        </span>
      </div>
      <p>{item.rationale}</p>
      {active ? (
        <form onSubmit={save}>
          {parsedProposal &&
            ["create_event", "update_event"].includes(
              String(parsedProposal.action),
            ) && (
              <div className="target-editor">
                <label>
                  Target Application
                  <select
                    value={
                      parsedProposal.newApplication
                        ? "new"
                        : String(parsedProposal.targetApplicationId ?? "")
                    }
                    onChange={(event) =>
                      updateParsedProposal((current) => {
                        if (event.target.value === "new") {
                          delete current.targetApplicationId;
                          current.newApplication = {
                            companyName: "",
                            roleTitle: "",
                            recruitingCycle: {
                              season: "Spring",
                              year: new Date().getFullYear() + 1,
                            },
                            submissionDate:
                              current.event?.occurredOn ??
                              new Date().toISOString().slice(0, 10),
                          };
                        } else {
                          delete current.newApplication;
                          current.targetApplicationId = event.target.value;
                        }
                      })
                    }
                  >
                    <option value="">Select an Application</option>
                    {applications.map((application) => (
                      <option key={application.id} value={application.id}>
                        {application.company.name} · {application.roleTitle} ·{" "}
                        {application.recruitingCycle.season}{" "}
                        {application.recruitingCycle.year}
                      </option>
                    ))}
                    {parsedProposal.action === "create_event" && (
                      <option value="new">Create a new Application…</option>
                    )}
                  </select>
                </label>
                {parsedProposal.newApplication && (
                  <div className="form-grid">
                    <label>
                      Company
                      <input
                        value={parsedProposal.newApplication.companyName ?? ""}
                        onChange={(event) =>
                          updateParsedProposal((current) => {
                            current.newApplication.companyName =
                              event.target.value;
                          })
                        }
                      />
                    </label>
                    <label>
                      Role title
                      <input
                        value={parsedProposal.newApplication.roleTitle ?? ""}
                        onChange={(event) =>
                          updateParsedProposal((current) => {
                            current.newApplication.roleTitle =
                              event.target.value;
                          })
                        }
                      />
                    </label>
                    <label>
                      Recruiting Cycle season
                      <select
                        value={
                          parsedProposal.newApplication.recruitingCycle
                            ?.season ?? "Spring"
                        }
                        onChange={(event) =>
                          updateParsedProposal((current) => {
                            current.newApplication.recruitingCycle.season =
                              event.target.value;
                          })
                        }
                      >
                        {["Spring", "Summer", "Fall", "Winter"].map(
                          (season) => (
                            <option key={season}>{season}</option>
                          ),
                        )}
                      </select>
                    </label>
                    <label>
                      Recruiting Cycle year
                      <input
                        type="number"
                        value={
                          parsedProposal.newApplication.recruitingCycle?.year ??
                          ""
                        }
                        onChange={(event) =>
                          updateParsedProposal((current) => {
                            current.newApplication.recruitingCycle.year =
                              Number(event.target.value);
                          })
                        }
                      />
                    </label>
                    <label>
                      Submission date
                      <input
                        type="date"
                        value={
                          parsedProposal.newApplication.submissionDate ?? ""
                        }
                        onChange={(event) =>
                          updateParsedProposal((current) => {
                            current.newApplication.submissionDate =
                              event.target.value;
                          })
                        }
                      />
                    </label>
                  </div>
                )}
              </div>
            )}
          <label>
            Editable structured proposal
            <textarea
              className="code-editor"
              rows={18}
              value={proposal}
              onChange={(event) => setProposal(event.target.value)}
              aria-describedby="proposal-help"
            />
          </label>
          <small id="proposal-help">
            Every proposed field, date, target, Company, role, cycle, and note
            can be corrected here before acceptance.
          </small>
          <div className="actions">
            <button className="secondary">Save proposal</button>
            <button
              type="button"
              onClick={async () => {
                await save();
                await api(`/inbox-items/${item.id}/accept`, { method: "POST" });
                await onChange();
              }}
            >
              Accept one proposed action
            </button>
            <button
              type="button"
              className="danger secondary"
              onClick={async () => {
                await api(`/inbox-items/${item.id}/dismiss`, {
                  method: "POST",
                });
                await onChange();
              }}
            >
              Dismiss
            </button>
          </div>
        </form>
      ) : (
        <pre className="proposal-view">{proposal}</pre>
      )}
      <div className="section-heading">
        <h3>Original Gmail message</h3>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const result = await api<{
                message: { from: string; subject: string; text: string };
              }>(`/inbox-items/${item.id}/source-message`);
              setSource(result.message);
            } catch (reason) {
              setError(
                reason instanceof Error
                  ? reason.message
                  : "Could not fetch source message",
              );
            }
          }}
        >
          Fetch transiently
        </button>
      </div>
      {source && (
        <section className="source-message">
          <strong>{source.subject}</strong>
          <small>From {source.from}</small>
          <pre>{source.text}</pre>
          <small>
            This content is fetched from Gmail on demand and is not stored
            locally.
          </small>
        </section>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </Modal>
  );
}
