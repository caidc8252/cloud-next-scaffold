import type { Metadata } from "next";

// portal 公开区（登录/注册/找回密码/营销首页）的 metadata 覆盖根 layout 的脚手架标题。
export const metadata: Metadata = {
  title: "PEP · Payment Empowerment Platform",
  description:
    "Partner console for Newland Payment Technology — provision devices, push firmware and apps, onboard merchants.",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return children;
}
