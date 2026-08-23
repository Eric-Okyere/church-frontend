"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

type Row = {
  id: string;
  name: string;
  phone: string | null;
  method: "qr" | "manual" | "visitor";
  checkedInAt: string;
};

const methodLabel: Record<Row["method"], string> = {
  qr: "QR scan",
  manual: "Manual",
  visitor: "Visitor",
};

export default function LiveAttendance({ serviceId }: { serviceId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ attendance: Row[] }>(`/api/services/${serviceId}/attendance`);
      setRows(data.attendance ?? []);
    } finally {
      setLoading(false);
    }
  }, [serviceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 4000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-foreground">Attendance</h2>
        <span className="text-sm text-muted">{rows.length} checked in</span>
      </div>
      <div className="flex flex-col divide-y divide-border max-h-[28rem] overflow-y-auto -mx-2">
        {loading && <p className="text-sm text-muted px-2 py-3">Loading…</p>}
        {!loading && rows.length === 0 && <p className="text-sm text-muted px-2 py-3">No check-ins yet.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-2 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{r.name}</p>
              <p className="text-xs text-muted">
                {new Date(r.checkedInAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </p>
            </div>
            <span className="badge badge-muted">{methodLabel[r.method]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
