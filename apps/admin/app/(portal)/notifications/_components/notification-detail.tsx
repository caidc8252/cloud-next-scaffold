"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Avatar, AvatarFallback, Button, Card, PageBody, toast } from "@cloud/ui";
import { useTranslations } from "@cloud/i18n/client";
import { useNotifications } from "../../_components/notifications-provider";
import { relTime } from "../_lib/notice-meta";
import { ModuleChip } from "./module-chip";

/**
 * Notification detail — the landing for clicking any notification (bell or list).
 * Shows the full note/quote that lives nowhere else, who/when, structured
 * metadata, and a primary CTA that would open the underlying record. Opening
 * marks it read (synced via the shared provider). Renders a not-found state for
 * unknown ids.
 *
 * CTA target modules (ticket/customer/app/order) have no pages in this scaffold,
 * so the CTA is a mock placeholder (toast) rather than a real navigation.
 */
export function NotificationDetail({ id }: { id: string }) {
  const t = useTranslations("notifications");
  const router = useRouter();
  const { notices, markRead } = useNotifications();
  const notice = notices.find((n) => n.id === id) ?? null;

  useEffect(() => {
    if (notice && notice.status === "UNREAD") markRead([notice.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, notice?.id]);

  const back = () => router.push("/notifications");

  if (!notice) {
    // Still hydrating the shared store → brief loading; otherwise truly missing.
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
  const metaRows = payload.meta.filter((r) => r.value);

  const openRecord = () => {
    if (payload.cta) toast.info(t("detail.ctaPlaceholder", { label: payload.cta.label }));
  };

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
            <h1 className="text-2xl font-semibold tracking-tight text-content-primary">
              {notice.title}
            </h1>
            <ModuleChip module={notice.module} />
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-content-secondary">
            {payload.actor && (
              <>
                <Avatar size="sm">
                  <AvatarFallback>{payload.actor.initials}</AvatarFallback>
                </Avatar>
                <span>
                  {payload.actorLabel ? <span className="text-content-tertiary">{payload.actorLabel} </span> : null}
                  <strong className="font-semibold text-content-primary">{payload.actor.name}</strong>
                  {payload.actor.role ? ` · ${payload.actor.role}` : ""}
                </span>
                <span className="text-content-tertiary">·</span>
              </>
            )}
            <span className="inline-flex items-center gap-1 text-content-tertiary">
              <Clock className="size-3.5" />
              {relTime(notice.createdAt)}
            </span>
          </div>
        </div>
      </div>

      <Card elevation={1} className="mt-4 max-w-4xl p-5">
        {payload.detailKind === "quote" ? (
          <blockquote className="border-l-2 border-line-strong pl-4 text-sm italic text-content-secondary">
            {payload.detail}
          </blockquote>
        ) : (
          <p className="text-sm leading-relaxed text-content-secondary">{payload.detail}</p>
        )}

        {metaRows.length > 0 && (
          <dl className="mt-5 border-t border-line-subtle">
            {metaRows.map((r, i) => (
              <div
                key={i}
                className="flex items-baseline gap-6 border-b border-line-subtle py-2.5 last:border-b-0"
              >
                <dt className="w-36 shrink-0 text-xs text-content-tertiary">{r.label}</dt>
                <dd
                  className={`text-sm text-content-primary ${r.mono ? "font-mono tabular-nums" : ""}`}
                >
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {payload.cta && (
          <div className="mt-5 border-t border-line-subtle pt-4">
            <Button variant="primary" iconRight={<ChevronRight className="size-4" />} onClick={openRecord}>
              {payload.cta.label}
            </Button>
          </div>
        )}
      </Card>
    </PageBody>
  );
}
