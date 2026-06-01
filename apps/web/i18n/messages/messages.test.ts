import { describe, expect, it } from "vitest";
import { locales } from "@cloud/i18n";
import en from "./en.json";
import zhCN from "./zh-CN.json";
import ja from "./ja.json";

type Messages = Record<string, unknown>;

const bundles: Record<string, Messages> = {
  en,
  "zh-CN": zhCN,
  ja,
};

function flattenKeys(obj: Messages, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value !== null && typeof value === "object"
      ? flattenKeys(value as Messages, path)
      : [path];
  });
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

describe("messages bundles", () => {
  it("ships a bundle for every supported locale", () => {
    for (const locale of locales) {
      expect(bundles[locale], `missing bundle: ${locale}`).toBeDefined();
    }
  });

  it("en (the base) defines every key the @cloud/ui date components need", () => {
    const keys = new Set(flattenKeys(en));
    for (const key of REQUIRED_DATE_PICKER_KEYS) {
      expect(keys.has(key), `en is missing required key: ${key}`).toBe(true);
    }
  });

  it("non-en bundles only override keys that exist in en (no orphans)", () => {
    const enKeys = new Set(flattenKeys(en));
    for (const locale of ["zh-CN", "ja"] as const) {
      for (const key of flattenKeys(bundles[locale])) {
        expect(enKeys.has(key), `${locale} has orphan key not in en base: ${key}`).toBe(true);
      }
    }
  });
});
