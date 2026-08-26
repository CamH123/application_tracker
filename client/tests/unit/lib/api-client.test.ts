import { afterEach, describe, expect, it, vi } from "vitest";

import { api, ApiError } from "../../../app/lib/api-client";

afterEach(() => vi.unstubAllGlobals());

describe("JSON API boundary", () => {
  it("preserves structured field errors for forms", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            message: "Invalid request",
            fields: [{ field: "submissionDate", message: "Use YYYY-MM-DD" }],
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const error = await api("/applications", {
      method: "POST",
      body: "{}",
    }).catch((reason) => reason);
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.fields).toEqual([
      { field: "submissionDate", message: "Use YYYY-MM-DD" },
    ]);
  });
});
