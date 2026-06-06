import { describe, expect, it, vi } from "vitest";
import {
  badRequestResponse,
  errorResponse,
  getAllErrorMessages,
  internalErrorResponse,
  registerErrorMessages,
  runWithLocale,
} from "./server.ts";
import {
  ERR_INVALID_ID,
  ERR_INTERNAL,
  ERR_ROLE_NAME_SHORT,
  ERR_USER_NOT_FOUND,
} from "./error-codes.ts";

async function readBody(response: Response) {
  return (await response.json()) as { code: string; message: string; traceId: string };
}

describe("error response localization", () => {
  it("uses the english registry message by default (no ambient locale)", async () => {
    const body = await readBody(errorResponse(ERR_USER_NOT_FOUND));
    expect(body.message).toBe("User not found.");
  });

  it("localizes registry codes to the ambient locale", async () => {
    const zh = await readBody(runWithLocale("zh-CN", () => errorResponse(ERR_USER_NOT_FOUND)));
    expect(zh.message).toBe("用户不存在。");

    const ja = await readBody(runWithLocale("ja", () => badRequestResponse(ERR_ROLE_NAME_SHORT)));
    expect(ja.message).toBe("ロール名が短すぎます。");
  });

  it("is code-authoritative: ignores the explicit message for registry codes", async () => {
    // 同一个 code 复用了不同具体文案，本地化时以注册表为准，显式 message 被忽略。
    const zh = await readBody(
      runWithLocale("zh-CN", () => badRequestResponse(ERR_INVALID_ID, "Cannot disable your own account.")),
    );
    expect(zh.message).toBe("提供的 ID 无效。");
  });

  it("falls back to the explicit message for codes outside the registry", async () => {
    const zh = await readBody(
      runWithLocale("zh-CN", () => errorResponse("storage.s3_env_missing", "Missing S3 env.")),
    );
    expect(zh.message).toBe("Missing S3 env.");
  });

  it("localizes the internal error message too", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const ja = await readBody(runWithLocale("ja", () => internalErrorResponse(new Error("boom"))));
    expect(ja.code).toBe(ERR_INTERNAL);
    expect(ja.message).toBe("サーバー内部エラーが発生しました。");
    spy.mockRestore();
  });
});

describe("app-registered error messages", () => {
  it("localizes codes registered via registerErrorMessages", async () => {
    registerErrorMessages({
      en: { "199001": "App error." },
      "zh-CN": { "199001": "应用错误。" },
    });

    const en = await readBody(errorResponse("199001"));
    expect(en.message).toBe("App error.");

    const zh = await readBody(runWithLocale("zh-CN", () => errorResponse("199001")));
    expect(zh.message).toBe("应用错误。");
  });

  it("falls back to english for a registered code under an unregistered locale", async () => {
    registerErrorMessages({ en: { "199002": "Only english." } });
    const ja = await readBody(runWithLocale("ja", () => errorResponse("199002")));
    expect(ja.message).toBe("Only english.");
  });
});

describe("i18n params interpolation", () => {
  it("substitutes {name} placeholders with params in the localized message", async () => {
    registerErrorMessages({
      en: { "199010": "Still assigned to {count} member(s)." },
      "zh-CN": { "199010": "仍被 {count} 个成员绑定。" },
    });

    const en = await readBody(errorResponse("199010", undefined, 409, { params: { count: 3 } }));
    expect(en.message).toBe("Still assigned to 3 member(s).");

    const zh = await readBody(
      runWithLocale("zh-CN", () => errorResponse("199010", undefined, 409, { params: { count: 5 } })),
    );
    expect(zh.message).toBe("仍被 5 个成员绑定。");
  });

  it("leaves unknown placeholders untouched", async () => {
    registerErrorMessages({ en: { "199011": "Hello {missing}." } });
    const en = await readBody(errorResponse("199011", undefined, 400, { params: { other: 1 } }));
    expect(en.message).toBe("Hello {missing}.");
  });
});

describe("stack logging", () => {
  it("logs the cause stack so every caught exception is traceable", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    errorResponse(ERR_USER_NOT_FOUND, undefined, 404, { cause: new Error("boom-stack-marker") });
    const logged = spy.mock.calls.flat().map(String).join("\n");
    expect(logged).toContain("boom-stack-marker");
    spy.mockRestore();
  });
});

describe("getAllErrorMessages", () => {
  it("merges builtin codes with app-registered codes", () => {
    registerErrorMessages({ en: { "199020": "App scoped." } });
    const en = getAllErrorMessages("en");
    expect(en[ERR_INTERNAL]).toBeTruthy(); // builtin present
    expect(en["199020"]).toBe("App scoped."); // app-registered present
  });
});
