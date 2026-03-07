import { useState } from 'react';
import { useGameTable } from '../../contexts/GameTableContext';
import { parseArenaFormat, deckCardCount } from '../../utils/deckImport';
import type { Player } from '../../types/sealed';

interface DeckImportModalProps {
  onClose: () => void;
  /** Pass a sealed pool player to enable "Load from pool" button */
  sealedPlayer?: Player | null;
}

type Tab = 'full' | 'commander';

export default function DeckImportModal({ onClose, sealedPlayer }: DeckImportModalProps) {
  const { importDeck, importCommander, loading, error } = useGameTable();
  const [activeTab, setActiveTab] = useState<Tab>('full');

  // ── Full Deck tab state ─────────────────────────────────────────────────
  const [deckText, setDeckText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ mainboard: number; commander: string | null } | null>(null);

  // ── Commander tab state ─────────────────────────────────────────────────
  const [commanderName, setCommanderName] = useState('');
  const [cmdError, setCmdError] = useState<string | null>(null);

  const handleTextChange = (text: string) => {
    setDeckText(text);
    setParseError(null);
    setPreview(null);

    if (!text.trim()) return;

    try {
      const parsed = parseArenaFormat(text);
      const count = deckCardCount(parsed);
      if (count === 0 && !parsed.commander) {
        setParseError('No cards found. Paste Arena-format deck list.');
        return;
      }
      setPreview({ mainboard: count, commander: parsed.commander });
    } catch {
      setParseError('Could not parse deck. Use Arena export format.');
    }
  };

  const handleLoadFromPool = () => {
    if (!sealedPlayer) return;
    const lines: string[] = [];

    // Commander section
    if (sealedPlayer.selectedLegend) {
      lines.push('Commander');
      lines.push(`1 ${sealedPlayer.selectedLegend.name}`);
      lines.push('');
    }

    // Deck section — all pool cards
    lines.push('Deck');
    for (const card of sealedPlayer.pool) {
      if (!sealedPlayer.selectedLegend || card.id !== sealedPlayer.selectedLegend.id) {
        lines.push(`1 ${card.name}`);
      }
    }

    handleTextChange(lines.join('\n'));
  };

  const handleImport = async () => {
    if (!deckText.trim()) return;
    setParseError(null);

    let parsed;
    try {
      parsed = parseArenaFormat(deckText);
      if (deckCardCount(parsed) === 0 && !parsed.commander) {
        setParseError('No cards found.');
        return;
      }
    } catch {
      setParseError('Parse error.');
      return;
    }

    try {
      await importDeck(parsed);
      onClose();
    } catch {
      // error shown via context
    }
  };

  const handleImportCommander = async () => {
    const name = commanderName.trim();
    if (!name) return;
    setCmdError(null);
    try {
      await importCommander(name);
      onClose();
    } catch {
      setCmdError('Failed to import commander. Check the card name and try again.');
    }
  };

  const tabClass = (tab: Tab) =>
    `flex-1 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
      activeTab === tab
        ? 'bg-navy-light text-cyan border-b-2 border-cyan'
        : 'text-cream-muted hover:text-cream'
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-navy rounded-2xl border border-cyan-dim w-full max-w-xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-dim">
          <h2 className="text-xl font-bold text-cream">Import Deck</h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 pt-2 gap-1 border-b border-cyan-dim/30">
          <button className={tabClass('full')} onClick={() => setActiveTab('full')}>
            Import Full Deck
          </button>
          <button className={tabClass('commander')} onClick={() => setActiveTab('commander')}>
            Add Commander
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {activeTab === 'full' && (
            <>
              {sealedPlayer && (
                <button
                  onClick={handleLoadFromPool}
                  className="w-full py-2 bg-magenta/20 hover:bg-magenta/30 border border-magenta/50 rounded-lg text-magenta font-semibold text-sm transition-all"
                >
                  Load Sealed Pool ({sealedPlayer.pool.length} cards)
                  {sealedPlayer.selectedLegend && ` — Commander: ${sealedPlayer.selectedLegend.name}`}
                </button>
              )}

              <div>
                <label className="block text-sm text-cream-muted mb-1">
                  Paste Arena deck list
                </label>
                <textarea
                  value={deckText}
                  onChange={e => handleTextChange(e.target.value)}
                  placeholder={`Commander\n1 Atraxa, Praetors' Voice\n\nDeck\n1 Sol Ring\n3 Llanowar Elves\n...`}
                  rows={14}
                  spellCheck={false}
                  className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm font-mono placeholder-cream-muted/40 focus:outline-none focus:border-cyan resize-none"
                />
              </div>

              {parseError && (
                <p className="text-red-400 text-sm">{parseError}</p>
              )}

              {preview && (
                <div className="bg-navy-light rounded-lg p-3 border border-cyan-dim text-sm space-y-1">
                  {preview.commander && (
                    <p className="text-magenta font-semibold">Commander: {preview.commander}</p>
                  )}
                  <p className="text-cream-muted">
                    Mainboard: <span className="text-cream font-bold">{preview.mainboard}</span> cards
                  </p>
                  {!preview.commander && (
                    <p className="text-yellow-400 text-xs">
                      No commander found. Use the "Add Commander" tab to add one separately.
                    </p>
                  )}
                  <p className="text-cyan text-xs">
                    Cards will be resolved via Scryfall — may take a moment for large decks.
                  </p>
                </div>
              )}
            </>
          )}

          {activeTab === 'commander' && (
            <>
              <p className="text-cream-muted text-sm">
                Add a commander to the command zone. If one already exists, it will be replaced.
              </p>

              <div>
                <label className="block text-sm text-cream-muted mb-1">
                  Commander card name
                </label>
                <input
                  type="text"
                  value={commanderName}
                  onChange={e => { setCommanderName(e.target.value); setCmdError(null); }}
                  placeholder="Atraxa, Praetors' Voice"
                  spellCheck={false}
                  className="w-full bg-navy-light border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 focus:outline-none focus:border-cyan"
                  onKeyDown={e => { if (e.key === 'Enter') handleImportCommander(); }}
                />
              </div>

              {cmdError && (
                <p className="text-red-400 text-sm">{cmdError}</p>
              )}

              <p className="text-cyan text-xs">
                The card will be resolved via Scryfall and placed in the command zone.
              </p>
            </>
          )}

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-cyan-dim">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-cyan-dim text-cream-muted hover:text-cream transition-colors"
          >
            Cancel
          </button>

          {activeTab === 'full' ? (
            <button
              onClick={handleImport}
              disabled={loading || !deckText.trim() || !!parseError}
              className="flex-1 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Importing...' : 'Import & Shuffle'}
            </button>
          ) : (
            <button
              onClick={handleImportCommander}
              disabled={loading || !commanderName.trim()}
              className="flex-1 py-2 bg-magenta hover:bg-magenta/90 rounded-lg font-bold text-navy disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Adding...' : 'Add Commander'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
