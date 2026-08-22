import { useState } from "react";
import type { Company } from "../lib/types";
import {
  createCompany,
  deleteCompany,
  mergeCompany,
  updateCompany,
} from "./settings-api";

export function CompanyManager({
  companies,
  reload,
}: {
  companies: Company[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="settings-card">
      <h2>Companies</h2>
      <form
        className="stack-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await createCompany({
            name: data.get("name"),
            candidatePortalUrl: data.get("url") || null,
          });
          event.currentTarget.reset();
          await reload();
        }}
      >
        <label>
          Name
          <input required name="name" />
        </label>
        <label>
          Candidate-portal URL
          <input type="url" name="url" />
        </label>
        <button>Add Company</button>
      </form>
      {companies.map((company) => (
        <CompanyRow
          key={company.id}
          company={company}
          companies={companies}
          reload={reload}
        />
      ))}
    </section>
  );
}

function CompanyRow({
  company,
  companies,
  reload,
}: {
  company: Company;
  companies: Company[];
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="management-row">
      {editing ? (
        <form
          className="stack-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await updateCompany(company.id, {
              name: data.get("name"),
              candidatePortalUrl: data.get("url") || null,
            });
            setEditing(false);
            await reload();
          }}
        >
          <label>
            Name
            <input name="name" required defaultValue={company.name} />
          </label>
          <label>
            Candidate-portal URL
            <input
              name="url"
              type="url"
              defaultValue={company.candidatePortalUrl ?? ""}
            />
          </label>
          <div className="actions">
            <button>Save</button>
            <button
              type="button"
              className="secondary"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <>
          <div>
            <strong>{company.name}</strong>
            <small>
              {company.candidatePortalUrl ?? "No candidate-portal URL"}
            </small>
          </div>
          <div className="row-actions">
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <select
              aria-label={`Merge ${company.name} into another Company`}
              defaultValue=""
              onChange={async (event) => {
                if (!event.target.value) return;
                const survivor = companies.find(
                  (item) => item.id === event.target.value,
                )!;
                if (
                  window.confirm(
                    `Merge ${company.name} into ${survivor.name}? All Applications will move to the survivor.`,
                  )
                ) {
                  await mergeCompany(company.id, survivor.id);
                  await reload();
                }
              }}
            >
              <option value="">Merge into…</option>
              {companies
                .filter((item) => item.id !== company.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </select>
            <button
              className="text-button danger"
              onClick={async () => {
                if (window.confirm(`Permanently delete ${company.name}?`)) {
                  await deleteCompany(company.id);
                  await reload();
                }
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </article>
  );
}
