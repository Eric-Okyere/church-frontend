import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "GraceTrack — Church Attendance",
  description: "Fast, modern attendance tracking for your congregation.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <AuthProvider>
          <div className="flex-1 flex flex-col">{children}</div>
        </AuthProvider>
        <Footer />
      </body>
    </html>
  );
}
