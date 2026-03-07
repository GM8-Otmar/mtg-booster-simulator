import { useEffect, useRef, useState } from 'react';
import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import { useCardInspector } from './CardInspectorPanel';

type Dest = 'top' | 'bottom' | 'graveyard';

interface PointerDragState {
  id: string;
  from: Dest;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: boolean;
}

interface ScryOverlayProps {
  cards: BattlefieldCard[];
  instanceIds: string[];
  initialMode?: 'scry' | 'surveil';
}

export default function ScryOverlay({ cards, instanceIds, initialMode = 'scry' }: ScryOverlayProps) {
  const { resolveScry } = useGameTable();
  const { hoverInspect, clearHoverInspect } = useCardInspector();
  const [mode, setMode] = useState<'scry' | 'surveil'>(initialMode);
  const [topIds, setTopIds] = useState<string[]>([...instanceIds]);
  const [bottomIds, setBottomIds] = useState<string[]>([]);
  const [graveyardIds, setGraveyardIds] = useState<string[]>([]);
  const [drag, setDrag] = useState<PointerDragState | null>(null);
  const suppressClickRef = useRef(false);

  const cardMap = Object.fromEntries(cards.map(c => [c.instanceId, c]));

  const getSection = (id: string): Dest =>
    bottomIds.includes(id) ? 'bottom' : graveyardIds.includes(id) ? 'graveyard' : 'top';

  const setterFor = (dest: Dest) =>
    dest === 'top' ? setTopIds : dest === 'bottom' ? setBottomIds : setGraveyardIds;

  const moveToSection = (id: string, dest: Dest) => {
    const from = getSection(id);
    if (from === dest) return;
    setterFor(from)(prev => prev.filter(x => x !== id));
    setterFor(dest)(prev => [...prev, id]);
  };

  const reorderWithin = (id: string, dest: Dest, targetId: string) => {
    setterFor(dest)(prev => {
      const arr = [...prev];
      const fi = arr.indexOf(id);
      const ti = arr.indexOf(targetId);
      if (fi === -1 || ti === -1) return prev;
      arr.splice(fi, 1);
      arr.splice(ti, 0, id);
      return arr;
    });
  };

  const moveBeforeTarget = (id: string, from: Dest, to: Dest, targetId: string) => {
    setterFor(from)(prev => prev.filter(x => x !== id));
    setterFor(to)(prev => {
      const arr = [...prev];
      const ti = arr.indexOf(targetId);
      if (ti === -1) arr.push(id);
      else arr.splice(ti, 0, id);
      return arr;
    });
  };

  // Click cycles: top → bottom → (surveil: graveyard →) top
  const cycleCard = (id: string) => {
    const cur = getSection(id);
    if (cur === 'top') {
      moveToSection(id, 'bottom');
    } else if (cur === 'bottom') {
      moveToSection(id, mode === 'surveil' ? 'graveyard' : 'top');
    } else {
      moveToSection(id, 'top');
    }
  };

  // When mode switches away from surveil, push GY cards back to bottom
  const handleModeChange = (m: 'scry' | 'surveil') => {
    if (m === 'scry' && graveyardIds.length > 0) {
      setBottomIds(prev => [...prev, ...graveyardIds]);
      setGraveyardIds([]);
    }
    setMode(m);
  };

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      const moved = Math.sqrt(dx * dx + dy * dy) >= 4;
      setDrag(prev => prev ? { ...prev, x: e.clientX, y: e.clientY, moved: prev.moved || moved } : prev);
    };

    const onUp = (e: PointerEvent) => {
      const current = drag;
      const moved = current.moved || Math.sqrt((e.clientX - current.startX) ** 2 + (e.clientY - current.startY) ** 2) >= 4;
      if (moved) {
        const hits = document.elementsFromPoint(e.clientX, e.clientY);
        const cardEl = hits.find(el => (el as HTMLElement).dataset?.scryCardId) as HTMLElement | undefined;
        const sectionEl = hits.find(el => (el as HTMLElement).dataset?.scrySection) as HTMLElement | undefined;
        const targetId = cardEl?.dataset.scryCardId;
        const targetDest = cardEl?.dataset.scryDest as Dest | undefined;
        const sectionDest = sectionEl?.dataset.scrySection as Dest | undefined;

        if (targetId && targetDest && targetId !== current.id) {
          if (current.from === targetDest) {
            reorderWithin(current.id, targetDest, targetId);
          } else {
            moveBeforeTarget(current.id, current.from, targetDest, targetId);
          }
        } else if (sectionDest) {
          moveToSection(current.id, sectionDest);
        }

        suppressClickRef.current = true;
        window.setTimeout(() => { suppressClickRef.current = false; }, 0);
      }
      setDrag(null);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag, topIds, bottomIds, graveyardIds]);

  const handleResolve = () => {
    resolveScry(topIds, bottomIds, graveyardIds.length > 0 ? graveyardIds : undefined);
  };

  // ── Render a single card row ───────────────────────────────────────────────

  const renderCard = (id: string, dest: Dest, idx: number) => {
    const card = cardMap[id];
    if (!card) return null;

    const borderColor =
      dest === 'top' ? 'border-cyan' :
      dest === 'bottom' ? 'border-amber-500' :
      'border-red-500';
    const badgeColor =
      dest === 'top' ? 'text-cyan bg-cyan/10' :
      dest === 'bottom' ? 'text-amber-400 bg-amber-500/10' :
      'text-red-400 bg-red-500/10';
    const badgeLabel =
      dest === 'top' ? '↑ Top' :
      dest === 'bottom' ? '↓ Bottom' :
      '💀 GY';

    return (
      <div
        key={id}
        data-scry-card-id={id}
        data-scry-dest={dest}
        onPointerDown={e => {
          if (e.button !== 0) return;
          e.stopPropagation();
          setDrag({
            id,
            from: dest,
            startX: e.clientX,
            startY: e.clientY,
            x: e.clientX,
            y: e.clientY,
            moved: false,
          });
        }}
        onMouseEnter={() => hoverInspect({ name: card.name, imageUri: card.imageUri ?? null, instanceId: card.instanceId })}
        onMouseLeave={clearHoverInspect}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-navy-light hover:bg-navy/80 cursor-grab active:cursor-grabbing transition-colors group select-none"
      >
        {/* Position index */}
        <span className="text-cream-muted/30 text-[10px] w-4 text-right shrink-0 font-mono">{idx + 1}</span>

        {/* Card thumbnail — click to cycle destination */}
        <div
          className={`w-10 h-14 rounded overflow-hidden border-2 shrink-0 cursor-pointer hover:scale-105 transition-transform ${borderColor}`}
          onClick={() => {
            if (suppressClickRef.current) return;
            cycleCard(id);
          }}
          title="Click to change destination"
        >
          {card.imageUri ? (
            <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" draggable={false} />
          ) : (
            <div className="w-full h-full bg-navy flex items-center justify-center p-1">
              <span className="text-[7px] text-cream text-center leading-tight">{card.name}</span>
            </div>
          )}
        </div>

        {/* Card name */}
        <span className="text-xs text-cream truncate flex-1 min-w-0">{card.name}</span>

        {/* Destination badge */}
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${badgeColor}`}>
          {badgeLabel}
        </span>

        {/* Drag handle hint */}
        <span className="text-cream-muted/20 group-hover:text-cream-muted/40 text-xs shrink-0 transition-colors">⠿</span>
      </div>
    );
  };

  // ── Section container ──────────────────────────────────────────────────────

  const renderSection = (dest: Dest, ids: string[], label: string, borderCls: string, headerCls: string) => (
    <div
      data-scry-section={dest}
      className={`rounded-xl border ${borderCls} p-2 min-h-[56px]`}
    >
      <p className={`text-[10px] uppercase tracking-widest mb-1.5 px-1 ${headerCls}`}>
        {label} <span className="opacity-50">({ids.length})</span>
      </p>
      <div className="flex flex-col gap-0.5">
        {ids.map((entryId, i) => renderCard(entryId, dest, i))}
        {ids.length === 0 && (
          <p className="text-cream-muted/20 text-xs text-center py-1.5 select-none">
            drag cards here
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-navy rounded-2xl border border-cyan p-5 w-full max-w-md mx-4 max-h-[88vh] flex flex-col gap-3 shadow-2xl">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-lg font-bold text-cream">
              {mode === 'scry' ? 'Scry' : 'Surveil'} {instanceIds.length}
            </h2>
            <p className="text-cream-muted/70 text-xs mt-0.5">
              {mode === 'scry'
                ? 'Click to cycle Top ↔ Bottom. Drag to reorder.'
                : 'Click to cycle Top → Bottom → Graveyard. Drag to reorder.'}
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => handleModeChange('scry')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                mode === 'scry'
                  ? 'bg-cyan text-navy'
                  : 'bg-navy-light text-cream-muted hover:text-cream'
              }`}
            >
              Scry
            </button>
            <button
              onClick={() => handleModeChange('surveil')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                mode === 'surveil'
                  ? 'bg-magenta/80 text-cream'
                  : 'bg-navy-light text-cream-muted hover:text-cream'
              }`}
            >
              Surveil
            </button>
          </div>
        </div>

        {/* ── Card sections ──────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2 overflow-y-auto flex-1 min-h-0 pr-0.5">
          {renderSection(
            'top', topIds,
            '↑ Top of Library',
            'border-cyan/30 bg-cyan/5',
            'text-cyan/60',
          )}
          {renderSection(
            'bottom', bottomIds,
            '↓ Bottom of Library',
            'border-amber-500/30 bg-amber-500/5',
            'text-amber-500/60',
          )}
          {mode === 'surveil' && renderSection(
            'graveyard', graveyardIds,
            '💀 Graveyard',
            'border-red-500/30 bg-red-500/5',
            'text-red-500/60',
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 shrink-0 pt-2 border-t border-cyan-dim/20">
          <p className="flex-1 text-xs text-cream-muted">
            <span className="text-cyan font-bold">{topIds.length}</span> top
            {' · '}
            <span className="text-amber-400 font-bold">{bottomIds.length}</span> bottom
            {mode === 'surveil' && graveyardIds.length > 0 && (
              <> · <span className="text-red-400 font-bold">{graveyardIds.length}</span> to GY</>
            )}
          </p>
          <button
            onClick={handleResolve}
            className="px-5 py-2 bg-cyan hover:bg-cyan/90 rounded-lg font-bold text-navy text-sm transition-all"
          >
            Confirm
          </button>
        </div>

        {drag && (() => {
          const card = cardMap[drag.id];
          if (!card) return null;
          return (
            <div
              className="fixed z-[12000] pointer-events-none w-10 h-14 rounded border-2 border-cyan shadow-2xl overflow-hidden opacity-90"
              style={{ left: drag.x - 20, top: drag.y - 28 }}
            >
              {card.imageUri ? (
                <img src={card.imageUri} alt={card.name} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-navy-light flex items-center justify-center p-1">
                  <span className="text-[7px] text-cream text-center leading-tight">{card.name}</span>
                </div>
              )}
            </div>
          );
        })()}

      </div>
    </div>
  );
}
