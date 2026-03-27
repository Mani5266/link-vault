import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ToastContainer } from "@/components/ui/ToastContainer";
import "./globals.css";

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "LinkVault — Your Personal AI-Powered Link Library",
  description:
    "Paste any link. AI makes it memorable. Find anything instantly. Never lose important content again.",
  keywords: [
    "link manager",
    "bookmark manager",
    "AI bookmarks",
    "save links",
    "link library",
  ],
  openGraph: {
    title: "LinkVault — Your Personal AI-Powered Link Library",
    description:
      "Paste any link. AI makes it memorable. Find anything instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${syne.variable} ${dmSans.variable} font-body antialiased`}
      >
        <AuthProvider>
          {children}
          <ToastContainer />
        </AuthProvider>
      </body>
    </html>
  );
}
