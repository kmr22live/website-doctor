import { z } from "zod";

/** Structured data extracted from one fetched page (Cheerio over real HTML). */

export const extractedImageSchema = z.object({
  src: z.string(),
  alt: z.string().nullable(),
  width: z.string().nullable(),
  height: z.string().nullable(),
  loading: z.string().nullable(),
});

export const extractedLinkSchema = z.object({
  href: z.string(),
  text: z.string(),
  rel: z.string().nullable(),
  target: z.string().nullable(),
  isInternal: z.boolean(),
});

export const extractedFormSchema = z.object({
  action: z.string().nullable(),
  method: z.string().nullable(),
  inputCount: z.number(),
  inputsWithoutLabel: z.number(),
  inputsWithoutRequired: z.number(),
  hasSubmit: z.boolean(),
});

export const extractedScriptSchema = z.object({
  src: z.string().nullable(),
  async: z.boolean(),
  defer: z.boolean(),
  type: z.string().nullable(),
});

export const extractedHeadingSchema = z.object({
  level: z.number().min(1).max(6),
  text: z.string(),
});

/** Sample of an offending element captured at extraction time. */
export const elementSampleSchema = z.object({
  selector: z.string().nullable(),
  html: z.string(),
});
export type ElementSample = z.infer<typeof elementSampleSchema>;

/** Offender samples per problem type (capped at 5 each; optional for old artifacts). */
export const offenderSamplesSchema = z
  .object({
    missingAlt: z.array(elementSampleSchema).default([]),
    badLinks: z.array(elementSampleSchema).default([]),
    inlineHandlers: z.array(elementSampleSchema).default([]),
    inlineStyles: z.array(elementSampleSchema).default([]),
    deprecatedTags: z.array(elementSampleSchema).default([]),
    unlabeledInputs: z.array(elementSampleSchema).default([]),
    blockingScripts: z.array(elementSampleSchema).default([]),
  })
  .default({
    missingAlt: [],
    badLinks: [],
    inlineHandlers: [],
    inlineStyles: [],
    deprecatedTags: [],
    unlabeledInputs: [],
    blockingScripts: [],
  });
export type OffenderSamples = z.infer<typeof offenderSamplesSchema>;

export const extractedPageSchema = z.object({
  url: z.string(),
  finalUrl: z.string(),
  statusCode: z.number().nullable(),
  title: z.string().nullable(),
  titleCount: z.number(),
  metaDescription: z.string().nullable(),
  metaDescriptionCount: z.number(),
  canonical: z.string().nullable(),
  canonicalCount: z.number(),
  robotsMeta: z.string().nullable(),
  viewport: z.string().nullable(),
  viewportCount: z.number(),
  charset: z.string().nullable(),
  htmlLang: z.string().nullable(),
  favicon: z.string().nullable(),
  appleTouchIcon: z.string().nullable(),
  headings: z.array(extractedHeadingSchema),
  images: z.array(extractedImageSchema),
  links: z.array(extractedLinkSchema),
  forms: z.array(extractedFormSchema),
  buttons: z.array(z.string()),
  scripts: z.array(extractedScriptSchema),
  schemaTypes: z.array(z.string()),
  ogTags: z.record(z.string(), z.string()),
  twitterTags: z.record(z.string(), z.string()),
  inlineEventHandlerCount: z.number(),
  inlineStyleCount: z.number(),
  deprecatedTags: z.array(z.string()),
  hasGa4: z.boolean(),
  hasGtm: z.boolean(),
  hasFbPixel: z.boolean(),
  wordCount: z.number(),
  htmlBytes: z.number(),
  hasDoctype: z.boolean(),
  mixedContentUrls: z.array(z.string()),
  textSample: z.string(),
  samples: offenderSamplesSchema,
});

export type ExtractedPage = z.infer<typeof extractedPageSchema>;
export type ExtractedImage = z.infer<typeof extractedImageSchema>;
export type ExtractedLink = z.infer<typeof extractedLinkSchema>;
export type ExtractedForm = z.infer<typeof extractedFormSchema>;
