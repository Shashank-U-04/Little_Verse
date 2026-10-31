import type { Metadata } from "next";
import { Fredoka, Nunito } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-nunito",
  display: "swap",
});

const fredoka = Fredoka({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-fredoka",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LittleVerse AI — Jungle learning adventures for ages 3–8",
  description:
    "Voice-first jungle adventures where young children count, explore and level up, with a parent dashboard that shows what they really learned.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${nunito.variable} ${fredoka.variable} antialiased`}>
      <body className="min-h-screen bg-cream antialiased">
        {children}
      </body>
    </html>
  );
}
