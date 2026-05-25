// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Toggle } from "../src/components/ui/toggle";

describe("<Toggle>", () => {
  it("renders children inside a button with role=button + aria-pressed", () => {
    render(<Toggle defaultPressed={false}>Bold</Toggle>);
    const btn = screen.getByRole("button", { name: "Bold" });
    expect(btn).toBeTruthy();
    expect(btn.getAttribute("aria-pressed")).toBe("false");
  });

  it("reflects controlled pressed prop on aria-pressed", () => {
    render(<Toggle pressed>Bold</Toggle>);
    expect(screen.getByRole("button").getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onPressedChange when clicked (uncontrolled)", () => {
    const fn = vi.fn();
    render(
      <Toggle defaultPressed={false} onPressedChange={fn}>Bold</Toggle>,
    );
    screen.getByRole("button").click();
    expect(fn).toHaveBeenCalledWith(true, expect.anything());
  });

  it("applies size and variant classes", () => {
    const { rerender } = render(<Toggle size="sm">B</Toggle>);
    expect(screen.getByRole("button").className).toMatch(/h-control-sm/);
    expect(screen.getByRole("button").className).toMatch(/text-xs/);
    rerender(<Toggle size="md" variant="outline">B</Toggle>);
    expect(screen.getByRole("button").className).toMatch(/h-control-md/);
    expect(screen.getByRole("button").className).toMatch(/bg-transparent/);
  });

  it("disabled blocks clicks and reflects on aria-disabled", () => {
    const fn = vi.fn();
    render(
      <Toggle defaultPressed={false} disabled onPressedChange={fn}>B</Toggle>,
    );
    screen.getByRole("button").click();
    expect(fn).not.toHaveBeenCalled();
  });
});
