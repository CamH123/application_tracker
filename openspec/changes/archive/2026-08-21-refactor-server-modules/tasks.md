## 1. Test and TypeScript Foundation

- [x] 1.1 Create the dedicated `tests/unit`, `tests/integration`, and `tests/support` hierarchy; move every existing server test to the matching category and verify Vitest discovers the same unit and integration suites.
- [x] 1.2 Configure the production TypeScript project to compile only `src` and add a no-emit test TypeScript project covering `src` and `tests`; verify both type-check commands succeed.
- [x] 1.3 Update server test scripts/configuration to select unit and integration suites from their dedicated locations; verify `test`, `test:integration`, and test watch mode retain their intended coverage.

## 2. Platform and Bootstrap Boundaries

- [x] 2.1 Move PostgreSQL pool, transaction, local-owner, and migration concerns into `src/platform/database`; update source imports and verify source type checking passes without changing database behavior.
- [x] 2.2 Extract shared HTTP parsing and error translation into `src/platform/http`; preserve the existing validation-error, not-found, conflict, and internal-error response shapes and verify them with HTTP tests.
- [x] 2.3 Create the bootstrap HTTP shell with shared middleware and error handling while legacy route registration remains temporarily in place; verify health and every existing API route remain registered.

## 3. Tracking Module

- [x] 3.1 Create `modules/tracking/domain` and move Application/Event state projection, normalization, and reopen rules there without behavior changes; verify the migrated domain unit tests pass.
- [x] 3.2 Create Tracking contracts for Application, Application Event, Company, Recruiting Cycle, list-filter, and export request values; move schemas unchanged and verify their validation tests pass.
- [x] 3.3 Move Application, Event, Company, and Recruiting Cycle PostgreSQL repositories and their private row mappings into Tracking persistence; verify list/create/update/delete and hydration behavior through existing HTTP and integration tests.
- [x] 3.4 Replace `TrackerService` with focused Tracking application use cases for Applications, Events, Companies, Cycles, company merge, and CSV export; verify transaction boundaries and all Tracking route responses are unchanged.
- [x] 3.5 Move tracking-related Express handlers into Tracking routes and mount them through bootstrap; verify the existing application, event, company, cycle, and CSV API tests pass.

## 4. Inbox Module and Shared Proposal Contract

- [x] 4.1 Move the Inbox proposal Zod schema and inferred DTOs into Inbox contracts, update Sync and Ollama consumers to use that contract, and verify valid and invalid proposal handling remains unchanged.
- [x] 4.2 Move Inbox persistence and Inbox application use cases into the Inbox module; make proposal acceptance call Tracking's public use case rather than instantiate Tracking repositories directly, and verify accept, dismiss, update, and reopen-acknowledgement behavior.
- [x] 4.3 Move Inbox HTTP handlers into Inbox routes and mount them through bootstrap; verify active/history listing, count, proposal editing, acceptance, dismissal, and source-message responses remain compatible.

## 5. Gmail and Sync Modules

- [x] 5.1 Move Gmail connection persistence, token encryption, Google OAuth, and Google message gateway into the Gmail module; verify OAuth state handling, connection lifecycle, and Gmail gateway tests pass.
- [x] 5.2 Move SyncRunner, coordinator, gateway/store contracts, deterministic recruiting signals, and matching rules into the Sync module with domain rules isolated from provider message shapes; verify all synchronization unit tests pass.
- [x] 5.3 Move the PostgreSQL SyncStore and Ollama analysis adapter into Sync, consume the Inbox proposal contract, and verify unavailable-model, non-recruiting, recruiting, matching, progress, and partial-failure behavior.
- [x] 5.4 Move Gmail and Sync HTTP handlers into their module routes and mount them through bootstrap; verify connection, OAuth, health, sync launch/startup, activity list, and activity detail endpoints preserve their responses.

## 6. Final Bootstrap Composition and Verification

- [x] 6.1 Finish the bootstrap composition root by constructing concrete PostgreSQL, Google, and Ollama dependencies and mounting Tracking, Inbox, Gmail, and Sync routes; verify health and every existing API route remain registered.
- [x] 6.2 Remove retired global `domain`, `repositories`, `services`, `http`, `integrations`, and `sync` source files only after all callers use module-owned replacements; verify no production or test imports target the retired paths.
- [x] 6.3 Review module imports to ensure routes do not construct repositories, domain code does not depend on HTTP/PostgreSQL/provider shapes, and cross-module workflows use public application APIs; verify with source inspection and full type checking.
- [x] 6.4 Run source and test type checks, unit tests, integration tests, and the production build; verify existing API behavior and database schema remain unchanged.

## 7. Simplify Module Internals

- [x] 7.1 Flatten the Tracking, Inbox, Gmail, and Sync module file trees; retain only Sync's multi-file `domain/` grouping and replace `persistence` with plainly named repository files.
- [x] 7.2 Consolidate Tracking's SQL behind one repository and expose its workflow through a deep service interface so routes no longer reach through to individual repositories.
- [x] 7.3 Update imports and tests for the flattened modules; run source/test type checks, unit tests, integration tests, and the production build.
