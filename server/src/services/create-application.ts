import type { Database } from "../database/client.js";
import {
  ApplicationRepository,
  type ApplicationInput,
} from "../repositories/applications.js";
import { EventRepository } from "../repositories/events.js";

export const createApplicationWithSubmittedEvent = async (
  database: Database,
  input: ApplicationInput,
): Promise<string> => {
  const applicationId = await new ApplicationRepository(database).create(input);
  await new EventRepository(database).create(applicationId, {
    eventType: "submitted",
    occurredOn: input.submissionDate,
    inboxItemId: input.inboxItemId,
  });
  return applicationId;
};
