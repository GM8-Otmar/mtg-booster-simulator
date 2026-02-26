import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface CardContextMenuProps {
  card: BattlefieldCard;
  x: number;
  y: number;
  onClose: () => void;
  /** When provided (>1 card), all actions apply to every card in this array */
  selectedCards?: BattlefieldCard[];
}

interface MenuSection {
  label?: string;
  items: MenuItem[];
}

interface MenuItem {
  label: string;
  action: () => void;
  danger?: boolean;
}

export default function CardContextMenu({ card, x, y, onClose, selectedCards }: CardContextMenuProps) {
  const {
    changeZone, tapCard, setFaceDown,
    addCounter, notifyCommanderCast,
    playerId,
  } = useGameTable();

  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [onClose]);

  // Bulk mode: actions apply to all selectedCards; single mode: just the one card
  const isBulk = !!selectedCards && selectedCards.length > 1;
  const targets = isBulk ? selectedCards! : [card];
  const isOwner = card.controller === playerId;

  const do_ = (fn: () => void) => { fn(); onClose(); };
  const doAll = (fn: (c: BattlefieldCard) => void) => { targets.forEach(fn); onClose(); };

  const zones: { label: string; zone: GameZone; toIndex?: number }[] = [
    { label: 'Hand', zone: 'hand' },
    { label: 'Library (top)', zone: 'library', toIndex: 0 },
    { label: 'Library (bottom)', zone: 'library' },
    { label: 'Graveyard', zone: 'graveyard' },
    { label: 'Exile', zone: 'exile' },
    { label: 'Command Zone', zone: 'command_zone' },
    { label: 'Sideboard', zone: 'sideboard' },
  ];

  const sections: MenuSection[] = [];

  if (isBulk) {
    // ── Bulk mode ────────────────────────────────────────────────────────────
    // Only show zones that at least one selected card isn't already in
    const onBattlefield = targets.some(c => c.zone === 'battlefield');

    if (onBattlefield) {
      sections.push({
        items: [
          {
            label: 'Tap all',
            action: () => doAll(c => { if (c.zone === 'battlefield') tapCard(c.instanceId, true); }),
          },
          {
            label: 'Untap all',
            action: () => doAll(c => { if (c.zone === 'battlefield') tapCard(c.instanceId, false); }),
          },
        ],
      });
    }

    sections.push({
      label: 'Move all to…',
      items: zones.map(z => ({
        label: z.label,
        action: () => doAll(c => changeZone(c.instanceId, z.zone, z.toIndex)),
      })),
    });

    if (onBattlefield) {
      sections.push({
        label: 'Add counter to all',
        items: [
          {
            label: '+1/+1 counter (+)',
            action: () => doAll(c => { if (c.zone === 'battlefield') addCounter(c.instanceId, 'plus1plus1', 1); }),
          },
          {
            label: '+1/+1 counter (−)',
            action: () => doAll(c => { if (c.zone === 'battlefield') addCounter(c.instanceId, 'plus1plus1', -1); }),
          },
          {
            label: '−1/−1 counter (+)',
            action: () => doAll(c => { if (c.zone === 'battlefield') addCounter(c.instanceId, 'minus1minus1', 1); }),
          },
          {
            label: 'Charge counter (+)',
            action: () => doAll(c => { if (c.zone === 'battlefield') addCounter(c.instanceId, 'charge', 1); }),
          },
        ],
      });
    }
  } else {
    // ── Single-card mode (existing behaviour) ────────────────────────────────
    if (card.zone === 'battlefield') {
      sections.push({
        items: [
          {
            label: card.tapped ? 'Untap' : 'Tap',
            action: () => do_(() => tapCard(card.instanceId, !card.tapped)),
          },
          {
            label: card.faceDown ? 'Turn Face Up' : 'Turn Face Down',
            action: () => do_(() => setFaceDown(card.instanceId, !card.faceDown)),
          },
        ],
      });
    }

    sections.push({
      label: 'Move to…',
      items: zones
        .filter(z => !(z.zone === card.zone && z.toIndex === undefined))
        .map(z => ({
          label: z.label,
          action: () => do_(() => changeZone(card.instanceId, z.zone, z.toIndex)),
        })),
    });

    if (card.zone === 'battlefield') {
      sections.push({
        label: 'Counters',
        items: [
          {
            label: '+1/+1 counter (+)',
            action: () => do_(() => addCounter(card.instanceId, 'plus1plus1', 1)),
          },
          {
            label: '+1/+1 counter (−)',
            action: () => do_(() => addCounter(card.instanceId, 'plus1plus1', -1)),
          },
          {
            label: '−1/−1 counter (+)',
            action: () => do_(() => addCounter(card.instanceId, 'minus1minus1', 1)),
          },
          {
            label: 'Loyalty counter (+)',
            action: () => do_(() => addCounter(card.instanceId, 'loyalty', 1)),
          },
          {
            label: 'Loyalty counter (−)',
            action: () => do_(() => addCounter(card.instanceId, 'loyalty', -1)),
          },
          {
            label: 'Charge counter (+)',
            action: () => do_(() => addCounter(card.instanceId, 'charge', 1)),
          },
        ],
      });
    }

    if (card.isCommander && card.zone === 'command_zone') {
      sections.push({
        label: 'Commander',
        items: [
          {
            label: 'Cast Commander (pay tax)',
            action: () => do_(() => notifyCommanderCast(card.instanceId)),
          },
        ],
      });
    }
  }

  // Viewport-clamp: measure actual menu height after mount, then clamp all edges
  const [adjustedStyle, setAdjustedStyle] = useState<React.CSSProperties>({
    left: x, top: y, visibility: 'hidden',
  });

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const menuH = menuRef.current.offsetHeight;
    const menuW = 220;
    const vpW = window.innerWidth;
    const vpH = window.innerHeight;
    const clampedLeft = Math.max(8, Math.min(x, vpW - menuW - 8));
    const clampedTop = Math.max(8, Math.min(y, vpH - menuH - 8));
    setAdjustedStyle({ left: clampedLeft, top: clampedTop, visibility: 'visible' });
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-navy-light border border-cyan-dim rounded-xl shadow-2xl text-sm overflow-hidden"
      style={{ ...adjustedStyle, width: 220 }}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-cyan-dim bg-navy">
        {isBulk ? (
          <>
            <p className="font-semibold text-cyan">{targets.length} cards selected</p>
            <p className="text-cream-muted text-xs">bulk actions</p>
          </>
        ) : (
          <>
            <p className="font-semibold text-cream truncate">{card.name}</p>
            <p className="text-cream-muted text-xs capitalize">{card.zone.replace('_', ' ')}</p>
          </>
        )}
      </div>

      {sections.map((section, si) => (
        <div key={si}>
          {section.label && (
            <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-widest text-cream-muted">
              {section.label}
            </p>
          )}
          {section.items.map((item, ii) => (
            <button
              key={ii}
              onClick={item.action}
              disabled={!isOwner && !['Move to…', 'Move all to…'].includes(section.label ?? '')}
              className={`w-full text-left px-3 py-1.5 transition-colors
                ${item.danger ? 'text-red-400 hover:bg-red-900/30' : 'text-cream hover:bg-cyan-dim/40'}
                disabled:opacity-40 disabled:cursor-not-allowed`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
