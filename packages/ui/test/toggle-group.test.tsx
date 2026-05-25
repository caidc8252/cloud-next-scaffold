// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ToggleGroup } from "../src/components/ui/toggle-group";
import { Toggle } from "../src/components/ui/toggle";

describe("<ToggleGroup type='single'>", () => {
  it("renders children with the wrapper data-slot", () => {
    render(
      <ToggleGroup type="single" defaultValue={null}>
        <Toggle value="left">L</Toggle>
        <Toggle value="center">C</Toggle>
        <Toggle value="right">R</Toggle>
      </ToggleGroup>,
    );
    const wrappers = document.querySelectorAll('[data-slot="toggle-group"]');
    expect(wrappers.length).toBe(1);
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("calls onValueChange with string | null on toggle", () => {
    const fn = vi.fn();
    render(
      <ToggleGroup type="single" defaultValue={null} onValueChange={fn}>
        <Toggle value="left">L</Toggle>
        <Toggle value="center">C</Toggle>
      </ToggleGroup>,
    );
    fireEvent.click(screen.getByRole("button", { name: "L" }));
    expect(fn).toHaveBeenLastCalledWith("left");
    fireEvent.click(screen.getByRole("button", { name: "L" }));
    expect(fn).toHaveBeenLastCalledWith(null);
  });

  it("controlled value sets pressed state on the matching child", () => {
    render(
      <ToggleGroup type="single" value="center" onValueChange={() => {}}>
        <Toggle value="left">L</Toggle>
        <Toggle value="center">C</Toggle>
      </ToggleGroup>,
    );
    expect(screen.getByRole("button", { name: "L" }).getAttribute("aria-pressed")).toBe("false");
    expect(screen.getByRole("button", { name: "C" }).getAttribute("aria-pressed")).toBe("true");
  });
});

describe("<ToggleGroup type='multiple'>", () => {
  it("calls onValueChange with string[]", () => {
    const fn = vi.fn();
    render(
      <ToggleGroup type="multiple" defaultValue={[]} onValueChange={fn}>
        <Toggle value="b">B</Toggle>
        <Toggle value="i">I</Toggle>
      </ToggleGroup>,
    );
    fireEvent.click(screen.getByRole("button", { name: "B" }));
    expect(fn).toHaveBeenLastCalledWith(["b"]);
    fireEvent.click(screen.getByRole("button", { name: "I" }));
    expect(fn).toHaveBeenLastCalledWith(["b", "i"]);
  });

  it("controlled value sets pressed on matching children", () => {
    render(
      <ToggleGroup type="multiple" value={["b", "i"]} onValueChange={() => {}}>
        <Toggle value="b">B</Toggle>
        <Toggle value="i">I</Toggle>
        <Toggle value="u">U</Toggle>
      </ToggleGroup>,
    );
    expect(screen.getByRole("button", { name: "B" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "I" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "U" }).getAttribute("aria-pressed")).toBe("false");
  });
});
