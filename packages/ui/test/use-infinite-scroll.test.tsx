// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { useInfiniteScroll, type UseInfiniteScrollOptions } from "../src/lib/use-infinite-scroll";

// Capturable IntersectionObserver stub: lets a test push entries into the
// callback registered for a given observed element.
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  observed: Element[] = [];

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }
  observe(el: Element) {
    this.observed.push(el);
  }
  disconnect() {
    this.observed = [];
  }
  unobserve() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  fire(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

function Probe(props: UseInfiniteScrollOptions) {
  const { sentinelRef } = useInfiniteScroll(props);
  return <div ref={sentinelRef} data-testid="sentinel" />;
}

const latest = () =>
  MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];

describe("useInfiniteScroll", () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls onLoadMore when the sentinel becomes visible", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore isLoading={false} onLoadMore={onLoadMore} />);
    latest().fire(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it("does not fire when there is nothing more to load", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore={false} isLoading={false} onLoadMore={onLoadMore} />);
    latest().fire(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("does not fire while a load is already in flight", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore isLoading onLoadMore={onLoadMore} />);
    latest().fire(true);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("ignores entries that are not intersecting", () => {
    const onLoadMore = vi.fn();
    render(<Probe hasMore isLoading={false} onLoadMore={onLoadMore} />);
    latest().fire(false);
    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it("uses the latest props without rebuilding the observer", () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(<Probe hasMore isLoading onLoadMore={onLoadMore} />);
    const observer = latest();
    // Loading finishes; same observer instance must now allow a load.
    rerender(<Probe hasMore isLoading={false} onLoadMore={onLoadMore} />);
    expect(latest()).toBe(observer);
    observer.fire(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });
});
