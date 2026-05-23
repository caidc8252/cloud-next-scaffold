import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion"
import { ChevronDownIcon } from "lucide-react"
import { cn } from "../../lib/utils"

// Collapsible content sections. Each AccordionItem expands/collapses to show/hide content on trigger click.
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        "flex w-full flex-col rounded-md border border-line-subtle overflow-hidden divide-y divide-line-subtle",
        className
      )}
      {...props}
    />
  )
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("group/accordion-item", className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: AccordionPrimitive.Trigger.Props) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center justify-between w-full py-3 px-4 text-sm font-medium text-content-primary bg-surface-2 hover:bg-surface-hover transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-inset aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="size-3.5 text-content-tertiary shrink-0 pointer-events-none transition-transform duration-[var(--duration-fast)] group-aria-expanded/accordion-item:rotate-180" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0 bg-surface-1 px-4 py-3 text-xs text-content-secondary",
          className
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  )
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }


