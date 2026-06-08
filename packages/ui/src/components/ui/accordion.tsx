import type * as React from "react";
import { Accordion as AccordionPrimitive } from "@base-ui/react/accordion";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface AccordionTriggerProps extends AccordionPrimitive.Trigger.Props {
  arrow?: React.ReactNode;
  arrowClassName?: string;
  arrowPosition?: "left" | "right";
  showArrow?: boolean;
}

// Collapsible content sections. Each AccordionItem expands/collapses to show/hide content on trigger click.
function Accordion({ className, ...props }: AccordionPrimitive.Root.Props) {
  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        "flex w-full flex-col rounded-md border border-line-subtle overflow-hidden divide-y divide-line-subtle",
        className,
      )}
      {...props}
    />
  );
}

function AccordionItem({ className, ...props }: AccordionPrimitive.Item.Props) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("group/accordion-item", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  arrow,
  arrowClassName,
  arrowPosition = "right",
  showArrow = true,
  ...props
}: AccordionTriggerProps) {
  const arrowElement = showArrow ? (
    <span
      data-slot="accordion-trigger-arrow"
      className={cn(
        "inline-flex size-3.5 shrink-0 items-center justify-center text-content-tertiary pointer-events-none transition-transform duration-[var(--duration-fast)] group-aria-expanded/accordion-item:rotate-180",
        arrowClassName,
      )}
    >
      {arrow ?? <ChevronDownIcon className="size-3.5" />}
    </span>
  ) : null;

  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-center gap-2 w-full py-3 px-4 text-sm font-medium text-content-primary bg-surface-2 hover:bg-surface-hover transition-colors outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-line-focus focus-visible:ring-inset aria-disabled:cursor-not-allowed aria-disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {arrowPosition === "left" && arrowElement}
        <span data-slot="accordion-trigger-content" className="min-w-0 flex-1 text-left">
          {children}
        </span>
        {arrowPosition === "right" && arrowElement}
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({ className, children, ...props }: AccordionPrimitive.Panel.Props) {
  return (
    <AccordionPrimitive.Panel
      data-slot="accordion-content"
      className="overflow-hidden data-open:animate-accordion-down data-closed:animate-accordion-up"
      {...props}
    >
      <div
        className={cn(
          "h-(--accordion-panel-height) data-ending-style:h-0 data-starting-style:h-0 bg-surface-1 px-4 py-3 text-xs text-content-secondary",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Panel>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent, type AccordionTriggerProps };
