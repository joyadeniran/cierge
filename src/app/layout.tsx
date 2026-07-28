import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-inter-tight", weight: ["400","500","600","700"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400","500"] });

export const metadata: Metadata = {
  title: "Cierge — Voice of Customer",
  description: "Your AI Customer Success Agent",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${interTight.variable} ${jetbrainsMono.variable} h-full`}>
      <body className="h-full bg-mist font-sans antialiased">{children}</body>
    </html>
  );
}
