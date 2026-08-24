"use client";

import { useState } from "react";
import { api, ApiError } from "@/lib/api";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  maritalStatus: string | null;
  jobStatus: string | null;
  department: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  numberOfChildren: number | null;
};

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
        maritalStatus: String(form.get("maritalStatus") || ""),
        jobStatus: String(form.get("jobStatus") || ""),
        department: String(form.get("department") || ""),
        emergencyContactName: String(form.get("emergencyContactName") || ""),
        emergencyContactPhone: String(form.get("emergencyContactPhone") || ""),
        address: String(form.get("address") || ""),
        numberOfChildren: String(form.get("numberOfChildren") || ""),
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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {error && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</div>}
      {success && <div className="text-sm text-success bg-success-soft rounded-lg px-3 py-2">Saved.</div>}

      <div className="flex flex-col gap-3">
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
      </div>

      <details className="rounded-lg border border-border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium text-muted hover:text-foreground">
          Additional details (optional)
        </summary>
        <div className="p-3 pt-1 grid sm:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Marital status</label>
            <select name="maritalStatus" className="input" defaultValue={member.maritalStatus ?? ""}>
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
            <select name="jobStatus" className="input" defaultValue={member.jobStatus ?? ""}>
              <option value="">Not specified</option>
              <option value="employed">Employed</option>
              <option value="unemployed">Unemployed</option>
              <option value="self_employed">Self-employed</option>
              <option value="student">Student</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Department</label>
            <select name="department" className="input" defaultValue={member.department ?? ""}>
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
            <input name="address" defaultValue={member.address ?? ""} className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Emergency contact name</label>
            <input name="emergencyContactName" defaultValue={member.emergencyContactName ?? ""} className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Emergency contact phone</label>
            <input name="emergencyContactPhone" defaultValue={member.emergencyContactPhone ?? ""} className="input" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">Number of children</label>
            <input
              name="numberOfChildren"
              type="number"
              min="0"
              defaultValue={member.numberOfChildren ?? ""}
              className="input"
            />
          </div>
        </div>
      </details>

      <button type="submit" disabled={pending} className="btn btn-primary self-start">
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
