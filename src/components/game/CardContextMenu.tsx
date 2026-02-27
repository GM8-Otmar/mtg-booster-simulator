import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import { getCachedOracle } from '../../utils/scryfallOracle';

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
    changeZone, bulkChangeZone, tapCard, setFaceDown,
    addCounter, bulkAddCounter, resetCounters, notifyCommanderCast,
    createToken, revealCards, startTargeting, effectivePlayerId: playerId,
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
        action: () => { bulkChangeZone(targets.map(c => c.instanceId), z.zone, z.toIndex); onClose(); },
      })),
    });

    if (onBattlefield) {
      const bfIds = targets.filter(c => c.zone === 'battlefield').map(c => c.instanceId);
      sections.push({
        label: 'Counters (all)',
        items: [
          {
            label: 'Counter +1 all',
            action: () => { bulkAddCounter(bfIds, 'generic', 1); onClose(); },
          },
          {
            label: 'Counter -1 all',
            action: () => { bulkAddCounter(bfIds, 'generic', -1); onClose(); },
          },
        ],
      });

      sections.push({
        label: 'Clone',
        items: [
          {
            label: 'Copy all to battlefield',
            action: () => doAll(c => {
              if (c.zone !== 'battlefield') return;
              const oracle = getCachedOracle(c.name);
              createToken(
                {
                  name: c.name,
                  typeLine: oracle?.typeLine ?? '',
                  power: oracle?.power ?? '0',
                  toughness: oracle?.toughness ?? '0',
                  colors: [],
                  imageUri: c.imageUri ?? undefined,
                },
                Math.min(96, c.x + 6),
                Math.min(96, c.y + 5),
              );
            }),
          },
        ],
      });
    }

    // Reveal hand cards in bulk
    const handTargets = targets.filter(c => c.zone === 'hand');
    if (handTargets.length > 0) {
      sections.push({
        items: [
          {
            label: 'Reveal selected to all',
            action: () => do_(() => revealCards(handTargets.map(c => c.instanceId))),
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
      const hasCounter = card.counters.length > 0;
      const firstCounter = card.counters[0];
      if (!hasCounter) {
        sections.push({
          items: [
            {
              label: 'Add counter',
              action: () => do_(() => addCounter(card.instanceId, 'generic', 1)),
            },
          ],
        });
      } else {
        sections.push({
          label: 'Counters',
          items: [
            {
              label: 'Counter +1',
              action: () => do_(() => addCounter(card.instanceId, firstCounter!.type, 1, firstCounter!.label)),
            },
            {
              label: 'Counter -1',
              action: () => do_(() => addCounter(card.instanceId, firstCounter!.type, -1, firstCounter!.label)),
            },
            {
              label: 'Remove counter',
              action: () => do_(() => resetCounters(card.instanceId)),
              danger: true,
            },
          ],
        });
      }
    }

    // Reveal (hand cards only)
    if (card.zone === 'hand') {
      sections.push({
        items: [
          {
            label: 'Reveal to all',
            action: () => do_(() => revealCards([card.instanceId])),
          },
        ],
      });
    }

    // Target (battlefield only)
    if (card.zone === 'battlefield') {
      sections.push({
        items: [
          {
            label: 'Target…',
            action: () => do_(() => startTargeting(card.instanceId)),
          },
        ],
      });
    }

    // Clone (battlefield only)
    if (card.zone === 'battlefield') {
      const oracle = getCachedOracle(card.name);
      sections.push({
        label: 'Clone',
        items: [
          {
            label: 'Copy to battlefield',
            action: () => do_(() => createToken(
              {
                name: card.name,
                typeLine: oracle?.typeLine ?? '',
                power: oracle?.power ?? '0',
                toughness: oracle?.toughness ?? '0',
                colors: [],
                imageUri: card.imageUri ?? undefined,
              },
              Math.min(96, card.x + 6),
              Math.min(96, card.y + 5),
            )),
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
              disabled={!isOwner && !isBulk && !['Move to…', 'Clone'].includes(section.label ?? '') && item.label !== 'Target…'}
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
