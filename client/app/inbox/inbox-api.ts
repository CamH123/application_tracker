import { api } from "../lib/api";
import type { Application, InboxItem } from "../lib/types";

export type InboxTab = "active" | "history";
export type SourceMessage = { from: string; subject: string; text: string };

export const listInboxItems = (tab: InboxTab) =>
  api<{ inboxItems: InboxItem[] }>(`/inbox-items?tab=${tab}`);

export const listApplications = () =>
  api<{ applications: Application[] }>("/applications");

export const updateProposal = (id: string, proposal: unknown) =>
  api<{ inboxItem: InboxItem }>(`/inbox-items/${id}/proposal`, {
    method: "PATCH",
    body: JSON.stringify(proposal),
  });

export const acceptInboxItem = (id: string) =>
  api(`/inbox-items/${id}/accept`, { method: "POST" });

export const dismissInboxItem = (id: string) =>
  api(`/inbox-items/${id}/dismiss`, { method: "POST" });

export const getSourceMessage = (id: string) =>
  api<{ message: SourceMessage }>(`/inbox-items/${id}/source-message`);
