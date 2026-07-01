"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@cloud/ui";
import type { Role } from "@/modules/system/roles/server/roles.public";

type NewRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { name: string; description: string; baseId: string | null }) => Promise<boolean>;
  allRoles: Role[];
};

export function NewRoleModal({ open, onClose, onCreate, allRoles }: NewRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseId, setBaseId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);

  const valid = name.trim().length > 1;

  function reset() {
    setName("");
    setDescription("");
    setBaseId("none");
    setSubmitting(false);
  }

  // 每次打开回到初始态：清掉上一次的输入与可能残留的 in-flight 标志（弹窗常驻挂载，不靠卸载重置）
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) reset();
  }

  async function handleCreate() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onCreate({ name: name.trim(), description: description.trim(), baseId: baseId === "none" ? null : baseId }); // 成功后父层关闭弹窗；失败保留输入、弹窗不关
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} closeOnOverlay={!submitting} onClose={onClose} title="New role"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={submitting} disabled={!valid} onClick={handleCreate}>
          {submitting ? "Creating…" : "Create"}
        </Button>
      </div>}>
      <div className="space-y-4">
        <Field label="Role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" autoFocus disabled={submitting} />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for..." rows={3} disabled={submitting} />
        </Field>
        <Field label="Start from" hint="Copy permissions from an existing role">
          <Select value={baseId} onValueChange={(v) => setBaseId(v ?? "none")} disabled={submitting}>
            <SelectTrigger className="w-full"><SelectValue placeholder="No base role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No base role</SelectItem>
              {allRoles.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name} ({r.permissions.length} perms)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
