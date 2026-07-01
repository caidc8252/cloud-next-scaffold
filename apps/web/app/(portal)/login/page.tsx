import { LoginScreen } from "./_components/login-screen";

// returnTo（限站内 /onboarding 前缀，后端再校验）：入驻页"我已有账号"跳来登录，成功后回跳本页。
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { returnTo } = await searchParams;
  return <LoginScreen returnTo={returnTo} />;
}
