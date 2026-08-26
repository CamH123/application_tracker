import { useId, useMemo, useState, type SyntheticEvent } from "react";
import { ApiError } from "../../lib/api-client";
import type { Application, Company, RecruitingCycle } from "../../lib/types";
import type { ApplicationInput } from "./dashboard-api";

const seasons = ["Spring", "Summer", "Fall", "Winter"] as const;
const cyclePattern = /^(Spring|Summer|Fall|Winter)\s+(\d{4})$/;

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
  const [recruitingCycle, setRecruitingCycle] = useState("Summer 2027");
  const [cycleSuggestionsOpen, setCycleSuggestionsOpen] = useState(false);
  const cycleSuggestionsId = useId();
  const cycleOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...cycles.map((cycle) => `${cycle.season} ${cycle.year}`),
          ...[2027, 2028, 2029].flatMap((year) =>
            seasons.map((season) => `${season} ${year}`),
          ),
        ]),
      ),
    [cycles],
  );

  const submit = async (
    event: SyntheticEvent<HTMLFormElement, SubmitEvent>,
  ) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const shared = {
      roleTitle: String(data.get("roleTitle")),
      submissionDate: String(data.get("submissionDate")),
      applicationUrl: String(data.get("applicationUrl")) || null,
      externalApplicationId: String(data.get("externalApplicationId")) || null,
      location: String(data.get("location")) || null,
      workArrangement: String(data.get("workArrangement")) || null,
      isReferred: data.get("isReferred") === "on",
      notes: String(data.get("notes")) || null,
    };
    const match = cyclePattern.exec(String(data.get("recruitingCycle")).trim());
    if (
      !application &&
      (!match || Number(match[2]) < 2000 || Number(match[2]) > 2200)
    ) {
      setError(
        "Recruiting Cycle: Use Season YYYY with a year from 2000 to 2200",
      );
      return;
    }
    const body = application
      ? {
          ...shared,
          companyId: String(data.get("companyId")),
          recruitingCycleId: String(data.get("recruitingCycleId")),
        }
      : {
          ...shared,
          companyName: String(data.get("companyName")),
          recruitingCycle: { season: match![1], year: Number(match![2]) },
        };
    const role = shared.roleTitle.trim().replace(/\s+/g, " ").toLowerCase();
    const companyId = String(data.get("companyId"));
    const recruitingCycleId = String(data.get("recruitingCycleId"));
    if (
      application &&
      applications.some(
        (item) =>
          item.id !== application.id &&
          item.company.id === companyId &&
          item.recruitingCycle.id === recruitingCycleId &&
          item.roleTitle.trim().replace(/\s+/g, " ").toLowerCase() === role,
      )
    ) {
      setDuplicate(true);
      return;
    }
    try {
      setError("");
      setDuplicate(false);
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
        {application ? (
          <select
            required
            name="companyId"
            defaultValue={application.company.id}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </select>
        ) : (
          <input required name="companyName" autoComplete="organization" />
        )}
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
        {application ? (
          <select
            required
            name="recruitingCycleId"
            defaultValue={application.recruitingCycle.id}
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.season} {cycle.year}
              </option>
            ))}
          </select>
        ) : (
          <div className="cycle-combobox">
            <input
              required
              name="recruitingCycle"
              value={recruitingCycle}
              role="combobox"
              aria-autocomplete="list"
              aria-controls={cycleSuggestionsId}
              aria-expanded={cycleSuggestionsOpen}
              onChange={(event) => {
                setRecruitingCycle(event.target.value);
                setCycleSuggestionsOpen(true);
              }}
              onFocus={() => setCycleSuggestionsOpen(true)}
              onBlur={() => setCycleSuggestionsOpen(false)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setCycleSuggestionsOpen(false);
              }}
            />
            {cycleSuggestionsOpen && (
              <div
                id={cycleSuggestionsId}
                className="cycle-suggestions"
                role="listbox"
                aria-label="Suggested recruiting cycles"
              >
                {cycleOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    className="cycle-suggestion"
                    aria-selected={option === recruitingCycle}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setRecruitingCycle(option);
                      setCycleSuggestionsOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
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
