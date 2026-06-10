import { describe, expect, it } from "vitest";
import { locales } from "@cloud/i18n";
import uiEn from "@cloud/ui/messages/en.json";
import uiZhCN from "@cloud/ui/messages/zh-CN.json";
import uiJa from "@cloud/ui/messages/ja.json";
import en from "./en.json";
import zhCN from "./zh-CN.json";
import ja from "./ja.json";

type Messages = Record<string, unknown>;

const appBundles: Record<string, Messages> = {
  en,
  "zh-CN": zhCN,
  ja,
};

const uiBundles: Record<string, Messages> = {
  en: uiEn,
  "zh-CN": uiZhCN,
  ja: uiJa,
};

function flattenKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenKeys(value as Messages, path)
      : [path];
  });
}

function getPath(obj: Messages, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Messages)[key];
  }, obj);
}

// @cloud/ui 日期组件硬依赖的 key（缺失会在开发期触发 getMessageFallback throw）。
// 这些组件用 useTranslations("ui.datePicker") / "ui.datePicker.presets"，
// presets 走 try/catch 可回退，但占位符 / clear / ok 不会回退，必须齐全。
const REQUIRED_DATE_PICKER_KEYS = [
  "ui.datePicker.clear",
  "ui.datePicker.ok",
  "ui.datePicker.placeholder.date",
  "ui.datePicker.placeholder.dateTime",
  "ui.datePicker.placeholder.range",
  "ui.datePicker.presets.today",
  "ui.datePicker.presets.last7",
  "ui.datePicker.presets.last30",
  "ui.datePicker.presets.thisMonth",
  "ui.datePicker.presets.lastMonth",
];

// @cloud/ui RichPagination reads useTranslations("ui.pagination") for the
// rows-per-page label, the range summary, and the four nav aria-labels. These
// defaults live in @cloud/ui/messages and apps merge them in request config.
const REQUIRED_PAGINATION_KEYS = [
  "ui.pagination.rowsPerPage",
  "ui.pagination.showing",
  "ui.pagination.first",
  "ui.pagination.prev",
  "ui.pagination.next",
  "ui.pagination.last",
];

describe("messages bundles", () => {
  it("ships app and @cloud/ui bundles for every supported locale", () => {
    for (const locale of locales) {
      expect(appBundles[locale], `missing app bundle: ${locale}`).toBeDefined();
      expect(uiBundles[locale], `missing @cloud/ui bundle: ${locale}`).toBeDefined();
    }
  });

  it("admin en overrides define every key the @cloud/ui date components need", () => {
    const keys = new Set(flattenKeys(appBundles.en));
    for (const key of REQUIRED_DATE_PICKER_KEYS) {
      expect(keys.has(key), `en is missing required key: ${key}`).toBe(true);
    }
  });

  it("@cloud/ui en defines every key RichPagination needs", () => {
    const keys = new Set(flattenKeys(uiBundles.en));
    for (const key of REQUIRED_PAGINATION_KEYS) {
      expect(keys.has(key), `@cloud/ui en is missing required key: ${key}`).toBe(true);
    }
  });

  it("admin messages do not duplicate @cloud/ui RichPagination defaults", () => {
    for (const locale of locales) {
      expect(
        getPath(appBundles[locale], "ui.pagination"),
        `${locale} should inherit ui.pagination from @cloud/ui/messages`,
      ).toBeUndefined();
    }
  });

  it("non-en bundles only override keys that exist in en (no orphans)", () => {
    const enKeys = new Set(flattenKeys(appBundles.en));
    for (const locale of ["zh-CN", "ja"] as const) {
      for (const key of flattenKeys(appBundles[locale])) {
        expect(enKeys.has(key), `${locale} has orphan key not in en base: ${key}`).toBe(true);
      }
    }
  });
});
