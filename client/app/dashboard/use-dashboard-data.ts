import { useCallback, useEffect, useState } from "react";
import type { Application, Company, RecruitingCycle } from "../lib/types";
import {
  listApplications,
  listCompanies,
  listRecruitingCycles,
  type DashboardFilters,
} from "./dashboard-api";

const initialFilters: DashboardFilters = {
  companyId: "",
  recruitingCycleId: "",
  currentStatus: "",
  isReferred: "",
  completion: "all",
};

export function useDashboardData() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [allApplications, setAllApplications] = useState<Application[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cycles, setCycles] = useState<RecruitingCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Application | null>(null);
  const [creating, setCreating] = useState(false);
  const [filters, setFilters] = useState<DashboardFilters>(initialFilters);

  const load = useCallback(async () => {
    try {
      const [filtered, all, companyData, cycleData] = await Promise.all([
        listApplications(filters),
        listApplications(),
        listCompanies(),
        listRecruitingCycles(),
      ]);
      setApplications(filtered.applications);
      setAllApplications(all.applications);
      setCompanies(companyData.companies);
      setCycles(cycleData.recruitingCycles);
      setSelected((current) =>
        current
          ? (filtered.applications.find((item) => item.id === current.id) ??
            null)
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

  return {
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
  };
}
