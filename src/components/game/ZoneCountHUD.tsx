import { Hand, Skull, Hexagon } from 'lucide-react';
import { useGameTable } from '../../contexts/GameTableContext';

/**
 * Compact per-player zone count strip (Arena-style).
 * Shows Hand / GY / Exile counts for every player at the table.
 * Stacks as one row per player — works for 1–4 players.
 */
export default function ZoneCountHUD() {
  const { room, playerId, isSandbox, activeSandboxPlayerId } = useGameTable();
  if (!room) return null;

  const players = Object.values(room.players);
  if (players.length === 0) return null;

  const effectiveMyId = isSandbox ? (activeSandboxPlayerId ?? playerId) : playerId;

  return (
    <div className="flex flex-col gap-px bg-navy-light/70 border border-cyan-dim/30 rounded-lg px-2 py-1.5 shadow backdrop-blur-sm">
      {players.map(p => {
        const isMe = p.playerId === effectiveMyId;
        return (
          <div key={p.playerId} className="flex items-center gap-2 text-[11px] leading-none">
            {/* Name */}
            <span
              className={`w-16 truncate font-semibold ${isMe ? 'text-cyan' : 'text-cream-muted'}`}
              title={p.playerName}
            >
              {p.playerName}
            </span>

            {/* Hand */}
            <span className="flex items-center gap-0.5" title="Hand">
              <Hand className="w-3 h-3 text-cream-muted/60 shrink-0" />
              <span className={`font-bold tabular-nums ${isMe ? 'text-cream' : 'text-cream-muted'}`}>
                {p.handCardIds?.length ?? 0}
              </span>
            </span>

            {/* Graveyard */}
            <span className="flex items-center gap-0.5" title="Graveyard">
              <Skull className="w-3 h-3 text-cream-muted/60 shrink-0" />
              <span className={`font-bold tabular-nums ${isMe ? 'text-cream' : 'text-cream-muted'}`}>
                {p.graveyardCardIds?.length ?? 0}
              </span>
            </span>

            {/* Exile */}
            <span className="flex items-center gap-0.5" title="Exile">
              <Hexagon className="w-3 h-3 text-cream-muted/60 shrink-0" />
              <span className={`font-bold tabular-nums ${isMe ? 'text-cream' : 'text-cream-muted'}`}>
                {p.exileCardIds?.length ?? 0}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
