import type { Express } from "express";
import { NotFoundError } from "../../platform/http/errors.js";
import { parse, routeId } from "../../platform/http/parse.js";
import { syncRangeSchema } from "../tracking/schemas.js";
import type { GmailRepository } from "../gmail/repository.js";
import { SyncCoordinator } from "./service.js";
import type { AnalysisGateway } from "./contracts.js";
import { SyncActivityRepository } from "./repository.js";
export const registerSyncRoutes = (
  app: Express,
  coordinator: SyncCoordinator,
  activities: SyncActivityRepository,
  gmail: GmailRepository,
  analysis: AnalysisGateway,
): void => {
  app.get("/api/integrations/ollama/health", async (_request, response) =>
    response.json(await analysis.health()),
  );
  app.post("/api/syncs", async (request, response) => {
    const range = parse(syncRangeSchema, request.body);
    response
      .status(202)
      .json({
        syncActivityId: await coordinator.launch(range.start, range.end),
      });
  });
  app.post("/api/syncs/startup", async (_request, response) => {
    const checkpoint = await activities.lastCheckpoint();
    const connection = await gmail.get();
    if (!checkpoint || !connection) {
      response.status(204).end();
      return;
    }
    if (coordinator.isRunning) {
      response.status(202).json({ alreadyRunning: true });
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    response
      .status(202)
      .json({
        syncActivityId: await coordinator.launch(
          checkpoint.slice(0, 10),
          today,
        ),
      });
  });
  app.get("/api/syncs", async (_request, response) =>
    response.json({ syncActivities: await activities.list() }),
  );
  app.get("/api/syncs/:id", async (request, response) => {
    const syncActivity = await activities.get(routeId(request.params.id));
    if (!syncActivity) throw new NotFoundError("Sync Activity not found");
    response.json({ syncActivity });
  });
};
