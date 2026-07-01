import { ResetScreen } from "./_components/reset-screen";

// 重置密码消费页（公开，token 即授权）。自助找回与管理员重置的链接都落这里。
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetScreen token={token ?? ""} />;
}
