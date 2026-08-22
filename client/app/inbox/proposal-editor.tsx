import type { FormEvent } from "react";
import type { Application } from "../lib/types";

export function ProposalEditor({
  action,
  applications,
  onAccept,
  onDismiss,
  onProposalChange,
  onSave,
  proposal,
}: {
  action: unknown;
  applications: Application[];
  onAccept: () => Promise<void>;
  onDismiss: () => Promise<void>;
  onProposalChange: (proposal: string) => void;
  onSave: (event?: FormEvent) => Promise<void>;
  proposal: string;
}) {
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
    onProposalChange(JSON.stringify(next, null, 2));
  };

  return (
    <form onSubmit={onSave}>
      {parsedProposal &&
        ["create_event", "update_event"].includes(String(action)) && (
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
                        current.newApplication.companyName = event.target.value;
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
                        current.newApplication.roleTitle = event.target.value;
                      })
                    }
                  />
                </label>
                <label>
                  Recruiting Cycle season
                  <select
                    value={
                      parsedProposal.newApplication.recruitingCycle?.season ??
                      "Spring"
                    }
                    onChange={(event) =>
                      updateParsedProposal((current) => {
                        current.newApplication.recruitingCycle.season =
                          event.target.value;
                      })
                    }
                  >
                    {["Spring", "Summer", "Fall", "Winter"].map((season) => (
                      <option key={season}>{season}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Recruiting Cycle year
                  <input
                    type="number"
                    value={
                      parsedProposal.newApplication.recruitingCycle?.year ?? ""
                    }
                    onChange={(event) =>
                      updateParsedProposal((current) => {
                        current.newApplication.recruitingCycle.year = Number(
                          event.target.value,
                        );
                      })
                    }
                  />
                </label>
                <label>
                  Submission date
                  <input
                    type="date"
                    value={parsedProposal.newApplication.submissionDate ?? ""}
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
          onChange={(event) => onProposalChange(event.target.value)}
          aria-describedby="proposal-help"
        />
      </label>
      <small id="proposal-help">
        Every proposed field, date, target, Company, role, cycle, and note can
        be corrected here before acceptance.
      </small>
      <div className="actions">
        <button className="secondary">Save proposal</button>
        <button
          type="button"
          onClick={async () => {
            await onSave();
            await onAccept();
          }}
        >
          Accept one proposed action
        </button>
        <button
          type="button"
          className="danger secondary"
          onClick={() => void onDismiss()}
        >
          Dismiss
        </button>
      </div>
    </form>
  );
}
