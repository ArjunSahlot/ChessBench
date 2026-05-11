import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ChessBench",
  description: "ELO benchmark for LLM-generated chess engines.",
  openGraph: {
    title: "ChessBench",
    description: "A public ELO benchmark for LLM-generated chess engines.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
