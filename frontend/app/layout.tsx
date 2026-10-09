import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ShelfSense — LLM-Powered Semantic Book Recommender",
  description: "Describe what you want to read in plain English and discover ranked, explained books with Vibe Sliders, Book DNA, and Discovery Galaxy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased selection:bg-amber-200 selection:text-amber-900">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
