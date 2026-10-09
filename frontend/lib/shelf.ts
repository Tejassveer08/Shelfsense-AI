/**
 * LocalStorage Reading Shelf persistence and management
 */

import { BookItem, ShelfBook, ShelfCategory } from "./types";

const SHELF_STORAGE_KEY = "shelfsense_reading_shelf_v1";

export function getShelfBooks(): ShelfBook[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SHELF_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to read shelf from localStorage", e);
    return [];
  }
}

export function saveShelfBooks(books: ShelfBook[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SHELF_STORAGE_KEY, JSON.stringify(books));
    window.dispatchEvent(new Event("shelfsense_shelf_updated"));
  } catch (e) {
    console.error("Failed to save shelf to localStorage", e);
  }
}

export function addBookToShelf(book: BookItem, shelf: ShelfCategory, userNotes?: string): void {
  const books = getShelfBooks();
  const existingIndex = books.findIndex((b) => b.book.isbn13 === book.isbn13);
  if (existingIndex >= 0) {
    books[existingIndex].shelf = shelf;
    if (userNotes !== undefined) books[existingIndex].userNotes = userNotes;
  } else {
    books.push({
      book,
      shelf,
      addedAt: new Date().toISOString(),
      userNotes,
    });
  }
  saveShelfBooks(books);
}

export function updateBookShelf(isbn13: string, newShelf: ShelfCategory): void {
  const books = getShelfBooks();
  const target = books.find((b) => b.book.isbn13 === isbn13);
  if (target) {
    target.shelf = newShelf;
    saveShelfBooks(books);
  }
}

export function removeBookFromShelf(isbn13: string): void {
  const books = getShelfBooks();
  const filtered = books.filter((b) => b.book.isbn13 !== isbn13);
  saveShelfBooks(filtered);
}

export function exportShelfJson(): string {
  const books = getShelfBooks();
  return JSON.stringify(books, null, 2);
}

export function clearShelf(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SHELF_STORAGE_KEY);
  window.dispatchEvent(new Event("shelfsense_shelf_updated"));
}
