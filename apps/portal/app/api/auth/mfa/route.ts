import "@/lib/auth-error-messages";

import { withApiHandler } from "@/lib/api-handler";
import { loginWithMfa } from "@/lib/auth-login-service";

export const POST = withApiHandler(async (req: Request) => {
  return loginWithMfa(req);
});
