"use client";

import { useState } from "react";
import { Button, Field, Input, Textarea, Modal } from "@cloud/ui";
import type { User } from "../types";

type EditUserModalProps = { open: boolean; onClose: () => void; user: User; onSave: (u: User) => void };

export function EditUserModal({ open, onClose, user, onSave }: EditUserModalProps) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [email, setEmail] = useState(user.email);
  const [country, setCountry] = useState(user.country);
  const [remark, setRemark] = useState(user.remark);

  const [prevId, setPrevId] = useState(user.id);
  if (user.id !== prevId) {
    setPrevId(user.id);
    setDisplayName(user.displayName);
    setEmail(user.email);
    setCountry(user.country);
    setRemark(user.remark);
  }

  function handleSave() {
    onSave({ ...user, displayName, email, country, remark });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Edit user"
      footer={<div className="flex gap-2 justify-end">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save</Button>
      </div>}>
      <div className="space-y-4">
        <Field label="Display name"><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Country"><Input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. US, CN, DE" /></Field>
        <Field label="Remark"><Textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={2} /></Field>
      </div>
    </Modal>
  );
}
