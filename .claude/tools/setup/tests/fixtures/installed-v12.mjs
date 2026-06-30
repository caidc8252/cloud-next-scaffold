import { nextKitGuardrail } from './eslint.nextkit.mjs';
export default [
  // next-kit:eslint-restricted-imports v12
  ...nextKitGuardrail({ appApi: ['apps/*/app/api/**'] }),
];
