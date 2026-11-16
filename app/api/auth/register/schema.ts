import { z } from "zod";

const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(32, "Username must be under 32 characters")
  .regex(
    /^[a-zA-Z0-9._-]+$/,
    "Username can only contain letters, numbers, dots, underscores, or hyphens"
  );

export const registerParentSchema = z.object({
  role: z.literal("parent"),
  displayName: z.string().trim().min(2).max(48),
  username: usernameSchema,
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(96),
});

export const registerStudentSchema = z.object({
  role: z.literal("student"),
  displayName: z.string().trim().min(2).max(48),
  username: usernameSchema,
  email: z
    .string()
    .trim()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(96),
  pin: z
    .string()
    .regex(/^\d{4}$/, "PIN must be 4 digits")
    .optional()
    .or(z.literal("")),
  tier: z.enum(["foundation", "higher"]).default("foundation"),
  targetGrade: z.number().int().min(1).max(9).default(5),
  invitedParentEmail: z
    .string()
    .trim()
    .email("Please enter a valid parent/guardian email")
    .optional()
    .or(z.literal("")),
});

export const registerRequestSchema = z.discriminatedUnion("role", [
  registerParentSchema,
  registerStudentSchema,
]);

export type RegisterRequest = z.infer<typeof registerRequestSchema>;
