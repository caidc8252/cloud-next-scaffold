import * as React from 'react'

// Full-bleed page-header band for detail pages (style-spec §2.1, §2.3). The
// header content (back button + identity + title + actions) goes in `children`;
// the `tabs` slot renders flush on the band's bottom edge — pass a line-variant
// TabsList with `shadow-none` so its underline merges with the band border.
//
// For list / create pages (title + actions, no tabs row) use PageHeader.

interface PageHeaderBandProps {
  children: React.ReactNode
  tabs?: React.ReactNode
}

function PageHeaderBand({ children, tabs }: PageHeaderBandProps) {
  return (
    <div className="border-b border-line-subtle bg-surface-2">
      <div className="px-6 py-4">{children}</div>
      {tabs ? <div className="flex px-6">{tabs}</div> : null}
    </div>
  )
}

export { PageHeaderBand }
