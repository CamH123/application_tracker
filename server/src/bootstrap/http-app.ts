import cors from "cors";
import express from "express";
import type pg from "pg";

import { InboxService } from "../modules/inbox/service.js";
import { InboxRepository } from "../modules/inbox/repository.js";
import { registerInboxRoutes } from "../modules/inbox/routes.js";
import {
  GoogleGmailGateway,
  GoogleOAuthService,
} from "../modules/gmail/google.js";
import { GmailRepository } from "../modules/gmail/repository.js";
import { registerGmailRoutes } from "../modules/gmail/routes.js";
import { TrackingService } from "../modules/tracking/service.js";
import { registerTrackingRoutes } from "../modules/tracking/routes.js";
import { OllamaGateway } from "../modules/sync/ollama.js";
import { SyncCoordinator, SyncRunner } from "../modules/sync/service.js";
import {
  PostgresSyncStore,
  SyncActivityRepository,
} from "../modules/sync/repository.js";
import { registerSyncRoutes } from "../modules/sync/routes.js";
import { errorHandler } from "../platform/http/errors.js";

export const createHttpApp = (pool: pg.Pool) => {
  const app = express();
  app.use(
    cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }),
  );
  app.use(express.json({ limit: "1mb" }));
  app.get("/api/health", (_request, response) =>
    response.json({ status: "ok" }),
  );
  const tracking = new TrackingService(pool);
  const gmailRepository = new GmailRepository(pool);
  const gmail = new GoogleGmailGateway(gmailRepository);
  const syncActivities = new SyncActivityRepository(pool);
  const ollama = new OllamaGateway();
  const syncRunner = new SyncRunner(
    new PostgresSyncStore(pool, tracking),
    gmail,
    ollama,
  );
  const coordinator = new SyncCoordinator(
    (start, end) => syncActivities.create(start, end),
    (start, end, activityId) => syncRunner.run(start, end, activityId),
  );
  registerTrackingRoutes(app, tracking);
  registerInboxRoutes(
    app,
    new InboxRepository(pool),
    new InboxService(pool, tracking),
    gmail,
  );
  registerGmailRoutes(
    app,
    gmailRepository,
    new GoogleOAuthService(gmailRepository),
    syncActivities,
  );
  registerSyncRoutes(app, coordinator, syncActivities, gmailRepository, ollama);
  app.use(errorHandler);
  return app;
};
