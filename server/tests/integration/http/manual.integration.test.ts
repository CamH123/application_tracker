import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import pg from "pg";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createHttpApp } from "../../../src/bootstrap/http-app.js";

const databaseUrl = process.env.TEST_DATABASE_URL;
const databaseDescribe = databaseUrl ? describe : describe.skip;
let pool: pg.Pool;

databaseDescribe("manual tracking against PostgreSQL", () => {
  beforeAll(async () => {
    if (!databaseUrl?.endsWith("/application_tracker_test"))
      throw new Error(
        "Integration tests require a dedicated application_tracker_test database",
      );
    pool = new pg.Pool({ connectionString: databaseUrl });
    const exists = await pool.query(
      "SELECT to_regclass('public.owners') relation",
    );
    if (!exists.rows[0]?.relation) {
      const migration = await readFile(
        join(
          dirname(fileURLToPath(import.meta.url)),
          "../../../migrations/001_initial.sql",
        ),
        "utf8",
      );
      await pool.query(migration);
    }
    await pool.query(
      "TRUNCATE sync_activities, processed_gmail_messages, application_events, inbox_items, applications, gmail_connections, recruiting_cycles, companies RESTART IDENTITY CASCADE",
    );
  });
  afterAll(async () => pool?.end());

  it("creates a Submitted Application and recalculates status after event changes", async () => {
    const app = createHttpApp(pool);
    const company = (
      await request(app)
        .post("/api/companies")
        .send({ name: "Google", candidatePortalUrl: null })
    ).body.company;
    const cycle = (
      await request(app)
        .post("/api/recruiting-cycles")
        .send({ season: "Summer", year: 2027 })
    ).body.recruitingCycle;
    const created = await request(app).post("/api/applications").send({
      companyId: company.id,
      recruitingCycleId: cycle.id,
      roleTitle: "SWE Intern",
      submissionDate: "2027-01-12",
      isReferred: false,
    });
    expect(created.status).toBe(201);
    expect(created.body.application).toMatchObject({
      currentStatus: "Applied",
      completion: "active",
    });
    expect(created.body.application.events).toHaveLength(1);

    const scheduled = await request(app)
      .post(`/api/applications/${created.body.application.id}/events`)
      .send({
        eventType: "interview_scheduled",
        occurredOn: "2027-02-10",
        scheduledTime: "10:30",
        timeZone: "America/Chicago",
        roundLabel: "Technical 1",
      });
    expect(scheduled.status).toBe(201);
    expect(
      (
        await request(app).get(
          `/api/applications/${created.body.application.id}`,
        )
      ).body.application.currentStatus,
    ).toBe("Interviewing");
    await request(app)
      .patch(`/api/application-events/${scheduled.body.event.id}`)
      .send({
        eventType: "interview_completed",
        occurredOn: "2027-02-10",
        roundLabel: "Technical 1",
      });
    expect(
      (
        await request(app).get(
          `/api/applications/${created.body.application.id}`,
        )
      ).body.application.currentStatus,
    ).toBe("Awaiting response");
  });

  it("enforces normalized duplicate Applications in PostgreSQL", async () => {
    const app = createHttpApp(pool);
    const company = (await request(app).get("/api/companies")).body
      .companies[0];
    const cycle = (await request(app).get("/api/recruiting-cycles")).body
      .recruitingCycles[0];
    const duplicate = await request(app).post("/api/applications").send({
      companyId: company.id,
      recruitingCycleId: cycle.id,
      roleTitle: "  swe   intern ",
      submissionDate: "2027-01-13",
    });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error).toBe("conflict");
  });

  it("accepts one edited Inbox proposal transactionally and retains provenance", async () => {
    const app = createHttpApp(pool);
    const application = (await request(app).get("/api/applications")).body
      .applications[0];
    const proposal = {
      action: "create_event",
      targetApplicationId: application.id,
      event: { eventType: "offer_received", occurredOn: "2027-03-01" },
    };
    const inserted = await pool.query<{ id: string }>(
      `INSERT INTO inbox_items(owner_id,gmail_message_id,proposal,original_proposal,rationale)
       VALUES('00000000-0000-4000-8000-000000000001','gmail-integration-1',$1,$1,'Offer language') RETURNING id`,
      [JSON.stringify(proposal)],
    );
    const inboxItemId = inserted.rows[0]!.id;
    proposal.event.occurredOn = "2027-03-02";
    expect(
      (
        await request(app)
          .patch(`/api/inbox-items/${inboxItemId}/proposal`)
          .send(proposal)
      ).status,
    ).toBe(200);
    expect(
      (await request(app).post(`/api/inbox-items/${inboxItemId}/accept`))
        .status,
    ).toBe(204);
    const refreshed = (
      await request(app).get(`/api/applications/${application.id}`)
    ).body.application;
    expect(refreshed.events).toContainEqual(
      expect.objectContaining({
        eventType: "offer_received",
        occurredOn: "2027-03-02",
        inboxItemId,
      }),
    );
    const history = (await request(app).get("/api/inbox-items?tab=history"))
      .body.inboxItems;
    expect(history[0]).toMatchObject({
      id: inboxItemId,
      state: "accepted",
      editedBeforeAcceptance: true,
    });
    const columns = await pool.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='inbox_items'",
    );
    expect(columns.rows.map((row) => row.column_name)).not.toEqual(
      expect.arrayContaining(["subject", "snippet", "body", "headers"]),
    );
  });
});
