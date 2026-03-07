import { useEffect, useRef, useState } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import CardContextMenu from './CardContextMenu';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

interface GraveyardPileProps {
  cards: BattlefieldCard[];
  label?: string;
  borderColor?: string;
  dropZone?: string;
  enableModal?: boolean;
  onTopCardToBattlefield?: (card: BattlefieldCard) => void;
}

const BULK_ZONES: { label: string; zone: GameZone; toIndex?: number }[] = [
  { label: 'Battlefield', zone: 'battlefield' },
  { label: 'Hand', zone: 'hand' },
  { label: 'Graveyard', zone: 'graveyard' },
  { label: 'Exile', zone: 'exile' },
  { label: 'Library (top)', zone: 'library', toIndex: 0 },
  { label: 'Library (bottom)', zone: 'library' },
];

export default function GraveyardPile({
  cards,
  label = 'GY',
  borderColor = 'border-cyan-dim/60',
  dropZone = 'graveyard',
  enableModal = true,
  onTopCardToBattlefield,
}: GraveyardPileProps) {
  const { changeZone } = useGameTable();
  const { hoverInspect, clearHoverInspect } = useCardInspector();
  const [expanded, setExpanded] = useState(false);
  const [menuInfo, setMenuInfo] = useState<{ card: BattlefieldCard; x: number; y: number } | null>(null);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [topDrag, setTopDrag] = useState<{
    instanceId: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const topCard = cards[cards.length - 1] ?? null;

  const toggleCheck = (id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (checkedIds.size === cards.length) {
      setCheckedIds(new Set());
    } else {
      setCheckedIds(new Set(cards.map(c => c.instanceId)));
    }
  };

  const sendAllTo = (zone: GameZone, toIndex?: number) => {
    cards.filter(c => checkedIds.has(c.instanceId)).forEach(c => changeZone(c.instanceId, zone, toIndex));
    setCheckedIds(new Set());
    setExpanded(false);
  };

  const onClose = () => {
    setExpanded(false);
    setCheckedIds(new Set());
  };

  // Zones shown in the bulk bar — exclude the zone this pile represents
  const bulkZones = BULK_ZONES.filter(z => z.zone !== dropZone);

  const moveTopToBattlefield = () => {
    if (!topCard) return;
    if (onTopCardToBattlefield) {
      onTopCardToBattlefield(topCard);
    } else {
      changeZone(topCard.instanceId, 'battlefield');
    }
  };

  useEffect(() => {
    if (!topDrag) return;

    const clearZoneHighlights = () => {
      document.querySelectorAll('[data-drop-zone]').forEach(el => {
        (el as HTMLElement).style.outline = '';
      });
    };

    const onMove = (e: PointerEvent) => {
      setTopDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
      const dx = e.clientX - topDrag.startX;
      const dy = e.clientY - topDrag.startY;
      if (Math.sqrt(dx * dx + dy * dy) < 4) return;
      clearZoneHighlights();
      const hits = document.elementsFromPoint(e.clientX, e.clientY);
      const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
      if (zoneEl) {
        zoneEl.style.outline = '3px solid rgba(0, 220, 255, 0.85)';
      }
    };

    const onUp = (e: PointerEvent) => {
      const dx = e.clientX - topDrag.startX;
      const dy = e.clientY - topDrag.startY;
      const moved = Math.sqrt(dx * dx + dy * dy) >= 4;
      clearZoneHighlights();
      if (moved) {
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        const zoneEl = hits.find(el => (el as HTMLElement).dataset?.dropZone) as HTMLElement | undefined;
        if (zoneEl) {
          const zone = zoneEl.dataset.dropZone as GameZone;
          if (zone === 'battlefield') {
            // Calculate position relative to the battlefield
            const bfEl = zoneEl;
            const bfRect = bfEl.getBoundingClientRect();
            const bfX = Math.max(5, Math.min(95, ((e.clientX - bfRect.left) / bfRect.width) * 100));
            const bfY = Math.max(5, Math.min(95, ((e.clientY - bfRect.top) / bfRect.height) * 100));
            changeZone(topDrag.instanceId, 'battlefield', undefined, bfX, bfY);
          } else {
            changeZone(topDrag.instanceId, zone, zone === 'library' ? 0 : undefined);
          }
        }
        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
      setTopDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      clearZoneHighlights();
    };
  }, [topDrag, changeZone]);

  return (
    <div
      className="flex flex-col items-center gap-1"
      data-drop-zone={dropZone}
    >
      {/* Pile face */}
      <div
        className={`relative w-16 h-[90px] rounded-md border-2 ${borderColor} ${topCard ? 'cursor-grab' : 'cursor-pointer'} overflow-hidden shadow-md`}
        onDragStart={e => e.preventDefault()}
        onPointerDown={e => {
          if (!topCard || e.button !== 0) return;
          setTopDrag({
            instanceId: topCard.instanceId,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
          });
        }}
        onClick={() => {
          if (suppressClickRef.current) return;
          if (!enableModal || cards.length === 0) return;
          setExpanded(v => !v);
        }}
        onDoubleClick={() => moveTopToBattlefield()}
        onContextMenu={e => {
          if (!topCard) return;
          e.preventDefault();
          e.stopPropagation();
          setMenuInfo({ card: topCard, x: e.clientX, y: e.clientY });
        }}
        onMouseEnter={() => {
          if (!topCard) return;
          hoverInspect({ name: topCard.name, imageUri: topCard.imageUri ?? null, instanceId: topCard.instanceId });
        }}
        onMouseLeave={clearHoverInspect}
        title={`${label} — ${cards.length} card${cards.length !== 1 ? 's' : ''}${topCard ? ' · double-click: top to battlefield' : ''}`}
      >
        {topCard?.imageUri ? (
          <img
            src={topCard.imageUri}
            alt={topCard.name}
            className="w-full h-full object-cover"
            draggable={false}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="w-full h-full bg-navy-light flex items-center justify-center">
            <span className="text-cream-muted/50 text-xs">{cards.length}</span>
          </div>
        )}
        {cards.length > 1 && (
          <div className="absolute top-1 right-1 bg-black/60 rounded-full px-1.5 text-[9px] text-cream font-bold">
            {cards.length}
          </div>
        )}
      </div>
      <p className="text-[10px] text-cream-muted">{label} ({cards.length})</p>

      {/* Expanded list */}
      {enableModal && expanded && cards.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={onClose}
        >
          <div
            className="bg-navy rounded-xl border border-cyan-dim p-4 w-80 max-h-[70vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {/* Select-all checkbox */}
                <input
                  type="checkbox"
                  checked={checkedIds.size === cards.length && cards.length > 0}
                  ref={el => {
                    if (el) el.indeterminate = checkedIds.size > 0 && checkedIds.size < cards.length;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                />
                <h3 className="font-bold text-cream">{label} ({cards.length})</h3>
              </div>
              <button onClick={onClose} className="text-cream-muted hover:text-cream text-lg">✕</button>
            </div>

            {/* Card list */}
            <div className="overflow-y-auto space-y-1 flex-1">
              {[...cards].reverse().map(card => (
                <div
                  key={card.instanceId}
                  className={`flex items-center gap-2 p-1.5 rounded transition-colors cursor-pointer
                    ${checkedIds.has(card.instanceId) ? 'bg-cyan-dim/20' : 'hover:bg-navy-light'}`}
                  onClick={() => toggleCheck(card.instanceId)}
                  onContextMenu={e => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuInfo({ card, x: e.clientX, y: e.clientY });
                  }}
                  onMouseEnter={() => hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
                  onMouseLeave={() => clearHoverInspect()}
                >
                  <input
                    type="checkbox"
                    checked={checkedIds.has(card.instanceId)}
                    onChange={() => toggleCheck(card.instanceId)}
                    onClick={e => e.stopPropagation()}
                    className="w-4 h-4 rounded accent-cyan-400 cursor-pointer flex-shrink-0"
                  />
                  {card.imageUri && (
                    <img
                      src={card.imageUri}
                      alt={card.name}
                      className="w-8 h-11 object-cover rounded flex-shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="text-sm text-cream truncate">{card.name}</span>
                </div>
              ))}
            </div>

            {/* Bulk action bar — shown when cards are checked */}
            {checkedIds.size > 0 && (
              <div className="mt-3 pt-3 border-t border-cyan-dim/30">
                <p className="text-[10px] text-cream-muted uppercase tracking-widest mb-2">
                  Send {checkedIds.size} selected to…
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {bulkZones.map(z => (
                    <button
                      key={`${z.zone}-${z.toIndex ?? 'end'}`}
                      onClick={() => sendAllTo(z.zone, z.toIndex)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-navy-light hover:bg-cyan-dim/30 border border-cyan-dim/50 text-cream hover:text-cyan transition-colors"
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {menuInfo && (
        <CardContextMenu
          card={menuInfo.card}
          x={menuInfo.x}
          y={menuInfo.y}
          onClose={() => setMenuInfo(null)}
        />
      )}

      {topDrag && topCard && (
        <div
          className="fixed z-[12000] pointer-events-none w-16 h-[90px] rounded-md border-2 border-cyan shadow-2xl overflow-hidden opacity-90"
          style={{ left: topDrag.x - 32, top: topDrag.y - 45 }}
        >
          {topCard.imageUri ? (
            <img
              src={topCard.imageUri}
              alt={topCard.name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
              <span className="text-[9px] text-cream text-center">{topCard.name}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
