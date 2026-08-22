import { CompanyManager } from "./company-manager";
import { CycleManager } from "./cycle-manager";
import { IntegrationSettings } from "./integration-settings";
import { useSettingsData } from "./use-settings-data";

export function meta() {
  return [{ title: "Settings · Job Tracker" }];
}

export default function Settings() {
  const {
    activities,
    companies,
    configured,
    connection,
    cycles,
    error,
    load,
    ollama,
  } = useSettingsData();

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">LOCAL CONFIGURATION</span>
          <h1>Settings</h1>
          <p>Manage integrations and reusable recruiting data.</p>
        </div>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <IntegrationSettings
        activities={activities}
        configured={configured}
        connection={connection}
        ollama={ollama}
        reload={load}
      />
      <section className="settings-grid">
        <CompanyManager companies={companies} reload={load} />
        <CycleManager cycles={cycles} reload={load} />
      </section>
    </main>
  );
}
