import { useCallback, useEffect, useState } from "react";
import type { InboxItem } from "../../lib/types";
import { listInboxItems, type InboxTab } from "./inbox-api";

export function useInboxData() {
  const [tab, setTab] = useState<InboxTab>("active");
  const [items, setItems] = useState<InboxItem[]>([]);
  const [selected, setSelected] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const result = await listInboxItems(tab);
      setItems(result.inboxItems);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load Inbox",
      );
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useEffect(() => {
    if (tab !== "active") return;
    const timer = window.setInterval(() => void load(), 5000);
    return () => window.clearInterval(timer);
  }, [tab, load]);

  return {
    error,
    items,
    load,
    loading,
    selected,
    setSelected,
    setTab,
    tab,
  };
}
