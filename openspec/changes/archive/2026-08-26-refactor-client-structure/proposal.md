## Why

The client has accumulated route wrappers, a separate shell layer, ambiguous API module naming, and scattered tests. These indirections make feature ownership and navigation harder than necessary without providing distinct behavior.

## What Changes

- Reorganize client page code beneath `app/pages/`, preserving descriptive page and domain filenames.
- Remove re-export-only route modules and route directly to descriptive page modules.
- Consolidate the persistent app frame and navigation in `root.tsx`; remove the redundant shell layout route.
- Move inbox badge polling and mount-time Gmail sync triggering into inbox-owned hooks, while keeping `root.tsx` declarative.
- Rename the shared native-dialog component from `Modal` to `Dialog`, including its file and CSS terminology.
- Rename the generic HTTP helper to `api-client.ts`; retain page-specific `*-api.ts` modules for domain endpoint operations.
- Centralize client unit and end-to-end tests beneath `client/tests/` and update test-runner configuration.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

This is a behavior-preserving structural refactor, so no specification delta is required.

## Impact

- Affected client areas: route configuration, root route, page modules, shared dialog component, API helper imports, styles, test locations, Vitest command, and Playwright configuration.
- No server APIs, external dependencies, or user-visible workflows change.
