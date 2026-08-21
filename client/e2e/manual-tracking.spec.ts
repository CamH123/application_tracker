import { expect, test } from "@playwright/test";

test("manual Application workflow and accessible dialogs", async ({ page }) => {
  const suffix = Date.now().toString();
  const companyName = `E2E Company ${suffix}`;
  const roleTitle = `E2E Engineer ${suffix}`;

  await page.goto("/settings");
  const companies = page
    .locator("section.settings-card")
    .filter({ hasText: "Companies" });
  await companies.getByLabel("Name").fill(companyName);
  await companies
    .getByLabel("Candidate-portal URL")
    .fill("https://example.com/candidates");
  await companies.getByRole("button", { name: "Add Company" }).click();
  await expect(companies.getByText(companyName)).toBeVisible();

  const cycles = page
    .locator("section.settings-card")
    .filter({ hasText: "Recruiting Cycles" });
  await cycles.getByLabel("Season").selectOption("Winter");
  await cycles.getByLabel("Year").fill("2199");
  await cycles.getByRole("button", { name: "Add cycle" }).click();
  await expect(cycles.getByText("Winter 2199")).toBeVisible();

  await page.goto("/");
  const newApplication = page.getByRole("button", { name: "New Application" });
  await expect(newApplication).toBeEnabled();
  await newApplication.click();
  const createDialog = page.getByRole("dialog", { name: "New Application" });
  await expect(createDialog).toBeVisible();
  await expect(
    createDialog.getByRole("button", { name: "Close dialog" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(createDialog).not.toBeVisible();
  await expect(newApplication).toBeFocused();

  await newApplication.click();
  const dialog = page.getByRole("dialog", { name: "New Application" });
  await dialog.getByLabel("Company").selectOption({ label: companyName });
  await dialog.getByLabel("Role title").fill(roleTitle);
  await dialog
    .getByLabel("Recruiting Cycle")
    .selectOption({ label: "Winter 2199" });
  await dialog.getByLabel("Submission date").fill("2027-01-12");
  await dialog.getByRole("button", { name: "Save Application" }).click();

  const row = page.getByRole("row", {
    name: new RegExp(`${companyName}.*${roleTitle}`),
  });
  await expect(row).toContainText("Applied");
  await row.click();
  const detail = page.getByRole("dialog", {
    name: `${companyName} · ${roleTitle}`,
  });
  await detail.getByLabel("Location").fill("Chicago, IL");
  await detail.getByRole("button", { name: "Save Application" }).click();
  await detail.getByRole("button", { name: "Add event" }).click();

  const eventDialog = page.getByRole("dialog", {
    name: "Add Application Event",
  });
  await eventDialog.getByLabel("Type").selectOption("interview_scheduled");
  await eventDialog.getByLabel("Occurrence date").fill("2027-02-10");
  await eventDialog.getByLabel("Local time").fill("10:30");
  await eventDialog.getByLabel("IANA time zone").fill("America/Chicago");
  await eventDialog.getByLabel("Round label").fill("Technical 1");
  await eventDialog
    .getByRole("button", { name: "Save Application Event" })
    .click();
  await expect(detail).toContainText("Interviewing");
  await detail.getByRole("button", { name: "Close dialog" }).click();

  await page.getByLabel("Current Status").selectOption("Interviewing");
  await expect(row).toBeVisible();
  await row.click();
  await detail.getByRole("button", { name: "Delete Application" }).click();
  const confirmation = page.getByRole("dialog", {
    name: "Delete Application permanently?",
  });
  await expect(confirmation).toContainText("There is no undo");
  await confirmation
    .getByRole("button", { name: "Delete permanently" })
    .click();
  await expect(page.getByText(roleTitle)).not.toBeVisible();
});

test("running Sync Activity exposes progress and live scanned count", async ({
  page,
}) => {
  await page.route("**/api/companies", (route) =>
    route.fulfill({ json: { companies: [] } }),
  );
  await page.route("**/api/recruiting-cycles", (route) =>
    route.fulfill({ json: { recruitingCycles: [] } }),
  );
  await page.route("**/api/gmail/connection", (route) =>
    route.fulfill({
      json: {
        connection: { gmailAddress: "owner@example.com" },
        initialSyncConfigured: true,
      },
    }),
  );
  await page.route("**/api/integrations/ollama/health", (route) =>
    route.fulfill({ json: { available: true } }),
  );
  await page.route("**/api/syncs", (route) =>
    route.fulfill({
      json: {
        syncActivities: [
          {
            id: "00000000-0000-4000-8000-000000000099",
            requestedStart: "2027-01-01",
            requestedEnd: "2027-01-31",
            startedAt: "2027-02-01T12:00:00Z",
            finishedAt: null,
            state: "running",
            scannedCount: 3,
            createdInboxItemCount: 1,
            skippedProcessedCount: 1,
            failureMessage: null,
          },
        ],
      },
    }),
  );
  await page.route("**/api/syncs/startup", (route) =>
    route.fulfill({ status: 202, json: { alreadyRunning: true } }),
  );
  await page.goto("/settings");
  await expect(
    page.getByRole("progressbar", {
      name: "Sync in progress; 3 messages scanned",
    }),
  ).toBeVisible();
  const liveStatus = page.getByText(
    "3 scanned · 1 new Inbox Items · 1 skipped",
  );
  await expect(liveStatus).toHaveAttribute("aria-live", "polite");
});
