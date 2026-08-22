import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("layout/shell.tsx", [
    index("routes/dashboard.tsx"),
    route("inbox", "routes/inbox.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
