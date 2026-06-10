import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Vault",
  description: "Your personal streaming library",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
