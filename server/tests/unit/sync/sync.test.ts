import { describe, expect, it } from "vitest";

import { SyncRunner } from "../../../src/modules/sync/service.js";
import type { AnalysisGateway, GmailGateway, SyncStore } from "../../../src/modules/sync/contracts.js";

class MemoryStore implements SyncStore {
  activities: Array<Record<string, unknown>> = [];
  processed = new Set<string>();
  inbox: string[] = [];

  async createActivity(start: string, end: string) {
    this.activities.push({ id: "sync-1", start, end, state: "running" });
    return "sync-1";
  }
  async isProcessed(id: string) {
    return this.processed.has(id);
  }
  async recordProcessed(
    id: string,
    outcome: "recruiting" | "non_recruiting",
    proposal?: unknown,
  ) {
    this.processed.add(id);
    if (outcome === "recruiting") this.inbox.push(JSON.stringify(proposal));
  }
  async updateActivity(_id: string, update: Record<string, unknown>) {
    Object.assign(this.activities[0]!, update);
  }
}

const gmail = (ids: string[], failureAt?: string): GmailGateway => ({
  async listMessageIds() {
    return ids;
  },
  async getMessage(id) {
    if (id === failureAt) throw new Error("Gmail unavailable");
    return {
      id,
      from: "recruiter@example.com",
      subject: "Interview",
      text: "Can we meet?",
    };
  },
  async getSourceMessage() {
    throw new Error("not used");
  },
});

const analysis = (healthy = true): AnalysisGateway => ({
  async health() {
    return healthy
      ? { available: true }
      : { available: false, message: "model missing" };
  },
  async analyze(message) {
    return {
      recruiting: true,
      proposal: {
        action: "create_event",
        targetApplicationId: "00000000-0000-4000-8000-000000000100",
        event: {
          eventType: "interview_scheduled",
          occurredOn: "2027-02-04",
          scheduledTime: "10:00",
          timeZone: "America/Chicago",
        },
      },
      confidence: 0.91,
      rationale: `Recruiting sender: ${message.from}`,
    };
  },
});

describe("Gmail Sync Window", () => {
  it("writes no Inbox Items or processed IDs when Ollama preflight fails", async () => {
    const store = new MemoryStore();
    await new SyncRunner(store, gmail(["one"]), analysis(false)).run(
      "2027-01-01",
      "2027-01-31",
    );
    expect(store.processed.size).toBe(0);
    expect(store.inbox).toHaveLength(0);
    expect(store.activities[0]).toMatchObject({
      state: "failed",
      failureMessage: "model missing",
    });
  });

  it("preserves completed messages and reports partial failure for a later Gmail error", async () => {
    const store = new MemoryStore();
    await new SyncRunner(store, gmail(["one", "two"], "two"), analysis()).run(
      "2027-01-01",
      "2027-01-31",
    );
    expect([...store.processed]).toEqual(["one"]);
    expect(store.inbox).toHaveLength(1);
    expect(store.activities[0]).toMatchObject({
      state: "partial_failure",
      scannedCount: 2,
      createdInboxItemCount: 1,
    });
  });

  it("skips processed message IDs when retrying an inclusive range", async () => {
    const store = new MemoryStore();
    store.processed.add("one");
    await new SyncRunner(store, gmail(["one", "two"]), analysis()).run(
      "2027-01-01",
      "2027-01-31",
    );
    expect([...store.processed]).toEqual(["one", "two"]);
    expect(store.activities[0]).toMatchObject({
      state: "succeeded",
      skippedProcessedCount: 1,
      createdInboxItemCount: 1,
    });
  });

  it("records model-classified non-recruiting results without creating an Inbox Item", async () => {
    const store = new MemoryStore();
    const nonRecruiting: AnalysisGateway = {
      async health() {
        return { available: true };
      },
      async analyze() {
        return {
          recruiting: false,
          confidence: 0.99,
          rationale: "Generic newsletter",
        };
      },
    };
    await new SyncRunner(store, gmail(["newsletter"]), nonRecruiting).run(
      "2027-01-01",
      "2027-01-31",
    );
    expect([...store.processed]).toEqual(["newsletter"]);
    expect(store.inbox).toHaveLength(0);
  });
});
