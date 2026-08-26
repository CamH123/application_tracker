## Why

Manual Application creation is blocked until a person has separately created
both a Company and a Recruiting Cycle in Settings. That setup step interrupts
the primary tracking workflow and is unnecessary when the Application itself
identifies those reusable records.

## What Changes

- Allow the Dashboard's New Application flow to open and save without preexisting
  Companies or Recruiting Cycles.
- Let a person enter a Company name; reuse the Company with the same normalized
  name when present, otherwise create it without a candidate-portal URL.
- Let a person choose a Recruiting Cycle from previously used cycles and the
  Spring, Summer, Fall, and Winter options for 2027 through 2029, or enter
  another valid cycle; reuse or create the resulting Recruiting Cycle.
- Preserve Settings as the place to manually manage Companies and Recruiting
  Cycles, and leave Inbox automation unchanged except for any shared creation
  code required by the manual flow.

## Capabilities

### New Capabilities

- `manual-application-creation`: Create Applications from the Dashboard while
  resolving their Company and Recruiting Cycle from entered values.

### Modified Capabilities

None.

## Impact

- Dashboard creation affordance and Application form.
- Tracking HTTP contract and service-layer creation workflow.
- Application, Company, and Recruiting Cycle integration and UI tests.
- No database migration or new third-party dependency is expected.
