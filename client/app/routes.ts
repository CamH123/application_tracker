import {
  type RouteConfig,
  index,
  route,
} from "@react-router/dev/routes";

export default [
  index("pages/dashboard/dashboard.tsx"),
  route("inbox", "pages/inbox/inbox.tsx"),
  route("settings", "pages/settings/settings.tsx"),
] satisfies RouteConfig;
