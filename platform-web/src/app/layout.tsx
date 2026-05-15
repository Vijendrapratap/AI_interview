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
  title: "ReCruItAI — AI Recruiting Workspace",
  description:
    "Test ReCruItAI, an AI-first applicant tracking workspace for resume screening, interview workflows, candidate pipeline management, and recruiting analytics.",
  openGraph: {
    title: "ReCruItAI — AI Recruiting Workspace",
    description:
      "AI-first ATS workspace for recruiters to screen resumes, manage candidates, coordinate interviews, and review hiring analytics.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
