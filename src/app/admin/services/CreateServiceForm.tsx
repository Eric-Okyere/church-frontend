"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { todayIso } from "@/lib/utils";

type Service = { id: string };

export default function CreateServiceForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await api.post<{ service: Service }>("/api/services", {
        name: String(form.get("name") || ""),
        date: String(form.get("date") || ""),
        activateNow: form.get("activateNow") === "on",
      });
      onCreated?.();
      router.push(`/admin/services/${res.service.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't create the service — try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 w-full">{error}</div>}
      <div className="flex flex-col gap-1.5 flex-1 min-w-[180px]">
        <label className="text-sm font-medium text-foreground">Service name</label>
        <input name="name" required className="input" placeholder="Sunday Service" defaultValue="Sunday Service" />
      </div>
      <div className="flex flex-col gap-1.5 min-w-[160px]">
        <label className="text-sm font-medium text-foreground">Date</label>
        <input name="date" type="date" required className="input" defaultValue={todayIso()} />
      </div>
      <label className="flex items-center gap-2 text-sm text-foreground pb-2.5">
        <input type="checkbox" name="activateNow" defaultChecked className="w-4 h-4 accent-[--color-primary]" />
        Start immediately
      </label>
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "Creating…" : "Create service"}
      </button>
    </form>
  );
}
