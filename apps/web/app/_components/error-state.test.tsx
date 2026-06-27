// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ErrorState } from "./error-state.tsx";

afterEach(cleanup);

describe("ErrorState", () => {
  it("renders the title, description and reference id", () => {
    render(
      <ErrorState
        title="Something went wrong"
        description="Service unavailable."
        referenceLabel="Reference"
        referenceId="SYS-abc123"
      />,
    );
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByText("Service unavailable.")).toBeTruthy();
    expect(screen.getByText(/SYS-abc123/)).toBeTruthy();
  });

  it("fires onRetry when the retry button is clicked", () => {
    const onRetry = vi.fn();
    render(
      <ErrorState title="x" description="y" retryLabel="Try again" onRetry={onRetry} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits the retry button when no onRetry is provided", () => {
    render(<ErrorState title="x" description="y" retryLabel="Try again" />);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });
});
