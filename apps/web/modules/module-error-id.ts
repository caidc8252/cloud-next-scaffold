// Business module error-code id registry. Values are the 2-hex-digit `II`
// prefix in the 5-hex-digit `IISSS` error code format.
export const MODULE_ERROR_IDS = {
  "system.users": "10",
  "system.roles": "11",
  "identity.auth": "12",
  "identity.account": "13",
  "identity.onboarding": "14",
  "identity.forgot-password": "15",
} as const;

export type ModuleErrorOwner = keyof typeof MODULE_ERROR_IDS;
