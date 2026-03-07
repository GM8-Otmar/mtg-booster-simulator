/**
 * Import panel for the deck library — Arena text paste and file import.
 */

import { useState, useRef } from 'react';
import { useDeckLibrary } from '../../contexts/DeckLibraryContext';
import { parseArenaFormat, deckCardCount } from '../../utils/deckImport';
import type { DeckRecord } from '../../types/deck';

interface DeckImportPanelProps {
  onImported: (deck: DeckRecord) => void;
  onCancel: () => void;
}

type ImportMode = 'arena' | 'file';

export default function DeckImportPanel({ onImported, onCancel }: DeckImportPanelProps) {
  const { importArenaText, importFile } = useDeckLibrary();
  const [mode, setMode] = useState<ImportMode>('arena');
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const preview = (() => {
    if (!text.trim()) return null;
    try {
      const parsed = parseArenaFormat(text);
      const count = deckCardCount(parsed);
      if (count === 0 && !parsed.commander) return null;
      return { mainboard: count, commander: parsed.commander };
    } catch {
      return null;
    }
  })();

  const handleImportArena = async () => {
    if (!text.trim()) return;
    setError(null);
    setImporting(true);
    try {
      const deck = await importArenaText(text, name.trim() || undefined);
      onImported(deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile = async (file: File) => {
    setError(null);
    setImporting(true);
    try {
      const deck = await importFile(file);
      onImported(deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'File import failed');
    } finally {
      setImporting(false);
    }
  };

  const tabClass = (m: ImportMode) =>
    `flex-1 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
      mode === m
        ? 'bg-navy-light text-cyan border-b-2 border-cyan'
        : 'text-cream-muted hover:text-cream'
    }`;

  return (
    <div className="bg-navy rounded-2xl border border-cyan-dim w-full max-w-xl shadow-2xl flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-dim">
        <h2 className="text-xl font-bold text-cream">Import Deck</h2>
        <button onClick={onCancel} className="text-cream-muted hover:text-cream text-xl">
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-6 pt-2 gap-1 border-b border-cyan-dim/30">
        <button className={tabClass('arena')} onClick={() => setMode('arena')}>
          Arena Text
        </button>
        <button className={tabClass('file')} onClick={() => setMode('file')}>
          File Import
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {mode === 'arena' && (
          <>
            <div>
              <label className="block text-sm text-cream-muted mb-1">Deck name (optional)</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My Commander Deck"
                className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
              />
            </div>

            <div>
              <label className="block text-sm text-cream-muted mb-1">Paste Arena deck list</label>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n3 Llanowar Elves\n...`}
                rows={12}
                spellCheck={false}
                className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm font-mono placeholder-cream-muted/40 focus:outline-none focus:border-cyan resize-none"
              />
            </div>

            {preview && (
              <div className="bg-navy-light rounded-lg p-3 border border-cyan-dim text-sm space-y-1">
                {preview.commander && (
                  <p className="text-magenta font-semibold">Commander: {preview.commander}</p>
                )}
                <p className="text-cream-muted">
                  Mainboard: <span className="text-cream font-bold">{preview.mainboard}</span> cards
                </p>
              </div>
            )}
          </>
        )}

        {mode === 'file' && (
          <>
            <p className="text-cream-muted text-sm">
              Import a <code>.deck.json</code> file or an Arena <code>.txt</code> export.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".json,.deck.json,.txt"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="w-full py-3 bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream font-semibold transition-colors"
            >
              {importing ? 'Importing...' : 'Choose File'}
            </button>
          </>
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>

      {/* Footer */}
      {mode === 'arena' && (
        <div className="flex gap-3 px-6 py-4 border-t border-cyan-dim">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg border border-cyan-dim text-cream-muted hover:text-cream transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImportArena}
            disabled={importing || !text.trim()}
            className="flex-1 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {importing ? 'Importing...' : 'Import Deck'}
          </button>
        </div>
      )}
    </div>
  );
}
