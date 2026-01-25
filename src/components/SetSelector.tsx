import { useEffect, useState } from 'react';
import { fetchBoosterSets } from '../api/scryfall';
import type { ScryfallSet } from '../types/card';

interface SetSelectorProps {
  selectedSet: string;
  onSetChange: (setCode: string) => void;
  disabled?: boolean;
}

export function SetSelector({ selectedSet, onSetChange, disabled }: SetSelectorProps) {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSets() {
      try {
        const boosterSets = await fetchBoosterSets();
        setSets(boosterSets);

        // Auto-select first set if none selected
        if (!selectedSet && boosterSets.length > 0) {
          onSetChange(boosterSets[0].code);
        }
      } catch (err) {
        console.error('Failed to load sets:', err);
        setError('Failed to load sets');
      } finally {
        setLoading(false);
      }
    }

    loadSets();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        Loading sets...
      </div>
    );
  }

  if (error) {
    return <div className="text-red-400">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="set-select" className="text-sm text-gray-400 uppercase tracking-wide">
        Select Set
      </label>
      <select
        id="set-select"
        value={selectedSet}
        onChange={(e) => onSetChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {sets.map((set) => (
          <option key={set.id} value={set.code}>
            {set.name} ({set.code.toUpperCase()}) - {set.released_at.slice(0, 4)}
          </option>
        ))}
      </select>
    </div>
  );
}
