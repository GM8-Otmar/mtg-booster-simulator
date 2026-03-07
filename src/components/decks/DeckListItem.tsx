/**
 * Individual deck card in the library grid.
 */

import { useState } from 'react';
import type { DeckSummary } from '../../types/deck';

interface DeckListItemProps {
  deck: DeckSummary;
  onOpen: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onDuplicate: (deckId: string) => void;
  onRename: (deckId: string, newName: string) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  commander: 'Commander',
  standard: 'Standard',
  modern: 'Modern',
  legacy: 'Legacy',
  vintage: 'Vintage',
  pauper: 'Pauper',
  limited: 'Limited',
  free: 'Free',
};

export default function DeckListItem({
  deck,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
}: DeckListItemProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(deck.name);
  const [showMenu, setShowMenu] = useState(false);

  const handleRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== deck.name) {
      onRename(deck.id, trimmed);
    }
    setEditing(false);
  };

  const relativeTime = (() => {
    const diff = Date.now() - new Date(deck.updatedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(deck.updatedAt).toLocaleDateString();
  })();

  const coverInitial = deck.commanderNames[0]?.[0] ?? deck.name[0] ?? 'D';

  return (
    <div className="group bg-navy-light rounded-xl overflow-hidden border border-cyan-dim hover:border-cyan transition-all relative">
      <button
        type="button"
        onClick={() => onOpen(deck.id)}
        className="block w-full text-left"
      >
        <div className="h-36 bg-navy relative overflow-hidden">
          {deck.coverImageUri ? (
            <img
              src={deck.coverImageUri}
              alt={deck.commanderNames[0] ?? deck.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.28),_transparent_45%),linear-gradient(135deg,_rgba(15,23,42,1),_rgba(30,41,59,1)_55%,_rgba(168,85,247,0.18))] flex items-center justify-center">
              <span className="text-5xl font-black text-cream/80">{deck.icon ?? coverInitial}</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy via-navy/75 to-transparent px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-cyan/20 text-cyan">
                {FORMAT_LABELS[deck.format] ?? deck.format}
              </span>
              <span className="text-xs text-cream-muted">{relativeTime}</span>
            </div>
            <h3 className="text-cream font-semibold text-sm mt-2 truncate" title={deck.name}>
              {deck.name}
            </h3>
          </div>
        </div>
      </button>

      <div className="p-4">
      {editing ? (
        <input
          type="text"
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={e => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') { setEditing(false); setEditName(deck.name); }
          }}
          autoFocus
          className="w-full bg-navy border border-cyan rounded-md px-2 py-1 text-cream text-sm font-semibold focus:outline-none mb-2"
        />
      ) : null}

      {/* Commander */}
      {deck.commanderNames.length > 0 && (
        <p className="text-magenta text-xs font-medium truncate mb-1" title={deck.commanderNames.join(', ')}>
          {deck.commanderNames.join(' & ')}
        </p>
      )}

      {/* Card count */}
      <p className="text-cream-muted text-xs">
        {deck.cardCount} cards
      </p>

      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => onOpen(deck.id)}
          className="flex-1 py-1.5 bg-cyan hover:bg-cyan/90 rounded-md text-xs font-semibold text-navy transition-colors"
        >
          Edit
        </button>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="px-2 py-1.5 bg-navy hover:bg-navy-light border border-cyan-dim rounded-md text-cream-muted text-xs transition-colors"
          >
            ...
          </button>
          {showMenu && (
            <div className="absolute right-0 bottom-full mb-1 bg-navy-light border border-cyan-dim rounded-lg shadow-xl z-10 py-1 min-w-[120px]">
              <button
                onClick={() => { setShowMenu(false); setEditing(true); setEditName(deck.name); }}
                className="w-full text-left px-3 py-1.5 text-sm text-cream hover:bg-navy transition-colors"
              >
                Rename
              </button>
              <button
                onClick={() => { setShowMenu(false); onDuplicate(deck.id); }}
                className="w-full text-left px-3 py-1.5 text-sm text-cream hover:bg-navy transition-colors"
              >
                Duplicate
              </button>
              <button
                onClick={() => { setShowMenu(false); onDelete(deck.id); }}
                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-navy transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
