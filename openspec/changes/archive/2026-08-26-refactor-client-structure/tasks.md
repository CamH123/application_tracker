## 1. Page and API module reorganization

- [x] 1.1 Move Dashboard, Inbox, and Settings modules into `client/app/pages/<page>/`, retain descriptive screen and supporting filenames, and verify all moved modules resolve through client type checking.
- [x] 1.2 Rename `client/app/lib/api.ts` to `api-client.ts`, update shared and page API imports, and verify the API-client unit test still passes.
- [x] 1.3 Update `client/app/routes.ts` to route directly to the descriptive page screen modules and remove the re-export-only route modules; browser route verification is tracked in task 5.3.

## 2. Persistent frame and inbox lifecycle behavior

- [x] 2.1 Extract active inbox-count fetching, five-second polling, silent failure handling, and timer cleanup into `pages/inbox/use-inbox-badge.ts`; browser verification is tracked in task 5.3.
- [x] 2.2 Extract the prior-checkpoint check and one mount-time startup-sync request into `pages/inbox/use-sync-on-app-mount.ts`; browser verification is tracked in task 5.3.
- [x] 2.3 Move the persistent app frame and navigation into `root.tsx`, consume the inbox hooks there, and remove `layout/shell.tsx` and its layout route; browser verification is tracked in task 5.3.

## 3. Shared dialog terminology

- [x] 3.1 Move the native dialog primitive to `client/app/components/dialog.tsx`, rename `Modal` to `Dialog`, and update consumer imports; browser dialog verification is tracked in task 5.3.
- [x] 3.2 Rename modal-specific CSS selectors to dialog terminology; browser styling verification is tracked in task 5.3.

## 4. Dedicated test layout

- [x] 4.1 Move the API-client unit test to `client/tests/unit/lib/api-client.test.ts` and update its imports; verify `npm test -w client` discovers and passes it while excluding end-to-end tests.
- [x] 4.2 Move Playwright coverage to `client/tests/e2e/`, update `playwright.config.ts` and test script exclusions, and verify `npm run test:e2e -w client` discovers the manual-tracking test.

## 5. Regression verification

- [x] 5.1 Run `npm run typecheck -w client` and `npm test -w client`; verify both pass after all moves and renames.
- [x] 5.2 Defer `npm run test:e2e -w client` at the user's request; the E2E suite was not run.
- [ ] 5.3 Manually verify Dashboard, Inbox, and Settings navigation, inbox badge polling, conditional startup sync, and dialog interactions retain their existing behavior.
