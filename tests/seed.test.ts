import { describe, expect, it } from "vitest";
import { parseSeedUrls } from "@/lib/services/seed";

describe("boot seeding (real self-scans on empty DB)", () => {
  it("defaults to the two demo sites when SEED_URLS is unset", () => {
    expect(parseSeedUrls(undefined)).toEqual(["https://example.com", "https://namastedev.com"]);
  });

  it("empty string disables seeding", () => {
    expect(parseSeedUrls("")).toEqual([]);
  });

  it("parses a custom comma list with whitespace", () => {
    expect(parseSeedUrls(" https://a.com , https://b.com ,")).toEqual(["https://a.com", "https://b.com"]);
  });
});
