/**
 * TokenCreatorModal — custom token creator with Scryfall art picker.
 * Fields: name, type line, P/T (creature only), colors, count, art search.
 * Art picker queries Scryfall `is:token name:{query}` and shows thumbnails.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import type { TokenTemplate } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface TokenCreatorModalProps {
  onClose: () => void;
}

interface ArtResult {
  id: string;
  name: string;
  imageUri: string;
}

const COLORS = [
  { id: 'W', label: 'White', cls: 'bg-amber-50 border-amber-300 text-amber-900' },
  { id: 'U', label: 'Blue',  cls: 'bg-blue-600  border-blue-400  text-white'     },
  { id: 'B', label: 'Black', cls: 'bg-zinc-900  border-zinc-600  text-white'     },
  { id: 'R', label: 'Red',   cls: 'bg-red-600   border-red-400   text-white'     },
  { id: 'G', label: 'Green', cls: 'bg-green-700 border-green-500 text-white'     },
];

export default function TokenCreatorModal({ onClose }: TokenCreatorModalProps) {
  const { createToken } = useGameTable();

  const [name, setName]           = useState('');
  const [typeLine, setTypeLine]   = useState('Token Creature — ');
  const [power, setPower]         = useState('1');
  const [toughness, setToughness] = useState('1');
  const [colors, setColors]       = useState<string[]>([]);
  const [count, setCount]         = useState(1);

  // Art picker
  const [artQuery, setArtQuery]                 = useState('');
  const [artResults, setArtResults]             = useState<ArtResult[]>([]);
  const [artLoading, setArtLoading]             = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const artTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isCreature = typeLine.toLowerCase().includes('creature');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const fetchArt = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) { setArtResults([]); return; }
    setArtLoading(true);
    try {
      const url = `https://api.scryfall.com/cards/search?q=is%3Atoken+name%3A${encodeURIComponent(trimmed)}&unique=cards&order=name`;
      const r = await fetch(url);
      if (!r.ok) { setArtResults([]); return; }
      const data = await r.json();
      type ScryfallCard = {
        id: string;
        name: string;
        image_uris?: { small?: string };
        card_faces?: { image_uris?: { small?: string } }[];
      };
      const results: ArtResult[] = (data.data ?? [])
        .map((c: ScryfallCard) => ({
          id: c.id,
          name: c.name,
          imageUri:
            c.image_uris?.small ??
            c.card_faces?.[0]?.image_uris?.small ??
            '',
        }))
        .filter((c: ArtResult) => c.imageUri)
        .slice(0, 20);
      setArtResults(results);
    } catch {
      setArtResults([]);
    } finally {
      setArtLoading(false);
    }
  }, []);

  // Debounce art search
  useEffect(() => {
    if (artTimerRef.current) clearTimeout(artTimerRef.current);
    artTimerRef.current = setTimeout(() => fetchArt(artQuery), 400);
    return () => { if (artTimerRef.current) clearTimeout(artTimerRef.current); };
  }, [artQuery, fetchArt]);

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleCreate = () => {
    const template: TokenTemplate = {
      name: name.trim() || 'Token',
      typeLine: typeLine.trim(),
      power: isCreature ? power : '0',
      toughness: isCreature ? toughness : '0',
      colors,
      imageUri: selectedImageUri ?? undefined,
    };
    for (let i = 0; i < count; i++) {
      const ox = (Math.random() - 0.5) * 14;
      const oy = (Math.random() - 0.5) * 10;
      createToken(template, Math.max(4, Math.min(96, 50 + ox)), Math.max(4, Math.min(96, 50 + oy)));
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-navy border border-cyan-dim rounded-2xl shadow-2xl w-[460px] max-h-[88vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-dim/30 shrink-0">
          <h2 className="font-bold text-cream text-sm">Create Custom Token</h2>
          <button
            onClick={onClose}
            className="text-cream-muted hover:text-cream transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Form body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Name */}
          <div>
            <label className="label-xs">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Goblin"
              autoFocus
              className="field"
            />
          </div>

          {/* Type line */}
          <div>
            <label className="label-xs">Type Line</label>
            <input
              type="text"
              value={typeLine}
              onChange={e => setTypeLine(e.target.value)}
              placeholder="Token Creature — Goblin"
              className="field"
            />
          </div>

          {/* P/T (creature only) */}
          {isCreature && (
            <div>
              <label className="label-xs">Power / Toughness</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={power}
                  onChange={e => setPower(e.target.value)}
                  placeholder="*"
                  className="field w-16 text-center"
                />
                <span className="text-cream-muted font-bold text-lg">/</span>
                <input
                  type="text"
                  value={toughness}
                  onChange={e => setToughness(e.target.value)}
                  placeholder="*"
                  className="field w-16 text-center"
                />
              </div>
            </div>
          )}

          {/* Colors */}
          <div>
            <label className="label-xs">Colors</label>
            <div className="flex gap-2 items-center">
              {COLORS.map(({ id, label, cls }) => (
                <button
                  key={id}
                  title={label}
                  onClick={() => toggleColor(id)}
                  className={`w-8 h-8 rounded-full border-2 text-xs font-bold transition-all
                    ${colors.includes(id)
                      ? `${cls} ring-2 ring-cyan scale-110`
                      : 'bg-navy-light border-cyan-dim/30 text-cream-muted/50 hover:border-cyan-dim'
                    }`}
                >
                  {id}
                </button>
              ))}
              {colors.length > 0 && (
                <button
                  onClick={() => setColors([])}
                  className="text-[10px] text-cream-muted/40 hover:text-cream-muted ml-0.5"
                >
                  clear
                </button>
              )}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="label-xs">Count</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCount(c => Math.max(1, c - 1))}
                className="w-8 h-8 rounded-lg bg-navy-light border border-cyan-dim/50 text-cream hover:bg-navy hover:border-cyan transition-colors flex items-center justify-center text-xl font-bold leading-none"
              >
                −
              </button>
              <span className="text-cream font-mono text-sm w-8 text-center">{count}</span>
              <button
                onClick={() => setCount(c => Math.min(20, c + 1))}
                className="w-8 h-8 rounded-lg bg-navy-light border border-cyan-dim/50 text-cream hover:bg-navy hover:border-cyan transition-colors flex items-center justify-center text-xl font-bold leading-none"
              >
                +
              </button>
            </div>
          </div>

          {/* Art picker */}
          <div>
            <label className="label-xs">Token Art (optional)</label>
            <input
              type="text"
              value={artQuery}
              onChange={e => setArtQuery(e.target.value)}
              placeholder="Search Scryfall token art…"
              className="field mb-2"
            />

            {artLoading && (
              <p className="text-cyan/40 text-[11px] animate-pulse">Searching…</p>
            )}

            {!artLoading && artResults.length > 0 && (
              <div className="grid grid-cols-5 gap-1.5">
                {/* "No art" tile */}
                <button
                  onClick={() => setSelectedImageUri(null)}
                  title="No art"
                  className={`rounded border-2 flex items-center justify-center text-[9px] text-cream-muted/40 transition-all
                    ${selectedImageUri === null ? 'border-cyan bg-cyan/10' : 'border-cyan-dim/20 hover:border-cyan-dim'}`}
                  style={{ aspectRatio: '63/88' }}
                >
                  ✕
                </button>

                {artResults.map(art => (
                  <button
                    key={art.id}
                    title={art.name}
                    onClick={() => setSelectedImageUri(art.imageUri)}
                    className={`rounded border-2 overflow-hidden transition-all
                      ${selectedImageUri === art.imageUri
                        ? 'border-cyan ring-1 ring-cyan'
                        : 'border-cyan-dim/20 hover:border-cyan-dim'
                      }`}
                    style={{ aspectRatio: '63/88' }}
                  >
                    <img
                      src={art.imageUri}
                      alt={art.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {!artLoading && artQuery.trim() && artResults.length === 0 && (
              <p className="text-cream-muted/40 text-[11px]">No token art found</p>
            )}
            {selectedImageUri && (
              <p className="text-cyan/60 text-[10px] mt-1.5">✓ Art selected</p>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-cyan-dim/20 shrink-0 flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg bg-navy-light border border-cyan-dim/30 text-cream-muted hover:text-cream transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 px-4 py-1.5 text-xs font-bold rounded-lg bg-magenta/80 hover:bg-magenta border border-magenta/60 text-white disabled:opacity-40 transition-all"
          >
            {count > 1 ? `Create ${count}× ` : 'Create '}{name.trim() || 'Token'}
          </button>
        </div>
      </div>

      {/* Scoped utility styles for this modal */}
      <style>{`
        .label-xs { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: rgba(210,200,180,0.5); margin-bottom: 4px; }
        .field { width: 100%; background: #1a2540; border: 1px solid rgba(0,200,220,0.3); border-radius: 8px; padding: 6px 12px; color: #e8dfc8; font-size: 13px; outline: none; }
        .field::placeholder { color: rgba(210,200,180,0.3); }
        .field:focus { border-color: #00d4e0; }
      `}</style>
    </div>
  );
}
