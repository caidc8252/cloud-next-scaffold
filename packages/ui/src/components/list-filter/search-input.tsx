"use client"

import { SearchIcon } from "lucide-react"

import { Input } from "../ui"

// Quick-bar search field (portal-page-style-spec §4): fixed outer width
// `max-w-64 flex-1` + search prefix + Enter triggers onSearch. placeholder is
// caller-supplied (business copy).
export function SearchInput({
  value,
  onChange,
  onSearch,
  placeholder,
}: {
  value: string
  onChange: (value: string) => void
  onSearch: () => void
  placeholder?: string
}) {
  return (
    <div className="max-w-64 flex-1">
      <Input
        inputSize="md"
        prefix={<SearchIcon className="size-4" />}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch()
        }}
      />
    </div>
  )
}
