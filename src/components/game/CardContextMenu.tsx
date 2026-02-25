import { useEffect, useRef } from 'react';
import type { BattlefieldCard, GameZone } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';

interface CardContextMenuProps {
  card: BattlefieldCard;
  x: number;
  y: number;
  onClose: () => void;
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

export default function CardContextMenu({ card, x, y, onClose }: CardContextMenuProps) {
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

  const isOwner = card.controller === playerId;

  const do_ = (fn: () => void) => { fn(); onClose(); };

  const zones: { label: string; zone: GameZone }[] = [
    { label: 'Hand', zone: 'hand' },
    { label: 'Library (top)', zone: 'library' },
    { label: 'Graveyard', zone: 'graveyard' },
    { label: 'Exile', zone: 'exile' },
    { label: 'Command Zone', zone: 'command_zone' },
    { label: 'Sideboard', zone: 'sideboard' },
  ];

  const sections: MenuSection[] = [];

  // Tap / untap
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

  // Move to zone
  sections.push({
    label: 'Move to…',
    items: zones
      .filter(z => z.zone !== card.zone)
      .map(z => ({
        label: z.label,
        action: () => do_(() => changeZone(card.instanceId, z.zone)),
      })),
  });

  // Counters
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

  // Commander-specific
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

  // Viewport-clamp: keep menu on screen
  const vpW = window.innerWidth;
  const vpH = window.innerHeight;
  const menuW = 220;
  const left = Math.min(x, vpW - menuW - 8);
  const maxTop = vpH - 16;

  return (
    <div
      ref={menuRef}
      className="fixed z-[9999] bg-navy-light border border-cyan-dim rounded-xl shadow-2xl text-sm overflow-hidden"
      style={{ left, top: Math.min(y, maxTop), width: menuW }}
    >
      {/* Card name header */}
      <div className="px-3 py-2 border-b border-cyan-dim bg-navy">
        <p className="font-semibold text-cream truncate">{card.name}</p>
        <p className="text-cream-muted text-xs capitalize">{card.zone.replace('_', ' ')}</p>
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
              disabled={!isOwner && !['Move to…'].includes(section.label ?? '')}
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
