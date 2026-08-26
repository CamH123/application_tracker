import { useState } from "react";
import { Dialog } from "../../components/dialog";
import type {
  Application,
  ApplicationEvent,
  Company,
  RecruitingCycle,
} from "../../lib/types";
import {
  createApplicationEvent,
  deleteApplication,
  deleteApplicationEvent,
  updateApplication,
  updateApplicationEvent,
} from "./dashboard-api";
import { ApplicationForm } from "./application-form";
import { EventForm, eventTypeLabel } from "./event-form";

export function ApplicationDetailDialog({
  application,
  companies,
  cycles,
  applications,
  onClose,
  onChange,
}: {
  application: Application;
  companies: Company[];
  cycles: RecruitingCycle[];
  applications: Application[];
  onClose: () => void;
  onChange: () => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<ApplicationEvent | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  return (
    <>
      <Dialog
        title={`${application.company.name} · ${application.roleTitle}`}
        onClose={onClose}
      >
        <div className="detail-status">
          <span className={`chip ${application.completion}`}>
            {application.currentStatus}
          </span>
          <span>{application.completion}</span>
        </div>
        <ApplicationForm
          application={application}
          companies={companies}
          cycles={cycles}
          applications={applications}
          onSave={async (body) => {
            await updateApplication(application.id, body);
            await onChange();
          }}
        />
        <div className="section-heading">
          <h3>Application Event timeline</h3>
          <button className="secondary" onClick={() => setAdding(true)}>
            Add event
          </button>
        </div>
        {application.events.map((item) => (
          <article className="application-event" key={item.id}>
            <div className="timeline-dot" />
            <div>
              <strong>{eventTypeLabel(item.eventType)}</strong>
              <p>
                {item.occurredOn}
                {item.scheduledTime
                  ? ` at ${item.scheduledTime} (${item.timeZone})`
                  : ""}
                {item.roundLabel ? ` · ${item.roundLabel}` : ""}
              </p>
              {item.notes && <p>{item.notes}</p>}
              {item.inboxItemId && (
                <small>Accepted Inbox provenance retained</small>
              )}
            </div>
            <div className="row-actions">
              <button className="text-button" onClick={() => setEditing(item)}>
                Edit
              </button>
              <button
                className="text-button danger"
                onClick={async () => {
                  if (
                    window.confirm("Permanently delete this Application Event?")
                  ) {
                    await deleteApplicationEvent(item.id);
                    await onChange();
                  }
                }}
              >
                Delete
              </button>
            </div>
          </article>
        ))}
        {error && (
          <div className="error" role="alert">
            {error}
          </div>
        )}
        <button className="danger secondary" onClick={() => setDeleting(true)}>
          Delete Application
        </button>
      </Dialog>
      {(adding || editing) && (
        <Dialog
          title={editing ? "Edit Application Event" : "Add Application Event"}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
        >
          <EventForm
            event={editing ?? undefined}
            completed={application.completion === "completed"}
            onSave={async (body) => {
              try {
                if (editing) await updateApplicationEvent(editing.id, body);
                else await createApplicationEvent(application.id, body);
                setAdding(false);
                setEditing(null);
                await onChange();
              } catch (reason) {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "Could not save event",
                );
              }
            }}
          />
        </Dialog>
      )}
      {deleting && (
        <Dialog
          title="Delete Application permanently?"
          onClose={() => setDeleting(false)}
        >
          <p>
            This deletes the Application and all its Application Events. There
            is no undo.
          </p>
          <div className="actions">
            <button className="secondary" onClick={() => setDeleting(false)}>
              Cancel
            </button>
            <button
              className="danger"
              onClick={async () => {
                await deleteApplication(application.id);
                onClose();
                await onChange();
              }}
            >
              Delete permanently
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
