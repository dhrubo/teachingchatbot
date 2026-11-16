import { z } from "zod";

export const linkWatcherCodeSchema = z.object({
  mode: z.literal("watcher_code"),
  watcherCode: z
    .string()
    .trim()
    .regex(
      /^\d{6}$/,
      "Enter the 6-digit Watcher Code from the student profile"
    ),
});

export const inviteParentEmailSchema = z.object({
  mode: z.literal("invite_parent_email"),
  parentEmail: z
    .string()
    .trim()
    .email("Enter a valid parent or guardian email"),
});

export const guardianLinkRequestSchema = z.discriminatedUnion("mode", [
  linkWatcherCodeSchema,
  inviteParentEmailSchema,
]);

export type GuardianLinkRequest = z.infer<typeof guardianLinkRequestSchema>;
