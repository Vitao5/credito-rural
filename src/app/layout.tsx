import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crédito Rural",
  description: "Esteira digital de análise e liberação de crédito rural",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="antialiased">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}
