// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import {
  PermissionsProvider,
  useCan,
  usePermissions,
} from "../src/client/index.ts";

const mountedRoots: Array<{ root: ReturnType<typeof createRoot>; node: HTMLDivElement }> = [];

afterEach(() => {
  for (const { root, node } of mountedRoots.splice(0)) {
    act(() => {
      root.unmount();
    });
    node.remove();
  }
});

function renderWithRoot(element: React.ReactNode) {
  const node = document.createElement("div");
  document.body.appendChild(node);
  const root = createRoot(node);
  mountedRoots.push({ root, node });

  act(() => {
    root.render(element);
  });

  return node;
}

describe("useCan", () => {
  it("returns true when check passes", () => {
    let current = false;

    function Probe() {
      current = useCan({ all: ["a"] });
      return null;
    }

    renderWithRoot(
      <PermissionsProvider permissions={["a", "b"]}>
        <Probe />
      </PermissionsProvider>,
    );

    expect(current).toBe(true);
  });

  it("returns false when check fails", () => {
    let current = true;

    function Probe() {
      current = useCan({ all: ["c"] });
      return null;
    }

    renderWithRoot(
      <PermissionsProvider permissions={["a", "b"]}>
        <Probe />
      </PermissionsProvider>,
    );

    expect(current).toBe(false);
  });
});

describe("usePermissions", () => {
  it("throws when used outside provider", () => {
    function Probe() {
      usePermissions();
      return null;
    }

    expect(() => renderWithRoot(<Probe />)).toThrow(
      /must be used within <PermissionsProvider>/,
    );
  });
});
