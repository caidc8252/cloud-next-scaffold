import { getTranslations } from "@cloud/i18n/server";
import { ErrorState } from "@/app/_components/error-state";

// 全局 404。由 notFound() 触发或匹配不到路由时渲染，在 root layout 内，可用 i18n。
// 无重试（重试无意义），给「返回工作台」入口。
export default async function NotFound() {
  const t = await getTranslations("errorPage");
  return (
    <ErrorState
      title={t("notFoundTitle")}
      description={t("notFoundDescription")}
      homeLabel={t("home")}
    />
  );
}
