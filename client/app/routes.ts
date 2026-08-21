import {
  type RouteConfig,
  index,
  layout,
  route,
} from "@react-router/dev/routes";

export default [
  layout("components/shell.tsx", [
    index("routes/home.tsx"),
    route("inbox", "routes/inbox.tsx"),
    route("settings", "routes/settings.tsx"),
  ]),
] satisfies RouteConfig;
