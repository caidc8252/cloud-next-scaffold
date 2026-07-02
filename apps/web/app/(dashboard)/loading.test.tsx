import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import Loading from "./loading"

describe("dashboard route loading fallback", () => {
  it("renders an accessible skeleton fallback", () => {
    const html = renderToStaticMarkup(<Loading />)

    expect(html).toContain('aria-label="Loading dashboard page"')
    expect(html).toContain('data-slot="skeleton"')
    expect(html).toContain('data-slot="spinner"')
  })
})
