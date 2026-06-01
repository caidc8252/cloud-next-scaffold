'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useSidebar } from '../../lib/sidebar'
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '../ui/tooltip'
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../ui/hover-card'

export interface SidebarSubItem {
  href: string
  label: string
}

export interface SidebarNavItem {
  href?: string
  icon?: React.ReactNode
  label: string
  children?: SidebarSubItem[]
}

export interface SidebarSection {
  label?: string
  items: SidebarNavItem[]
}

export interface SidebarBrand {
  logo?: React.ReactNode
  title: string
  subtitle?: string
}

export interface SidebarProps {
  brand?: SidebarBrand
  sections: SidebarSection[]
  footer?: React.ReactNode
  className?: string
}

const itemBase =
  'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-fast cursor-pointer select-none w-full text-left'
const itemActive = 'bg-surface-2 text-content-primary shadow-1'
const itemIdle = 'text-content-secondary hover:bg-surface-hover hover:text-content-primary'
// Centered square used in the collapsed icon rail.
const itemRail =
  'flex items-center justify-center size-9 mx-auto rounded-md transition-colors duration-fast cursor-pointer'

function makeMatcher(pathname: string) {
  // pathname 完全等于 href 或以 "href/" 开头才算匹配，避免 "/users" 被
  // "/users-archive" 误激活；根路径 "/" 只在严格相等时命中。
  return (href: string) => pathname === href || pathname.startsWith(href + '/')
}

function NavSubItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center pl-5 pr-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-fast',
        active
          ? 'bg-surface-2 text-content-primary shadow-1'
          : 'text-content-tertiary hover:bg-surface-hover hover:text-content-primary',
      )}
    >
      {active && (
        <span className="absolute -left-px top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-sm bg-primary-500" />
      )}
      {label}
    </Link>
  )
}

function NavItemRow({
  item,
  pathname,
  collapsed,
}: {
  item: SidebarNavItem
  pathname: string
  collapsed: boolean
}) {
  const matches = makeMatcher(pathname)
  const childActive = !!item.children?.some((c) => matches(c.href))
  const active = item.href ? matches(item.href) && !item.children : false

  const [open, setOpen] = React.useState(childActive)

  const iconEl = item.icon && (
    <span className={active || childActive ? 'text-primary-700' : 'text-content-tertiary'}>
      {item.icon}
    </span>
  )

  // ─── Collapsed icon rail ──────────────────────────────────
  if (collapsed) {
    // Parent (has children) → hover flyout listing the sub-items.
    if (item.children) {
      return (
        <HoverCard>
          <HoverCardTrigger
            render={
              <button
                type="button"
                aria-label={item.label}
                className={cn(itemRail, childActive ? itemActive : itemIdle)}
              />
            }
          >
            {iconEl}
          </HoverCardTrigger>
          <HoverCardContent side="right" align="start" className="w-52 p-1">
            <div className="px-2 py-1 text-xs font-semibold uppercase tracking-wider text-content-tertiary">
              {item.label}
            </div>
            <div className="flex flex-col gap-px">
              {item.children.map((sub) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={cn(
                    'rounded-md px-2 py-1.5 text-sm',
                    matches(sub.href)
                      ? 'bg-surface-2 text-content-primary'
                      : 'text-content-secondary hover:bg-surface-hover hover:text-content-primary',
                  )}
                >
                  {sub.label}
                </Link>
              ))}
            </div>
          </HoverCardContent>
        </HoverCard>
      )
    }
    // Leaf → icon link with a tooltip label.
    return (
      <Tooltip>
        <TooltipTrigger
          render={
            <Link
              href={item.href ?? '#'}
              aria-label={item.label}
              className={cn(itemRail, active ? itemActive : itemIdle)}
            />
          }
        >
          {iconEl}
        </TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    )
  }

  // ─── Expanded ─────────────────────────────────────────────
  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            itemBase,
            childActive ? 'text-content-primary hover:bg-surface-hover' : itemIdle,
          )}
        >
          {iconEl}
          <span className="flex-1">{item.label}</span>
          <ChevronRight
            size={14}
            className={cn(
              'text-content-tertiary transition-transform duration-fast shrink-0',
              open && 'rotate-90',
            )}
          />
        </button>
        {open && (
          <div className="relative ml-5 flex flex-col gap-px py-1 before:absolute before:left-0 before:top-1 before:bottom-1 before:w-px before:bg-line-subtle">
            {item.children.map((sub) => (
              <NavSubItem key={sub.href} href={sub.href} label={sub.label} active={matches(sub.href)} />
            ))}
          </div>
        )}
      </div>
    )
  }

  if (item.href) {
    return (
      <Link href={item.href} className={cn(itemBase, active ? itemActive : itemIdle)}>
        {iconEl}
        <span className="flex-1">{item.label}</span>
      </Link>
    )
  }

  return (
    <div className={cn(itemBase, itemIdle)}>
      {iconEl}
      <span className="flex-1">{item.label}</span>
    </div>
  )
}

// Left navigation panel.
// brand: {logo?, title, subtitle?} — logo + name block; defaults to a letter avatar.
// sections: {label?, items[]}[] — item {href, icon, label, children?}; children makes it expandable.
// Collapsed rail mode (collapsed && !isMobile, from useSidebar): icon-only, labels move to
// tooltips (leaf) / hover flyouts (parents). On mobile the drawer always renders expanded.
// footer slot is pinned to the bottom.
export function Sidebar({ brand, sections, footer, className }: SidebarProps) {
  const pathname = usePathname()
  const { collapsed, isMobile } = useSidebar()
  const rail = collapsed && !isMobile

  return (
    <TooltipProvider delay={0}>
      <div className={cn('flex flex-col h-full', className)}>
        {brand && (
          <div
            className={cn(
              'flex items-center gap-2.5 py-4 pb-3 shrink-0',
              rail ? 'px-0 justify-center' : 'px-4',
            )}
          >
            {brand.logo ?? (
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, oklch(55% 0.18 262), oklch(40% 0.14 262))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'oklch(99% 0 0)',
                  fontSize: 12,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {brand.title[0]}
              </div>
            )}
            {!rail && (
              <div className="min-w-0">
                <div className="text-md font-semibold text-content-primary leading-none truncate">
                  {brand.title}
                </div>
                {brand.subtitle && (
                  <div className="text-xs text-content-tertiary leading-none mt-0.5 truncate">
                    {brand.subtitle}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {sections.map((section, i) => (
            <div key={i} className={cn('pt-4 pb-1', rail ? 'px-1.5' : 'px-3')}>
              {section.label && !rail && (
                <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider px-1 mb-1.5">
                  {section.label}
                </div>
              )}
              <nav className="flex flex-col gap-0.5">
                {section.items.map((item, j) => (
                  <NavItemRow
                    key={item.href ?? item.label + j}
                    item={item}
                    pathname={pathname}
                    collapsed={rail}
                  />
                ))}
              </nav>
            </div>
          ))}
        </div>

        {footer && <div className={cn('shrink-0', rail ? 'p-2' : 'p-3')}>{footer}</div>}
      </div>
    </TooltipProvider>
  )
}
