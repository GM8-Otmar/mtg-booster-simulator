/**
 * File System Access API wrapper for deck storage.
 *
 * Handles folder selection, permission management, and file I/O.
 * Folder handles are persisted in IndexedDB so the user doesn't
 * have to re-select the folder on every visit.
 *
 * When the File System Access API is unavailable (Firefox, older browsers),
 * this module gracefully reports 'fallback' capability.
 */

// ── Capability detection ─────────────────────────────────────────────────────

export function isFileSystemAccessSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'showDirectoryPicker' in window
  );
}

// ── IndexedDB handle persistence ─────────────────────────────────────────────

const IDB_NAME = 'mtg-deck-storage';
const IDB_STORE = 'handles';
const HANDLE_KEY = 'deck-folder';

function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const request = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await openIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // Ignore cleanup errors
  }
}

// ── Permission management ────────────────────────────────────────────────────

export async function verifyPermission(
  handle: FileSystemDirectoryHandle,
  mode: 'read' | 'readwrite' = 'readwrite',
): Promise<boolean> {
  const options = { mode } as FileSystemHandlePermissionDescriptor;

  // Check current permission
  if ((await handle.queryPermission(options)) === 'granted') {
    return true;
  }

  // Request permission
  if ((await handle.requestPermission(options)) === 'granted') {
    return true;
  }

  return false;
}

// ── Folder picker ────────────────────────────────────────────────────────────

export async function pickDeckFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFileSystemAccessSupported()) return null;

  try {
    const handle = await window.showDirectoryPicker({
      id: 'mtg-decks',
      mode: 'readwrite',
      startIn: 'documents',
    });
    await saveDirectoryHandle(handle);
    return handle;
  } catch {
    // User cancelled or error
    return null;
  }
}

// ── File operations ──────────────────────────────────────────────────────────

const DECK_FILE_SUFFIX = '.deck.json';

export function isDeckFile(name: string): boolean {
  return name.endsWith(DECK_FILE_SUFFIX);
}

export function deckFileName(id: string): string {
  return `${id}${DECK_FILE_SUFFIX}`;
}

export function deckIdFromFileName(name: string): string {
  return name.slice(0, -DECK_FILE_SUFFIX.length);
}

export async function listDeckFiles(
  dir: FileSystemDirectoryHandle,
): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file' && isDeckFile(name)) {
      names.push(name);
    }
  }
  return names.sort();
}

export async function readDeckFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<string> {
  const fileHandle = await dir.getFileHandle(fileName);
  const file = await fileHandle.getFile();
  return file.text();
}

export async function writeDeckFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
  content: string,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();
}

export async function deleteDeckFile(
  dir: FileSystemDirectoryHandle,
  fileName: string,
): Promise<void> {
  await dir.removeEntry(fileName);
}
