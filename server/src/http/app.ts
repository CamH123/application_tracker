import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import type pg from "pg";
import { z, ZodError, type ZodType } from "zod";

import {
  cleanApplicationInput,
  ConflictError,
  NotFoundError,
  ReopenAcknowledgementError,
  TrackerService,
} from "../services/tracker.js";
import {
  GoogleGmailGateway,
  GoogleOAuthService,
} from "../integrations/google.js";
import { OllamaGateway } from "../integrations/ollama.js";
import { GmailRepository } from "../repositories/gmail.js";
import { InboxRepository } from "../repositories/inbox.js";
import { SyncActivityRepository } from "../repositories/sync-activities.js";
import { InboxService } from "../services/inbox.js";
import { PostgresSyncStore } from "../services/sync-store.js";
import { SyncRunner } from "../sync/sync.js";
import {
  SyncAlreadyRunningError,
  SyncCoordinator,
} from "../sync/coordinator.js";
import {
  applicationInputSchema,
  companyInputSchema,
  cycleInputSchema,
  eventInputSchema,
  filtersSchema,
  syncRangeSchema,
} from "./validation.js";

const parse = <T>(schema: ZodType<T>, value: unknown): T => schema.parse(value);
const routeId = (value: unknown): string => z.uuid().parse(value);

export const createHttpApp = (pool: pg.Pool) => {
  const app = express();
  const tracker = new TrackerService(pool);
  const gmailRepository = new GmailRepository(pool);
  const gmail = new GoogleGmailGateway(gmailRepository);
  const ollama = new OllamaGateway();
  const syncActivities = new SyncActivityRepository(pool);
  const syncRunner = new SyncRunner(new PostgresSyncStore(pool), gmail, ollama);
  const inbox = new InboxRepository(pool);
  const inboxService = new InboxService(pool);
  const oauth = new GoogleOAuthService(gmailRepository);
  const syncCoordinator = new SyncCoordinator(
    (start, end) => syncActivities.create(start, end),
    (start, end, activityId) => syncRunner.run(start, end, activityId),
  );

  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok" }),
  );
  app.get("/api/integrations/ollama/health", async (_request, response) =>
    response.json(await ollama.health()),
  );

  app.get("/api/applications", async (request, response) => {
    const filters = parse(filtersSchema, request.query);
    let applications = await tracker.applications().list();
    if (filters.recruitingCycleId)
      applications = applications.filter(
        (item) => item.recruitingCycle.id === filters.recruitingCycleId,
      );
    if (filters.companyId)
      applications = applications.filter(
        (item) => item.company.id === filters.companyId,
      );
    if (filters.currentStatus)
      applications = applications.filter(
        (item) => item.currentStatus === filters.currentStatus,
      );
    if (filters.isReferred)
      applications = applications.filter(
        (item) => item.isReferred === (filters.isReferred === "true"),
      );
    if (filters.completion !== "all")
      applications = applications.filter(
        (item) => item.completion === filters.completion,
      );
    response.json({ applications });
  });

  app.post("/api/applications", async (request, response) => {
    const input = cleanApplicationInput(
      parse(applicationInputSchema, request.body),
    );
    response
      .status(201)
      .json({ application: await tracker.createApplication(input) });
  });

  app.get("/api/applications/:id", async (request, response) => {
    const application = await tracker
      .applications()
      .get(routeId(request.params.id));
    if (!application) throw new NotFoundError("Application not found");
    response.json({ application });
  });

  app.patch("/api/applications/:id", async (request, response) => {
    const input = cleanApplicationInput(
      parse(applicationInputSchema, request.body),
    );
    response.json({
      application: await tracker.updateApplication(
        routeId(request.params.id),
        input,
      ),
    });
  });

  app.delete("/api/applications/:id", async (request, response) => {
    if (!(await tracker.applications().delete(routeId(request.params.id))))
      throw new NotFoundError("Application not found");
    response.status(204).end();
  });

  app.post("/api/applications/:id/events", async (request, response) => {
    const input = parse(eventInputSchema, request.body);
    response.status(201).json({
      event: await tracker.createEvent(routeId(request.params.id), input),
    });
  });

  app.patch("/api/application-events/:id", async (request, response) => {
    const input = parse(eventInputSchema, request.body);
    response.json({
      event: await tracker.updateEvent(routeId(request.params.id), input),
    });
  });

  app.delete("/api/application-events/:id", async (request, response) => {
    if (!(await tracker.events().delete(routeId(request.params.id))))
      throw new NotFoundError("Application Event not found");
    response.status(204).end();
  });

  app.get("/api/companies", async (_request, response) =>
    response.json({ companies: await tracker.companies().list() }),
  );
  app.post("/api/companies", async (request, response) => {
    const input = parse(companyInputSchema, request.body);
    response.status(201).json({
      company: await tracker
        .companies()
        .create(input.name, input.candidatePortalUrl || null),
    });
  });
  app.patch("/api/companies/:id", async (request, response) => {
    const input = parse(companyInputSchema, request.body);
    const company = await tracker
      .companies()
      .update(
        routeId(request.params.id),
        input.name,
        input.candidatePortalUrl || null,
      );
    if (!company) throw new NotFoundError("Company not found");
    response.json({ company });
  });
  app.delete("/api/companies/:id", async (request, response) => {
    const result = await tracker.companies().delete(routeId(request.params.id));
    if (result === "not_found") throw new NotFoundError("Company not found");
    if (result === "in_use")
      throw new ConflictError(
        "Move or delete this Company's Applications first",
      );
    response.status(204).end();
  });
  app.post("/api/companies/:id/merge", async (request, response) => {
    const { survivorId } = parse(
      z.object({ survivorId: z.uuid() }),
      request.body,
    );
    await tracker.mergeCompanies(routeId(request.params.id), survivorId);
    response.status(204).end();
  });

  app.get("/api/recruiting-cycles", async (_request, response) =>
    response.json({ recruitingCycles: await tracker.cycles().list() }),
  );
  app.post("/api/recruiting-cycles", async (request, response) => {
    const input = parse(cycleInputSchema, request.body);
    response.status(201).json({
      recruitingCycle: await tracker.cycles().create(input.season, input.year),
    });
  });
  app.patch("/api/recruiting-cycles/:id", async (request, response) => {
    const input = parse(cycleInputSchema, request.body);
    const cycle = await tracker
      .cycles()
      .update(routeId(request.params.id), input.season, input.year);
    if (!cycle) throw new NotFoundError("Recruiting Cycle not found");
    response.json({ recruitingCycle: cycle });
  });
  app.delete("/api/recruiting-cycles/:id", async (request, response) => {
    const result = await tracker.cycles().delete(routeId(request.params.id));
    if (result === "not_found")
      throw new NotFoundError("Recruiting Cycle not found");
    if (result === "in_use")
      throw new ConflictError(
        "Move this Recruiting Cycle's Applications before deleting it",
      );
    response.status(204).end();
  });

  app.get("/api/exports/events.csv", async (_request, response) => {
    response
      .type("text/csv")
      .attachment("application-events.csv")
      .send(await tracker.exportCsv());
  });

  app.get("/api/inbox-items", async (request, response) => {
    const tab = z
      .enum(["active", "history"])
      .default("active")
      .parse(request.query.tab);
    response.json({ inboxItems: await inbox.list(tab) });
  });
  app.get("/api/inbox-items/count", async (_request, response) =>
    response.json({ count: await inbox.countActive() }),
  );
  app.get("/api/inbox-items/:id/source-message", async (request, response) => {
    const item = await inbox.get(routeId(request.params.id));
    if (!item) throw new NotFoundError("Inbox Item not found");
    const message = await gmail.getSourceMessage(item.gmailMessageId);
    response.set("Cache-Control", "no-store").json({ message });
  });
  app.patch("/api/inbox-items/:id/proposal", async (request, response) => {
    response.json({
      inboxItem: await inboxService.updateProposal(
        routeId(request.params.id),
        request.body,
      ),
    });
  });
  app.post("/api/inbox-items/:id/accept", async (request, response) => {
    await inboxService.accept(routeId(request.params.id));
    response.status(204).end();
  });
  app.post("/api/inbox-items/:id/dismiss", async (request, response) => {
    await inboxService.dismiss(routeId(request.params.id));
    response.status(204).end();
  });

  app.get("/api/gmail/connection", async (_request, response) => {
    const connection = await gmailRepository.get();
    response.json({
      connection,
      initialSyncConfigured: Boolean(await syncActivities.lastCheckpoint()),
    });
  });
  app.get("/api/gmail/oauth/start", (_request, response) =>
    response.redirect(oauth.startUrl()),
  );
  app.get("/api/gmail/oauth/callback", async (request, response) => {
    const query = parse(
      z.object({ code: z.string().min(1), state: z.string().min(1) }),
      request.query,
    );
    await oauth.complete(query.code, query.state);
    response.redirect(
      `${process.env.CLIENT_ORIGIN ?? "http://localhost:5173"}/settings?gmail=connected`,
    );
  });
  app.delete("/api/gmail/connection", async (_request, response) => {
    await gmailRepository.disconnect();
    response.status(204).end();
  });

  app.post("/api/syncs", async (request, response) => {
    const range = parse(syncRangeSchema, request.body);
    response.status(202).json({
      syncActivityId: await syncCoordinator.launch(range.start, range.end),
    });
  });
  app.post("/api/syncs/startup", async (_request, response) => {
    const checkpoint = await syncActivities.lastCheckpoint();
    const connection = await gmailRepository.get();
    if (!checkpoint || !connection) {
      response.status(204).end();
      return;
    }
    if (syncCoordinator.isRunning) {
      response.status(202).json({ alreadyRunning: true });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    response.status(202).json({
      syncActivityId: await syncCoordinator.launch(
        checkpoint.slice(0, 10),
        today,
      ),
    });
  });
  app.get("/api/syncs", async (_request, response) =>
    response.json({ syncActivities: await syncActivities.list() }),
  );
  app.get("/api/syncs/:id", async (request, response) => {
    const activity = await syncActivities.get(routeId(request.params.id));
    if (!activity) throw new NotFoundError("Sync Activity not found");
    response.json({ syncActivity: activity });
  });

  const errorHandler: ErrorRequestHandler = (
    error: unknown,
    _request,
    response,
    _next,
  ) => {
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "validation_error",
        fields: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    if (error instanceof NotFoundError) {
      response.status(404).json({ error: "not_found", message: error.message });
      return;
    }
    if (error instanceof ReopenAcknowledgementError) {
      response.status(409).json({
        error: "reopen_acknowledgement_required",
        message: error.message,
      });
      return;
    }
    if (error instanceof SyncAlreadyRunningError) {
      response.status(409).json({ error: "conflict", message: error.message });
      return;
    }
    const code =
      typeof error === "object" && error && "code" in error
        ? String(error.code)
        : "";
    if (
      error instanceof ConflictError ||
      code === "23505" ||
      code === "23503"
    ) {
      response.status(409).json({
        error: "conflict",
        message:
          error instanceof Error
            ? error.message
            : "The record conflicts with existing data",
      });
      return;
    }
    console.error(error);
    response.status(500).json({
      error: "internal_error",
      message: "The request could not be completed",
    });
  };
  app.use(errorHandler);
  return app;
};
