import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Collaborative Document Editor",
  description: "Next.js baseline for the collaborative editor, auth, sharing, AI, and export experience."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
