"use client";

import { useState } from "react";
import { Button, Field, Input, Modal } from "@cloud/ui";
import type { Role } from "@/app/(portal)/system/_shared/types";

type DuplicateRoleModalProps = {
  source: Role | null;
  onClose: () => void;
  onDuplicate: (name: string) => Promise<boolean>;
};

export function DuplicateRoleModal({ source, onClose, onDuplicate }: DuplicateRoleModalProps) {
  if (!source) return null;

  return <DuplicateRoleModalBody key={source.id} source={source} onClose={onClose} onDuplicate={onDuplicate} />;
}

type DuplicateRoleModalBodyProps = {
  source: Role;
  onClose: () => void;
  onDuplicate: (name: string) => Promise<boolean>;
};

function DuplicateRoleModalBody({ source, onClose, onDuplicate }: DuplicateRoleModalBodyProps) {
  const [name, setName] = useState(`${source.name} (copy)`);
  const [submitting, setSubmitting] = useState(false);
  const valid = name.trim().length > 1;

  async function handleSubmit() {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      await onDuplicate(name.trim()); // 成功后父层关闭弹窗；失败保留输入、弹窗不关
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open closeOnOverlay={!submitting} onClose={onClose} title="Duplicate role"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" loading={submitting} disabled={!valid} onClick={handleSubmit}>
          {submitting ? "Duplicating…" : "Duplicate"}
        </Button>
      </div>}>
      <div className="space-y-3">
        <p className="text-md text-content-secondary">
          Create a copy of <strong>{source.name}</strong> with all its permissions.
        </p>
        <Field label="New role name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter role name"
            autoFocus disabled={submitting} onKeyDown={(e) => { if (e.key === "Enter" && valid) handleSubmit(); }} />
        </Field>
      </div>
    </Modal>
  );
}
