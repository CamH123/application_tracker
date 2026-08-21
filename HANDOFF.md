# Application Tracker — testing and integration handoff

## Next-session objective

Help the user run the completed Job Tracker v1 locally, execute PostgreSQL and browser acceptance tests, diagnose any environment/runtime failures, configure optional Gmail/Ollama integration, and plan or implement additional integrations without violating the local-first review model.

## Canonical project context

- Product specification and implementation sequence: `/home/joesm/Code/application_tracker/docs/job-tracker-v1-spec-and-plan.md`
- Domain vocabulary: `/home/joesm/Code/application_tracker/CONTEXT.md`
- Architectural decisions: `/home/joesm/Code/application_tracker/docs/adr/`
- Setup, Google OAuth, test, backup, and restore instructions: `/home/joesm/Code/application_tracker/README.md`
- Repository agent instructions: `/home/joesm/Code/application_tracker/AGENTS.md`

Read those sources rather than reconstructing their content from this handoff.

## Current implementation state

The v1 implementation is present in the working tree:

- Root npm workspace, Docker PostgreSQL configurations, environment examples, and CI workflow.
- Ordered PostgreSQL schema/migration at `server/migrations/001_initial.sql`.
- Express JSON API composition at `server/src/http/app.ts`, with per-aggregate SQL repositories, request validation, domain status projection, CSV export, transactional Inbox acceptance, Gmail OAuth/read-only access, encrypted refresh-token storage, sync coordination, deterministic recruiting signals, matching, and Ollama structured-output handling.
- React Router routes at `client/app/routes/home.tsx`, `inbox.tsx`, and `settings.tsx`, with the shared shell and accessible native dialogs under `client/app/components/`.
- Unit/API tests under `server/src/**/*.test.ts` and `client/app/**/*.test.ts`.
- PostgreSQL integration tests at `server/src/http/manual.integration.test.ts`.
- Playwright manual-flow and accessibility tests at `client/e2e/manual-tracking.spec.ts`.

The final two-axis review reported:

- Spec axis: pass, no remaining findings.
- Standards axis: three non-blocking maintainability observations: repeated canonical contract values between client/server, a large route-composition module, and thin repository accessor methods in `TrackerService`.

## Verification already completed

- `npm run lint`: passed.
- `npm run typecheck`: passed for client and server.
- `npm run build`: passed for client and server.
- `npm test`: passed; 26 server tests and 1 client test.
- Playwright discovery: passed; two Chromium tests are listed.
- The PostgreSQL integration suite is discovered and compiles; three tests are present.

The PostgreSQL integration tests and actual Playwright browser runs were not executed in the prior environment because neither Docker/PostgreSQL nor browser binaries were available. `docker --version` specifically indicated that Docker Desktop WSL integration was not enabled, and `psql` was absent.

## Git state and safety

No implementation commit exists. The branch remains at `976f175 Initial commit`. Git-index write permission was declined during the previous session.

Most project files are currently untracked, while `README.md` is modified. Some untracked agent-support files (`.agents/`, `AGENTS.md`, `skills-lock.json`, and related documentation) predated implementation and belong to the user. Inspect and stage intentionally; do not blindly add or delete all untracked files.

## Recommended next steps

1. Confirm Docker Desktop is installed and WSL integration is enabled, or configure an existing PostgreSQL instance through `DATABASE_URL`.
2. Follow `README.md` to create local `.env` files. Generate a new encryption key locally; never print or commit it.
3. Run `npm run local:start`, then verify `/api/health` and open the client.
4. Execute `npm run test:integration:local`.
5. Install the Chromium test binary with `npx playwright install chromium`, start the disposable test PostgreSQL service as documented, and run `npm run test:e2e -w client`.
6. Work through the acceptance scenario in section 7 of the spec, recording exact errors and relevant server/browser logs if anything fails.
7. Configure Ollama first, then Google OAuth only if the user wants to test Gmail. Gmail and Ollama are optional; PostgreSQL is required even for manual tracking.
8. After successful verification, review `git status`, stage only intended project files, run the full verification suite again, and commit if the user authorizes Git writes.

## Integration guardrails

For any new external system, preserve the central v1 invariant: automation may create editable Inbox Items only and must never mutate Applications or Application Events directly. Keep external clients behind injected adapters, retain source data transiently unless a new approved ADR says otherwise, validate extracted proposals at the API/domain boundary, make retries idempotent, and preserve provenance on acceptance.

Before adding another integration, ask which system and desired actions are in scope, then check whether the change contradicts an ADR or expands beyond v1.

## Suggested skills

- `wizard`: guide the user through Docker Desktop/WSL, Google Cloud OAuth, local credentials, and other dashboard-only setup steps.
- `diagnosing-bugs`: investigate failures found during PostgreSQL, browser, Gmail, or Ollama testing before changing code.
- `tdd`: implement fixes or new integration behavior at the existing domain, HTTP, adapter, and browser seams.
- `research`: consult primary documentation for any new external API or OAuth provider and save findings in the repository.
- `codebase-design`: decide adapter boundaries and deepen modules before adding another external system.
- `code-review`: review any follow-up implementation against both repository standards and the relevant spec/ADR.

## Sensitive-data note

No secrets are recorded in this handoff. Do not expose or commit `.env` values, OAuth client secrets, refresh tokens, encryption keys, Gmail content, or personal account identifiers.
