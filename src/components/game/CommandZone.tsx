import type { BattlefieldCard } from '../../types/game';
import { useGameTable } from '../../contexts/GameTableContext';
import GraveyardPile from './GraveyardPile';

interface CommandZoneProps {
  cards: BattlefieldCard[];
  commanderTax: number;
  playerId: string;
}

export default function CommandZone({ cards, commanderTax, playerId: ownerId }: CommandZoneProps) {
  const { notifyCommanderCast, changeZone, setCommanderTax, effectivePlayerId } = useGameTable();
  const taxCost = commanderTax * 2;
  const isOwner = ownerId === effectivePlayerId;

  return (
    <div className="flex flex-col items-center gap-1">
      <GraveyardPile
        cards={cards}
        label="CMD"
        borderColor="border-magenta/50"
        dropZone="command_zone"
        enableModal={false}
        onTopCardToBattlefield={(card) => {
          notifyCommanderCast(card.instanceId);
          changeZone(card.instanceId, 'battlefield');
        }}
      />

      <div className="flex items-center gap-1" title={ownerId}>
        <button
          onClick={() => setCommanderTax(Math.max(0, commanderTax - 1))}
          disabled={!isOwner}
          className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-[10px] disabled:opacity-30 transition-all"
        >
          -
        </button>
        <button
          onClick={() => {
            if (!isOwner) return;
            const raw = window.prompt('Set commander tax cast count (0 = no tax):', String(commanderTax));
            if (raw == null) return;
            const next = Number.parseInt(raw, 10);
            if (Number.isNaN(next)) return;
            setCommanderTax(Math.max(0, next));
          }}
          disabled={!isOwner}
          className="px-2 py-0.5 rounded-md bg-magenta/15 hover:bg-magenta/25 border border-magenta/40 text-[10px] text-magenta font-bold disabled:opacity-40 transition-colors"
        >
          +{taxCost} tax
        </button>
        <button
          onClick={() => setCommanderTax(commanderTax + 1)}
          disabled={!isOwner}
          className="w-5 h-5 rounded-full bg-navy-light hover:bg-navy border border-cyan-dim text-cream-muted text-[10px] disabled:opacity-30 transition-all"
        >
          +
        </button>
      </div>
    </div>
  );
}
