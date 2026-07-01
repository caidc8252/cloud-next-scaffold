// next-kit:e2e-bootstrap v14
//
// Standalone login helper for the deploy-then-test journey suite (e2e/flows/). Drives the
// REAL portal→console login over HTTP and returns an authenticated BrowserContext. Imports
// ONLY @playwright/test — no pg, no e2e.nextkit.ts. Mirrors signInForE2E's login-drive so the
// suite stays portable (runs anywhere with a URL + credentials; never touches a DB).
import type { Browser, BrowserContext } from '@playwright/test';

export interface LoginInput {
  portalUrl: string; // E2E_PORTAL_URL — the login host
  baseURL: string;   // E2E_BASE_URL — the console under test
  email: string;
  password: string;
}

// Log in as one principal; return an authenticated context (caller newPage()s from it). There
// is NO <form> wrapper, so submit is the password field's Enter keydown. A real CONSOLE 'sid'
// cookie must exist on the console origin after the cross-host handoff — otherwise login didn't
// take and we throw rather than hand back an anonymous context.
export async function login(
  browser: Browser,
  { portalUrl, baseURL, email, password }: LoginInput,
): Promise<BrowserContext> {
  const consoleOrigin = new URL(baseURL).origin;
  const consoleHost = new URL(baseURL).hostname;
  const ctx = await browser.newContext({ baseURL });
  const page = await ctx.newPage();
  await page.goto(`${portalUrl}/login`);
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.locator('#login-password').press('Enter');
  await page.waitForURL(u => u.origin === consoleOrigin, { timeout: 30_000 });
  const cookies = await ctx.cookies();
  const authed = cookies.some(c => c.name === 'sid' && c.domain.replace(/^\./, '') === consoleHost);
  if (!authed) {
    await ctx.close();
    throw new Error(`login(${email}): no 'sid' cookie on ${consoleOrigin} after handoff — login didn't take.`);
  }
  await page.close();
  return ctx;
}
