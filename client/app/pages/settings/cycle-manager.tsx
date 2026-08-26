import { useState } from "react";
import type { RecruitingCycle } from "../../lib/types";
import {
  createRecruitingCycle,
  deleteRecruitingCycle,
  updateRecruitingCycle,
} from "./settings-api";

const seasons = ["Spring", "Summer", "Fall", "Winter"];

export function CycleManager({
  cycles,
  reload,
}: {
  cycles: RecruitingCycle[];
  reload: () => Promise<void>;
}) {
  return (
    <section className="settings-card">
      <h2>Recruiting Cycles</h2>
      <form
        className="inline-form"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          await createRecruitingCycle({
            season: data.get("season"),
            year: Number(data.get("year")),
          });
          await reload();
        }}
      >
        <label>
          Season
          <select name="season">
            {seasons.map((season) => (
              <option key={season}>{season}</option>
            ))}
          </select>
        </label>
        <label>
          Year
          <input
            name="year"
            type="number"
            min="2000"
            max="2200"
            required
            defaultValue={new Date().getFullYear() + 1}
          />
        </label>
        <button>Add cycle</button>
      </form>
      {cycles.map((cycle) => (
        <CycleRow key={cycle.id} cycle={cycle} reload={reload} />
      ))}
    </section>
  );
}

function CycleRow({
  cycle,
  reload,
}: {
  cycle: RecruitingCycle;
  reload: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <article className="management-row">
      {editing ? (
        <form
          className="inline-form"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            await updateRecruitingCycle(cycle.id, {
              season: data.get("season"),
              year: Number(data.get("year")),
            });
            setEditing(false);
            await reload();
          }}
        >
          <select name="season" defaultValue={cycle.season}>
            {seasons.map((season) => (
              <option key={season}>{season}</option>
            ))}
          </select>
          <input name="year" type="number" defaultValue={cycle.year} />
          <button>Save</button>
        </form>
      ) : (
        <>
          <strong>
            {cycle.season} {cycle.year}
          </strong>
          <div className="row-actions">
            <button className="text-button" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button
              className="text-button danger"
              onClick={async () => {
                if (
                  window.confirm(
                    `Delete ${cycle.season} ${cycle.year}? Applications must be moved first.`,
                  )
                ) {
                  await deleteRecruitingCycle(cycle.id);
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
