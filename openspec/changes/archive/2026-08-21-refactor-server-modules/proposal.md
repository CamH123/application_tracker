## Why

The server is organized primarily by technical layer, so following one job-tracking workflow requires jumping among HTTP, services, repositories, domain helpers, sync, and integrations. Several current dependencies also cross the intended layers, making ownership and safe maintenance unclear.

This refactor establishes cohesive server modules while preserving the existing JSON API and recruiting behavior.

## What Changes

- Reorganize server code around cohesive modules for tracking, inbox review, Gmail connection, and synchronization rather than global domain, repository, service, and HTTP folders.
- Separate HTTP composition from route registration so the application bootstrap only wires dependencies.
- Define module-local contracts and Zod schemas at the boundaries that use them; remove the HTTP validation layer as a shared dependency of non-HTTP code.
- Keep database access in PostgreSQL repositories/adapters and business rules in domain code; use services/use cases to coordinate them.
- Move unit and integration tests to a dedicated `server/tests/` hierarchy, with shared test support and independent source/test type checking.
- Preserve existing routes, response shapes, validation behavior, database schema, and external integrations.

## Capabilities

### New Capabilities

_None. This is an internal, behavior-preserving refactor._

### Modified Capabilities

_None. Existing externally observable requirements do not change._

## Impact

- Affected server source: HTTP app wiring and routes, domain helpers, repositories, services, sync, Gmail/Ollama integrations, database utilities, and tests.
- Affected server tooling: TypeScript include/type-check configuration and test scripts/configuration.
- No API, database migration, client, dependency, or external-service behavior changes are intended.
