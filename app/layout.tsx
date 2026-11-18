import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { Header } from "@/components/Header";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz", "SOFT"], display: "swap" });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "ShelfSense — find your next favourite book with AI", template: "%s · ShelfSense" },
  description:
    "Describe what you want to read in plain English and get grounded, explainable recommendations from hundreds of thousands of Goodreads books. AI librarian, taste matching, vibe sliders and reading DNA.",
  metadataBase: process.env.VERCEL_PROJECT_PRODUCTION_URL ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) : undefined,
  openGraph: { type: "website", siteName: "ShelfSense" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f3ec" },
    { media: "(prefers-color-scheme: dark)", color: "#0d0e12" },
  ],
};

// Applies the saved/system theme before first paint so there is no light→dark flash.
const themeScript = `try{var t=localStorage.getItem("shelfsense.theme");if(t==="dark"||(!t&&matchMedia("(prefers-color-scheme: dark)").matches))document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${fraunces.variable} ${inter.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex min-h-screen flex-col selection:bg-accent/25">
        <a href="#main" className="sr-only z-50 rounded bg-ink px-3 py-2 text-paper focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
          Skip to content
        </a>
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <footer className="mt-16 border-t border-line">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p>
              <span className="font-display text-base font-semibold text-ink">ShelfSense</span> · AI book discovery. Book data from the{" "}
              <a className="underline hover:text-ink" href="https://mcauleylab.ucsd.edu/public_datasets/gdrive/goodreads/UCSD%20Book%20Graph.html" target="_blank" rel="noreferrer">
                UCSD Goodreads Book Graph
              </a>{" "}
              (academic use).
            </p>
            <nav className="flex gap-5" aria-label="Footer">
              <Link href="/discover" className="hover:text-ink">Discover</Link>
              <Link href="/librarian" className="hover:text-ink">Librarian</Link>
              <Link href="/about" className="hover:text-ink">How it works</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
