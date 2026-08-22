## Context

See proposal.md for the motivation. React Router currently maps an index route and two named routes directly to large files in `client/app/routes`. The index route is named `home.tsx` even though the screen calls itself Dashboard. `Modal` is a reusable browser-dialog primitive, while `Shell` is the route-layout component selected by the route configuration.

The refactor must preserve the existing browser URLs, route metadata, HTTP calls, polling behavior, and rendered interaction flow. It must not introduce API-contract or SSR changes.

## Goals / Non-Goals

**Goals:**

- Make each feature's UI, data loading, and API operations discoverable from one descriptive directory.
- Keep React Router adapter files small and focused on framework exports.
- Separate feature screen composition, request functions, stateful data hooks, and focused UI components.
- Reflect Dashboard in the index route's source filename without changing the `/` URL.

**Non-Goals:**

- Changing backend endpoints, shared frontend/backend typing, or server-side data loading.
- Introducing a client state-management, query-cache, form, or component-library dependency.
- Redesigning UI, changing polling cadence, or altering error and confirmation behavior.
- Creating generic `page.tsx`, `components`, or `hooks` folders inside every feature.

## Decisions

### Use descriptive, top-level feature directories

Create `client/app/dashboard`, `client/app/inbox`, and `client/app/settings`. Each feature's main screen takes the feature name (`dashboard.tsx`, `inbox.tsx`, and `settings.tsx`), and supporting files use explicit responsibility-based names.

The resulting file layout is:

```text
client/app/
  routes/
    dashboard.tsx
    inbox.tsx
    settings.tsx
  dashboard/
    dashboard.tsx
    dashboard-api.ts
    use-dashboard-data.ts
    dashboard-filters.tsx
    applications-table.tsx
    application-form.tsx
    application-detail-dialog.tsx
    event-form.tsx
  inbox/
    inbox.tsx
    inbox-api.ts
    use-inbox-data.ts
    inbox-list.tsx
    review-inbox-item-dialog.tsx
    proposal-editor.tsx
  settings/
    settings.tsx
    settings-api.ts
    use-settings-data.ts
    integration-settings.tsx
    sync-form.tsx
    sync-activity-list.tsx
    company-manager.tsx
    cycle-manager.tsx
  components/ui/modal.tsx
  layout/shell.tsx
```

Files may remain combined when a split would create a private component with little independent behavior; the names above are the intended responsibility boundaries, not a requirement to manufacture wrappers. A one-off hook remains at the feature root rather than in a `hooks/` directory.

Alternative considered: a `modules/<feature>` nesting level with `page.tsx` and subdirectories. It adds indirection without meaningful context in this small client, and `page.tsx` hides which feature renders.

### Keep routes as framework adapters

`routes/dashboard.tsx`, `routes/inbox.tsx`, and `routes/settings.tsx` re-export the feature screen and `meta` function. `routes.ts` maps the index route to `routes/dashboard.tsx`; the public `/`, `/inbox`, and `/settings` URLs do not change.

Alternative considered: register feature files directly in `routes.ts`. This removes the adapter but makes framework-owned route definitions point into implementation directories and weakens the clear route boundary.

### Put requests behind feature-local API files

Move endpoint paths and request construction from screens and components into `dashboard-api.ts`, `inbox-api.ts`, and `settings-api.ts`, retaining the existing shared low-level `lib/api.ts` transport. Screens and components call named feature operations instead of constructing endpoint strings themselves.

This is a local organization change; current request/response types remain in `lib/types.ts` until a separate contract-unification change is approved.

Alternative considered: leave API calls in UI components. That preserves the present duplication and keeps request details coupled to rendering and modal state.

### Retain the distinction between UI primitives and application layout

Move `Modal` to `components/ui/modal.tsx` because it has no recruiting-domain knowledge. Move `Shell` to `layout/shell.tsx` because it is the application-wide layout route and contains navigation plus global startup/count behavior. Update `routes.ts` to reference the new shell location.

Feature-owned dialog components compose the shared modal; they do not become globally shared simply because they are dialogs.

## Risks / Trade-offs

- [Changed relative imports can break route resolution or omit a `meta` export] → Keep adapters deliberately minimal and run client type checking after each feature migration.
- [Moving stateful components can accidentally change data reload, selected-item, or dialog-unmount behavior] → Move behavior intact first; extract only along existing component boundaries and verify the relevant user flow.
- [API helpers can become a second abstraction layer without reducing complexity] → Limit them to named wrappers around endpoints currently used by the feature; keep transport concerns in `lib/api.ts`.
- [A mechanical reorganization produces many renamed files] → Review by feature and use version-control renames where possible, keeping each feature's behavior unchanged.

## Migration Plan

1. Create the destination shared UI/layout locations and update their imports and route-layout reference.
2. Migrate Dashboard first: rename the index route adapter, extract dashboard-owned behavior into descriptive files, and retain the index URL.
3. Migrate Inbox and Settings using the same route-adapter and feature-local API conventions.
4. Remove the superseded route and component locations only after all imports use their replacements.
5. Run client type checks and tests, then manually exercise Dashboard application/event dialogs, Inbox review actions, Settings management actions, navigation, and polling.

Rollback consists of reverting the refactor change as a unit; no data migration, API migration, or persistent state change occurs.
