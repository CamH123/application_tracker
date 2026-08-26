import { z } from "zod";

import { EVENT_TYPES } from "./domain.js";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a real calendar date");
const nullableUrl = z.union([z.url(), z.literal(""), z.null()]).optional();
const nullableText = z.union([z.string(), z.null()]).optional();

export const applicationInputSchema = z.object({
  companyId: z.uuid(),
  recruitingCycleId: z.uuid(),
  roleTitle: z.string().trim().min(1),
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

export const manualApplicationInputSchema = applicationInputSchema
  .omit({ companyId: true, recruitingCycleId: true })
  .extend({
    companyName: z.string().trim().min(1),
    recruitingCycle: z.object({
      season: z.enum(["Spring", "Summer", "Fall", "Winter"]),
      year: z.number().int().min(2000).max(2200),
    }),
  });

export const eventInputSchema = z
  .object({
    eventType: z.enum(EVENT_TYPES),
    occurredOn: date,
    scheduledTime: z
      .union([
        z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        z.literal(""),
        z.null(),
      ])
      .optional(),
    timeZone: nullableText,
    roundLabel: nullableText,
    notes: nullableText,
    acknowledgeReopen: z.boolean().optional(),
  })
  .superRefine((event, context) => {
    if (event.eventType === "interview_scheduled") {
      if (!event.scheduledTime) {
        context.addIssue({
          code: "custom",
          path: ["scheduledTime"],
          message: "Required for a scheduled interview",
        });
      }
      if (!event.timeZone) {
        context.addIssue({
          code: "custom",
          path: ["timeZone"],
          message: "Required for a scheduled interview",
        });
      } else {
        try {
          new Intl.DateTimeFormat("en-US", { timeZone: event.timeZone });
        } catch {
          context.addIssue({
            code: "custom",
            path: ["timeZone"],
            message: "Use an IANA time-zone identifier",
          });
        }
      }
    } else if (event.scheduledTime || event.timeZone) {
      context.addIssue({
        code: "custom",
        path: ["scheduledTime"],
        message: "Only scheduled interviews have a time and time zone",
      });
    }
    if (
      event.roundLabel &&
      ![
        "assessment_scheduled",
        "assessment_completed",
        "interview_scheduled",
        "interview_completed",
      ].includes(event.eventType)
    ) {
      context.addIssue({
        code: "custom",
        path: ["roundLabel"],
        message: "Only assessment and interview events have a round label",
      });
    }
  });

export const companyInputSchema = z.object({
  name: z.string().trim().min(1),
  candidatePortalUrl: nullableUrl,
});

export const cycleInputSchema = z.object({
  season: z.enum(["Spring", "Summer", "Fall", "Winter"]),
  year: z.number().int().min(2000).max(2200),
});

export const filtersSchema = z.object({
  recruitingCycleId: z.uuid().optional(),
  companyId: z.uuid().optional(),
  currentStatus: z
    .enum([
      "Applied",
      "Assessment pending",
      "Awaiting response",
      "Interviewing",
      "Offer accepted",
      "Offer declined",
      "Rejected",
      "Withdrawn",
    ])
    .optional(),
  isReferred: z.enum(["true", "false"]).optional(),
  completion: z.enum(["all", "active", "completed"]).default("all"),
});

export const syncRangeSchema = z
  .object({ start: date, end: date })
  .refine((range) => range.start <= range.end, {
    path: ["end"],
    message: "End date must not be before start date",
  });
