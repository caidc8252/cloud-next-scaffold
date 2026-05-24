"use client";

import { useState, useMemo } from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, Input, Switch } from "@cloud/ui";
import { permissionGroupsForContract } from "../helpers";

type PermissionsCardProps = {
  contractDefineCode: string;
  permissions: string[];
  onTogglePerm: (code: string) => void;
  onToggleGroup: (menuId: string, grant: boolean) => void;
  disabled?: boolean;
};

export function PermissionsCard({
  contractDefineCode, permissions, onTogglePerm, onToggleGroup, disabled,
}: PermissionsCardProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "granted" | "available">("all");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const grantedSet = useMemo(() => new Set(permissions), [permissions]);
  const groups = useMemo(() => permissionGroupsForContract(contractDefineCode), [contractDefineCode]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return groups
      .map((g) => {
        let items = g.items;
        if (q) items = items.filter((p) => p.label.toLowerCase().includes(q) || p.code.toLowerCase().includes(q));
        if (filter === "granted") items = items.filter((p) => grantedSet.has(p.code));
        if (filter === "available") items = items.filter((p) => !grantedSet.has(p.code));
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [groups, query, filter, grantedSet]);

  const totalInScope = groups.reduce((n, g) => n + g.items.length, 0);
  const grantedCount = permissions.filter((p) => groups.some((g) => g.items.some((i) => i.code === p))).length;
  const availableCount = totalInScope - grantedCount;
  const hiddenCount = filter !== "all" ? totalInScope - filtered.reduce((n, g) => n + g.items.length, 0) : 0;
  const allExpanded = filtered.length > 0 && filtered.every((g) => expanded.has(g.menuId));

  function toggleExpandAll() {
    if (allExpanded) setExpanded(new Set());
    else setExpanded(new Set(filtered.map((g) => g.menuId)));
  }

  return (
    <div className="border border-line-default rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-line-subtle flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-content-primary">Permissions</div>
          <div className="text-xs text-content-tertiary mt-0.5">
            <span className="font-medium text-content-secondary">{grantedCount}</span> granted
            <span className="mx-1">·</span>
            {totalInScope} in scope
            {hiddenCount > 0 && (
              <><span className="mx-1">·</span><span className="text-warning">{hiddenCount} hidden</span></>
            )}
          </div>
        </div>
        <Button variant="ghost" size="xs" onClick={toggleExpandAll}>
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      <div className="px-4 py-2 border-b border-line-subtle flex items-center gap-2">
        <Input prefix={<Search size={14} />} placeholder="Search permissions by name…" value={query}
          onChange={(e) => setQuery(e.target.value)} inputSize="sm" className="flex-1" />
        <div className="flex gap-1">
          {([
            { key: "all" as const, label: "All", count: totalInScope },
            { key: "granted" as const, label: "Granted", count: grantedCount },
            { key: "available" as const, label: "Available", count: availableCount },
          ]).map((f) => (
            <Button key={f.key} variant={filter === f.key ? "secondary" : "ghost"} size="xs"
              onClick={() => setFilter(f.key)}>
              {f.label} <span className="ml-1 text-content-tertiary">{f.count}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-line-subtle">
        {filtered.map((group) => {
          const isOpen = expanded.has(group.menuId);
          const groupGranted = group.items.filter((p) => grantedSet.has(p.code)).length;
          const allGranted = groupGranted === group.items.length;

          return (
            <div key={group.menuId}>
              <button type="button"
                className="flex items-center w-full px-5 py-3 bg-surface-3 border-b border-line-subtle text-left"
                onClick={() => {
                  const next = new Set(expanded);
                  if (isOpen) next.delete(group.menuId); else next.add(group.menuId);
                  setExpanded(next);
                }}>
                {isOpen
                  ? <ChevronDown size={14} className="text-content-tertiary mr-2 shrink-0" />
                  : <ChevronRight size={14} className="text-content-tertiary mr-2 shrink-0" />}
                <span className="flex-1 font-semibold tracking-wide uppercase text-content-secondary" style={{ fontSize: 12.5 }}>{group.menuTitle}</span>
                <span className="text-xs text-content-tertiary mr-3">{groupGranted}/{group.items.length}</span>
                {!disabled && (
                  <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onToggleGroup(group.menuId, !allGranted); }}>
                    {allGranted ? "Revoke all" : "Grant all"}
                  </Button>
                )}
              </button>
              {isOpen && (
                <div className="pb-1">
                  {group.items.map((perm) => (
                    <div key={perm.code} className="flex items-center gap-3 px-5 py-3 border-b border-line-subtle hover:bg-surface-hover">
                      <Switch checked={grantedSet.has(perm.code)} onCheckedChange={() => onTogglePerm(perm.code)}
                        disabled={disabled} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-content-primary" style={{ fontSize: 13.5 }}>{perm.label}</div>
                        <div className="text-xs text-content-tertiary">{perm.desc}</div>
                      </div>
                      <Badge variant="outline" className="shrink-0 font-mono text-xs">{perm.code}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-content-tertiary">No permissions match your filter.</div>
        )}
      </div>
    </div>
  );
}
