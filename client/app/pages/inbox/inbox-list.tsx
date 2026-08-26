import type { InboxItem } from "../../lib/types";

export function InboxList({
  items,
  onSelect,
}: {
  items: InboxItem[];
  onSelect: (item: InboxItem) => void;
}) {
  return (
    <div className="card-list">
      {items.map((item) => (
        <button
          className="inbox-card"
          key={item.id}
          onClick={() => onSelect(item)}
        >
          <div>
            <span className={`state ${item.state}`}>{item.state}</span>
            <strong>{String(item.proposal.action).replaceAll("_", " ")}</strong>
            <p>{item.rationale}</p>
          </div>
          <div>
            <span>
              {item.confidence === null
                ? "—"
                : `${Math.round(item.confidence * 100)}%`}
            </span>
            {item.state === "accepted" && (
              <small>
                {item.editedBeforeAcceptance
                  ? "Edited before acceptance"
                  : "Accepted unchanged"}
              </small>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
