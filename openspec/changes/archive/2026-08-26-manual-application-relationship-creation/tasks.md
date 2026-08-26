## 1. Server creation contract

- [x] 1.1 Define and validate the manual Application creation input with a Company name and Recruiting Cycle season/year, while preserving the existing identifier-based update input; verify server unit schema tests cover valid and invalid cycle values.
- [x] 1.2 Add a transactional tracking-service operation that resolves or creates the Company and Recruiting Cycle before creating the Application, reusing normalized Company identity and handling unique-identity races; verify focused service or repository tests cover reuse, first creation, and rollback on a failed Application.
- [x] 1.3 Expose the new manual creation operation through the Application create route without changing Inbox acceptance behavior; verify HTTP integration tests cover a first Application, reuse of existing records, duplicate Application rejection, no orphan records after rejection, and merging an automatically created Company through the existing Settings API.

## 2. Dashboard creation experience

- [x] 2.1 Remove the empty-relationship gate from New Application and replace the creation-form Company selector with an entered Company name while retaining the existing edit behavior; verify the Dashboard can open New Application with empty Company and Recruiting Cycle lists.
- [x] 2.2 Add a Recruiting Cycle autocomplete-style control that lists stored cycles plus every season in 2027–2029 and accepts a valid typed `Season YYYY` value; verify client tests cover suggested selection, an unsuggested valid value, and an invalid value.
- [x] 2.3 Submit the creation-specific payload, surface server field errors, and reload the Dashboard's Applications and relationship lists after success; verify a client test confirms the newly created Company appears in the Settings viewer and that the newly created records are available to filters and a subsequent Application form.

## 3. Full verification

- [x] 3.1 Run `npm run typecheck`, `npm test`, and `npm run test:integration`; verify all pass with the new manual creation scenarios.
- [x] 3.2 Run `openspec validate manual-application-relationship-creation --strict`; verify the planning artifacts remain valid.
