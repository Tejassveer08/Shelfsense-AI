import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "How it works" };

const STEPS = [
  {
    title: "1 · The catalogue",
    body: "Hundreds of thousands of books from the UCSD Goodreads Book Graph live in MongoDB Atlas — one edition per work, with descriptions, shelves, ratings, series and authors. Each book was embedded once with the all-MiniLM-L6-v2 sentence-transformer into a 384-dimensional vector.",
  },
  {
    title: "2 · Understanding your request",
    body: "A fast parser pulls hard constraints out of plain English (“under 300 pages”, “from the 90s”, “rated over 4”, “sci-fi”) and vibe cues (“dark”, “cozy”, “fast-paced”). Asking for “books like Dune” anchors the search on Dune's own vector instead of the word “Dune”.",
  },
  {
    title: "3 · Hybrid retrieval",
    body: "Atlas Vector Search finds books whose meaning is closest to your query, while Atlas Search (BM25) finds exact words, titles and authors. The two ranked lists are merged with Reciprocal Rank Fusion: 0.6/(60+rank₁) + 0.4/(60+rank₂).",
  },
  {
    title: "4 · Re-ranking",
    body: "Results are multiplied by how well each book's vibe (mood, pace, depth, length) matches your sliders, and by a gentle “reader-love” prior — a Bayesian-weighted rating so a 5.0 with three ratings doesn't beat a beloved classic.",
  },
  {
    title: "5 · Grounded explanations",
    body: "For every result, the sentence of the description closest to your query is highlighted. The AI explanations, librarian chat, personal-fit verdicts and reader personas are written by an LLM on Groq (gpt-oss-120b by default) and grounded strictly in the retrieved book text — with deterministic offline fallbacks.",
  },
  {
    title: "6 · Your taste",
    body: "Taste Match and “Picked for you” average the vectors of books you rated highly (weighted by stars), push away from books you disliked, and can be bent with free text — “like these, but funnier” adds the direction of “funnier” in vector space.",
  },
];

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-5xl font-semibold">How ShelfSense works</h1>
      <p className="mt-4 text-lg text-muted">Semantic search, explainable ranking and an AI librarian over the Goodreads catalogue — running on Vercel and MongoDB Atlas.</p>
      <ol className="mt-12 space-y-10">
        {STEPS.map((s) => (
          <li key={s.title}>
            <h2 className="font-display text-2xl font-semibold">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-ink-2">{s.body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-14 rounded-2xl border border-line bg-surface p-5 text-sm text-muted">
        Data: Mengting Wan &amp; Julian McAuley, “Item Recommendation on Monotonic Behavior Chains”, RecSys 2018; Wan, Misra, Nakashole &amp; McAuley, “Fine-Grained Spoiler Detection from Large-Scale Review Corpora”, ACL 2019. For academic, non-commercial use. Check{" "}
        <Link href="/api/health" className="underline">/api/health</Link> for live system status.
      </p>
    </div>
  );
}
