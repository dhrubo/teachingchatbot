import { z } from "zod";

export const createKidByParentSchema = z.object({
  displayName: z.string().trim().min(2).max(48),
  username: z
    .string()
    .trim()
    .min(3)
    .max(32)
    .regex(
      /^[a-zA-Z0-9._-]+$/,
      "Username can only contain letters, numbers, dots, underscores, or hyphens"
    ),
  pin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  password: z
    .string()
    .min(6, "Optional password must be at least 6 characters")
    .max(96)
    .optional()
    .or(z.literal("")),
  tier: z.enum(["foundation", "higher"]).default("foundation"),
  targetGrade: z.number().int().min(1).max(9).default(5),
});

export type CreateKidByParentRequest = z.infer<typeof createKidByParentSchema>;
