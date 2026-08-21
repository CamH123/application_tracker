import type { Express } from "express";
import { z } from "zod";
import { NotFoundError } from "../../platform/http/errors.js";
import { routeId } from "../../platform/http/parse.js";
import { InboxService } from "./service.js";
import { InboxRepository } from "./repository.js";
import type { GmailGateway } from "../sync/contracts.js";
export const registerInboxRoutes = (
  app: Express,
  inbox: InboxRepository,
  service: InboxService,
  gmail: GmailGateway,
): void => {
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
    response
      .set("Cache-Control", "no-store")
      .json({ message: await gmail.getSourceMessage(item.gmailMessageId) });
  });
  app.patch("/api/inbox-items/:id/proposal", async (request, response) =>
    response.json({
      inboxItem: await service.updateProposal(
        routeId(request.params.id),
        request.body,
      ),
    }),
  );
  app.post("/api/inbox-items/:id/accept", async (request, response) => {
    await service.accept(routeId(request.params.id));
    response.status(204).end();
  });
  app.post("/api/inbox-items/:id/dismiss", async (request, response) => {
    await service.dismiss(routeId(request.params.id));
    response.status(204).end();
  });
};
