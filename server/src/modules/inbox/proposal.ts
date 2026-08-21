import { z } from "zod";

import { eventInputSchema } from "../tracking/schemas.js";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const nullableUrl = z.union([z.url(), z.literal(""), z.null()]).optional();
const nullableText = z.union([z.string(), z.null()]).optional();

export const proposedApplicationFieldsSchema = z.object({
  companyName: z.string().trim().min(1),
  candidatePortalUrl: nullableUrl,
  roleTitle: z.string().trim().min(1),
  recruitingCycle: z.object({
    season: z.enum(["Spring", "Summer", "Fall", "Winter"]),
    year: z.number().int().min(2000).max(2200),
  }),
  submissionDate: date,
  applicationUrl: nullableUrl,
  externalApplicationId: nullableText,
  location: nullableText,
  workArrangement: z
    .enum(["remote", "hybrid", "on-site"])
    .nullable()
    .optional(),
  isReferred: z.boolean().optional(),
  notes: nullableText,
});

const createEventProposalSchema = z
  .object({
    action: z.literal("create_event"),
    targetApplicationId: z.uuid().optional(),
    newApplication: proposedApplicationFieldsSchema.optional(),
    event: eventInputSchema,
  })
  .refine(
    (proposal) =>
      Boolean(proposal.targetApplicationId) !==
      Boolean(proposal.newApplication),
    {
      path: ["targetApplicationId"],
      message:
        "Select one existing target Application or propose one new Application",
    },
  );

export const proposalSchema = z.union([
  proposedApplicationFieldsSchema.extend({
    action: z.literal("create_application"),
  }),
  createEventProposalSchema,
  z.object({
    action: z.literal("update_event"),
    targetApplicationId: z.uuid(),
    targetEventId: z.uuid(),
    event: eventInputSchema,
  }),
]);

export type Proposal = z.infer<typeof proposalSchema>;
export type ProposedApplicationFields = z.infer<
  typeof proposedApplicationFieldsSchema
>;
