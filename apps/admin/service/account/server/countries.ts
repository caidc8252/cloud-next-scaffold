import "server-only";

import type { Country } from "@/app/(portal)/account/_shared/types";

// Country list for the profile editor. Ported verbatim from the prototype's
// COUNTRIES table (code + display name + dial code). The name is demo data,
// not UI chrome, so it is not routed through i18n.
export const COUNTRIES: Country[] = [
  { code: "AE", name: "United Arab Emirates", dial: "+971" },
  { code: "AR", name: "Argentina", dial: "+54" },
  { code: "AU", name: "Australia", dial: "+61" },
  { code: "BE", name: "Belgium", dial: "+32" },
  { code: "BR", name: "Brazil", dial: "+55" },
  { code: "CA", name: "Canada", dial: "+1" },
  { code: "CH", name: "Switzerland", dial: "+41" },
  { code: "CN", name: "China", dial: "+86" },
  { code: "DE", name: "Germany", dial: "+49" },
  { code: "DK", name: "Denmark", dial: "+45" },
  { code: "ES", name: "Spain", dial: "+34" },
  { code: "FI", name: "Finland", dial: "+358" },
  { code: "FR", name: "France", dial: "+33" },
  { code: "GB", name: "United Kingdom", dial: "+44" },
  { code: "HK", name: "Hong Kong", dial: "+852" },
  { code: "IE", name: "Ireland", dial: "+353" },
  { code: "IN", name: "India", dial: "+91" },
  { code: "IT", name: "Italy", dial: "+39" },
  { code: "JP", name: "Japan", dial: "+81" },
  { code: "KR", name: "South Korea", dial: "+82" },
  { code: "MX", name: "Mexico", dial: "+52" },
  { code: "NL", name: "Netherlands", dial: "+31" },
  { code: "NO", name: "Norway", dial: "+47" },
  { code: "NZ", name: "New Zealand", dial: "+64" },
  { code: "PL", name: "Poland", dial: "+48" },
  { code: "SE", name: "Sweden", dial: "+46" },
  { code: "SG", name: "Singapore", dial: "+65" },
  { code: "US", name: "United States", dial: "+1" },
  { code: "ZA", name: "South Africa", dial: "+27" },
];
