// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { Can, PermissionsProvider } from "../src/client/index.ts";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; node: HTMLDivElement }> = [];

afterEach(() => {
  for (const { root, node } of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
    node.remove();
  }
});

function renderWithPermissions(permissions: string[], element: React.ReactNode) {
  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  mountedRoots.push({ root, node });

  act(() => {
    root.render(
      <PermissionsProvider permissions={permissions}>
        {element}
      </PermissionsProvider>,
    );
  });

  return node;
}

describe("<Can>", () => {
  it("renders children when all permissions hit", () => {
    const node = renderWithPermissions(
      ["a", "b"],
      <Can all={["a", "b"]}>
        <span>ok</span>
      </Can>,
    );

    expect(node.textContent).toContain("ok");
  });

  it("renders fallback when missing permission", () => {
    const node = renderWithPermissions(
      ["a"],
      <Can all={["a", "b"]} fallback={<span>nope</span>}>
        <span>ok</span>
      </Can>,
    );

    expect(node.textContent).toContain("nope");
    expect(node.textContent).not.toContain("ok");
  });

  it("renders null when missing permission and no fallback", () => {
    const node = renderWithPermissions(
      [],
      <Can all={["a"]}>
        <span>ok</span>
      </Can>,
    );

    expect(node.textContent).toBe("");
  });

  it("passes when any permission matches", () => {
    const node = renderWithPermissions(
      ["b"],
      <Can any={["a", "b"]}>
        <span>ok</span>
      </Can>,
    );

    expect(node.textContent).toContain("ok");
  });
});
