"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/utils";

type Subscription = {
  status: "trialing" | "active" | "past_due" | "unpaid";
  amount: number;
  currentPeriodEnd: string | null;
  lastPaymentMethod: "card" | "mobile_money" | "manual" | null;
  autoRenews: boolean;
};

type Invoice = {
  id: string;
  amount: number;
  status: "pending" | "paid" | "failed";
  method: "card" | "mobile_money" | "manual" | null;
  periodEnd: string | null;
  paidAt: string | null;
  note: string | null;
  createdAt: string;
};

const STATUS_LABEL: Record<Subscription["status"], { label: string; badge: string }> = {
  trialing: { label: "Trial — no payment yet", badge: "badge-muted" },
  active: { label: "Active", badge: "badge-success" },
  past_due: { label: "Past due", badge: "badge-warning" },
  unpaid: { label: "Unpaid", badge: "badge-warning" },
};

const METHOD_LABEL: Record<NonNullable<Invoice["method"]>, string> = {
  card: "Card",
  mobile_money: "Mobile money",
  manual: "Manual",
};

function BillingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await api.get<{ subscription: Subscription; invoices: Invoice[] }>("/api/billing/status");
      setSubscription(res.subscription);
      setInvoices(res.invoices);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Couldn't load your billing status.");
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Paystack redirects back here with ?reference=... after checkout. Verify
  // it (a fallback in case the webhook hasn't landed yet), then clean the
  // reference out of the URL so a page refresh doesn't re-verify it.
  useEffect(() => {
    const reference = searchParams.get("reference");
    if (!reference) return;

    setVerifying(true);
    api
      .post<{ subscription: Subscription }>("/api/billing/verify", { reference })
      .then((res) => {
        setSubscription(res.subscription);
        setVerifyMessage(
          res.subscription.status === "active" ? "Payment confirmed — thank you!" : "That payment didn't go through — you can try again below."
        );
        loadStatus();
      })
      .catch((err) => {
        setVerifyMessage(err instanceof ApiError ? err.message : "Couldn't confirm that payment — check the history below in a moment.");
      })
      .finally(() => {
        setVerifying(false);
        router.replace("/admin/billing");
      });
  }, [searchParams, router, loadStatus]);

  async function onPayNow() {
    setPaying(true);
    setPayError(null);
    try {
      const res = await api.post<{ authorizationUrl: string }>("/api/billing/checkout");
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setPayError(err instanceof ApiError ? err.message : "Couldn't start checkout — try again.");
      setPaying(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Billing</h1>
        <p className="text-sm text-muted mt-1">Manage your church&apos;s monthly subscription.</p>
      </div>

      {verifyMessage && (
        <div className="card p-4 border-l-4" style={{ borderLeftColor: "var(--primary)" }}>
          <p className="text-sm text-foreground">{verifying ? "Confirming your payment…" : verifyMessage}</p>
        </div>
      )}

      {loadError && (
        <div className="card p-4 border-l-4 border-l-[var(--danger)]">
          <p className="text-sm text-danger">{loadError}</p>
        </div>
      )}

      {subscription && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className={`badge ${STATUS_LABEL[subscription.status].badge}`}>{STATUS_LABEL[subscription.status].label}</span>
              </div>
              <p className="text-2xl font-semibold text-foreground mt-2">
                {formatMoney(subscription.amount)}
                <span className="text-sm font-normal text-muted"> / month</span>
              </p>
              {subscription.currentPeriodEnd && (
                <p className="text-sm text-muted mt-1">
                  {subscription.status === "active" ? "Covers you through" : "Was covered through"} {formatDate(subscription.currentPeriodEnd)}
                </p>
              )}
              <p className="text-xs text-muted mt-1">
                {subscription.autoRenews
                  ? "Renews automatically by card each month."
                  : subscription.lastPaymentMethod === "mobile_money"
                    ? "Paid by mobile money — this doesn't auto-renew, so you'll need to pay again each month."
                    : "No auto-renewal set up yet."}
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={onPayNow} disabled={paying} className="btn btn-primary">
                {paying ? "Starting checkout…" : subscription.status === "active" ? "Pay again" : "Pay now"}
              </button>
              {payError && <p className="text-xs text-danger text-right max-w-xs">{payError}</p>}
            </div>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="font-medium text-foreground">Payment history</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="text-sm text-muted p-5">No payments yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {invoices.map((inv) => (
              <div key={inv.id} className="p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-sm text-foreground font-medium">
                    {formatMoney(inv.amount)}
                    {inv.method && <span className="text-muted font-normal"> · {METHOD_LABEL[inv.method]}</span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5">{formatDate(inv.createdAt)}</p>
                  {inv.note && <p className="text-xs text-muted mt-0.5">{inv.note}</p>}
                </div>
                <span
                  className={`badge ${
                    inv.status === "paid" ? "badge-success" : inv.status === "pending" ? "badge-muted" : "badge-warning"
                  }`}
                >
                  {inv.status === "paid" ? "Paid" : inv.status === "pending" ? "Pending" : "Failed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingContent />
    </Suspense>
  );
}
