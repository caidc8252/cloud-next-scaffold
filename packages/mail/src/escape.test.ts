import { describe, expect, it } from "vitest";
import { escapeHtml } from "./escape.ts";

describe("escapeHtml", () => {
  it("escapes HTML-significant characters", () => {
    expect(escapeHtml(`<script>alert("x")&'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&amp;&#39;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("Acme Pay 123")).toBe("Acme Pay 123");
  });

  it("escapes ampersand in org names", () => {
    expect(escapeHtml("Smith & Co")).toBe("Smith &amp; Co");
  });
});
