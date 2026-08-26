import { Dialog } from "../../components/dialog";
import { createApplication, eventsCsvUrl } from "./dashboard-api";
import { ApplicationDetailDialog } from "./application-detail-dialog";
import { ApplicationForm } from "./application-form";
import { ApplicationsTable } from "./applications-table";
import { DashboardFilters } from "./dashboard-filters";
import { useDashboardData } from "./use-dashboard-data";

export function meta() {
  return [{ title: "Dashboard · Job Tracker" }];
}

export default function Dashboard() {
  const {
    applications,
    allApplications,
    companies,
    cycles,
    creating,
    error,
    filters,
    load,
    loading,
    selected,
    setCreating,
    setFilters,
    setSelected,
  } = useDashboardData();

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">RECRUITING RECORDS</span>
          <h1>Applications</h1>
          <p>Every submission, from first click to final decision.</p>
        </div>
        <div className="actions">
          <a className="button secondary" href={eventsCsvUrl()}>
            Export CSV
          </a>
          <button onClick={() => setCreating(true)}>New Application</button>
        </div>
      </div>
      <DashboardFilters
        companies={companies}
        cycles={cycles}
        filters={filters}
        onChange={setFilters}
      />
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
        <ApplicationsTable applications={applications} onSelect={setSelected} />
      )}
      {creating && (
        <Dialog title="New Application" onClose={() => setCreating(false)}>
          <ApplicationForm
            companies={companies}
            cycles={cycles}
            applications={allApplications}
            onSave={async (body) => {
              await createApplication(body);
              setCreating(false);
              await load();
            }}
          />
        </Dialog>
      )}
      {selected && (
        <ApplicationDetailDialog
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
