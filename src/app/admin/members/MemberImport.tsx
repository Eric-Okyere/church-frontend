"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { api, ApiError } from "@/lib/api";

// The set of fields a bulk import can populate — same optional-profile
// fields the single Add Member form already supports, minus qrToken/id/
// active/createdAt which are never something an import file would carry.
type ParsedRow = {
  name: string;
  phone: string;
  email: string;
  gender: string;
  maritalStatus: string;
  jobStatus: string;
  department: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  numberOfChildren: string;
};

type ImportError = { row: number; name: string | null; reason: string };

type Phase = "idle" | "preview" | "importing" | "done";

// Column-header aliases we try to auto-match against a real church's own
// spreadsheet, which is never going to use our exact internal field names.
// Matched case- and punctuation-insensitively (see normalizeHeader) so
// "Phone Number", "phone_number", and "PHONE" all resolve to the same
// field.
const FIELD_ALIASES: Record<keyof ParsedRow, string[]> = {
  name: ["name", "full name", "member name", "fullname"],
  phone: ["phone", "phone number", "phonenumber", "mobile", "cell", "contact", "contact number"],
  email: ["email", "email address", "emailaddress"],
  gender: ["gender", "sex"],
  maritalStatus: ["marital status", "maritalstatus", "marital"],
  jobStatus: ["job status", "jobstatus", "employment", "employment status", "employmentstatus"],
  department: ["department", "dept", "group", "ministry"],
  emergencyContactName: ["emergency contact name", "emergencycontactname", "emergency contact", "emergency name"],
  emergencyContactPhone: ["emergency contact phone", "emergencycontactphone", "emergency phone"],
  address: ["address", "home address", "homeaddress", "location"],
  numberOfChildren: ["number of children", "numberofchildren", "children", "kids", "no. of children"],
};

function normalizeHeader(h: string) {
  return h.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildHeaderMap(headers: string[]): Partial<Record<keyof ParsedRow, string>> {
  const normalized = headers.map((h) => ({ original: h, norm: normalizeHeader(h) }));
  const map: Partial<Record<keyof ParsedRow, string>> = {};
  (Object.keys(FIELD_ALIASES) as (keyof ParsedRow)[]).forEach((field) => {
    const aliases = FIELD_ALIASES[field].map(normalizeHeader);
    const found = normalized.find((h) => aliases.includes(h.norm));
    if (found) map[field] = found.original;
  });
  return map;
}

// Sent in batches rather than all at once — keeps each request small
// (server-side cap is 500 rows/request) and lets the UI show real
// progress on a large roster instead of one long spinner.
const BATCH_SIZE = 150;

function downloadTemplate() {
  const header = [
    "Name",
    "Phone",
    "Email",
    "Gender",
    "Marital Status",
    "Job Status",
    "Department",
    "Emergency Contact Name",
    "Emergency Contact Phone",
    "Address",
    "Number of Children",
  ];
  const example = [
    "Ama Mensah",
    "024 000 0000",
    "ama@example.com",
    "Female",
    "married",
    "employed",
    "Women",
    "Kojo Mensah",
    "020 000 0000",
    "12 Ring Road, Accra",
    "2",
  ];
  const csv = [header, example]
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "member_import_template.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Lets a church that already keeps its member list in a CSV or Excel file
// (very common — this is usually how a church's existing records show up)
// upload it and add everyone at once, instead of retyping each person into
// the single Add Member form. Parsing happens entirely in the browser
// (via the `xlsx` library, which reads CSV/XLS/XLSX alike) — the file
// itself is never sent anywhere; only the extracted name/phone/etc. fields
// go to the backend, batched, after the church has reviewed a preview.
export default function MemberImport({ onImported }: { onImported?: () => void }) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [summary, setSummary] = useState<{ created: number; skipped: number; errors: ImportError[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function reset() {
    setPhase("idle");
    setFileName(null);
    setRows([]);
    setParseError(null);
    setProgress({ done: 0, total: 0 });
    setSummary(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throw new Error("empty");
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
      if (json.length === 0) {
        setParseError("That file doesn't have any rows we could read.");
        return;
      }
      const headers = Object.keys(json[0]);
      const map = buildHeaderMap(headers);
      if (!map.name) {
        setParseError(
          `Couldn't find a "Name" column in that file (saw: ${headers.join(", ")}). Rename the name column to "Name" and try again.`
        );
        return;
      }
      const mapped: ParsedRow[] = json.map((r) => ({
        name: String(r[map.name!] ?? "").trim(),
        phone: map.phone ? String(r[map.phone] ?? "").trim() : "",
        email: map.email ? String(r[map.email] ?? "").trim() : "",
        gender: map.gender ? String(r[map.gender] ?? "").trim() : "",
        maritalStatus: map.maritalStatus ? String(r[map.maritalStatus] ?? "").trim() : "",
        jobStatus: map.jobStatus ? String(r[map.jobStatus] ?? "").trim() : "",
        department: map.department ? String(r[map.department] ?? "").trim() : "",
        emergencyContactName: map.emergencyContactName ? String(r[map.emergencyContactName] ?? "").trim() : "",
        emergencyContactPhone: map.emergencyContactPhone ? String(r[map.emergencyContactPhone] ?? "").trim() : "",
        address: map.address ? String(r[map.address] ?? "").trim() : "",
        numberOfChildren: map.numberOfChildren ? String(r[map.numberOfChildren] ?? "").trim() : "",
      }));
      setRows(mapped);
      setPhase("preview");
    } catch {
      setParseError("Couldn't read that file. Make sure it's a valid CSV or Excel (.xlsx/.xls) file.");
    }
  }

  async function confirmImport() {
    setPhase("importing");
    setProgress({ done: 0, total: rows.length });
    let createdTotal = 0;
    let skippedTotal = 0;
    const allErrors: ImportError[] = [];

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      try {
        const res = await api.post<{
          createdCount: number;
          skippedCount: number;
          errorCount: number;
          errors: ImportError[];
        }>("/api/members/import", {
          members: batch.map((r) => ({ ...r, numberOfChildren: r.numberOfChildren || undefined })),
        });
        createdTotal += res.createdCount;
        skippedTotal += res.skippedCount;
        allErrors.push(...res.errors.map((err) => ({ ...err, row: err.row + i })));
      } catch (err) {
        allErrors.push({
          row: i,
          name: null,
          reason: err instanceof ApiError ? err.message : "This batch failed to upload — try again.",
        });
      }
      setProgress({ done: Math.min(i + BATCH_SIZE, rows.length), total: rows.length });
    }

    setSummary({ created: createdTotal, skipped: skippedTotal, errors: allErrors });
    setPhase("done");
    onImported?.();
  }

  const missingNameCount = rows.filter((r) => !r.name).length;

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn btn-secondary">
        Import from CSV / Excel
      </button>
    );
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">Import members from a file</h2>
        <button
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-sm text-muted hover:text-foreground"
        >
          Close
        </button>
      </div>

      {phase === "idle" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            Already have your members in a spreadsheet? Upload a CSV or Excel (.xlsx/.xls) file and we&apos;ll add
            everyone at once. We&apos;ll try to match your column headers automatically (Name, Phone, Email, Gender,
            Department, etc.) — you&apos;ll see a preview before anything is saved, and anyone who already matches an
            existing member by phone number is skipped rather than duplicated.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={onFileSelected}
              className="text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-primary-hover"
            />
            <button onClick={downloadTemplate} className="text-xs text-primary font-semibold whitespace-nowrap">
              Download a template
            </button>
          </div>
          {parseError && <div className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{parseError}</div>}
        </div>
      )}

      {phase === "preview" && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted">
            <span className="font-medium text-foreground">{fileName}</span> — found{" "}
            <span className="font-medium text-foreground">{rows.length}</span> row{rows.length === 1 ? "" : "s"}.
            {missingNameCount > 0 && (
              <span className="text-danger">
                {" "}
                {missingNameCount} row{missingNameCount === 1 ? "" : "s"} {missingNameCount === 1 ? "has" : "have"} no
                name and will be skipped.
              </span>
            )}
          </div>

          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="px-2 py-1.5">Name</th>
                  <th className="px-2 py-1.5">Phone</th>
                  <th className="px-2 py-1.5">Email</th>
                  <th className="px-2 py-1.5">Gender</th>
                  <th className="px-2 py-1.5">Department</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 8).map((r, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="px-2 py-1.5 text-foreground">
                      {r.name || <span className="text-danger">missing</span>}
                    </td>
                    <td className="px-2 py-1.5 text-muted">{r.phone || "—"}</td>
                    <td className="px-2 py-1.5 text-muted">{r.email || "—"}</td>
                    <td className="px-2 py-1.5 text-muted">{r.gender || "—"}</td>
                    <td className="px-2 py-1.5 text-muted">{r.department || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 8 && <p className="text-xs text-muted mt-2">…and {rows.length - 8} more.</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={confirmImport} className="btn btn-primary">
              Import {rows.length} member{rows.length === 1 ? "" : "s"}
            </button>
            <button onClick={reset} className="btn btn-secondary">
              Choose a different file
            </button>
          </div>
        </div>
      )}

      {phase === "importing" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted">
            Importing {progress.done} of {progress.total}…
          </p>
          <div className="h-2 rounded-full bg-primary-soft overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%` }}
            />
          </div>
        </div>
      )}

      {phase === "done" && summary && (
        <div className="flex flex-col gap-3">
          <div className="text-sm bg-success-soft text-success rounded-lg px-3 py-2">
            Added {summary.created} member{summary.created === 1 ? "" : "s"}.
            {summary.skipped > 0 && ` Skipped ${summary.skipped} already on file (matched by phone number).`}
          </div>
          {summary.errors.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-danger font-medium">
                {summary.errors.length} row{summary.errors.length === 1 ? "" : "s"} couldn&apos;t be imported
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs text-muted max-h-40 overflow-y-auto">
                {summary.errors.map((e, i) => (
                  <li key={i}>
                    Row {e.row + 2}
                    {e.name ? ` (${e.name})` : ""}: {e.reason}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => {
                setOpen(false);
                reset();
              }}
              className="btn btn-primary"
            >
              Done
            </button>
            <button onClick={reset} className="btn btn-secondary">
              Import another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
