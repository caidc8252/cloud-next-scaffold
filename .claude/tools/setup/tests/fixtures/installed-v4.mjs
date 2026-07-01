import { nextKitGuardrail } from './eslint.nextkit.mjs';
export default [
  // next-kit:eslint-restricted-imports v4
  ...nextKitGuardrail({ appApi: ['apps/*/app/api/**'] }),
];
