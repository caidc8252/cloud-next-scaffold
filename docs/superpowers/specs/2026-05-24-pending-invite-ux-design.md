# Pending Invite UX Optimization — Design Spec

> Scope: Improve the PENDING user experience from an admin perspective.
> Approach: Option B (moderate enhancement).

## 1. Expired Invite Visual Distinction

Frontend-only calculation, no data model change.

- **Condition:** `inviteExpiresAt < Date.now()`
- **List item (`UserListItem`):**
  - Badge text: `PENDING` → `EXPIRED`
  - Badge color: warning (yellow) → error (red)
  - Avatar gradient: yellow → red
  - Subtitle time already handled by `relTime()` ("expired 2 days ago")
- **Detail panel (`PendingInviteDetail`):**
  - Title: "Invitation sent" → "Invitation expired"
  - Badge: same red treatment
  - New red Alert: "This invitation has expired. Resend to generate a new 7-day window, or cancel it."
- **Data model:** `User.status` stays `PENDING` in DB. Expiry is a derived display state.

## 2. Cancel Confirmation Dialog

Reuse existing `Modal` component.

- **Trigger:** both the list item X button and detail panel "Cancel invite" button.
- **State:** `UsersPage` holds `confirmCancelId: string | null`.
- **Dialog content:**
  - Title: "Cancel invitation?"
  - Body: "This will permanently remove the pending invitation for **{inviteEmail}**. Pre-assigned roles will be discarded."
  - Actions: `Keep invitation` (ghost) / `Cancel invitation` (danger)
- **On confirm:** call existing `cancelInvite(userId)`.

## 3. Token Masking

- **Display:** `abc1****efg9` (first 4 + `****` + last 4 chars).
- **Copy button:** clipboard icon next to the masked value, copies full token, toast "Token copied".
- **No show/hide toggle** — admin use case is copy-to-debug, not visual inspection.

## 4. Editable Pre-assigned Roles

No new API — reuse `PUT /api/system/users/{userId}` which already accepts `roleIds`.

- **Detail panel role card:** add "Edit" button (Pencil icon) in card header.
- **Edit mode:** role list switches to checkbox selection (same style as `NewUserModal`).
- **Actions:** "Save" / "Cancel" buttons appear below the list.
- **Save:** calls existing `update()` with new `roleIds`, refreshes detail.

## 5. Resend Count

Lightweight data model extension.

- **Schema:** `SysInvite` add `resendCount Int @default(0) @map("resend_count")`.
- **API:** `POST /api/system/users/{userId}/resend-invite` increments `resendCount` alongside expiry extension.
- **Frontend type:** `User` add `resendCount?: number`.
- **Mapper:** `user-mapper.ts` maps `invite.resendCount` to client type.
- **Detail panel:** new row in Invitation details card — `Resent` → `"3 times"` (0 → `"Never"`).
- **List item:** no change (keep compact).

## Files Affected

| File | Change |
|---|---|
| `packages/db/prisma/schema.prisma` | Add `resendCount` to `SysInvite` |
| `packages/system/src/types.ts` | Add `resendCount` to `User` |
| `packages/system/src/users/user-list-item.tsx` | Expired visual state |
| `packages/system/src/users/pending-invite-detail.tsx` | Expired state, token masking, role editing, resend count display |
| `packages/system/src/users/users-page.tsx` | Cancel confirmation modal state + dialog |
| `apps/web/lib/user-mapper.ts` | Map `resendCount` |
| `apps/web/app/api/system/users/[userId]/resend-invite/route.ts` | Increment `resendCount` |
