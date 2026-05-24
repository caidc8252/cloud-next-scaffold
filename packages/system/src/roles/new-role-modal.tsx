"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, Modal, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@cloud/ui";
import type { Role } from "../types";

type NewRoleModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (draft: { name: string; description: string; baseId: string | null }) => void;
  allRoles: Role[];
};

export function NewRoleModal({ open, onClose, onCreate, allRoles }: NewRoleModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [baseId, setBaseId] = useState<string>("none");

  const valid = name.trim().length > 1;

  function handleCreate() {
    onCreate({ name: name.trim(), description: description.trim(), baseId: baseId === "none" ? null : baseId });
    setName("");
    setDescription("");
    setBaseId("none");
  }

  return (
    <Modal open={open} onClose={onClose} title="New role"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!valid} onClick={handleCreate}>Create</Button>
      </div>}>
      <div className="space-y-4">
        <Field label="Role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Support Agent" autoFocus />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What this role is for..." rows={3} />
        </Field>
        <Field label="Start from" hint="Copy permissions from an existing role">
          <Select value={baseId} onValueChange={(v) => setBaseId(v ?? "none")}>
            <SelectTrigger><SelectValue placeholder="No base role" /></SelectTrigger>
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
