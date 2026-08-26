import { useState, type SyntheticEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { Application, Company, RecruitingCycle } from "../../lib/types";
import type { ApplicationInput } from "./dashboard-api";

export function ApplicationForm({
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
  onSave: (body: ApplicationInput) => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);

  const submit = async (event: SyntheticEvent<HTMLFormElement, SubmitEvent>) => {
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
        (item) =>
          item.id !== application?.id &&
          item.company.id === body.companyId &&
          item.recruitingCycle.id === body.recruitingCycleId &&
          item.roleTitle.trim().replace(/\s+/g, " ").toLowerCase() === role,
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
          ? `${reason.message}${reason.fields.length ? `: ${reason.fields.map((field) => `${field.field} ${field.message}`).join(", ")}` : ""}`
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
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
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
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.season} {cycle.year}
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
