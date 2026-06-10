"use client";

import { useState } from "react";
import { Button, Field, Input, Modal } from "@cloud/ui";
import type { Role } from "@/app/(portal)/system/_shared/types";

type DuplicateRoleModalProps = {
  source: Role | null;
  onClose: () => void;
  onDuplicate: (name: string) => void;
};

export function DuplicateRoleModal({ source, onClose, onDuplicate }: DuplicateRoleModalProps) {
  if (!source) return null;

  return <DuplicateRoleModalBody key={source.id} source={source} onClose={onClose} onDuplicate={onDuplicate} />;
}

type DuplicateRoleModalBodyProps = {
  source: Role;
  onClose: () => void;
  onDuplicate: (name: string) => void;
};

function DuplicateRoleModalBody({ source, onClose, onDuplicate }: DuplicateRoleModalBodyProps) {
  const [name, setName] = useState(`${source.name} (copy)`);
  const valid = name.trim().length > 1;

  function handleSubmit() {
    if (valid) onDuplicate(name.trim());
  }

  return (
    <Modal open onClose={onClose} title="Duplicate role"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={!valid} onClick={handleSubmit}>Duplicate</Button>
      </div>}>
      <div className="space-y-3">
        <p className="text-sm text-content-secondary">
          Create a copy of <strong>{source.name}</strong> with all its permissions.
        </p>
        <Field label="New role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter role name"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter" && valid) handleSubmit(); }} />
        </Field>
      </div>
    </Modal>
  );
}
