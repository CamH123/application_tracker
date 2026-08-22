## 1. Establish route and shared-code boundaries

- [x] 1.1 Move the reusable dialog to `client/app/components/ui/modal.tsx`, update all imports, and verify the client typecheck passes.
- [x] 1.2 Move the route-layout component to `client/app/layout/shell.tsx`, update the layout entry in `routes.ts`, and verify Dashboard, Inbox, and Settings still render within the shell.
- [x] 1.3 Replace `routes/home.tsx` with the thin `routes/dashboard.tsx` adapter, update the index route configuration, and verify `/` remains the Dashboard URL with its existing title.

## 2. Migrate Dashboard into a feature directory

- [x] 2.1 Create `client/app/dashboard/dashboard-api.ts` with named wrappers for Dashboard's existing application, company, cycle, and event requests; verify the request paths and HTTP methods match the pre-refactor behavior.
- [x] 2.2 Extract Dashboard loading, filter, selection, and create-dialog state into `client/app/dashboard/use-dashboard-data.ts`; verify filters, reloads, and selected-application refresh behavior are unchanged.
- [x] 2.3 Move Dashboard presentation into descriptive feature files (`dashboard.tsx`, `dashboard-filters.tsx`, `applications-table.tsx`, `application-form.tsx`, `application-detail-dialog.tsx`, and `event-form.tsx`) and verify application create, edit, event CRUD, and delete flows work unchanged.
- [x] 2.4 Reduce `routes/dashboard.tsx` to re-export the Dashboard screen and metadata, remove the superseded route file, and verify no Dashboard-specific endpoint string remains outside its feature API file.

## 3. Migrate Inbox into a feature directory

- [x] 3.1 Create `client/app/inbox/inbox-api.ts` and `use-inbox-data.ts` for the existing Inbox list, proposal, source-message, accept, and dismiss operations; verify the active-tab five-second polling and history-tab behavior are preserved.
- [x] 3.2 Move Inbox rendering into descriptive feature files (`inbox.tsx`, `inbox-list.tsx`, `review-inbox-item-dialog.tsx`, and `proposal-editor.tsx`) and verify reviewing, editing, saving, accepting, dismissing, and source-message display retain their behavior.
- [x] 3.3 Reduce `routes/inbox.tsx` to re-export the Inbox screen and metadata, and verify `/inbox` renders with the original title and interaction flow.

## 4. Migrate Settings into a feature directory

- [x] 4.1 Create `client/app/settings/settings-api.ts` and `use-settings-data.ts` for current settings requests; verify Gmail status, Ollama health, and running-sync two-second polling remain unchanged.
- [x] 4.2 Move Settings UI into descriptive feature files (`settings.tsx`, `integration-settings.tsx`, `sync-form.tsx`, `sync-activity-list.tsx`, `company-manager.tsx`, and `cycle-manager.tsx`) and verify integration, sync, Company, and Recruiting Cycle operations retain their current requests and confirmations.
- [x] 4.3 Reduce `routes/settings.tsx` to re-export the Settings screen and metadata, and verify `/settings` renders with the original title and behavior.

## 5. Verify the behavior-preserving refactor

- [x] 5.1 Run `npm run typecheck` and `npm test`; verify both commands pass with the final client structure.
- [ ] 5.2 Manually verify navigation, Inbox-count polling, Dashboard dialogs, Inbox review actions, and Settings management/sync flows; verify no browser URL, API contract, visual behavior, or polling cadence changed.
