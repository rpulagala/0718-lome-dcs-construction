import type { Metadata, Viewport } from "next";
import { TabBar } from "@/components/portal/TabBar";
import { RegisterSW } from "@/components/portal/RegisterSW";
import { PortalThemeProvider } from "@/components/portal/PortalTheme";

export const metadata: Metadata = {
  title: "DCS Construction",
  description: "Track your DCS Construction requests, projects, estimates, and messages.",
  appleWebApp: { capable: true, title: "DCS", statusBarStyle: "black-translucent" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#024988",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

/** Mobile app shell — a phone-width column with a bottom tab bar. */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalThemeProvider>
      <div className="min-h-[100dvh] bg-slate-200 font-brand text-brand-ink dark:bg-black dark:text-slate-100">
        <RegisterSW />
        <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-slate-50 shadow-xl dark:bg-slate-950">
          <main className="flex-1">{children}</main>
          <TabBar />
        </div>
      </div>
    </PortalThemeProvider>
  );
}
