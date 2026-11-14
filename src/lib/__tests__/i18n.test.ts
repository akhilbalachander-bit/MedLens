import { describe, expect, it } from "vitest";
import { fill, samePlaceholders } from "../i18n";
import { buildTranslatable } from "../translatable";
import { SAMPLE_ANALYSIS } from "../sample/discharge";
import { SAMPLE_TRANSLATIONS } from "../sample/discharge-es";

describe("interface text helpers", () => {
  it("fills placeholders", () => {
    expect(fill("Page {n} of {total}", { n: 2, total: 5 })).toBe("Page 2 of 5");
    expect(fill("No vars {x}")).toBe("No vars {x}");
  });
  it("rejects translations that lost or changed a placeholder", () => {
    expect(samePlaceholders("Page {n} added", "Página {n} añadida")).toBe(true);
    expect(samePlaceholders("Page {n} added", "Página añadida")).toBe(false);
    expect(samePlaceholders("Page {n} added", "Página {número} añadida")).toBe(false);
  });
});

describe("offline Spanish sample", () => {
  it("covers every translatable key of the sample, so it works without an API key", () => {
    const keys = Object.keys(buildTranslatable(SAMPLE_ANALYSIS));
    const es = SAMPLE_TRANSLATIONS.es;
    expect(keys.filter((k) => !(k in es))).toEqual([]);
  });
});
