import { describe, expect, it } from "vitest";

import { SyncAlreadyRunningError, SyncCoordinator } from "./coordinator.js";

describe("per-owner Gmail sync coordination", () => {
  it("locks before durable activity creation so simultaneous requests cannot race", async () => {
    let finishCreation!: (id: string) => void;
    const creation = new Promise<string>((resolve) => {
      finishCreation = resolve;
    });
    const coordinator = new SyncCoordinator(
      () => creation,
      async () => {},
    );
    const first = coordinator.launch("2027-01-01", "2027-01-31");
    await expect(
      coordinator.launch("2027-01-01", "2027-01-31"),
    ).rejects.toBeInstanceOf(SyncAlreadyRunningError);
    finishCreation("sync-1");
    await expect(first).resolves.toBe("sync-1");
  });
});
