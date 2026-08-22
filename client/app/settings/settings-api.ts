import { api, apiUrl } from "../lib/api";
import type { Company, RecruitingCycle, SyncActivity } from "../lib/types";

export type GmailConnection = { gmailAddress: string } | null;
export type OllamaHealth = { available: boolean; message?: string };

export const listSettingsData = async () => {
  const [companyData, cycleData, syncData, gmailData, health] =
    await Promise.all([
      api<{ companies: Company[] }>("/companies"),
      api<{ recruitingCycles: RecruitingCycle[] }>("/recruiting-cycles"),
      api<{ syncActivities: SyncActivity[] }>("/syncs"),
      api<{
        connection: GmailConnection;
        initialSyncConfigured: boolean;
      }>("/gmail/connection"),
      api<OllamaHealth>("/integrations/ollama/health"),
    ]);
  return { companyData, cycleData, gmailData, health, syncData };
};

export const gmailOAuthStartUrl = () => apiUrl("/gmail/oauth/start");

export const disconnectGmail = () =>
  api("/gmail/connection", { method: "DELETE" });

export const startSync = (range: {
  start: FormDataEntryValue | null;
  end: FormDataEntryValue | null;
}) => api("/syncs", { method: "POST", body: JSON.stringify(range) });

export const createCompany = (input: {
  name: FormDataEntryValue | null;
  candidatePortalUrl: FormDataEntryValue | null;
}) => api("/companies", { method: "POST", body: JSON.stringify(input) });

export const updateCompany = (
  id: string,
  input: {
    name: FormDataEntryValue | null;
    candidatePortalUrl: FormDataEntryValue | null;
  },
) => api(`/companies/${id}`, { method: "PATCH", body: JSON.stringify(input) });

export const mergeCompany = (id: string, survivorId: string) =>
  api(`/companies/${id}/merge`, {
    method: "POST",
    body: JSON.stringify({ survivorId }),
  });

export const deleteCompany = (id: string) =>
  api(`/companies/${id}`, { method: "DELETE" });

export const createRecruitingCycle = (input: {
  season: FormDataEntryValue | null;
  year: number;
}) =>
  api("/recruiting-cycles", { method: "POST", body: JSON.stringify(input) });

export const updateRecruitingCycle = (
  id: string,
  input: { season: FormDataEntryValue | null; year: number },
) =>
  api(`/recruiting-cycles/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const deleteRecruitingCycle = (id: string) =>
  api(`/recruiting-cycles/${id}`, { method: "DELETE" });
