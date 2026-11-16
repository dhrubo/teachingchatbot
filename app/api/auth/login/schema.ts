import { z } from "zod";

export const loginPasswordSchema = z.object({
  mode: z.literal("password"),
  identifier: z.string().trim().min(2).max(160),
  password: z.string().min(1).max(128),
});

export const loginPinSchema = z.object({
  mode: z.literal("pin"),
  username: z.string().trim().min(2).max(48),
  pin: z.string().regex(/^\d{4}$/, "PIN must be 4 digits"),
});

export const loginRequestSchema = z.discriminatedUnion("mode", [
  loginPasswordSchema,
  loginPinSchema,
]);

export type LoginRequest = z.infer<typeof loginRequestSchema>;
