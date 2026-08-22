import type { Company, RecruitingCycle } from "../lib/types";
import type { DashboardFilters } from "./dashboard-api";

interface DashboardFiltersProps {
  companies: Company[];
  cycles: RecruitingCycle[];
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
}

export function DashboardFilters({
  companies,
  cycles,
  filters,
  onChange,
}: DashboardFiltersProps) {
  return (
    <section className="filters" aria-label="Application filters">
      <label>
        Recruiting Cycle
        <select
          value={filters.recruitingCycleId}
          onChange={(event) =>
            onChange({ ...filters, recruitingCycleId: event.target.value })
          }
        >
          <option value="">All cycles</option>
          {cycles.map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.season} {cycle.year}
            </option>
          ))}
        </select>
      </label>
      <label>
        Company
        <select
          value={filters.companyId}
          onChange={(event) =>
            onChange({ ...filters, companyId: event.target.value })
          }
        >
          <option value="">All companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Current Status
        <select
          value={filters.currentStatus}
          onChange={(event) =>
            onChange({ ...filters, currentStatus: event.target.value })
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
          ].map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
      </label>
      <label>
        Referral
        <select
          value={filters.isReferred}
          onChange={(event) =>
            onChange({ ...filters, isReferred: event.target.value })
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
          onChange={(event) =>
            onChange({ ...filters, completion: event.target.value })
          }
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
        </select>
      </label>
    </section>
  );
}
