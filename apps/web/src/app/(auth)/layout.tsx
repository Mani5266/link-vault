import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    template: "%s — LinkVault",
    default: "Authentication — LinkVault",
  },
  description: "Sign in or create your LinkVault account to save and organize links with AI.",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
