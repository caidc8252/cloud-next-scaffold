import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("package scripts", () => {
  it("keeps e2e scripts portable across Windows and POSIX shells", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    const e2eScripts = Object.entries(packageJson.scripts).filter(([name]) =>
      name.includes("e2e"),
    );

    expect(e2eScripts).toEqual(expect.any(Array));
    for (const [name, script] of e2eScripts) {
      expect(script, name).not.toMatch(/(?:^|&&\s*)[A-Z_][A-Z0-9_]*=/);
    }
  });

  it("loads e2e seed intent from .env.test instead of a helper script", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    const envExample = readFileSync(resolve(process.cwd(), ".env.test.example"), "utf8");

    expect(envExample).toMatch(/^E2E_SEED=1$/m);
    expect(packageJson.scripts["test:e2e:spec"]).toContain(
      "node --env-file=.env.test scripts/prisma.mjs db seed",
    );
    expect(packageJson.scripts["test:e2e:spec"]).not.toContain("scripts/e2e-seed.mjs");
    expect(existsSync(resolve(process.cwd(), "scripts/e2e-seed.mjs"))).toBe(false);
  });
});
