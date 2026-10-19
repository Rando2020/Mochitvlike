import type { Metadata, Viewport } from "next";
import { CRAYVO } from "@/lib/brand/crayvo";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: CRAYVO.fullName,
  title: { default: CRAYVO.fullName, template: "%s | Crayvo" },
  description: "Crayvo is a creative studio for original shows, characters, episodes and worlds. " + CRAYVO.tagline,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: CRAYVO.name },
  icons: { icon: "/icon.svg", apple: "/apple-icon" }
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#101117" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
