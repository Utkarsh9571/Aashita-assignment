import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aashita Technosoft — Meeting Room Booking System",
  description: "Enterprise meeting room management and reservation system for Aashita Technosoft.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#F5FAFA] text-[#10243A] selection:bg-[#00C9B7]/20 selection:text-[#003B45]">
        {children}
      </body>
    </html>
  );
}
