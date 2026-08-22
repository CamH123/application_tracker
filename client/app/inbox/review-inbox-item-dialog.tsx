import { useEffect, useState, type FormEvent } from "react";
import { Modal } from "../components/ui/modal";
import type { Application, InboxItem } from "../lib/types";
import {
  acceptInboxItem,
  dismissInboxItem,
  getSourceMessage,
  listApplications,
  updateProposal,
  type SourceMessage,
} from "./inbox-api";
import { ProposalEditor } from "./proposal-editor";

export function ReviewInboxItemDialog({
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
  const [source, setSource] = useState<SourceMessage | null>(null);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState(
    JSON.stringify(item.proposal, null, 2),
  );
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!active) return;
    void listApplications().then((result) =>
      setApplications(result.applications),
    );
  }, [active]);

  const save = async (event?: FormEvent) => {
    event?.preventDefault();
    try {
      const parsed = JSON.parse(proposal);
      const result = await updateProposal(item.id, parsed);
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
        <ProposalEditor
          action={item.proposal.action}
          applications={applications}
          proposal={proposal}
          onProposalChange={setProposal}
          onSave={save}
          onAccept={async () => {
            await acceptInboxItem(item.id);
            await onChange();
          }}
          onDismiss={async () => {
            await dismissInboxItem(item.id);
            await onChange();
          }}
        />
      ) : (
        <pre className="proposal-view">{proposal}</pre>
      )}
      <div className="section-heading">
        <h3>Original Gmail message</h3>
        <button
          className="secondary"
          onClick={async () => {
            try {
              const result = await getSourceMessage(item.id);
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
