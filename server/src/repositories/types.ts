import type { CurrentStatus, EventType } from "../domain/application.js";

export interface Company {
  id: string;
  name: string;
  normalizedName: string;
  candidatePortalUrl: string | null;
}

export interface RecruitingCycle {
  id: string;
  season: "Spring" | "Summer" | "Fall" | "Winter";
  year: number;
}

export interface EventRecord {
  id: string;
  applicationId: string;
  eventType: EventType;
  occurredOn: string;
  scheduledTime: string | null;
  timeZone: string | null;
  roundLabel: string | null;
  notes: string | null;
  recordedAt: string;
  inboxItemId: string | null;
}

export interface ApplicationRecord {
  id: string;
  company: Company;
  recruitingCycle: RecruitingCycle;
  roleTitle: string;
  submissionDate: string;
  applicationUrl: string | null;
  externalApplicationId: string | null;
  location: string | null;
  workArrangement: "remote" | "hybrid" | "on-site" | null;
  isReferred: boolean;
  notes: string | null;
  inboxItemId: string | null;
  events: EventRecord[];
  currentStatus: CurrentStatus;
  completion: "active" | "completed";
}
