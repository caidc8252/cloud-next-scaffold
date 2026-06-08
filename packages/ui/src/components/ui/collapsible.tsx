"use client";

import { Collapsible as CollapsiblePrimitive } from "@base-ui/react/collapsible";

// Headless show/hide behavior primitive. Callers own all visual styling.
function Collapsible({ className, ...props }: CollapsiblePrimitive.Root.Props) {
  return <CollapsiblePrimitive.Root data-slot="collapsible" className={className} {...props} />;
}

function CollapsibleTrigger({ className, children, ...props }: CollapsiblePrimitive.Trigger.Props) {
  return (
    <CollapsiblePrimitive.Trigger data-slot="collapsible-trigger" className={className} {...props}>
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({ className, ...props }: CollapsiblePrimitive.Panel.Props) {
  return (
    <CollapsiblePrimitive.Panel data-slot="collapsible-content" className={className} {...props} />
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
