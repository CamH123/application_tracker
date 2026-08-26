import type pg from "pg";
import request from "supertest";
import { describe, expect, it } from "vitest";

import { createHttpApp } from "../../../src/bootstrap/http-app.js";

const unusedPool = {
  query: async () => {
    throw new Error("Database should not be reached");
  },
} as unknown as pg.Pool;

describe("JSON API", () => {
  it("reports service health without requiring an integration", async () => {
    const response = await request(createHttpApp(unusedPool)).get(
      "/api/health",
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });

  it("returns structured field errors at the request boundary", async () => {
    const response = await request(createHttpApp(unusedPool))
      .post("/api/applications")
      .send({ roleTitle: "" });
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation_error");
    expect(
      response.body.fields.map((field: { field: string }) => field.field),
    ).toContain("companyName");
  });

  it("validates route identifiers before repository access", async () => {
    const response = await request(createHttpApp(unusedPool)).get(
      "/api/applications/not-a-uuid",
    );
    expect(response.status).toBe(400);
    expect(response.body.error).toBe("validation_error");
  });
});
