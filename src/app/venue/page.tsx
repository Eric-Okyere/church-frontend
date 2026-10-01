import Image from "next/image";

// Each church's self-check-in link is now /venue/<their-slug> (see
// /venue/[slug]/page.tsx) so the member search it powers only ever looks at
// that one church's members. A bare /venue link (no slug) predates
// multi-tenancy and can't know which church to search, so it just explains
// that rather than guessing.
export default function VenueMissingSlugPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="card p-8 max-w-sm w-full text-center">
        <Image src="/linkpii-logo.jpg" alt="Linkpii" width={48} height={48} className="rounded-full object-cover mx-auto mb-3" />
        <h1 className="text-xl font-semibold text-foreground">Check-in link needed</h1>
        <p className="text-muted text-sm mt-2">
          This link is missing your church. Please scan the QR code posted at your church&apos;s entrance, or ask an
          usher for your church&apos;s check-in link.
        </p>
      </div>
    </div>
  );
}
