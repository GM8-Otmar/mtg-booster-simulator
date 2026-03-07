/**
 * Deck storage facade: the single interface the rest of the app consumes.
 *
 * Supports two modes:
 *   - 'folder': backed by a user-selected directory via File System Access API
 *   - 'fallback': in-memory with import/export via file downloads
 *
 * All deck I/O flows through this module. Components never touch file APIs directly.
 */

import type { DeckRecord, DeckSummary, DeckStorageCapability } from '../types/deck';
import { duplicateDeck } from '../utils/deckRecord';
import { computeDeckSummary } from '../utils/deckSummary';
import { deserializeDeck, serializeDeck } from './deckSerialization';
import {
  clearDirectoryHandle,
  deckFileName,
  deleteDeckFile,
  isFileSystemAccessSupported,
  listDeckFiles,
  loadDirectoryHandle,
  pickDeckFolder,
  readDeckFile,
  verifyPermission,
  writeDeckFile,
} from './deckFileSystem';

// Storage interface

export interface DeckStorage {
  getCapability(): DeckStorageCapability;
  isConnected(): boolean;
  connectFolder(): Promise<boolean>;
  disconnectFolder(): Promise<void>;
  listDecks(): Promise<DeckSummary[]>;
  loadDeck(deckId: string): Promise<DeckRecord>;
  saveDeck(deck: DeckRecord): Promise<void>;
  deleteDeck(deckId: string): Promise<void>;
  duplicateDeck(deckId: string, newName: string): Promise<DeckRecord>;
  importDeckFromFile(file: File): Promise<DeckRecord>;
  exportDeckToFile(deck: DeckRecord): void;
  rescan(): Promise<DeckSummary[]>;
}

// Folder-backed implementation

class FolderDeckStorage implements DeckStorage {
  private dirHandle: FileSystemDirectoryHandle | null = null;
  private initialized = false;
  private memoryDecks = new Map<string, DeckRecord>();

  getCapability(): DeckStorageCapability {
    return 'folder';
  }

  isConnected(): boolean {
    return this.dirHandle !== null;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    const handle = await loadDirectoryHandle();
    if (!handle) return;

    const ok = await verifyPermission(handle).catch(() => false);
    if (ok) {
      this.dirHandle = handle;
    }
  }

  async connectFolder(): Promise<boolean> {
    const handle = await pickDeckFolder();
    if (!handle) return false;

    this.dirHandle = handle;

    if (this.memoryDecks.size > 0) {
      for (const deck of this.memoryDecks.values()) {
        await writeDeckFile(this.dirHandle, deckFileName(deck.id), serializeDeck(deck));
      }
      this.memoryDecks.clear();
    }

    return true;
  }

  async disconnectFolder(): Promise<void> {
    this.dirHandle = null;
    await clearDirectoryHandle();
  }

  async listDecks(): Promise<DeckSummary[]> {
    await this.init();

    if (!this.dirHandle) {
      return Array.from(this.memoryDecks.values())
        .map(computeDeckSummary)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    }

    const files = await listDeckFiles(this.dirHandle);
    const summaries: DeckSummary[] = [];

    for (const fileName of files) {
      try {
        const text = await readDeckFile(this.dirHandle, fileName);
        summaries.push(computeDeckSummary(deserializeDeck(text)));
      } catch {
        // Skip corrupt files.
      }
    }

    return summaries.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async loadDeck(deckId: string): Promise<DeckRecord> {
    await this.init();

    if (!this.dirHandle) {
      const deck = this.memoryDecks.get(deckId);
      if (!deck) throw new Error(`Deck not found: ${deckId}`);
      return { ...deck };
    }

    const text = await readDeckFile(this.dirHandle, deckFileName(deckId));
    return deserializeDeck(text);
  }

  async saveDeck(deck: DeckRecord): Promise<void> {
    await this.init();

    if (!this.dirHandle) {
      this.memoryDecks.set(deck.id, { ...deck });
      return;
    }

    await writeDeckFile(this.dirHandle, deckFileName(deck.id), serializeDeck(deck));
  }

  async deleteDeck(deckId: string): Promise<void> {
    await this.init();

    if (!this.dirHandle) {
      this.memoryDecks.delete(deckId);
      return;
    }

    await deleteDeckFile(this.dirHandle, deckFileName(deckId));
  }

  async duplicateDeck(deckId: string, newName: string): Promise<DeckRecord> {
    const original = await this.loadDeck(deckId);
    const copy = duplicateDeck(original, newName);
    await this.saveDeck(copy);
    return copy;
  }

  async importDeckFromFile(file: File): Promise<DeckRecord> {
    const text = await file.text();

    if (file.name.endsWith('.json') || file.name.endsWith('.deck.json')) {
      const deck = deserializeDeck(text);
      await this.saveDeck(deck);
      return deck;
    }

    const { arenaTextToDeckRecord } = await import('../utils/deckArena');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'Imported Deck';
    const deck = arenaTextToDeckRecord(text, { name: baseName });
    await this.saveDeck(deck);
    return deck;
  }

  exportDeckToFile(deck: DeckRecord): void {
    downloadJson(deck);
  }

  async rescan(): Promise<DeckSummary[]> {
    return this.listDecks();
  }
}

// Fallback implementation (in-memory + download)

class FallbackDeckStorage implements DeckStorage {
  private decks = new Map<string, DeckRecord>();

  getCapability(): DeckStorageCapability {
    return 'fallback';
  }

  isConnected(): boolean {
    return false;
  }

  async connectFolder(): Promise<boolean> {
    return false;
  }

  async disconnectFolder(): Promise<void> {
    // No-op in fallback.
  }

  async listDecks(): Promise<DeckSummary[]> {
    return Array.from(this.decks.values())
      .map(computeDeckSummary)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async loadDeck(deckId: string): Promise<DeckRecord> {
    const deck = this.decks.get(deckId);
    if (!deck) throw new Error(`Deck not found: ${deckId}`);
    return { ...deck };
  }

  async saveDeck(deck: DeckRecord): Promise<void> {
    this.decks.set(deck.id, { ...deck });
  }

  async deleteDeck(deckId: string): Promise<void> {
    this.decks.delete(deckId);
  }

  async duplicateDeck(deckId: string, newName: string): Promise<DeckRecord> {
    const original = await this.loadDeck(deckId);
    const copy = duplicateDeck(original, newName);
    await this.saveDeck(copy);
    return copy;
  }

  async importDeckFromFile(file: File): Promise<DeckRecord> {
    const text = await file.text();

    if (file.name.endsWith('.json') || file.name.endsWith('.deck.json')) {
      const deck = deserializeDeck(text);
      this.decks.set(deck.id, deck);
      return deck;
    }

    const { arenaTextToDeckRecord } = await import('../utils/deckArena');
    const baseName = file.name.replace(/\.[^.]+$/, '') || 'Imported Deck';
    const deck = arenaTextToDeckRecord(text, { name: baseName });
    this.decks.set(deck.id, deck);
    return deck;
  }

  exportDeckToFile(deck: DeckRecord): void {
    downloadJson(deck);
  }

  async rescan(): Promise<DeckSummary[]> {
    return this.listDecks();
  }
}

// Download helper

function downloadJson(deck: DeckRecord): void {
  const json = serializeDeck(deck);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${deck.name.replace(/[^a-zA-Z0-9 _-]/g, '')}.deck.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Factory

let instance: DeckStorage | null = null;

export function getDeckStorage(): DeckStorage {
  if (instance) return instance;

  if (isFileSystemAccessSupported()) {
    instance = new FolderDeckStorage();
  } else {
    instance = new FallbackDeckStorage();
  }

  return instance;
}

/** Reset the singleton (for testing). */
export function resetDeckStorage(): void {
  instance = null;
}
