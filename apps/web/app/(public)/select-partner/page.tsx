import { redirect } from "next/navigation";
import { getSiteSelectPartnerUrl } from "@/lib/site-routing";

export default async function SelectPartnerPage() {
  // 权限包的 partial-session 兜底仍可能落到 /select-partner；
  // 这里作为兼容壳转交给 site 的统一 partner 选择页。
  redirect(getSiteSelectPartnerUrl());
}
