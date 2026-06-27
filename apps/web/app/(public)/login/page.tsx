import { redirect } from "next/navigation";
import { getPortalLoginUrl } from "@/lib/portal-routing";

export default function LoginPage() {
  // 兼容旧链接：admin 不再承载登录表单，统一交给 portal 登录中心。
  redirect(getPortalLoginUrl());
}
