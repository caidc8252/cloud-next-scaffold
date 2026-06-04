"use client";

// ─────────────────────────────────────────────────────────────────────────────
// STYLE TEMPLATE · Create page / single-step form (spec §1.2 §2.2 §3 §7.1)
//
// Compilable style skeleton for the portal CREATE/EDIT page shape that ISN'T a
// wizard — a plain form with no steps. Cancel + Submit both live in a STICKY
// header; the body is one centered column of section cards. No footer, no
// summary rail, no done step. Reference implementation:
// apps/web/app/(portal)/app/app-publish/new/_components/app-form.tsx
//
// Style-only: static fields, no-op handlers. In a real page: useState for the
// form, shared field components + one validation source (see §7), POST via
// @cloud/request/client then router.push to the new record's detail page, and
// @cloud/ui's <PageHeader sticky …/> (@cloud/ui/components/layout) instead of the inlined band below.
// NOT exported from @cloud/ui — never enters the bundle.
// ─────────────────────────────────────────────────────────────────────────────

import { Plus, X } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Textarea,
} from "@cloud/ui";

export function CreateFormTemplate() {
  return (
    <>
      {/* §2.2 §7.1 — STICKY header band carrying both actions. In apps/web use
          <PageHeader sticky actions={<>{cancel}{submit}</>} />. The band
          docks under the app header (the shell <main> is the scrollport) and its
          opaque bg-surface-2 masks content scrolling beneath it. */}
      <div className="sticky top-0 z-10 border-b border-line-subtle bg-surface-2">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 px-6 py-4">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
              New record
            </h1>
            <p className="mt-1.5 max-w-3xl text-sm text-content-tertiary">
              A plain form with no steps — fill in the fields and submit from the header.
            </p>
          </div>
          {/* Action surface lives ONLY here: ghost Cancel + primary Submit
              (iconLeft = Plus on create / Check on edit; loading while pending) */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" iconLeft={<X className="size-4" />} onClick={() => {}}>
              Cancel
            </Button>
            <Button variant="primary" iconLeft={<Plus className="size-4" />} onClick={() => {}}>
              Create record
            </Button>
          </div>
        </div>
      </div>

      {/* §3 §7.1 — page body: one centered column of section cards at gap-6 */}
      <div className="px-6 pt-6 pb-8">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          {/* Section card 1 — group fields by concern */}
          <Card elevation={1}>
            <CardHeader>
              <CardTitle>Primary information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4.5">
              <Field label="Name" required>
                <Input placeholder="Display name" />
              </Field>
              <div className="grid grid-cols-2 gap-4.5">
                <Field label="Reference code">
                  <Input placeholder="Optional identifier" />
                </Field>
                <Field label="Owner">
                  <Input placeholder="Responsible person" />
                </Field>
              </div>
              <Field label="Description" hint="A short summary shown on the detail page.">
                <Textarea rows={4} placeholder="What is this record for?" />
              </Field>
            </CardContent>
          </Card>

          {/* Section card 2 — a second concern; helper text lives in CardDescription */}
          <Card elevation={1}>
            <CardHeader>
              <CardTitle>Options</CardTitle>
              <CardDescription>
                A secondary group of settings, described once here rather than per field.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4.5">
              <Field label="Category">
                <Input placeholder="Pick a category" />
              </Field>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
