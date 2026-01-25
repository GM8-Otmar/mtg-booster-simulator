import type { BoosterType } from '../api/scryfall';

interface BoosterTypeSelectorProps {
  selected: BoosterType;
  onChange: (type: BoosterType) => void;
  disabled?: boolean;
}

export function BoosterTypeSelector({ selected, onChange, disabled }: BoosterTypeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-gray-400 uppercase tracking-wide">
        Booster Type
      </label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('play')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all cursor-pointer
            ${selected === 'play'
              ? 'bg-blue-600 text-white ring-2 ring-blue-400'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          📦 Play
        </button>
        <button
          type="button"
          onClick={() => onChange('collector')}
          disabled={disabled}
          className={`
            px-4 py-2 rounded-lg font-medium transition-all cursor-pointer
            ${selected === 'collector'
              ? 'bg-purple-600 text-white ring-2 ring-purple-400'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          💎 Collector
        </button>
      </div>
      <p className="text-xs text-gray-500">
        {selected === 'play'
          ? '14 cards: 7 commons, 3 uncommons, 1 wildcard, 1 rare/mythic, 1 guaranteed foil'
          : '~15 cards: 5 foil commons, 4 foil uncommons, 2-3 rares, 1 foil rare'
        }
      </p>
    </div>
  );
}
