import type { Metadata } from "next";
import { Suspense } from "react";
import { LibrarianChat } from "./LibrarianChat";

export const metadata: Metadata = {
  title: "AI Librarian",
  description: "Chat with an AI librarian that searches the Goodreads catalogue and explains every recommendation.",
};

export default function LibrarianPage() {
  return (
    <Suspense>
      <LibrarianChat />
    </Suspense>
  );
}
