import { useEffect, useState } from "react";
import { getActiveInboxItemCount } from "./inbox-api";

export function useInboxBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;
    const refresh = () =>
      getActiveInboxItemCount()
        .then((value) => active && setCount(value.count))
        .catch(() => {});

    void refresh();
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  return count;
}
