import { InboxList } from "./inbox-list";
import { ReviewInboxItemDialog } from "./review-inbox-item-dialog";
import { useInboxData } from "./use-inbox-data";

export function meta() {
  return [{ title: "Inbox · Job Tracker" }];
}

export default function Inbox() {
  const { error, items, load, loading, selected, setSelected, setTab, tab } =
    useInboxData();

  return (
    <main className="page">
      <div className="page-heading">
        <div>
          <span className="eyebrow">REVIEW QUEUE</span>
          <h1>Inbox</h1>
          <p>Gmail proposals wait here until you decide.</p>
        </div>
      </div>
      <div className="tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "active"}
          onClick={() => setTab("active")}
        >
          Active
        </button>
        <button
          role="tab"
          aria-selected={tab === "history"}
          onClick={() => setTab("history")}
        >
          History
        </button>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="empty">Loading Inbox…</div>
      ) : !items.length ? (
        <div className="empty">
          <strong>
            {tab === "active"
              ? "No active Inbox Items"
              : "No Inbox History yet"}
          </strong>
          <p>
            {tab === "active"
              ? "New recruiting detections will wait here for review."
              : "Accepted and dismissed proposals will appear here."}
          </p>
        </div>
      ) : (
        <InboxList items={items} onSelect={setSelected} />
      )}
      {selected && (
        <ReviewInboxItemDialog
          item={selected}
          active={selected.state === "active"}
          onClose={() => setSelected(null)}
          onChange={async () => {
            setSelected(null);
            await load();
          }}
        />
      )}
    </main>
  );
}
