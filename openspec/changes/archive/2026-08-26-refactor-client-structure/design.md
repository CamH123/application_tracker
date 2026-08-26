## Context

See proposal.md for motivation. The client currently has feature folders at `app/dashboard`, `app/inbox`, and `app/settings`, but React Router targets three re-export-only modules in `app/routes/`. A `layout/shell.tsx` route wrapper owns navigation, inbox badge polling, and mount-time Gmail sync requests. The generic transport helper is named `lib/api.ts`, which is easy to confuse with feature-specific `*-api.ts` modules. Unit and end-to-end tests live in separate ad-hoc locations.

The refactor must preserve the public `/`, `/inbox`, and `/settings` URLs, route metadata, current API calls, polling cadence, dialog behavior, and test coverage.

## Goals / Non-Goals

**Goals:**

- Make each page's screen, endpoint operations, state hooks, and private UI easy to locate under a descriptive page directory.
- Make `root.tsx` the single persistent application frame without embedding inbox operational details in its component body.
- Make generic transport code, page endpoint wrappers, and tests unambiguous by name and location.

**Non-Goals:**

- Changing server endpoints, response contracts, Gmail sync semantics, polling cadence, or rendered workflows.
- Adding a state-management, query-cache, form, or UI-library dependency.
- Consolidating page-specific forms and components into generic abstractions.
- Changing the application URLs or adding route-level data loading.

## Decisions

### Use descriptive page directories and route to their screen modules directly

Move feature code to `app/pages/dashboard`, `app/pages/inbox`, and `app/pages/settings`. The screen in each directory retains its descriptive name: `dashboard.tsx`, `inbox.tsx`, and `settings.tsx`. Supporting files retain current responsibility-based names such as `dashboard-api.ts` and `use-dashboard-data.ts`.

`routes.ts` will reference these screen modules directly, eliminating the re-export-only `app/routes/` directory. The routes remain `/`, `/inbox`, and `/settings`.

Alternative considered: `page.tsx` within every directory. Descriptive filenames make search results and imports clearer, and the directory already establishes page ownership.

### Make the root route own chrome; make inbox behavior inbox-owned hooks

Move the persistent application frame and navigation from `layout/shell.tsx` to `root.tsx`, then remove the route-layout wrapper from `routes.ts`. Extract the two stateful behaviors into inbox hooks:

- `use-inbox-badge.ts` fetches the active inbox-item count on mount, refreshes it every five seconds, and cleans up the timer.
- `use-sync-on-app-mount.ts` requests the server's startup-sync endpoint after confirming a prior successful sync is configured.

`root.tsx` calls the hooks and renders their results, but does not contain fetch, timer, or sync orchestration details. The hooks stay in the inbox page directory because their endpoints and meaning belong to the inbox/Gmail-sync domain, even though the app frame displays the badge.

Alternative considered: placing this behavior in `lib/` or `utils/`. Those locations imply reusable framework-neutral helpers, while React lifecycle effects, state, and inbox policy are feature-owned behavior.

### Distinguish low-level transport from page endpoint operations

Rename `lib/api.ts` to `lib/api-client.ts`. It continues to provide only shared HTTP mechanics: base URL resolution, fetch execution, JSON decoding, and `ApiError` construction.

Keep page endpoint modules named `<page>-api.ts`. They expose domain operations such as `createApplication`, `listInboxItems`, and `disconnectGmail`, built on `api-client.ts`. This retains the useful distinction between generic transport and domain-specific requests without adding another abstraction layer.

### Rename the shared native-dialog primitive

Move `components/ui/modal.tsx` to `components/dialog.tsx` and rename its exported component to `Dialog`. Update all imports and CSS class names from modal terminology to dialog terminology. Feature-specific components may keep names such as `ApplicationDetailDialog` because they compose the shared primitive.

Alternative considered: `Dialogue`. `Dialog` matches the native HTML `<dialog>` element and established UI terminology.

### Centralize tests by test type

Move client tests to `client/tests/unit/` and `client/tests/e2e/`. Preserve their descriptive filenames and organize unit tests by the source area they verify (for example, `tests/unit/lib/api-client.test.ts`). Update the Vitest exclusion to omit `tests/e2e/**` and Playwright's `testDir` to `./tests/e2e`.

Alternative considered: colocated unit tests. A dedicated test directory is the chosen project convention for this refactor; organizing by source area retains discoverability.

## Risks / Trade-offs

- [Moved files leave stale imports or route references] → Update route configuration and imports as each destination becomes authoritative; run type checking after the migration.
- [Moving the shell into root changes outlet or error-boundary presentation] → Preserve the existing document layout and route error boundary while moving only the persistent frame.
- [Extracted hooks subtly change request timing or cleanup] → Preserve immediate count refresh, five-second interval, silent error handling, one mount-time sync request, and cleanup behavior.
- [Test relocation causes a runner to discover or exclude the wrong files] → Explicitly update both Vitest and Playwright configuration, then run their commands.
- [File moves inflate the diff] → Use version-control-aware moves where practical and avoid behavioral cleanup during the structural migration.

## Migration Plan

1. Create the destination page, shared-component, and test directories; move files without changing their behavior.
2. Rename the generic transport module and update all imports.
3. Extract inbox badge and mount-time sync behavior into inbox hooks, then move the app frame into `root.tsx` and simplify `routes.ts`.
4. Rename the shared dialog component and CSS terminology; update all consumers.
5. Move tests and update Vitest/Playwright configuration.
6. Run client type checks, unit tests, and end-to-end tests; manually confirm navigation, badge polling, sync triggering, and dialog focus/close behavior.

Rollback is a single source-code revert. The change has no data migration, API migration, or persistent-state effect.
