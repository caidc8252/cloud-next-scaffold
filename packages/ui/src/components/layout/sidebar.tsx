'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

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

function NavItemRow({ item, pathname }: { item: SidebarNavItem; pathname: string }) {
  const isSubActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/')

  const childActive = !!item.children?.some((c) => isSubActive(c.href))
  const active = item.href
    ? pathname.startsWith(item.href) && !item.children
    : false

  const [open, setOpen] = React.useState(childActive)

  const iconEl = item.icon && (
    <span className={active ? 'text-primary-700' : 'text-content-tertiary'}>
      {item.icon}
    </span>
  )

  if (item.children) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            itemBase,
            childActive
              ? 'text-content-primary hover:bg-surface-hover'
              : itemIdle,
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
              <NavSubItem
                key={sub.href}
                href={sub.href}
                label={sub.label}
                active={isSubActive(sub.href)}
              />
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
// brand: {logo?, title, subtitle?} — renders a logo + name block at the top; defaults to a colored letter avatar.
// sections: {label?, items[]}[] — each item: {href, icon, label, children?} where children makes it expandable.
// Active state derived from usePathname(); sub-items show a left accent bar when active.
// footer slot is pinned to the bottom (e.g. user avatar, settings link).
export function Sidebar({ brand, sections, footer, className }: SidebarProps) {
  const pathname = usePathname()

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {brand && (
        <div className="flex items-center gap-2.5 px-4 py-4 pb-3 shrink-0   ">
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
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {sections.map((section, i) => (
          <div key={i} className="px-3 pt-4 pb-1">
            {section.label && (
              <div className="text-xs font-semibold text-content-tertiary uppercase tracking-wider px-1 mb-1.5">
                {section.label}
              </div>
            )}
            <nav className="flex flex-col gap-0.5">
              {section.items.map((item, j) => (
                <NavItemRow key={item.href ?? item.label + j} item={item} pathname={pathname} />
              ))}
            </nav>
          </div>
        ))}
      </div>

      {footer && (
        <div className="p-3 shrink-0">
          {footer}
        </div>
      )}
    </div>
  )
}


