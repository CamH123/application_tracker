import type { Express } from "express";
import { z } from "zod";

import { ConflictError, NotFoundError } from "../../platform/http/errors.js";
import { parse, routeId } from "../../platform/http/parse.js";
import {
  applicationInputSchema,
  companyInputSchema,
  cycleInputSchema,
  eventInputSchema,
  filtersSchema,
} from "./schemas.js";
import { cleanApplicationInput, TrackingService } from "./service.js";

export const registerTrackingRoutes = (
  app: Express,
  tracking: TrackingService,
): void => {
  app.get("/api/applications", async (request, response) => {
    const filters = parse(filtersSchema, request.query);
    let applications = await tracking.listApplications();
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
      .json({ application: await tracking.createApplication(input) });
  });
  app.get("/api/applications/:id", async (request, response) => {
    const application = await tracking.getApplication(
      routeId(request.params.id),
    );
    if (!application) throw new NotFoundError("Application not found");
    response.json({ application });
  });
  app.patch("/api/applications/:id", async (request, response) => {
    const input = cleanApplicationInput(
      parse(applicationInputSchema, request.body),
    );
    response.json({
      application: await tracking.updateApplication(
        routeId(request.params.id),
        input,
      ),
    });
  });
  app.delete("/api/applications/:id", async (request, response) => {
    if (!(await tracking.deleteApplication(routeId(request.params.id))))
      throw new NotFoundError("Application not found");
    response.status(204).end();
  });
  app.post("/api/applications/:id/events", async (request, response) => {
    const input = parse(eventInputSchema, request.body);
    response
      .status(201)
      .json({
        event: await tracking.createEvent(routeId(request.params.id), input),
      });
  });
  app.patch("/api/application-events/:id", async (request, response) => {
    const input = parse(eventInputSchema, request.body);
    response.json({
      event: await tracking.updateEvent(routeId(request.params.id), input),
    });
  });
  app.delete("/api/application-events/:id", async (request, response) => {
    if (!(await tracking.deleteEvent(routeId(request.params.id))))
      throw new NotFoundError("Application Event not found");
    response.status(204).end();
  });

  app.get("/api/companies", async (_request, response) =>
    response.json({ companies: await tracking.listCompanies() }),
  );
  app.post("/api/companies", async (request, response) => {
    const input = parse(companyInputSchema, request.body);
    response
      .status(201)
      .json({
        company: await tracking.createCompany(
          input.name,
          input.candidatePortalUrl || null,
        ),
      });
  });
  app.patch("/api/companies/:id", async (request, response) => {
    const input = parse(companyInputSchema, request.body);
    const company = await tracking.updateCompany(
      routeId(request.params.id),
      input.name,
      input.candidatePortalUrl || null,
    );
    if (!company) throw new NotFoundError("Company not found");
    response.json({ company });
  });
  app.delete("/api/companies/:id", async (request, response) => {
    const result = await tracking.deleteCompany(routeId(request.params.id));
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
    await tracking.mergeCompanies(routeId(request.params.id), survivorId);
    response.status(204).end();
  });

  app.get("/api/recruiting-cycles", async (_request, response) =>
    response.json({ recruitingCycles: await tracking.listCycles() }),
  );
  app.post("/api/recruiting-cycles", async (request, response) => {
    const input = parse(cycleInputSchema, request.body);
    response
      .status(201)
      .json({
        recruitingCycle: await tracking.createCycle(input.season, input.year),
      });
  });
  app.patch("/api/recruiting-cycles/:id", async (request, response) => {
    const input = parse(cycleInputSchema, request.body);
    const recruitingCycle = await tracking.updateCycle(
      routeId(request.params.id),
      input.season,
      input.year,
    );
    if (!recruitingCycle) throw new NotFoundError("Recruiting Cycle not found");
    response.json({ recruitingCycle });
  });
  app.delete("/api/recruiting-cycles/:id", async (request, response) => {
    const result = await tracking.deleteCycle(routeId(request.params.id));
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
      .send(await tracking.exportCsv());
  });
};
