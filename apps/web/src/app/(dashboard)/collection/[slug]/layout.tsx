import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Collection — LinkVault",
  description: "Browse and manage links in this collection.",
};

export default function CollectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
