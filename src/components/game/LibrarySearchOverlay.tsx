/**
 * LibrarySearchOverlay — modal to search and retrieve a specific card from the library.
 * Searches by card name (case-insensitive substring match).
 * Clicking a result sends the card to hand. Player can shuffle separately.
 */
import { useEffect, useRef, useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface LibrarySearchOverlayProps {
  onClose: () => void;
}

function scoreMatch(name: string, query: string): number {
  const n = name.toLowerCase();
  const q = query.toLowerCase();
  if (n === q) return 3;
  if (n.startsWith(q)) return 2;
  if (n.includes(q)) return 1;
  return 0;
}

export default function LibrarySearchOverlay({ onClose }: LibrarySearchOverlayProps) {
  const { room, myPlayer, changeZone, shuffleLibrary } = useGameTable();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!room || !myPlayer) return null;

  // Build list of library cards with match scores
  const libraryCards: (BattlefieldCard & { score: number })[] = myPlayer.libraryCardIds
    .map(id => room.cards[id])
    .filter((c): c is BattlefieldCard => c != null)
    .map(card => ({ ...card, score: query.trim() ? scoreMatch(card.name, query.trim()) : 1 }))
    .filter(c => !query.trim() || c.score > 0)
    .sort((a, b) => b.score - a.score);

  const handleSendToHand = (instanceId: string) => {
    changeZone(instanceId, 'hand');
    onClose();
  };

  const handleSendToTop = (instanceId: string) => {
    changeZone(instanceId, 'library', 0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-navy border border-cyan-dim rounded-2xl shadow-2xl w-96 max-h-[80vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-dim/30 shrink-0">
          <h2 className="font-bold text-cream text-sm">Find in Library</h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="px-4 py-3 border-b border-cyan-dim/20 shrink-0">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by card name…"
            className="w-full bg-navy-light border border-cyan-dim/50 rounded-lg px-3 py-2 text-cream text-sm placeholder:text-cream-muted/40 focus:outline-none focus:border-cyan"
          />
          <p className="text-cream-muted/40 text-[10px] mt-1.5">
            {myPlayer.libraryCardIds.length} cards in library
            {query.trim() ? ` · ${libraryCards.length} match${libraryCards.length !== 1 ? 'es' : ''}` : ''}
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {libraryCards.length === 0 ? (
            <div className="flex items-center justify-center py-10">
              <p className="text-cream-muted/40 text-sm">No cards match</p>
            </div>
          ) : (
            <div className="py-1">
              {libraryCards.map((card, i) => (
                <div
                  key={`${card.instanceId}-${i}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-navy-light group"
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 w-8 h-11 rounded overflow-hidden border border-cyan-dim/30">
                    {card.imageUri ? (
                      <img
                        src={card.imageUri}
                        alt={card.name}
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full bg-navy-light flex items-center justify-center">
                        <span className="text-[6px] text-cream-muted text-center leading-tight px-0.5">{card.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <span className="flex-1 text-cream text-sm truncate">{card.name}</span>

                  {/* Actions — shown on hover */}
                  <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleSendToTop(card.instanceId)}
                      className="text-[10px] px-2 py-0.5 rounded border border-cyan-dim text-cream-muted hover:text-cream hover:border-cyan transition-colors"
                      title="Send to top of library"
                    >
                      Top
                    </button>
                    <button
                      onClick={() => handleSendToHand(card.instanceId)}
                      className="text-[10px] px-2 py-0.5 rounded bg-cyan/20 border border-cyan-dim text-cyan hover:bg-cyan/30 transition-colors"
                      title="Send to hand"
                    >
                      Hand
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: shuffle button */}
        <div className="px-4 py-3 border-t border-cyan-dim/20 shrink-0 flex justify-between items-center">
          <span className="text-cream-muted/40 text-[10px]">Actions close the search</span>
          <button
            onClick={() => { shuffleLibrary(); onClose(); }}
            className="text-xs px-3 py-1.5 bg-navy-light hover:bg-navy border border-cyan-dim rounded-lg text-cream-muted hover:text-cream transition-all"
          >
            Shuffle &amp; Close
          </button>
        </div>
      </div>
    </div>
  );
}
