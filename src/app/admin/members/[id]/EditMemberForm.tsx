"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

type Member = { id: string; name: string; phone: string | null; email: string | null };

export default function EditMemberForm({ member, onSaved }: { member: Member; onSaved?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    try {
      await api.patch(`/api/members/${member.id}`, {
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
      });
      setSuccess(true);
      onSaved?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2">Saved.</div>}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Full name</label>
        <input name="name" required defaultValue={member.name} className="input" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Phone</label>
        <input name="phone" defaultValue={member.phone ?? ""} className="input" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-foreground">Email</label>
        <input name="email" type="email" defaultValue={member.email ?? ""} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
