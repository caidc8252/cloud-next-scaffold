import { z } from "zod";
import { assertPermissions } from "@cloud/permissions/server";
import { successResponse, badRequestResponse } from "@cloud/request/server";
import { ERR_INVALID_JSON } from "@cloud/request/error-codes";
import { withApiHandler } from "@/lib/api-handler";
import { getProfile, updateProfile } from "@/app/(portal)/account/_server/account-store";

/**
 * The signed-in user's own profile (display name, country, sign-in identity).
 *
 * Read by the "My profile" page and the sidebar user card. Login-only — every
 * authenticated user manages their own profile, no extra permission required.
 * Currently returns the mock store; swap the store call for a real service later.
 */
export const GET = withApiHandler(async () => {
  await assertPermissions({ all: [] });
  return successResponse(getProfile());
});

// Display name and country are edited inline on the profile page; email and
// username arrive only after the client-side verified change flow completes.
const profilePatchSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    country: z.string().trim().length(2),
    email: z.email(),
    username: z
      .string()
      .trim()
      .regex(/^[a-z0-9._-]{3,32}$/i),
  })
  .partial();

/**
 * Update the signed-in user's profile.
 *
 * Called when the profile page saves name/country, or when the email/username
 * change flow applies its verified new value. Persists to the shared mock store
 * so the change is reflected on the profile page and the sidebar card alike.
 */
export const PATCH = withApiHandler(async (req: Request) => {
  await assertPermissions({ all: [] });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return badRequestResponse(ERR_INVALID_JSON);
  }

  const parsed = profilePatchSchema.safeParse(raw);
  if (!parsed.success) return badRequestResponse();

  return successResponse(updateProfile(parsed.data));
});
