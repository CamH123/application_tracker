import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router";
import { api } from "../lib/api";

export default function Shell() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let active = true;
    const refresh = () =>
      api<{ count: number }>("/inbox-items/count")
        .then((value) => active && setCount(value.count))
        .catch(() => {});
    void refresh();
    void api<{ connection: unknown; initialSyncConfigured: boolean }>(
      "/gmail/connection",
    )
      .then((status) => {
        if (status.initialSyncConfigured)
          return api("/syncs/startup", { method: "POST" });
      })
      .catch(() => {});
    const timer = window.setInterval(refresh, 5000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);
  return (
    <div className="app-frame">
      <header className="topbar">
        <div>
          <span className="eyebrow">LOCAL WORKSPACE</span>
          <strong>Job Tracker</strong>
        </div>
        <nav aria-label="Primary navigation">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/inbox">
            Inbox{" "}
            {count > 0 && (
              <span
                className="badge"
                aria-label={`${count} active Inbox Items`}
              >
                {count}
              </span>
            )}
          </NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
      </header>
      <Outlet />
    </div>
  );
}
