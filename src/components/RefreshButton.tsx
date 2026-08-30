"use client";

// A single, always-present way to reload the page — deliberately a full
// `window.location.reload()` rather than re-fetching each page's own data
// in place. The main real-world use case is a kiosk/tablet running this
// app in a browser with no visible address bar or reload control (kiosk
// mode, a pinned tab, a PWA) — this button is the only way to force a
// fresh load without underlying browser chrome. Rendered once in the root
// layout, so it shows on every single page (login, signup, every admin
// page, /scan, /c/[token], /venue and /venue/[slug]) without needing to be
// added to each one individually — same pattern as the Footer.
export default function RefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      title="Refresh this page"
      aria-label="Refresh this page"
      className="fixed bottom-24 right-5 z-30 w-11 h-11 rounded-full bg-primary text-white shadow-lg flex items-center justify-center hover:bg-primary-hover transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M21 12a9 9 0 1 1-2.64-6.36" />
        <polyline points="21 3 21 9 15 9" />
      </svg>
    </button>
  );
}
