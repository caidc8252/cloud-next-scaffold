import { redirect } from "next/navigation";
import { getPortalSelectPartnerUrl } from "@/lib/portal-routing";

export default async function SelectPartnerPage() {
  // 权限包的 partial-session 兜底仍可能落到 /select-partner；
  // 这里作为兼容壳转交给 portal 的统一 partner 选择页。
  redirect(getPortalSelectPartnerUrl());
}
