import { z } from "zod";

/** A single AI-observed finding (vision / html / cross-page reviews). */
export const aiFindingSchema = z.object({
  title: z.string().min(4).max(200),
  severity: z.enum(["critical", "high", "medium", "low"]),
  category: z.enum(["UX", "Conversion", "Content", "Accessibility", "SEO", "Code quality"]),
  description: z.string().min(10),
  businessImpact: z.string().min(10),
  fix: z.string().min(5),
  code: z.string().nullable(),
});
export type AiFinding = z.infer<typeof aiFindingSchema>;

export const aiReviewSchema = z.object({
  findings: z.array(aiFindingSchema).max(5),
  summary: z.string().min(10),
});
export type AiReview = z.infer<typeof aiReviewSchema>;

export const aiCrossPageSchema = z.object({
  findings: z.array(aiFindingSchema).max(5),
  /** Executive summary of the whole site's health for the dashboard. */
  summary: z.string().min(20),
});
export type AiCrossPage = z.infer<typeof aiCrossPageSchema>;

export const aiFixSchema = z.object({
  description: z.string().min(10),
  businessImpact: z.string().min(10),
  fix: z.string().min(5),
  code: z.string().nullable(),
  effort: z.enum(["low", "medium", "high"]),
});
export type AiFix = z.infer<typeof aiFixSchema>;

export const aiChatSchema = z.object({
  answer: z.string().min(1),
  refused: z.boolean(),
});
export type AiChat = z.infer<typeof aiChatSchema>;
