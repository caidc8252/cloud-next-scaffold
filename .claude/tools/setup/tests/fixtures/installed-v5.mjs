import { nextKitGuardrail } from './eslint.nextkit.mjs';
export default [
  // next-kit:eslint-restricted-imports v5
  ...nextKitGuardrail({ appApi: ['apps/*/app/api/**'] }),
];
