## Context

The Dashboard disables New Application when either reusable relationship list
is empty. Its form sends stored `companyId` and `recruitingCycleId`; the
tracking API validates those identifiers before the service creates the
Application. In contrast, accepted Inbox proposals already resolve Company and
Recruiting Cycle by their natural identities and create missing records inside
a database transaction.

## Goals / Non-Goals

**Goals:**

- Make the manual Dashboard creation path self-sufficient.
- Reuse the established Company normalization and Recruiting Cycle identity.
- Make a reuse-or-create operation transactional and safe to retry after a
  unique-identity race.
- Give the form discoverable cycle choices without limiting entry to those
  choices.

**Non-Goals:**

- Change Inbox proposal review, acceptance, or extraction behavior.
- Infer or edit a Company's candidate-portal URL from an Application URL.
- Change the manual Settings managers, database schema, or the Application
  detail editing workflow.

## Decisions

### Use a creation-specific natural-identity input

Add a creation contract that accepts `companyName` and a Recruiting Cycle
`season`/`year` rather than overloading the existing identifier-based
Application input used for edits. The server will validate the values, find or
create their reusable records, and call the existing Application creation
logic within one transaction.

This keeps update semantics stable and makes the API's automatic behavior
explicit. Requiring the client to create relationships before its Application
would recreate the setup race and permit orphan records on a later failure.

### Build the cycle picker from a unified option set

The form will construct an option set from stored cycles plus the twelve
season/year combinations from 2027–2029. Its control must permit typed values
as well as selection; parsing and validation will turn the entered label into
the canonical season and numeric year before submission.

A native autocomplete-style control avoids a dependency for one compact form
while retaining keyboard input. A select-only control was rejected because it
cannot represent a new cycle; separate season/year inputs were rejected because
they do not expose the requested combined list of prior and likely cycles.

### Resolve identities atomically on the server

The service will share or extract the Inbox's find-or-create behavior so both
flows use the same Company normalization and cycle equality. The new flow will
catch a uniqueness conflict caused by concurrent creation, re-read the record,
and continue only when the natural identity matches. All relationship resolution
and Application insertion will occur in the request transaction.

Duplicating repository calls in the client was rejected because identity rules
and atomicity belong at the server boundary. Changing the Inbox's observable
flow is unnecessary; only an internal helper may be shared.

## Risks / Trade-offs

- [Typed cycle labels are ambiguous or malformed] → Define one displayed format
  (`Season YYYY`), validate it before submission, and return a field-specific
  error for invalid input.
- [Concurrent first submissions create the same Company or cycle] → Keep
  database uniqueness authoritative, retry lookup after a unique conflict, and
  retain a single transaction for the overall operation.
- [A new API contract drifts from existing duplicate validation] → Run the
  existing Application uniqueness rules after resolving identities and cover
  first-record and reused-record cases with integration tests.

## Migration Plan

No data migration is needed. Deploy the server contract before or together with
the Dashboard client. If a rollback is required, existing stored Companies,
Recruiting Cycles, and Applications remain valid; only the new manual creation
request shape is withdrawn.
