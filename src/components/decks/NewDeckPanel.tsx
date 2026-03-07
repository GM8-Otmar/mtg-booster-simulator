import { useState } from 'react';
import { useDeckLibrary } from '../../contexts/DeckLibraryContext';
import type { DeckFormat, DeckRecord } from '../../types/deck';

interface NewDeckPanelProps {
  onCreated: (deck: DeckRecord) => void;
  onCancel: () => void;
}

type CreationMode = 'manual' | 'arena';

export default function NewDeckPanel({ onCreated, onCancel }: NewDeckPanelProps) {
  const { createDeck, importArenaText } = useDeckLibrary();
  const [name, setName] = useState('');
  const [format, setFormat] = useState<DeckFormat>('commander');
  const [mode, setMode] = useState<CreationMode>('manual');
  const [arenaText, setArenaText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'manual') {
        const deck = await createDeck(name.trim() || 'Untitled Deck', format);
        onCreated(deck);
        return;
      }

      if (!arenaText.trim()) {
        setError('Paste an Arena-format deck list first.');
        return;
      }

      const deck = await importArenaText(arenaText, name.trim() || undefined, format);
      onCreated(deck);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create deck');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (value: CreationMode) =>
    `flex-1 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
      mode === value
        ? 'bg-navy-light text-cyan border-b-2 border-cyan'
        : 'text-cream-muted hover:text-cream'
    }`;

  return (
    <div className="bg-navy rounded-2xl border border-cyan-dim w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-dim">
        <h2 className="text-xl font-bold text-cream">New Deck</h2>
        <button onClick={onCancel} className="text-cream-muted hover:text-cream text-xl">
          x
        </button>
      </div>

      <div className="flex px-6 pt-2 gap-1 border-b border-cyan-dim/30">
        <button className={tabClass('manual')} onClick={() => setMode('manual')}>
          Build Manually
        </button>
        <button className={tabClass('arena')} onClick={() => setMode('arena')}>
          Import Arena-Format Deck
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-cream-muted mb-1">Deck Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="My Deck"
              className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
            />
          </div>

          <div>
            <label className="block text-sm text-cream-muted mb-1">Format</label>
            <select
              value={format}
              onChange={e => setFormat(e.target.value as DeckFormat)}
              className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-cyan"
            >
              <option value="commander">Commander</option>
              <option value="limited">Limited / Sealed</option>
              <option value="free">Freeform</option>
              <option value="modern">Modern</option>
              <option value="standard">Standard</option>
              <option value="legacy">Legacy</option>
              <option value="vintage">Vintage</option>
              <option value="pauper">Pauper</option>
            </select>
          </div>
        </div>

        {mode === 'manual' ? (
          <div className="bg-navy-light rounded-lg p-4 border border-cyan-dim space-y-2">
            <p className="text-cream text-sm font-semibold">Manual Deckbuilding</p>
            <p className="text-cream-muted text-sm">
              Start with an empty deck, then use the builder to search Scryfall-backed card data, choose a commander,
              and add or remove cards manually.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm text-cream-muted mb-1">Paste Arena deck list</label>
            <textarea
              value={arenaText}
              onChange={e => setArenaText(e.target.value)}
              placeholder={`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n3 Llanowar Elves\n...`}
              rows={12}
              spellCheck={false}
              className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm font-mono placeholder-cream-muted/40 focus:outline-none focus:border-cyan resize-none"
            />
            <p className="text-cyan text-xs">
              The imported deck opens in the builder afterward so you can edit cards, commander choice, and printings.
            </p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="flex gap-3 px-6 py-4 border-t border-cyan-dim">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-cyan-dim text-cream-muted hover:text-cream transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          disabled={loading || (mode === 'arena' && !arenaText.trim())}
          className="flex-1 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Creating...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
