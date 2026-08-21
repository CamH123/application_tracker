## Context

See `proposal.md` for the motivation. The server currently groups source files by technical role (`domain`, `repositories`, `services`, `http`, `integrations`, and `sync`). A single workflow therefore crosses several top-level folders, and `http/validation.ts` is imported by persistence, synchronization, and Ollama code. `http/app.ts` also combines dependency construction with all route handlers.

The refactor must preserve the Express JSON API, PostgreSQL schema, Gmail and Ollama behavior, and the existing business rules. It must continue to compile under TypeScript's NodeNext configuration and keep both unit and PostgreSQL-backed integration tests usable.

## Goals / Non-Goals

**Goals:**

- Make each business workflow navigable from one cohesive module.
- Make database, HTTP, and external-provider boundaries obvious from file ownership and dependency direction.
- Give contracts and Zod schemas a stable owner outside the HTTP layer when non-HTTP consumers need them.
- Move all tests under `server/tests` without losing TypeScript checking or test-category clarity.
- Permit incremental, behavior-preserving migration with a passing test suite after each phase.

**Non-Goals:**

- Changing API routes, request/response bodies, validation rules, database schema, or client behavior.
- Replacing Express, PostgreSQL, Vitest, Google APIs, or Ollama.
- Introducing a generic dependency-injection framework or an interface for every internal class.
- Redesigning recruiting domain rules while files move.

## Decisions

### 1. Organize code as vertical modules with a small platform layer

Use modules as the primary source-navigation boundary:

```text
src/
  bootstrap/                 # builds dependencies and assembles the HTTP app
  platform/
    database/                # pool, transaction helper, migration entry point
    http/                    # shared parsing and error translation only
  modules/
    tracking/                # Applications, Application Events, Companies, Cycles, export
    inbox/                   # Inbox Items and proposal acceptance/review
    gmail/                   # connection storage, OAuth, Google message gateway, encryption
    sync/                    # run/coordinator, analysis gateway, durable sync store
```

`tracking` owns Applications and their supporting Company and Recruiting Cycle concepts because they are currently managed chiefly as part of tracking an Application. Its public use cases replace the broad `TrackerService`; Inbox uses those use cases rather than coordinating Tracking repositories itself.

Keep modules flat by default. A folder earns its place only when it groups multiple cohesive files, not merely to label a one-file technical layer:

```text
modules/tracking/
  domain.ts                  # pure rules and domain value types
  schemas.ts                 # request/input schemas and inferred public DTOs
  repository.ts              # PostgreSQL adapter and private row mappings
  service.ts                 # use cases that coordinate domain and repository
  routes.ts                  # Express adapter for this module

modules/sync/
  domain/                    # matching and recruiting-signal rules: a real grouping
  contracts.ts
  repository.ts
  service.ts
  ollama.ts
  routes.ts
```

Use `repository` rather than `persistence`: it names the concrete database adapter in plain language. Tracking consolidates its application, event, company, and recruiting-cycle SQL behind one `TrackingRepository`; its service exposes the module's workflow interface rather than leaking the separate repositories to routes. Inbox and Gmail do not need a `domain/` folder because they currently lack a multi-file cluster of pure rules. This is a deliberate hybrid of layered and feature-based organization. Pure global technical folders make features hard to follow; fully independent packages and ports for every class would add unnecessary ceremony to this server.

### 2. Preserve a one-way dependency direction

```text
routes / external adapters
           ↓
application use cases
     ↙                 ↘
domain rules       persistence ports/adapters
                          ↓
                      platform/database
```

- Domain code accepts and returns ordinary TypeScript values, performs no SQL or HTTP work, and does not depend on Express, PostgreSQL, or external-provider shapes.
- PostgreSQL repositories/adapters own SQL, owner filtering, and conversion between database rows and module data. Database row interfaces remain private to the module's `repository.ts` file.
- Application use cases fetch or mutate through repositories, invoke domain rules, and manage transactions. They are the only public route for cross-module workflows such as accepting an Inbox proposal into Tracking.
- Routes validate untrusted request values through the owning module's contracts and translate use-case errors through shared HTTP helpers.

The existing `SyncRunner` gateway/store interfaces are retained as useful ports. Introduce additional ports only for actual provider/persistence boundaries; do not create internal interfaces merely to satisfy the pattern.

### 3. Give schemas and TypeScript types explicit local ownership

Place Zod schemas and the `z.infer` types derived from them in the owning module's flat `schemas.ts` or purpose-named contract file:

- Tracking owns Application, Application Event, Company, Cycle, filtering, and sync-range request contracts as applicable to its routes.
- Inbox owns the proposal contract because it is validated both when a person edits an Inbox Item and when Ollama supplies a proposal.
- Sync imports the Inbox proposal contract rather than importing from an HTTP folder.

Domain types remain alongside their rules, persistence records remain with persistence, and provider message types remain with the Gmail or Sync boundary that owns them. This rejects a single global `types/` directory: it would hide ownership while merely moving the current ambiguity.

### 4. Split composition from route registration

`bootstrap` constructs the PostgreSQL pool and concrete Google/Ollama/PostgreSQL adapters, then mounts module routes. Individual route files receive their module's use cases/dependencies rather than constructing repositories or provider clients directly.

This preserves one obvious composition root without making it the owner of every endpoint. Shared CORS, JSON middleware, and error handling remain in the HTTP assembly layer.

### 5. Use a dedicated mirrored test tree and separate test type checking

Move tests to:

```text
tests/
  unit/modules/...
  integration/http/...
  support/                   # reusable fixtures, database setup, and builders
```

The source build `tsconfig.json` includes only `src`. A test-specific no-emit TypeScript configuration includes both source and tests, and its command is included in the verification workflow. Vitest scripts select unit versus integration tests by their dedicated directories/patterns.

This avoids the current `rootDir: ./src` conflict once tests reside outside `src`, without treating test files as production build output.

## Risks / Trade-offs

- [Large move creates noisy diffs and import breakage] → Migrate module-by-module, keep behavior unchanged, and run type checking and the relevant tests after every module.
- [Folder ownership becomes cosmetic if modules keep reaching into one another's persistence] → Expose only module application/use-case APIs for cross-module workflows and review imports during each migration.
- [Moving schemas accidentally changes validation behavior] → Move schemas unchanged first, retain validation tests, and add route/integration coverage for shared proposal validation.
- [Moving tests outside `src` removes them from TypeScript checking] → Add and run the test-specific no-emit project before deleting co-located tests.
- [Mixed unit/integration selection becomes unclear] → Use dedicated test directories and explicit scripts rather than the current filename exclusion alone.
- [A behavior-preserving refactor masks a regression] → Use existing API integration tests as a compatibility net and add focused tests where extracted seams need coverage.

## Migration Plan

1. Establish the test hierarchy and TypeScript/Vitest configuration while retaining existing test behavior.
2. Extract platform database and HTTP helpers, then create the bootstrap HTTP shell while legacy route registration remains temporarily in place.
3. Migrate Tracking first, including Application/Event domain rules, repository, service, schemas, routes, and CSV export.
4. Migrate Inbox to consume Tracking's public use cases and own its proposal contracts.
5. Migrate Gmail and Sync adapters, preserving the existing gateway/store contracts and moving Ollama proposal validation to Inbox contracts.
6. Mount the Tracking, Inbox, Gmail, and Sync routes from bootstrap after every module route has migrated.
7. Remove retired layer directories and compatibility imports only after every source consumer and test has moved.
8. Run full source/test type checking, unit tests, integration tests, build, and API compatibility checks before merge.
9. Flatten module internals after the migration: retain a subdirectory only for a genuine multi-file grouping, name database adapters `repository`, and keep module workflow interfaces deep enough that routes do not reach through to individual repositories.

Rollback is a normal source rollback: the change includes no database migration or externally persisted representation change.

## Open Questions

- Whether `tracking` later needs to split Applications from Company/Cycle administration can be decided after this refactor reveals real navigation pressure; it does not change the initial module boundary or migration plan.
