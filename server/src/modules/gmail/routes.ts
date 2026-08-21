import type { Express } from "express";
import { z } from "zod";
import { parse } from "../../platform/http/parse.js";
import { GoogleOAuthService } from "./google.js";
import { GmailRepository } from "./repository.js";
import type { SyncActivityRepository } from "../sync/repository.js";
export const registerGmailRoutes = (
  app: Express,
  repository: GmailRepository,
  oauth: GoogleOAuthService,
  syncActivities: SyncActivityRepository,
): void => {
  app.get("/api/gmail/connection", async (_request, response) =>
    response.json({
      connection: await repository.get(),
      initialSyncConfigured: Boolean(await syncActivities.lastCheckpoint()),
    }),
  );
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
    await repository.disconnect();
    response.status(204).end();
  });
};
