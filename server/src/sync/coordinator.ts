export class SyncAlreadyRunningError extends Error {}

export class SyncCoordinator {
  private running = false;

  constructor(
    private readonly createActivity: (
      start: string,
      end: string,
    ) => Promise<string>,
    private readonly run: (
      start: string,
      end: string,
      activityId: string,
    ) => Promise<unknown>,
  ) {}

  async launch(start: string, end: string): Promise<string> {
    if (this.running)
      throw new SyncAlreadyRunningError(
        "A Gmail Sync Window is already running",
      );
    this.running = true;
    let activityId: string;
    try {
      activityId = await this.createActivity(start, end);
    } catch (error) {
      this.running = false;
      throw error;
    }
    void this.run(start, end, activityId).finally(() => {
      this.running = false;
    });
    return activityId;
  }

  get isRunning(): boolean {
    return this.running;
  }
}
