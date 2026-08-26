import { useCallback, useEffect, useState } from "react";
import type { Company, RecruitingCycle, SyncActivity } from "../../lib/types";
import {
  listSettingsData,
  type GmailConnection,
  type OllamaHealth,
} from "./settings-api";

export function useSettingsData() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [cycles, setCycles] = useState<RecruitingCycle[]>([]);
  const [activities, setActivities] = useState<SyncActivity[]>([]);
  const [connection, setConnection] = useState<GmailConnection>(null);
  const [configured, setConfigured] = useState(false);
  const [ollama, setOllama] = useState<OllamaHealth | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { companyData, cycleData, gmailData, health, syncData } =
        await listSettingsData();
      setCompanies(companyData.companies);
      setCycles(cycleData.recruitingCycles);
      setActivities(syncData.syncActivities);
      setConnection(gmailData.connection);
      setConfigured(gmailData.initialSyncConfigured);
      setOllama(health);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load Settings",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!activities.some((item) => item.state === "running")) return;
    const timer = window.setInterval(() => void load(), 2000);
    return () => window.clearInterval(timer);
  }, [activities, load]);

  return {
    activities,
    companies,
    configured,
    connection,
    cycles,
    error,
    load,
    ollama,
  };
}
