import { z } from "zod";

export const fixtureFindingSchema = z.object({
  detector: z.string(),
  severity: z.enum(["low", "medium", "high"]).optional(),
  contains: z.array(z.string()).default([]),
});

export const fixtureSchema = z.object({
  name: z.string(),
  base: z.string().default("before"),
  head: z.string().default("after"),
  expected: z.object({
    impact: z.enum(["none", "low", "medium", "high"]),
    findings: z.array(fixtureFindingSchema).default([]),
  }),
});

export type Fixture = z.infer<typeof fixtureSchema>;
export type FixtureFinding = z.infer<typeof fixtureFindingSchema>;
