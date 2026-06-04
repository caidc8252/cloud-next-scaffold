"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · Create page / wizard (spec §1.2 §2.2 §3 §7)
//
// Compilable style skeleton for the portal CREATE (wizard) page shape.
// Reference implementation:
// apps/web/app/(portal)/manage/customers/new/_components/customer-wizard.tsx
//
// Style-only: static step, no-op handlers, <a> stands in for next/link. In a
// real page: useState for step/form, shared field components + one validation
// source (see customers' _components/company-fields.tsx), POST via
// @cloud/request/client, and the app-level ManagePageHeader.
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import type { ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  StepIndicator,
} from "@cloud/ui";

const STEPS = [
  { caption: "Step 1", label: "Company" },
  { caption: "Step 2", label: "Contracts" },
  { caption: "Done", label: "Confirmation" },
];

// §7 — summary rail rows: dl at text-xs, dt w-20 tertiary, empty values render —
function SummaryRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-content-tertiary">{term}</dt>
      <dd className="min-w-0 flex-1 break-words text-content-primary">{children}</dd>
    </div>
  );
}

const Dash = () => <span className="text-content-tertiary">—</span>;

export function CreateWizardTemplate() {
  return (
    <>
      {/* §2.2 — header band; escape action is ghost Cancel. Use <ManagePageHeader/> in apps/web. */}
      <div className="border-b border-line-subtle bg-surface-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
              New customer
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">
              Register a company and configure its contracts.
            </p>
          </div>
          <Button variant="ghost" iconLeft={<X className="size-4" />} onClick={() => {}}>
            Cancel
          </Button>
        </div>
      </div>

      {/* §3 — page body */}
      <div className="flex flex-col gap-6 px-6 pt-6 pb-8">
        {/* §7 — step indicator wears card chrome */}
        <StepIndicator
          current={0}
          steps={STEPS}
          className="rounded-xl border border-line-default bg-surface-2 px-5.5 py-4 shadow-1"
        />

        {/* §7 — two-column row; a full-width step simply doesn't render the rail */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {/* Step card: flush head px-5 py-4 + text-md title; content keeps slot padding */}
            <Card>
              <CardHeader flush className="px-5 py-4">
                <CardTitle className="text-md">Company information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4.5">
                  <Field label="Company name" required>
                    <Input placeholder="e.g. Northwind Commerce" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4.5">
                    <Field label="License">
                      <Input placeholder="e.g. NW-2024-08831-CA" />
                    </Field>
                    <Field label="Contact name">
                      <Input placeholder="e.g. Sarah Chen" />
                    </Field>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* §7 — error banner (render under the step card when the POST fails) */}
            <div
              className="mt-3 rounded-md border border-error/30 bg-error-bg px-3 py-2 text-sm text-error-strong"
              role="alert"
            >
              Failed to create customer.
            </div>

            {/* §7 — footer nav: Back ghost (disabled on step 1) | Continue primary; last step → Create */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="ghost"
                iconLeft={<ChevronLeft className="size-4" />}
                disabled
                onClick={() => {}}
              >
                Back
              </Button>
              <Button
                variant="primary"
                iconRight={<ChevronRight className="size-4" />}
                onClick={() => {}}
              >
                Continue
              </Button>
              {/* Final step variant:
                  <Button variant="primary" iconLeft={<Check className="size-4" />} loading>Create customer</Button> */}
            </div>
          </div>

          {/* §7 — summary rail: carries its own width (w-75 = 300px) + sticky top-5 */}
          <aside className="sticky top-5 w-full rounded-xl border border-line-default bg-surface-2 p-4.5 shadow-1 lg:w-75 lg:shrink-0">
            <h4 className="mb-3 text-sm font-semibold tracking-tight text-content-primary">
              Summary
            </h4>
            <dl className="flex flex-col gap-2 text-xs">
              <SummaryRow term="Name">Northwind Commerce</SummaryRow>
              <SummaryRow term="Country">United States</SummaryRow>
              <SummaryRow term="Address">
                <Dash />
              </SummaryRow>
              <SummaryRow term="Contracts">
                <span className="text-content-tertiary">None selected</span>
              </SummaryRow>
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}

// §7 — done step: centered card with a 72px success disc.
export function WizardDoneTemplate() {
  return (
    <Card className="text-center">
      <CardContent className="flex flex-col items-center px-8 py-10">
        <div className="mb-4 grid size-18 place-items-center rounded-full border border-success/25 bg-success-bg text-success-strong">
          <Check size={36} />
        </div>
        <h2 className="mb-2 text-2xl font-semibold tracking-tight text-content-primary">
          Customer created
        </h2>
        <p className="mx-auto mb-6 max-w-md text-sm leading-relaxed text-content-secondary">
          Next step: invite an Admin so the customer can sign in and start operating.
        </p>
        <Button
          variant="primary"
          iconRight={<ChevronRight className="size-4" />}
          onClick={() => {}}
        >
          Invite Admin
        </Button>
      </CardContent>
    </Card>
  );
}
