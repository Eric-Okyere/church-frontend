"use client";

import { use, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate, formatTime, telHref, whatsappHref } from "@/lib/utils";
import EditMemberForm from "./EditMemberForm";
import ChildrenSection from "./ChildrenSection";

type Member = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  active: boolean;
  maritalStatus: string | null;
  jobStatus: string | null;
  department: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  address: string | null;
  numberOfChildren: number | null;
};

type HistoryRow = {
  id: string;
  checkedInAt: string;
  method: string;
  serviceName: string;
  serviceDate: string | null;
};

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [member, setMember] = useState<Member | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [busy, setBusy] = useState(false);

  async function load() {
    const [memberRes, qrRes, historyRes] = await Promise.all([
      api.get<{ member: Member }>(`/api/members/${id}`),
      api.get<{ dataUrl: string }>(`/api/members/${id}/qrcode`),
      api.get<{ history: HistoryRow[] }>(`/api/members/${id}/attendance`),
    ]);
    setMember(memberRes.member);
    setQrDataUrl(qrRes.dataUrl);
    setHistory(historyRes.history);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleActive() {
    if (!member) return;
    setBusy(true);
    try {
      await api.post(`/api/members/${id}/${member.active ? "deactivate" : "reactivate"}`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function regenerateQr() {
    setBusy(true);
    try {
      await api.post(`/api/members/${id}/regenerate-qr`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!member) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{member.name}</h1>
          <p className="text-sm text-muted">{member.phone || member.email || "No contact info"}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {member.phone && (
            <>
              <a href={telHref(member.phone)} className="btn btn-secondary">
                📞 Call
              </a>
              <a
                href={whatsappHref(member.phone, `Hi ${member.name.split(" ")[0]}, `)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                💬 WhatsApp
              </a>
            </>
          )}
          {!member.active && <span className="badge badge-muted">Inactive</span>}
          <button className={member.active ? "btn btn-danger" : "btn btn-secondary"} disabled={busy} onClick={toggleActive}>
            {member.active ? "Deactivate member" : "Reactivate"}
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card p-6 flex flex-col items-center text-center">
          <h2 className="font-semibold text-foreground mb-4 self-start">Check-in QR code</h2>
          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt={`QR code for ${member.name}`} className="w-56 h-56 rounded-xl border border-border" />
          )}
          <p className="text-xs text-muted mt-3">
            Scanning this marks {member.name.split(" ")[0]} present for whichever service is currently active.
          </p>
          <div className="flex gap-2 mt-4 w-full">
            {qrDataUrl && (
              <a href={qrDataUrl} download={`${member.name.replace(/\s+/g, "_")}_qr.png`} className="btn btn-secondary flex-1">
                Download
              </a>
            )}
            <button disabled={busy} onClick={regenerateQr} className="btn btn-secondary flex-1">
              Regenerate
            </button>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-foreground mb-4">Edit details</h2>
          <EditMemberForm member={member} onSaved={load} />
        </div>
      </div>

      <ChildrenSection memberId={id} />

      <div className="card">
        <h2 className="font-semibold text-foreground p-6 pb-4">Attendance history</h2>
        <div className="divide-y divide-border">
          {history.length === 0 && <p className="px-6 pb-6 text-sm text-muted">No attendance recorded yet.</p>}
          {history.map((h) => (
            <div key={h.id} className="flex items-center justify-between px-6 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">{h.serviceName}</p>
                {h.serviceDate && <p className="text-xs text-muted">{formatDate(h.serviceDate)}</p>}
              </div>
              <p className="text-xs text-muted">{formatTime(h.checkedInAt)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
