# PEP Portal (mock prototype)

A runnable prototype of the **PEP** partner console (Payment Empowerment
Platform) for Newland — home, sign-in, account recovery, invite onboarding,
and a minimal post-login dashboard. Ported from `docs/Carbon-Login` into
`@cloud/ui` primitives.

**This app is a mock.** It has no database, Redis, or real auth. Every "backend"
is a thin stub route handler under `app/api/**` that reads/writes a single
in-memory store (`lib/mock/`) and returns the standard `@cloud/request` envelope.
The seam is engineered so the mock→real swap touches **only handler bodies**.

## Run

```bash
pnpm --filter portal dev      # http://localhost:3100
pnpm --filter portal build && pnpm --filter portal start
```

No `.env` required (no DB/auth). Dependencies: `@cloud/ui`, `@cloud/request`,
`@cloud/i18n`, `@cloud/config` (password policy only).

## Demo scenarios

Sign in with **any email + a 6-char password**. The email local-part drives the
scenario (Tweaks panel from the prototype is replaced by deterministic inputs):

| Input | Reaches |
|---|---|
| any email (e.g. `jordan.diaz@brightpos.com`) | TOTP MFA → workspace chooser → dashboard |
| `sms@pep.io` | SMS MFA → workspace chooser |
| `solo@pep.io` | single workspace → straight to dashboard (no MFA) |
| `locked@pep.io` | account-locked screen |
| `ratelimited@pep.io` | rate-limited countdown screen |
| `nocompany@pep.io` | no-workspace screen |
| password `wrongpw` | inline bad-credentials error |
| `…@acmepay.com` / `…@verakiosk.com` | enterprise SSO (Okta / Google) IdP |
| `…@northpeak.io` | SSO-suspended notice + password fallback |
| MFA code `000000` | rejected; 5 wrong → verification lockout; any other 6 digits passes |

Onboarding: visit `/onboarding` (signed-out landing) or sign in first then visit
it (signed-in landing). `/onboarding?token=bad` shows the invalid state. Invite
code in the recovery / register flows: `123456` (or any 6 digits).

## Layout

- `app/(marketing)` — home · `app/(auth)` — login / forgot-password / onboarding
  · `app/(console)` — dashboard (session-gated) · `app/not-found.tsx` — 404
- `app/api/**` — stub handlers (auth / onboarding / forgot-password / dashboard)
- `lib/mock/` — the single shared store, view types, and cookie session seam
- `app/_components` — brand marks, auth shell, provider button, account chip,
  locale switcher · `app/(auth)/_components` — shared auth-card bits

## i18n

All visible copy is routed through `@cloud/i18n` (`en` base, `zh-CN` / `ja`
overlays). The chrome and headings are translated in all three locales; longer
marketing/body prose falls back to English (the package's English-base design).
Switch language via the globe in the home nav / dashboard header.
