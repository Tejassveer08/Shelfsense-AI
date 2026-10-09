"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Compass, BookmarkCheck, Sparkles, Sun, Moon, Search } from "lucide-react";
import { useTheme } from "@/app/providers";
import { getShelfBooks } from "@/lib/shelf";

interface HeaderProps {
  onOpenTasteProfile?: () => void;
  onOpenChatDrawer?: () => void;
}

export function Header({ onOpenTasteProfile, onOpenChatDrawer }: HeaderProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [shelfCount, setShelfCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setShelfCount(getShelfBooks().length);
    };
    updateCount();
    window.addEventListener("shelfsense_shelf_updated", updateCount);
    return () => window.removeEventListener("shelfsense_shelf_updated", updateCount);
  }, []);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-[var(--bg-primary)]/90 border-b border-[var(--border-library)] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-lg bg-[var(--accent-amber)] text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <span className="font-editorial text-2xl font-bold tracking-tight text-[var(--text-primary)]">
              ShelfSense
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-widest text-[var(--accent-amber)] font-medium">
              Curated Intelligence
            </span>
          </div>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-[var(--bg-surface)] p-1 rounded-full border border-[var(--border-library)]">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              pathname === "/"
                ? "bg-[var(--accent-amber)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Explorer
          </Link>
          <Link
            href="/galaxy"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              pathname === "/galaxy"
                ? "bg-[var(--accent-amber)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Compass className="w-4 h-4" />
            Discovery Galaxy
          </Link>
          <Link
            href="/shelf"
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              pathname === "/shelf"
                ? "bg-[var(--accent-amber)] text-white shadow-sm"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <BookmarkCheck className="w-4 h-4" />
            My Shelf
            {shelfCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-xs rounded-full bg-[var(--accent-amber)] text-white">
                {shelfCount}
              </span>
            )}
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {onOpenTasteProfile && (
            <button
              onClick={onOpenTasteProfile}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border-library)] hover:border-[var(--accent-amber)] transition-colors shadow-sm"
              title="Taste Profile ('Books I Love')"
            >
              <Sparkles className="w-4 h-4 text-[var(--accent-amber)]" />
              <span className="hidden sm:inline">Taste Profile</span>
              <span className="sm:hidden">Taste</span>
            </button>
          )}

          {onOpenChatDrawer && (
            <button
              onClick={onOpenChatDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg bg-[var(--accent-amber)] text-white hover:opacity-90 transition-opacity shadow-sm"
              title="Conversational Refine Drawer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Refine with AI</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-primary)] border border-[var(--border-library)] transition-colors"
          >
            {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
