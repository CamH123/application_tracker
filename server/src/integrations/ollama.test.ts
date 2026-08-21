import { afterEach, describe, expect, it, vi } from "vitest";

import { OllamaGateway } from "./ollama.js";

afterEach(() => vi.unstubAllGlobals());

describe("Ollama structured output", () => {
  it("rejects malformed model JSON instead of processing the Gmail message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: { content: "not json" } }), {
          status: 200,
        }),
      ),
    );
    await expect(
      new OllamaGateway().analyze({
        id: "gmail-1",
        from: "recruiter@example.com",
        subject: "Interview",
        text: "Hello",
      }),
    ).rejects.toThrow("malformed JSON");
  });
});
