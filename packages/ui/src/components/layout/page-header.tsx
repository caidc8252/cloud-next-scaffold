import * as React from "react";
import { cn } from "../../lib/utils";

// Full-bleed page-header band for list / create pages (style-spec §2.1–§2.2).
// Sits flush under the AppHeader, spanning edge to edge.
//
// `sticky` docks the band at the top of the scrollport (the shell <main>, so
// top-0 lands under the AppHeader — same mechanism as the list condition band,
// §5). Use it for single-step create/edit forms, where Cancel + Submit live in
// the header and must stay reachable while the form scrolls (§7.1).
//
// For an in-content title (not a full-bleed band) use ContentHeader instead.

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  /** Inline chip next to the title (e.g. a status badge). */
  titleAdornment?: React.ReactNode;
  /** Dock the band under the app header while the page scrolls (§7.1 forms). */
  sticky?: boolean;
}

function PageHeader({
  title,
  description,
  actions,
  titleAdornment,
  sticky = false,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b border-line-subtle bg-surface-2", sticky && "sticky top-0 z-10")}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">{title}</h1>
            {titleAdornment}
          </div>
          {description ? (
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export { PageHeader };
