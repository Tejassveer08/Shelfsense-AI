import type { Metadata } from "next";
import { ShelfView } from "./ShelfView";

export const metadata: Metadata = { title: "My Shelf" };

export default function ShelfPage() {
  return <ShelfView />;
}
