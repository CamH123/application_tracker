import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Modal } from "../components/modal";
import { api, apiUrl, ApiError } from "../lib/api";
import type {
  Application,
  ApplicationEvent,
  Company,
  EventType,
  RecruitingCycle,
} from "../lib/types";

export function meta() {
  return [{ title: "Dashboard · Job Tracker" }];
}
const EVENT_TYPES: EventType[] = [
  "submitted",
  "assessment_scheduled",
  "assessment_completed",
  "recruiter_screen",
  "interview_scheduled",
  "interview_completed",
  "offer_received",
  "offer_accepted",
  "offer_declined",
  "rejected",
  "withdrawn",
  "other",
];
const label = (value: string) =>
  value
    .replaceAll("_", " ")
    .replace(/^./, (character) => character.toUpperCase());

export default function Dashboard() {
  const [applications, setApplications] = useState<Application[]>([]),
    [allApplications, setAllApplications] = useState<Application[]>([]),
    [companies, setCompanies] = useState<Company[]>([]),
    [cycles, setCycles] = useState<RecruitingCycle[]>([]);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Application | null>(null),
    [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState({
    companyId: "",
    recruitingCycleId: "",
    currentStatus: "",
    isReferred: "",
    completion: "all",
  });
  const load = useCallback(async () => {
    try {
      const query = new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value && value !== "all"),
      );
      const [a, all, c, r] = await Promise.all([
        api<{ applications: Application[] }>(`/applications?${query}`),
        api<{ applications: Application[] }>("/applications"),
        api<{ companies: Company[] }>("/companies"),
        api<{ recruitingCycles: RecruitingCycle[] }>("/recruiting-cycles"),
      ]);
      setApplications(a.applications);
      setAllApplications(all.applications);
      setCompanies(c.companies);
      setCycles(r.recruitingCycles);
      setSelected((current) =>
        current
          ? (a.applications.find((item) => item.id === current.id) ?? null)
          : null,
      );
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Could not load Applications",
      );
    } finally {
      setLoading(false);
    }
  }, [filters]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RECRUITING RECORDS</span>
          <h1>Applications</h1>
          <p>Every submission, from first click to final decision.</p>
        </div>
        <div className="actions">
          <a className="button secondary" href={apiUrl("/exports/events.csv")}>
            Export CSV
          </a>
          <button
            disabled={!companies.length || !cycles.length}
            onClick={() => setCreating(true)}
          >
            New Application
          </button>
        </div>
      </div>
      {(!companies.length || !cycles.length) && !loading && (
        <div className="notice">
          Create at least one Company and Recruiting Cycle in{" "}
          <a href="/settings">Settings</a> before adding an Application.
        </div>
      )}
      <section className="filters" aria-label="Application filters">
        <label>
          Recruiting Cycle
          <select
            value={filters.recruitingCycleId}
            onChange={(e) =>
              setFilters({ ...filters, recruitingCycleId: e.target.value })
            }
          >
            <option value="">All cycles</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.season} {c.year}
              </option>
            ))}
          </select>
        </label>
        <label>
          Company
          <select
            value={filters.companyId}
            onChange={(e) =>
              setFilters({ ...filters, companyId: e.target.value })
            }
          >
            <option value="">All companies</option>
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Current Status
          <select
            value={filters.currentStatus}
            onChange={(e) =>
              setFilters({ ...filters, currentStatus: e.target.value })
            }
          >
            <option value="">All statuses</option>
            {[
              "Applied",
              "Assessment pending",
              "Awaiting response",
              "Interviewing",
              "Offer accepted",
              "Offer declined",
              "Rejected",
              "Withdrawn",
            ].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Referral
          <select
            value={filters.isReferred}
            onChange={(e) =>
              setFilters({ ...filters, isReferred: e.target.value })
            }
          >
            <option value="">All</option>
            <option value="true">Referred</option>
            <option value="false">Not referred</option>
          </select>
        </label>
        <label>
          Completion
          <select
            value={filters.completion}
            onChange={(e) =>
              setFilters({ ...filters, completion: e.target.value })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </label>
      </section>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="empty">Loading Applications…</div>
      ) : applications.length === 0 ? (
        <div className="empty">
          <strong>No Applications found</strong>
          <p>Add your first submission or adjust the filters.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Submitted</th>
                <th>Company</th>
                <th>Role</th>
                <th>Recruiting Cycle</th>
                <th>Status</th>
                <th>Referral</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((a) => (
                <tr
                  key={a.id}
                  tabIndex={0}
                  onClick={() => setSelected(a)}
                  onKeyDown={(e) => e.key === "Enter" && setSelected(a)}
                >
                  <td>{a.submissionDate}</td>
                  <td>
                    <strong>{a.company.name}</strong>
                  </td>
                  <td>{a.roleTitle}</td>
                  <td>
                    {a.recruitingCycle.season} {a.recruitingCycle.year}
                  </td>
                  <td>
                    <span className={`chip ${a.completion}`}>
                      {a.currentStatus}
                    </span>
                  </td>
                  <td>{a.isReferred ? "Yes" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {creating && (
        <Modal title="New Application" onClose={() => setCreating(false)}>
          <ApplicationForm
            companies={companies}
            cycles={cycles}
            applications={allApplications}
            onSave={async (body) => {
              await api("/applications", {
                method: "POST",
                body: JSON.stringify(body),
              });
              setCreating(false);
              await load();
            }}
          />
        </Modal>
      )}
      {selected && (
        <ApplicationDetail
          application={selected}
          companies={companies}
          cycles={cycles}
          applications={allApplications}
          onClose={() => setSelected(null)}
          onChange={load}
        />
      )}
    </main>
  );
}

function ApplicationForm({
  application,
  companies,
  cycles,
  applications,
  onSave,
}: {
  application?: Application;
  companies: Company[];
  cycles: RecruitingCycle[];
  applications: Application[];
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [error, setError] = useState(""),
    [duplicate, setDuplicate] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const body = {
      companyId: String(data.get("companyId")),
      recruitingCycleId: String(data.get("recruitingCycleId")),
      roleTitle: String(data.get("roleTitle")),
      submissionDate: String(data.get("submissionDate")),
      applicationUrl: String(data.get("applicationUrl")) || null,
      externalApplicationId: String(data.get("externalApplicationId")) || null,
      location: String(data.get("location")) || null,
      workArrangement: String(data.get("workArrangement")) || null,
      isReferred: data.get("isReferred") === "on",
      notes: String(data.get("notes")) || null,
    };
    const role = body.roleTitle.trim().replace(/\s+/g, " ").toLowerCase();
    if (
      applications.some(
        (a) =>
          a.id !== application?.id &&
          a.company.id === body.companyId &&
          a.recruitingCycle.id === body.recruitingCycleId &&
          a.roleTitle.trim().replace(/\s+/g, " ").toLowerCase() === role,
      )
    ) {
      setDuplicate(true);
      return;
    }
    try {
      setError("");
      await onSave(body);
    } catch (reason) {
      setError(
        reason instanceof ApiError
          ? `${reason.message}${reason.fields.length ? `: ${reason.fields.map((f) => `${f.field} ${f.message}`).join(", ")}` : ""}`
          : "Could not save Application",
      );
    }
  };
  return (
    <form onSubmit={submit} className="form-grid">
      <label>
        Company
        <select
          required
          name="companyId"
          defaultValue={application?.company.id}
        >
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Role title
        <input
          required
          name="roleTitle"
          defaultValue={application?.roleTitle}
        />
      </label>
      <label>
        Recruiting Cycle
        <select
          required
          name="recruitingCycleId"
          defaultValue={application?.recruitingCycle.id}
        >
          {cycles.map((c) => (
            <option key={c.id} value={c.id}>
              {c.season} {c.year}
            </option>
          ))}
        </select>
      </label>
      <label>
        Submission date
        <input
          required
          type="date"
          name="submissionDate"
          defaultValue={application?.submissionDate}
        />
      </label>
      <label>
        Application URL
        <input
          type="url"
          name="applicationUrl"
          defaultValue={application?.applicationUrl ?? ""}
        />
      </label>
      <label>
        External Application ID
        <input
          name="externalApplicationId"
          defaultValue={application?.externalApplicationId ?? ""}
        />
      </label>
      <label>
        Location
        <input name="location" defaultValue={application?.location ?? ""} />
      </label>
      <label>
        Work arrangement
        <select
          name="workArrangement"
          defaultValue={application?.workArrangement ?? ""}
        >
          <option value="">Unset</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="on-site">On-site</option>
        </select>
      </label>
      <label className="check">
        <input
          type="checkbox"
          name="isReferred"
          defaultChecked={application?.isReferred}
        />{" "}
        Referred
      </label>
      <label className="full">
        Application Notes
        <textarea
          name="notes"
          rows={4}
          defaultValue={application?.notes ?? ""}
        />
      </label>
      {duplicate && (
        <div className="warning full" role="alert">
          A duplicate Company, role title, and Recruiting Cycle already exists.
        </div>
      )}
      {error && (
        <div className="error full" role="alert">
          {error}
        </div>
      )}
      <div className="actions full">
        <button>Save Application</button>
      </div>
    </form>
  );
}

function ApplicationDetail({
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
  const [adding, setAdding] = useState(false),
    [editing, setEditing] = useState<ApplicationEvent | null>(null),
    [deleting, setDeleting] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <Modal
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
            await api(`/applications/${application.id}`, {
              method: "PATCH",
              body: JSON.stringify(body),
            });
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
              <strong>{label(item.eventType)}</strong>
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
                    await api(`/application-events/${item.id}`, {
                      method: "DELETE",
                    });
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
      </Modal>
      {(adding || editing) && (
        <Modal
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
                await api(
                  editing
                    ? `/application-events/${editing.id}`
                    : `/applications/${application.id}/events`,
                  {
                    method: editing ? "PATCH" : "POST",
                    body: JSON.stringify(body),
                  },
                );
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
        </Modal>
      )}
      {deleting && (
        <Modal
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
                await api(`/applications/${application.id}`, {
                  method: "DELETE",
                });
                onClose();
                await onChange();
              }}
            >
              Delete permanently
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

function EventForm({
  event,
  completed,
  onSave,
}: {
  event?: ApplicationEvent;
  completed: boolean;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [eventType, setEventType] = useState<EventType>(
    event?.eventType ?? "other",
  );
  const terminalEventTypes: EventType[] = [
    "offer_accepted",
    "offer_declined",
    "rejected",
    "withdrawn",
  ];
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        void onSave({
          eventType,
          occurredOn: String(data.get("occurredOn")),
          scheduledTime:
            eventType === "interview_scheduled"
              ? String(data.get("scheduledTime"))
              : null,
          timeZone:
            eventType === "interview_scheduled"
              ? String(data.get("timeZone"))
              : null,
          roundLabel: String(data.get("roundLabel")) || null,
          notes: String(data.get("notes")) || null,
          acknowledgeReopen: data.get("acknowledgeReopen") === "on",
        });
      }}
    >
      <label>
        Type
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value as EventType)}
        >
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {label(type)}
            </option>
          ))}
        </select>
      </label>
      <label>
        Occurrence date
        <input
          required
          type="date"
          name="occurredOn"
          defaultValue={event?.occurredOn}
        />
      </label>
      {eventType === "interview_scheduled" && (
        <>
          <label>
            Local time
            <input
              required
              type="time"
              name="scheduledTime"
              defaultValue={event?.scheduledTime ?? ""}
            />
          </label>
          <label>
            IANA time zone
            <input
              required
              name="timeZone"
              placeholder="America/Chicago"
              defaultValue={
                event?.timeZone ??
                Intl.DateTimeFormat().resolvedOptions().timeZone
              }
            />
          </label>
        </>
      )}
      {[
        "assessment_scheduled",
        "assessment_completed",
        "interview_scheduled",
        "interview_completed",
      ].includes(eventType) && (
        <label>
          Round label
          <input
            name="roundLabel"
            placeholder="Technical 1"
            defaultValue={event?.roundLabel ?? ""}
          />
        </label>
      )}
      <label className="full">
        Notes
        <textarea name="notes" defaultValue={event?.notes ?? ""} />
      </label>
      {!event && completed && !terminalEventTypes.includes(eventType) && (
        <label className="check full">
          <input type="checkbox" required name="acknowledgeReopen" /> I
          acknowledge this correction or reopening.
        </label>
      )}
      <button>Save Application Event</button>
    </form>
  );
}
