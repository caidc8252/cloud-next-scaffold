import { redirect } from "next/navigation";
import { getSiteLoginUrl } from "@/lib/site-routing";

export default function LoginPage() {
  // 兼容旧链接：web 不再承载登录表单，统一交给 site 登录中心。
  redirect(getSiteLoginUrl());
}
