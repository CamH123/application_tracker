import type { Application } from "../lib/types";

export function ApplicationsTable({
  applications,
  onSelect,
}: {
  applications: Application[];
  onSelect: (application: Application) => void;
}) {
  return (
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
          {applications.map((application) => (
            <tr
              key={application.id}
              tabIndex={0}
              onClick={() => onSelect(application)}
              onKeyDown={(event) =>
                event.key === "Enter" && onSelect(application)
              }
            >
              <td>{application.submissionDate}</td>
              <td>
                <strong>{application.company.name}</strong>
              </td>
              <td>{application.roleTitle}</td>
              <td>
                {application.recruitingCycle.season}{" "}
                {application.recruitingCycle.year}
              </td>
              <td>
                <span className={`chip ${application.completion}`}>
                  {application.currentStatus}
                </span>
              </td>
              <td>{application.isReferred ? "Yes" : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
