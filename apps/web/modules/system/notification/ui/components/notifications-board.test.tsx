// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react"
import { RequestError } from "@cloud/request/client"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { NotificationsBoard } from "./notifications-board"

const listNoticeMock = vi.fn()
const toastErrorMock = vi.fn()
const pushMock = vi.fn()
const markReadMock = vi.fn()
const markAllReadMock = vi.fn()

vi.mock("@cloud/i18n/client", () => ({
  useTranslations: () => {
    const t = (key: string) => key
    t.rich = (key: string) => key
    return t
  },
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
    relativeTime: (date: Date) => date.toISOString(),
  }),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}))

vi.mock("@cloud/request/error-toast", () => ({
  toastError: (error: unknown) => toastErrorMock(error),
}))

vi.mock("@/modules/system/notification/client/notification.api", () => ({
  listNotice: (query: unknown) => listNoticeMock(query),
}))

vi.mock("@/app/(dashboard)/_components/notifications-provider", () => ({
  useNotifications: () => ({
    unreadCount: 0,
    markRead: markReadMock,
    markAllRead: markAllReadMock,
  }),
}))

describe("NotificationsBoard", () => {
  beforeEach(() => {
    listNoticeMock.mockReset()
    toastErrorMock.mockReset()
    pushMock.mockReset()
    markReadMock.mockReset()
    markAllReadMock.mockReset()
  })

  it("shows a toast and exits the route loading fallback after an initial 403", async () => {
    const error = new RequestError("Forbidden.", 403, {
      code: "forbidden",
      message: "Forbidden.",
      traceId: "trace-1",
    })
    listNoticeMock.mockRejectedValueOnce(error)

    render(<NotificationsBoard currentPartyName="Carbon" />)

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(error))
    expect(screen.queryByLabelText("Loading dashboard page")).toBeNull()
  })
})
