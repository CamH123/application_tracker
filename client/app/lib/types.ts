export type EventType =
  | "submitted"
  | "assessment_scheduled"
  | "assessment_completed"
  | "recruiter_screen"
  | "interview_scheduled"
  | "interview_completed"
  | "offer_received"
  | "offer_accepted"
  | "offer_declined"
  | "rejected"
  | "withdrawn"
  | "other";
export interface Company {
  id: string;
  name: string;
  candidatePortalUrl: string | null;
}
export interface RecruitingCycle {
  id: string;
  season: "Spring" | "Summer" | "Fall" | "Winter";
  year: number;
}
export interface ApplicationEvent {
  id: string;
  eventType: EventType;
  occurredOn: string;
  scheduledTime: string | null;
  timeZone: string | null;
  roundLabel: string | null;
  notes: string | null;
  recordedAt: string;
  inboxItemId: string | null;
}
export interface Application {
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
  currentStatus: string;
  completion: "active" | "completed";
  events: ApplicationEvent[];
}
export interface InboxItem {
  id: string;
  gmailMessageId: string;
  proposal: Record<string, any>;
  state: "active" | "accepted" | "dismissed";
  confidence: number | null;
  rationale: string;
  editedBeforeAcceptance: boolean;
  createdAt: string;
}
export interface SyncActivity {
  id: string;
  requestedStart: string;
  requestedEnd: string;
  startedAt: string;
  finishedAt: string | null;
  state: "running" | "succeeded" | "partial_failure" | "failed";
  scannedCount: number;
  createdInboxItemCount: number;
  skippedProcessedCount: number;
  failureMessage: string | null;
}
