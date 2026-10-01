"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

function CheckCircleIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.299 12.299 0 0 1 9.374 21c-2.33 0-4.512-.645-6.374-1.766Z"
      />
    </svg>
  );
}

function CurrencyDollarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function ArchiveBoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5C21.75 4.254 21.246 3.75 20.625 3.75H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z"
      />
    </svg>
  );
}

function ChartBarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 13.125c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
      />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <CheckCircleIcon />,
    title: "QR check-in & attendance",
    description:
      "Members check themselves in with a personal QR code, or an usher scans them in at the door — present and absent counts update live for every service.",
  },
  {
    icon: <UserPlusIcon />,
    title: "Visitor follow-up",
    description:
      "Keep a simple list of first-time visitors, and convert anyone into a full member once you're ready — their visit history comes with them.",
  },
  {
    icon: <CurrencyDollarIcon />,
    title: "Tithes & levies",
    description:
      "Record member tithes, and run named levies — like a building fund — with live paid-versus-outstanding tracking for every member.",
  },
  {
    icon: <ArchiveBoxIcon />,
    title: "Asset inventory",
    description: "Keep a running list of the instruments and equipment your church owns, with quantities and notes.",
  },
  {
    icon: <ChartBarIcon />,
    title: "Attendance analytics",
    description:
      "See trends, demographics, and check-in methods at a glance, and know exactly who missed a service so you can follow up.",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "Built for every church",
    description:
      "Each church gets its own account and its own GPS-verified check-in — your data is never visible to any other congregation.",
  },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    router.replace(user.isPlatformAdmin ? "/platform" : "/admin");
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="flex flex-col">
      <header className="px-4 sm:px-8 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <Image
            src="/linkpii-logo.jpg"
            alt="Linkpii"
            width={32}
            height={32}
            className="rounded-full object-cover"
          />
          <span className="font-semibold text-foreground">Linkpii Church Management</span>
        </div>
        <Link href="/login" className="text-sm font-medium text-muted hover:text-foreground">
          Sign in
        </Link>
      </header>

      <section className="px-4 sm:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24 text-center max-w-3xl mx-auto w-full">
        <h1 className="text-3xl sm:text-5xl font-semibold text-foreground tracking-tight">
          Run your church&apos;s attendance, tithes, and membership — all in one place
        </h1>
        <p className="text-base sm:text-lg text-muted mt-5 max-w-2xl mx-auto">
          QR check-in, visitor follow-up, tithes and levies, and a live view of who showed up — built for
          congregations of every size.
        </p>
        <div className="flex items-center justify-center gap-3 mt-8 flex-wrap">
          <Link href="/signup" className="btn btn-primary !px-6 !py-3 text-base">
            Create your church&apos;s account
          </Link>
          <Link href="/login" className="btn btn-secondary !px-6 !py-3 text-base">
            Sign in
          </Link>
        </div>
        <p className="text-xs text-muted mt-4">Free to get started — no card required.</p>
      </section>

      <section className="px-4 sm:px-8 pb-20 max-w-6xl mx-auto w-full">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-semibold text-foreground">Everything your church needs</h2>
          <p className="text-sm text-muted mt-2">One platform for attendance, giving, and membership growth.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="w-10 h-10 rounded-full bg-primary-soft flex items-center justify-center text-primary mb-4">
                {f.icon}
              </div>
              <h3 className="font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted mt-2">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-8 pb-24 max-w-3xl mx-auto w-full">
        <div className="card p-10 text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-foreground">Ready to get your church set up?</h2>
          <p className="text-sm text-muted mt-2">
            It takes a few minutes — add your details, set your church&apos;s location, and you&apos;re ready to
            check people in.
          </p>
          <Link href="/signup" className="btn btn-primary !px-6 !py-3 text-base mt-6 inline-flex">
            Create your church&apos;s account
          </Link>
        </div>
      </section>
    </div>
  );
}
