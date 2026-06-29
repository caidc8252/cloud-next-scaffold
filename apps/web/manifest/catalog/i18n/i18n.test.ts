import { describe, expect, it } from "vitest";
import en from "./en.ts";
import zhCN from "./zh-CN.ts";
import ja from "./ja.ts";

describe("catalog i18n", () => {
  it("each locale carries directory + role + contract keys", () => {
    for (const m of [en, zhCN, ja]) {
      expect(m.menu.system).toBeTruthy();
      expect(m.role.adminPresetAdmin).toBeTruthy();
      expect(m.contract.admin).toBeTruthy();
      expect(m.contract.merchant).toBeTruthy();
    }
  });
});
