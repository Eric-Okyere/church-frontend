"use client";

import { useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

export default function AddMemberForm({ onAdded }: { onAdded?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, setPending] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(false);
    const form = new FormData(e.currentTarget);
    try {
      await api.post("/api/members", {
        name: String(form.get("name") || ""),
        phone: String(form.get("phone") || ""),
        email: String(form.get("email") || ""),
      });
      setSuccess(true);
      formRef.current?.reset();
      onAdded?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't add the member — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 w-full">{error}</div>}
      {success && (
        <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2 w-full">
          Member added — their QR code is ready on their profile.
        </div>
      )}
      <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label className="text-sm font-medium text-foreground">Full name</label>
        <input name="name" required className="input" placeholder="Ama Mensah" />
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label className="text-sm font-medium text-foreground">Phone</label>
        <input name="phone" className="input" placeholder="024 000 0000" />
      </div>
      <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
        <label className="text-sm font-medium text-foreground">Email (optional)</label>
        <input name="email" type="email" className="input" placeholder="ama@email.com" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
