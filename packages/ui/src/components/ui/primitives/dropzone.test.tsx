// @vitest-environment jsdom
import * as React from "react"
import { render, screen, fireEvent } from "@testing-library/react"
import { describe, it, expect, vi } from "vitest"
import { Dropzone, FileList, FileRow } from "./dropzone"

const mkFile = (name: string, size = 8) =>
  new File(["x".repeat(size)], name, { type: "application/octet-stream" })

describe("Dropzone", () => {
  it("emits selected files from the hidden input (presentation-only — no upload)", () => {
    const onFiles = vi.fn()
    const { container } = render(<Dropzone onFiles={onFiles} multiple />)
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeTruthy()
    fireEvent.change(input, { target: { files: [mkFile("a.bin"), mkFile("b.bin")] } })
    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0][0].map((f: File) => f.name)).toEqual(["a.bin", "b.bin"])
  })

  it("emits on drop", () => {
    const onFiles = vi.fn()
    const { container } = render(<Dropzone onFiles={onFiles} />)
    fireEvent.drop(container.firstElementChild as Element, {
      dataTransfer: { files: [mkFile("c.bin")] },
    })
    expect(onFiles).toHaveBeenCalledTimes(1)
  })

  it("does not emit when disabled", () => {
    const onFiles = vi.fn()
    const { container } = render(<Dropzone onFiles={onFiles} disabled />)
    fireEvent.drop(container.firstElementChild as Element, {
      dataTransfer: { files: [mkFile("d.bin")] },
    })
    expect(onFiles).not.toHaveBeenCalled()
  })
})

describe("FileRow", () => {
  it("renders the file name and formatted size", () => {
    render(
      <FileList>
        <FileRow name="firmware.bin" sizeBytes={2048} status="pending" />
      </FileList>,
    )
    expect(screen.getByText("firmware.bin")).toBeTruthy()
    expect(screen.getByText("2.0 KB")).toBeTruthy()
  })

  it("renders error text on error status", () => {
    render(<FileList><FileRow name="x" status="error" error="Too large" /></FileList>)
    expect(screen.getByText("Too large")).toBeTruthy()
  })

  it("calls onRemove when the remove button is clicked", () => {
    const onRemove = vi.fn()
    render(<FileList><FileRow name="x" status="done" onRemove={onRemove} /></FileList>)
    fireEvent.click(screen.getByRole("button", { name: "Remove" }))
    expect(onRemove).toHaveBeenCalledTimes(1)
  })
})
