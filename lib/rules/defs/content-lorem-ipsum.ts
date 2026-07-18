import { defineRule } from "@/lib/rules/types";

export default defineRule({
  id: "content-lorem-ipsum",
  name: "No placeholder (lorem ipsum) text",
  category: "Content",
  checkClass: "critical",
  failSeverity: "medium",
  scoreCategory: "seo",
  appliesTo: "page",
  issue: {
    title: 'Placeholder "lorem ipsum" text in production',
    description: (_r, ctx) =>
      `${ctx.page.finalUrl} still contains "lorem ipsum" placeholder copy left over from a template.`,
    businessImpact:
      "Placeholder text on a live page reads as unfinished and undermines trust in the whole site.",
    fix: "Replace the placeholder with real copy.",
    effort: "low",
  },
  evaluate: (ctx) => {
    if (/lorem ipsum/i.test(ctx.page.textSample))
      return { status: "fail", evidence: "\"lorem ipsum\" found in page text" };
    return { status: "pass", evidence: "no placeholder text detected" };
  },
});
