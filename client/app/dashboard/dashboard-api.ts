import { api, apiUrl } from "../lib/api";
import type {
  Application,
  ApplicationEvent,
  Company,
  RecruitingCycle,
} from "../lib/types";

export interface DashboardFilters {
  companyId: string;
  recruitingCycleId: string;
  currentStatus: string;
  isReferred: string;
  completion: string;
}

export type ApplicationInput = Record<string, unknown>;
export type EventInput = Record<string, unknown>;

export const listApplications = async (filters?: DashboardFilters) => {
  const query = filters
    ? new URLSearchParams(
        Object.entries(filters).filter(([, value]) => value && value !== "all"),
      )
    : undefined;
  const suffix = query ? `?${query}` : "";
  return api<{ applications: Application[] }>(`/applications${suffix}`);
};

export const listCompanies = () => api<{ companies: Company[] }>("/companies");

export const listRecruitingCycles = () =>
  api<{ recruitingCycles: RecruitingCycle[] }>("/recruiting-cycles");

export const createApplication = (input: ApplicationInput) =>
  api("/applications", { method: "POST", body: JSON.stringify(input) });

export const updateApplication = (id: string, input: ApplicationInput) =>
  api(`/applications/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteApplication = (id: string) =>
  api(`/applications/${id}`, { method: "DELETE" });

export const createApplicationEvent = (
  applicationId: string,
  input: EventInput,
) =>
  api(`/applications/${applicationId}/events`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateApplicationEvent = (id: string, input: EventInput) =>
  api(`/application-events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteApplicationEvent = (id: string) =>
  api(`/application-events/${id}`, { method: "DELETE" });

export const eventsCsvUrl = () => apiUrl("/exports/events.csv");
