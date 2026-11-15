import { z } from "zod";

export const pushSubscribePostSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  reminderHour: z.number().int().min(0).max(23).optional(),
  reminderMinute: z.number().int().min(0).max(59).optional(),
  timezone: z.string().min(2).max(64).optional(),
});

export const pushUnsubscribeDeleteSchema = z.object({
  endpoint: z.string().url(),
});
