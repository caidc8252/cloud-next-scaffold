// next-kit:e2e-bootstrap v14
// Kit-owned shim — do not edit (overwritten on every `.claude/bin/setup e2e`). Logic: ./e2e.nextkit.ts
import { config as loadEnv } from 'dotenv';
import { defineE2eConfig } from './e2e.nextkit.ts';

loadEnv({ path: '.env.test' });
export default defineE2eConfig({ console: process.env.E2E_CONSOLE ?? 'admin' });
