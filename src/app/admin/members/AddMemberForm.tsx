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
        gender: String(form.get("gender") || ""),
        maritalStatus: String(form.get("maritalStatus") || ""),
        jobStatus: String(form.get("jobStatus") || ""),
        department: String(form.get("department") || ""),
        emergencyContactName: String(form.get("emergencyContactName") || ""),
        emergencyContactPhone: String(form.get("emergencyContactPhone") || ""),
        address: String(form.get("address") || ""),
        numberOfChildren: String(form.get("numberOfChildren") || ""),
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
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2 w-full">{error}</div>}
      {success && (
        <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2 w-full">
          Member added — their QR code is ready on their profile.
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end flex-wrap">
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
      </div>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
          Additional details (optional)
        </summary>
        <div className="p-3 pt-1 grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Gender</label>
            <select name="gender" className="input" defaultValue="">
              <option value="">Not specified</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Marital status</label>
            <select name="maritalStatus" className="input" defaultValue="">
              <option value="">Not specified</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="separated">Separated</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Job status</label>
            <select name="jobStatus" className="input" defaultValue="">
              <option value="">Not specified</option>
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="self_employed">Self-employed</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Department</label>
            <select name="department" className="input" defaultValue="">
              <option value="">Not specified</option>
              <option value="Youth">Youth</option>
              <option value="Children">Children</option>
              <option value="Men">Men</option>
              <option value="Leader">Leader</option>
              <option value="Women">Women</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Where they stay</label>
            <input name="address" className="input" placeholder="e.g. East Legon" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Emergency contact name</label>
            <input name="emergencyContactName" className="input" placeholder="e.g. Efua Boateng" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Emergency contact phone</label>
            <input name="emergencyContactPhone" className="input" placeholder="024 000 0000" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Number of children</label>
            <input name="numberOfChildren" type="number" min="0" className="input" placeholder="e.g. 2" />
          </div>
        </div>
      </details>

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? "Adding…" : "Add member"}
      </button>
    </form>
  );
}
