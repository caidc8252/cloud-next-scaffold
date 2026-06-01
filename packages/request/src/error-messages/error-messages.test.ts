import { describe, expect, it } from "vitest";
import * as codes from "../error-codes.ts";
import { errorMessages, getErrorMessages } from "./index.ts";

// error-codes 里所有导出的码值，作为完整性校验的真源。
const allCodes = Object.values(codes);
const locales = Object.keys(errorMessages);

describe("error message bundles", () => {
  it("covers every error code in every locale", () => {
    for (const locale of locales) {
      const bundle = errorMessages[locale as keyof typeof errorMessages];
      for (const code of allCodes) {
        expect(bundle[code], `${locale} is missing code: ${code}`).toBeTruthy();
      }
    }
  });

  it("has no orphan keys beyond the defined error codes", () => {
    const known = new Set<string>(allCodes);
    for (const locale of locales) {
      const bundle = errorMessages[locale as keyof typeof errorMessages];
      for (const key of Object.keys(bundle)) {
        expect(known.has(key), `${locale} has orphan code: ${key}`).toBe(true);
      }
    }
  });

  it("falls back to english for unknown locales", () => {
    expect(getErrorMessages("fr-FR")).toBe(errorMessages.en);
    expect(getErrorMessages("zh-CN")).toBe(errorMessages["zh-CN"]);
  });
});
