"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@cloud/ui";
import { request } from "@cloud/request/client";
import { toastError } from "@cloud/request/error-toast";

type EntityOption = {
  entityId: number;
  entityName: string;
  active: boolean;
};

export function EntityList({ entities }: { entities: EntityOption[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<number | null>(null);

  async function select(entityId: number) {
    if (pendingId !== null) return;
    setPendingId(entityId);
    try {
      await request.post("/api/auth/select-entity", { entityId });
      router.replace("/");
      router.refresh();
    } catch (err) {
      toastError(err);
      setPendingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {entities.map((entity) => (
        <button
          key={entity.entityId}
          type="button"
          disabled={!entity.active || pendingId !== null}
          onClick={() => select(entity.entityId)}
          className="w-full text-left px-4 py-3 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-hover border-line-default"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-content-primary">{entity.entityName}</span>
            <Badge variant={entity.active ? "default" : "outline"}>
              {entity.active ? "Active" : "Disabled"}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
