import { useEffect } from "react";
import { getGmailConnection, startSyncOnAppMount } from "./inbox-api";

export function useSyncOnAppMount() {
  useEffect(() => {
    void getGmailConnection()
      .then((status) => {
        if (status.initialSyncConfigured) return startSyncOnAppMount();
      })
      .catch(() => {});
  }, []);
}
