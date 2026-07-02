import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

describe("app lib error code ownership", () => {
  it("does not own business module error code files", () => {
    const libDir = fileURLToPath(new URL("./", import.meta.url));
    const businessErrorCodeFiles = readdirSync(libDir).filter((name) =>
      /^.+-error-codes\.ts$/.test(name),
    );

    expect(businessErrorCodeFiles).toEqual([]);
  });
});
