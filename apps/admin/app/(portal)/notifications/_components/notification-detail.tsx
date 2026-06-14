"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { Button, Card, PageBody } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import type { Notice } from "@/service/notification/types";
import { useNotifications } from "../../_components/notifications-provider";
import { relTime, openNoticeLink } from "../_lib/notice-meta";
import { ModuleChip } from "./module-chip";

/**
 * Notification detail — receives a pre-fetched Notice (or null) from the RSC
 * parent (Task 16). Marks the notice read on mount so the bell badge syncs.
 * Renders summary · relTime in the header and a Card with optional detail
 * paragraph, structured fields (key → i18n label with raw-key fallback), and
 * action links (button or text style).
 */
export function NotificationDetail({ notice, currentPartyName }: { notice: Notice | null; currentPartyName: string }) {
  const t = useTranslations("notifications");
  const tf = useTranslations("notifications.fields");
  const router = useRouter();
  const { markRead } = useNotifications();

  useEffect(() => {
    if (notice && notice.status === "UNREAD") markRead([notice.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice?.id]);

  const back = () => router.push("/notifications");

  if (!notice) {
    return (
      <PageBody>
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("detail.back")}
          onClick={back}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="py-16 text-center text-sm text-content-tertiary">
          {t("detail.notFound")}
        </div>
      </PageBody>
    );
  }

  const { payload } = notice;
  const fields = (payload.fields ?? []).filter((f) => f.value);

  return (
    <PageBody>
      <div className="flex items-start gap-3 border-b border-line-subtle pb-4">
        <Button
          variant="secondary"
          size="icon"
          aria-label={t("detail.back")}
          onClick={back}
          className="mt-0.5 shrink-0"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            {notice.title ? (
              <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
                {notice.title}
              </h1>
            ) : null}
            <ModuleChip type={notice.type} />
          </div>
          <div className="text-sm text-content-tertiary">
            {payload.summary} · {relTime(notice.createdAt)} · {notice.belongToPartyId == null ? t("party.system") : currentPartyName}
          </div>
        </div>
      </div>

      <Card elevation={1} className="mt-4 max-w-4xl p-5">
        {payload.detail ? (
          <p className="text-sm leading-relaxed text-content-secondary">
            {payload.detail}
          </p>
        ) : null}

        {fields.length > 0 && (
          <dl className="mt-5 border-t border-line-subtle">
            {fields.map((f, i) => (
              <div
                key={i}
                className="flex items-baseline gap-6 border-b border-line-subtle py-2.5 last:border-b-0"
              >
                <dt className="w-36 shrink-0 text-xs text-content-tertiary">
                  {tf.has(f.key) ? tf(f.key) : f.key}
                </dt>
                <dd
                  className={`text-sm text-content-primary ${f.mono ? "font-mono tabular-nums" : ""}`}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {(payload.links ?? []).length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line-subtle pt-4">
            {(payload.links ?? []).map((l, i) =>
              l.type === "button" ? (
                <Button
                  key={i}
                  variant="primary"
                  iconRight={<ChevronRight className="size-4" />}
                  onClick={() => openNoticeLink(router, l.url)}
                >
                  {l.label}
                </Button>
              ) : (
                <Button
                  key={i}
                  variant="link"
                  onClick={() => openNoticeLink(router, l.url)}
                  className="inline-flex items-center gap-1"
                >
                  <ExternalLink className="size-3.5" />
                  {l.label}
                </Button>
              ),
            )}
          </div>
        )}
      </Card>
    </PageBody>
  );
}
