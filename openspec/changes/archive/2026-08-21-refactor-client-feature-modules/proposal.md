## Why

The client route modules combine React Router integration, feature state, API calls, dialogs, forms, and rendering in files of 400–700 lines. This makes route-level work difficult to locate and risky to change, even when the user-facing behavior is unchanged.

## What Changes

- Replace the current Dashboard route source name with `routes/dashboard.tsx` while retaining `/` as the index URL.
- Reduce Dashboard, Inbox, and Settings route modules to thin React Router adapters that re-export their feature screens and metadata.
- Organize client code by feature in top-level `dashboard`, `inbox`, and `settings` directories.
- Give feature-owned files descriptive names for their screen, API calls, data hook, forms, dialogs, lists, and managers; do not introduce generic `page.tsx` or one-file hook directories.
- Move the reusable modal into a UI component location and the application shell into a layout location.
- Preserve existing routes, UI behavior, requests, polling intervals, error handling, and public API contracts.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None.

This is a behavior-preserving internal refactor; no specification delta is required.

## Impact

- Affected code: `client/app/routes.ts`, existing client route modules, `client/app/components/modal.tsx`, `client/app/components/shell.tsx`, and their imports.
- APIs and backend code remain unchanged.
- No new runtime dependencies are required.
