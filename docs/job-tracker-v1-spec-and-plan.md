# Job Tracker v1 Specification and Implementation Plan

## 1. Outcome

Deliver a local-first application tracker for one implicit local owner. Manual tracking is the complete, authoritative workflow. Gmail and Ollama only create editable Inbox Items; they never change Applications or Application Events directly.

The existing React Router client becomes the UI, and the currently empty Express server becomes a JSON API backed by local PostgreSQL. No cloud deployment, app authentication, Google Sheet import, notifications, reminders, or analytics dashboards are in v1.

## 2. Product scope

### 2.1 Manual tracking

- The Dashboard lists every Application, oldest submission date first.
- A person can filter by Recruiting Cycle, Company, Current Status, referral, and Application Completion (`all`, `active`, `completed`).
- A Dashboard row opens an editable Application Detail Dialog; it contains Application fields, Application Notes, and the event timeline.
- Creating an Application requires Company, role title, Recruiting Cycle, and submission date, and creates its Submitted Application Event.
- Application fields are: Company, role title, Recruiting Cycle, submission date, application URL, external application ID, location, work arrangement (`remote`, `hybrid`, `on-site`, or unset), referral yes/no, and Application Notes.
- A person can create, edit, and delete any Application Event manually. Any automated action is therefore reproducible manually.
- Deleting an Application requires confirmation and permanently deletes its Application Events. Deleting one Application Event only deletes that event. There is no trash or undo in v1.

### 2.2 Timeline and status

Canonical event types are `submitted`, `assessment_scheduled`, `assessment_completed`, `recruiter_screen`, `interview_scheduled`, `interview_completed`, `offer_received`, `offer_accepted`, `offer_declined`, `rejected`, `withdrawn`, and `other`.

- Every event has an occurrence date, optional notes, and automatic recorded-at metadata.
- Scheduled interviews also have a local time and IANA time-zone identifier. Other v1 events are date-only.
- Assessment and interview events optionally carry a round label such as `Technical 1` or `Final`.
- Current Status is a server-derived projection, never a writable field. Its display values are `Applied`, `Assessment pending`, `Awaiting response`, `Interviewing`, `Offer accepted`, `Offer declined`, `Rejected`, and `Withdrawn`.
- Status projection rules are deterministic and tested. A scheduled assessment produces `Assessment pending`; scheduled/completed recruiting screens and interviews produce `Interviewing`; a completed assessment or other non-terminal milestone produces `Awaiting response`; terminal outcomes override prior stages.
- `Offer accepted`, `Offer declined`, `Rejected`, and `Withdrawn` are terminal and make Application Completion `completed`. Other statuses are `active`.
- Editing, deleting, or adding an event immediately recalculates Current Status from the effective event sequence. The UI must require explicit correction/reopen acknowledgement before adding a non-terminal event after a terminal outcome.

### 2.3 Company and Recruiting Cycle

- A Company has a unique normalized name and one optional manually maintained candidate-portal URL.
- A Company can be renamed and can be merged into another Company. Merge requires confirmation and moves all Applications to the selected survivor.
- A Recruiting Cycle consists only of a season (`Spring`, `Summer`, `Fall`, or `Winter`) and year. It is editable.
- A Recruiting Cycle with Applications cannot be deleted until those Applications are moved elsewhere.
- One owner may not have two Applications with the same Company, normalized role title, and Recruiting Cycle. The UI warns before submission; the database enforces it. An external application ID, when supplied, is also unique for the owner.

### 2.4 Inbox

- Inbox has Active and History tabs. Active holds Items awaiting review. History holds accepted and dismissed Items; accepted entries visibly indicate whether the person edited the proposal before accepting it.
- The navigation Inbox Badge shows the Active count.
- One Gmail message produces at most one Inbox Item proposing exactly one action: create one Application or create/update one Application Event.
- An Inbox Item contains the Gmail message ID, structured extraction, proposed action, proposed target Application (if any), confidence/match rationale, and acceptance/dismissal metadata. It does not persist email subject, snippet, body, or headers.
- Review permits changing every proposed field, including Company, role, Recruiting Cycle, event type, dates, interview round, notes, and target Application. It may select an existing Application or create a new one.
- Acceptance is transactional: validate duplicates and terminal-state rules, perform the one proposed write, preserve Accepted Inbox Provenance on the created/changed record, and move the Inbox Item to History. Dismissal only changes the Inbox Item to History.
- The original Gmail message is fetched from Gmail on demand for review and is never stored locally.

### 2.5 Gmail and Ollama

- One Connected Gmail Account is supported; Google OAuth uses Gmail read-only authorization only.
- No startup sync occurs before the person configures an initial date-range sync in Settings.
- Initial sync takes an inclusive start and end date, runs in the background, and displays a progress bar with scanned-message count.
- After a successful initial sync, application startup launches a background incremental sync from the last successful sync checkpoint through the present. Manual Settings sync can always choose another inclusive date range.
- Sync never updates the Dashboard directly. It creates only Inbox Items.
- Every sync produces a Sync Activity record and a visible result: started/finished timestamps, requested date range, scanned count, newly created Inbox Item count, skipped processed count, state, and a failure message when relevant.
- The server stores processed Gmail message IDs. Processed IDs make date-range retries safe.
- Sync must preflight Ollama. The hard-coded model is `llama3.2:3b` at the standard local Ollama URL. If Ollama/model health fails before work starts, create no Inbox Items and mark no messages processed. If a later Gmail/API/network failure occurs, preserve completed per-message work, mark the Sync Activity partial failure, and retry remaining messages safely later.
- Pipeline per unprocessed message: retrieve metadata/content transiently; apply deterministic recruiting/ATS/application-ID rules; call Ollama for structured JSON extraction and ambiguous classification/matching; discard non-recruiting messages after recording their IDs; create at most one Inbox Item for recruiting messages. The model only proposes data—server validation and user review decide all writes.
- Matching ranks exact external application ID first, then Company identity, sender/ATS signals, normalized role text, and temporal proximity. The Inbox Item always exposes the proposal for correction.

### 2.6 Settings and export

- Settings manages Gmail connection/disconnection, initial/manual date-range sync, Sync Activity, Ollama health, Companies, and Recruiting Cycles.
- The app exposes a flat CSV export. Each row repeats Application fields for an Application Event; Applications with no events are still exported with empty event columns.
- Documentation includes a PostgreSQL backup/restore command for the local deployment.

## 3. Data model

Use UUID primary keys and `owner_id` foreign keys on owner-owned records. Seed one local Owner at startup; no user-facing authentication exists.

| Table | Essential columns and constraints |
| --- | --- |
| `owners` | `id`, `created_at`; exactly one seed owner in v1. |
| `companies` | `id`, `owner_id`, `name`, `normalized_name`, `candidate_portal_url`, timestamps; unique `(owner_id, normalized_name)`. |
| `recruiting_cycles` | `id`, `owner_id`, `season`, `year`, timestamps; unique `(owner_id, season, year)`. |
| `applications` | `id`, `owner_id`, `company_id`, `recruiting_cycle_id`, `role_title`, `normalized_role_title`, `submission_date`, optional URL/ID/location/work arrangement, `is_referred`, `notes`, timestamps; unique `(owner_id, company_id, normalized_role_title, recruiting_cycle_id)` and unique non-null `(owner_id, external_application_id)`. |
| `application_events` | `id`, `application_id`, `event_type`, `occurred_on`, optional `scheduled_time`/`time_zone`, `round_label`, `notes`, `recorded_at`, `inbox_item_id`; ordering uses occurrence date then recorded-at then ID. |
| `gmail_connections` | `owner_id`, encrypted OAuth refresh token, Gmail address, connection metadata, timestamps; one row per owner. |
| `processed_gmail_messages` | `owner_id`, `gmail_message_id`, classification outcome, processed timestamp; unique `(owner_id, gmail_message_id)`. |
| `inbox_items` | `id`, `owner_id`, `gmail_message_id`, proposal JSON, state (`active`, `accepted`, `dismissed`), confidence/rationale, edited-before-acceptance flag, target references, timestamps; unique `(owner_id, gmail_message_id)`. |
| `sync_activities` | `id`, `owner_id`, requested start/end, started/finished timestamps, state (`running`, `succeeded`, `partial_failure`, `failed`), counters, checkpoint/error details. |

Expose Current Status and Application Completion as SQL/query projections or a server domain function; do not store writable duplicate columns. Use transaction boundaries for Inbox acceptance, Company merge, deletion, sync-item finalization, and checkpoint updates.

## 4. API contract

Version JSON endpoints under `/api`. Validate every request at the boundary (for example, with Zod), return structured field errors, and never expose OAuth tokens or raw stored email content.

| Area | Endpoints |
| --- | --- |
| Health | `GET /api/health`, `GET /api/integrations/ollama/health` |
| Dashboard | `GET /api/applications` with filters/sort; `POST /api/applications`; `GET/PATCH/DELETE /api/applications/:id` |
| Events | `POST /api/applications/:id/events`; `PATCH/DELETE /api/application-events/:id` |
| Companies | `GET/POST /api/companies`; `PATCH/DELETE /api/companies/:id`; `POST /api/companies/:id/merge` |
| Cycles | `GET/POST /api/recruiting-cycles`; `PATCH/DELETE /api/recruiting-cycles/:id` |
| Inbox | `GET /api/inbox-items?tab=active|history`; `GET /api/inbox-items/:id/source-message`; `PATCH /api/inbox-items/:id/proposal`; `POST /api/inbox-items/:id/accept`; `POST /api/inbox-items/:id/dismiss`; `GET /api/inbox-items/count` |
| Gmail/sync | `GET /api/gmail/connection`; OAuth start/callback/disconnect endpoints; `POST /api/syncs` for initial/manual ranges; `GET /api/syncs`; `GET /api/syncs/:id` for progress; `POST /api/syncs/startup` |
| Export | `GET /api/exports/events.csv` |

## 5. Client behavior

Use React Router routes for `/` (Dashboard), `/inbox`, and `/settings`. Keep the application-detail and deletion-confirmation experiences as accessible modal dialogs, not routes.

- On client boot, fetch Dashboard data and Inbox Badge count; invoke startup sync asynchronously only when the server reports an initial sync checkpoint.
- Poll an active Sync Activity at a short interval, then refresh the Inbox Badge and relevant Inbox/Dashboard queries when it finishes.
- Use server-returned Current Status and Completion rather than reproducing status logic in the client.
- Display explicit empty states: no Applications, no active Inbox Items, Gmail not connected, no initial sync configured, and Ollama unavailable.
- For on-demand source-message review, render fetched Gmail content in a sanitized, non-persistent viewer.

## 6. Implementation sequence

### Phase 0 — Repository foundation

1. Make the Express server runnable: ESM TypeScript configuration, `dev`, `build`, `start`, `typecheck`, and test scripts.
2. Add a root local-development configuration: PostgreSQL service/volume, server and client environment examples, and a single documented start command.
3. Add server dependencies for PostgreSQL access/migrations, request validation, OAuth/Gmail API, encryption, CSV generation, and tests. Keep the client’s existing React Router/Tailwind setup.
4. Add CI-local quality commands: formatter/linter, typecheck, unit tests, and integration tests against disposable PostgreSQL.

### Phase 1 — Database and domain core

1. Create ordered SQL migrations for all tables, enum/check constraints, indexes, seed Owner, and foreign-key deletion behavior.
2. Implement the domain module: normalization, duplicate checks, event ordering, status/completion projection, terminal-event guard, and Company merge.
3. Add repository modules that are the only code allowed to issue SQL for each aggregate.
4. Implement validated Application, Event, Company, Cycle, and export endpoints.
5. Test projection edge cases: same-day events, assessment completed before interview, terminal corrections, deleted latest event, duplicate role/cycle, and merge collisions.

### Phase 2 — Manual tracking UI

1. Replace the starter React Router home screen with shared app shell/navigation and the Inbox Badge.
2. Build Dashboard table, filter controls, status/completion chips, empty/loading/error states, and submission-date ordering.
3. Build create-Application and Application Detail Dialogs, including editable fields, Application Notes, sorted event timeline, event form, and destructive confirmations.
4. Build Settings CRUD screens for Companies, candidate-portal URL, Company merge, and Recruiting Cycles.
5. Add end-to-end tests for manual creation, event-based status change, filtering, editing, and deletes.

### Phase 3 — Gmail connection and sync infrastructure

1. Implement read-only Google OAuth, encrypted refresh-token storage, connection status, disconnect, and token-refresh error handling.
2. Implement Settings initial-range/manual sync form, durable Sync Activity records, progress endpoint, and client progress UI.
3. Add startup-sync orchestration conditioned on a prior successful checkpoint; run jobs in-process for v1 with a per-owner lock preventing concurrent syncs.
4. Implement Gmail pagination/date filtering, processed-ID deduplication, source-message retrieval, checkpoint/counter persistence, and partial-failure semantics.
5. Test OAuth adapter behavior with fakes and sync idempotence/partial retry with mocked Gmail pages.

### Phase 4 — Classification, extraction, and Inbox review

1. Implement Ollama health/model preflight and the fixed `llama3.2:3b` structured-output adapter.
2. Implement deterministic signals and structured model schema for recruiting classification, Company/role/application-ID extraction, event proposal, date/time, round, and cycle/match suggestions.
3. Implement matching scorer and record human-readable rationale/confidence.
4. Implement the Inbox/Inbox History client views, editable proposal dialog, transient source-message viewer, accept/dismiss actions, and history edited indicator.
5. Test malformed model output, unavailable Ollama, non-recruiting message suppression, ambiguous matching, proposal edits, acceptance provenance, duplicate rejection, and source-message non-persistence.

### Phase 5 — Portability, polish, and release verification

1. Implement flat CSV export with stable headers and RFC 4180 escaping.
2. Document install steps: PostgreSQL, Ollama, `ollama pull llama3.2:3b`, Google OAuth client setup, environment variables, start/stop, and backup/restore.
3. Add accessibility checks for modal focus handling, keyboard navigation, labels, progress status, and destructive confirmations.
4. Run the full test/typecheck/build suite and manually verify the end-to-end scenario below.

## 7. Acceptance scenario

1. Start the local app with no Gmail connection; create Company `Google`, cycle `Summer 2027`, and a `SWE Intern` Application. The Dashboard shows `Applied`.
2. Add a manually scheduled technical interview with date, time, time zone, and round label. The Dashboard shows `Interviewing`; complete it, and it shows `Awaiting response`.
3. Connect Gmail read-only, select an initial date range in Settings, and observe a running Sync Activity progress bar. The Dashboard is usable throughout.
4. A matching recruiting email creates an Inbox Item and increments the Inbox Badge; it does not modify the Application.
5. Open the Inbox Item, inspect its transient Gmail source, correct its event date and proposed Application, then accept it. The history entry says it was edited, the created Event retains provenance, and the Dashboard projection changes appropriately.
6. Stop Ollama and retry a sync. It fails before message processing, leaves Inbox/Application data unchanged, and shows an actionable Sync Activity failure.
7. Export CSV and confirm it contains flat event rows with repeated Application fields and no email body/content.

## 8. Deferred work

- Multi-user authentication and multiple Gmail accounts.
- Google Sheet/CSV import.
- In-app analytics/visualizations, reminders, Calendar integration, notifications, custom fields, company notes, and per-Application candidate-portal URLs.
- Background services, webhooks, Pub/Sub, cloud deployment, and automatic acceptance of email-derived updates.
- Version history, undo/trash, persisted email archive, ignored-email review queue, and configurable Ollama model/URL.
