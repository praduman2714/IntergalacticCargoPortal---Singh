import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intergalactic Cargo Portal",
  description: "Authentication and cargo manifest management portal"
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
