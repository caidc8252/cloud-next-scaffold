"use client";

import { useEffect, useState } from "react";
import { request } from "@cloud/request/client";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@cloud/ui";

type HealthPayload = {
  ok: boolean;
  service: string;
};

export function HealthPanel() {
  const [phase, setPhase] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [payload, setPayload] = useState<HealthPayload | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setPhase("loading");
      setMessage(null);

      try {
        const result = await request.get<HealthPayload>("/api/health");
        if (cancelled) return;
        setPayload(result.data);
        setPhase("success");
      } catch (error) {
        if (cancelled) return;
        setPhase("error");
        setMessage(error instanceof Error ? error.message : "Unknown health check error.");
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Health Check</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <Badge tone={phase === "success" ? "success" : phase === "error" ? "error" : "warning"}>
            {phase}
          </Badge>
          {payload ? <code>{JSON.stringify(payload)}</code> : null}
          {message ? <span>{message}</span> : null}
        </div>
      </CardContent>
    </Card>
  );
}
