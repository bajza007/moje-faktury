import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moje faktury",
  description: "Evidence nákladových faktur s AI extrakcí",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs">
      <body className="antialiased min-h-screen bg-slate-50 text-slate-900">
        {children}
      </body>
    </html>
  );
}
