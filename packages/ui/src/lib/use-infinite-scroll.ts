import * as React from 'react'

export interface UseInfiniteScrollOptions {
  /** Whether there is another page to load; observer stays idle when false. */
  hasMore: boolean
  /** Whether a load is in flight; prevents duplicate onLoadMore calls. */
  isLoading: boolean
  /** Called once when the sentinel becomes visible and a load is allowed. */
  onLoadMore: () => void
  /** Scroll container to observe within; defaults to the browser viewport. */
  root?: React.RefObject<HTMLElement | null>
  /** Grow the root's bounding box so loading starts before the true bottom. @default "200px" */
  rootMargin?: string
}

export interface UseInfiniteScrollResult {
  /** Attach to a 0-height element rendered at the end of the list. */
  sentinelRef: React.RefObject<HTMLDivElement | null>
}

// Scroll-loading primitive: fires onLoadMore once whenever the returned sentinel
// scrolls into view, as long as hasMore is true and no load is already running.
// Pure IntersectionObserver, no third-party dependency. <VirtualTable> already
// wraps this — reach for the hook directly only for non-table lists.
//
// Usage: render the sentinel as the LAST element of your scrollable list, and
// point `root` at the scroll container (omit it to observe the page viewport).
//   const [items, setItems] = useState<Item[]>(firstPage)
//   const [isLoading, setIsLoading] = useState(false)
//   const hasMore = items.length < total
//   const scrollRef = useRef<HTMLDivElement>(null)
//   const { sentinelRef } = useInfiniteScroll({
//     hasMore,
//     isLoading,
//     onLoadMore: loadNextPage,   // your async fetch; flip isLoading around it
//     root: scrollRef,            // the overflow-scroll container
//   })
//   return (
//     <div ref={scrollRef} className="overflow-auto h-[520px]">
//       {items.map((it) => <Row key={it.id} item={it} />)}
//       <div ref={sentinelRef} />          {/* must be the last child */}
//       {isLoading && <Spinner />}
//     </div>
//   )
// rootMargin (default "200px") starts the load before the true bottom, so the
// next page is usually ready by the time the user reaches it.
export function useInfiniteScroll({
  hasMore,
  isLoading,
  onLoadMore,
  root,
  rootMargin = '200px',
}: UseInfiniteScrollOptions): UseInfiniteScrollResult {
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)

  // Keep the latest values in a ref so the observer callback never goes stale
  // without forcing the observer itself to be torn down on every render.
  const stateRef = React.useRef({ hasMore, isLoading, onLoadMore })
  React.useEffect(() => {
    stateRef.current = { hasMore, isLoading, onLoadMore }
  })

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        const { hasMore: canLoad, isLoading: loading, onLoadMore: load } = stateRef.current
        if (entries[0]?.isIntersecting && canLoad && !loading) load()
      },
      { root: root?.current ?? null, rootMargin },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [root, rootMargin])

  return { sentinelRef }
}
