import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/providers/WalletProvider";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Split or Steal",
  description: "A 2-player trust game on Solana",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-950 text-white" suppressHydrationWarning>
        <WalletProvider>
          <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
            <a href="/" className="text-xl font-bold tracking-tight">
              🤝 Split or Steal
            </a>
            <a href="/admin" className="text-sm text-gray-400 hover:text-white transition">
              Admin
            </a>
          </nav>
          <main className="max-w-4xl mx-auto w-full px-4 py-8">{children}</main>
        </WalletProvider>
      </body>
    </html>
  );
}
