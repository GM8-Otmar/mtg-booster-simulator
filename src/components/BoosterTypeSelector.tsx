import type { BoosterType } from '../api/scryfall';
import { Package, Gem } from 'lucide-react';

interface BoosterTypeSelectorProps {
  selected: BoosterType;
  onChange: (type: BoosterType) => void;
  disabled?: boolean;
}

export function BoosterTypeSelector({ selected, onChange, disabled }: BoosterTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-cream-muted uppercase tracking-wide">
        Booster Type
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('play')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-2
            ${selected === 'play'
              ? 'bg-magenta text-navy ring-2 ring-magenta'
              : 'bg-navy-light text-cream-muted hover:bg-navy-light/80 border border-cyan-dim'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Package className="w-4 h-4" />
          Play
        </button>
        <button
          type="button"
          onClick={() => onChange('collector')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-2
            ${selected === 'collector'
              ? 'bg-cyan text-navy ring-2 ring-cyan'
              : 'bg-navy-light text-cream-muted hover:bg-navy-light/80 border border-cyan-dim'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <Gem className="w-4 h-4" />
          Collector
        </button>
      </div>
      <p className="text-xs text-cream-muted">
        {selected === 'play'
          ? '14 cards: 7 commons, 3 uncommons, 1 wildcard, 1 rare/mythic, 1 guaranteed foil'
          : '~15 cards: 5 foil commons, 4 foil uncommons, 2-3 rares, 1 foil rare'
        }
      </p>
    </div>
  );
}
