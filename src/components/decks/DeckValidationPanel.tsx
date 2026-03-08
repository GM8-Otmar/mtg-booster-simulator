import { validateDeck } from '../../utils/deckValidation';
import type { DeckRecord } from '../../types/deck';

interface DeckValidationPanelProps {
  deck: DeckRecord;
}

export default function DeckValidationPanel({ deck }: DeckValidationPanelProps) {
  const issues = validateDeck(deck);

  return (
    <div className="bg-navy-light rounded-xl p-4 border border-cyan-dim space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cream">Validation</h3>
        <span className="text-xs text-cream-muted">{issues.length} issue{issues.length !== 1 ? 's' : ''}</span>
      </div>

      {issues.length === 0 ? (
        <p className="text-green-400 text-sm">No validation issues.</p>
      ) : (
        <div className="space-y-2">
          {issues.map((issue, index) => {
            const color =
              issue.severity === 'error'
                ? 'text-red-400 border-red-500/40'
                : issue.severity === 'warning'
                ? 'text-yellow-400 border-yellow-500/40'
                : 'text-cyan border-cyan/40';
            return (
              <div key={`${issue.code}-${index}`} className={`rounded-lg border p-2 text-sm ${color}`}>
                <p>{issue.message}</p>
                {issue.section && (
                  <p className="text-xs opacity-70 mt-1 uppercase tracking-wide">{issue.section}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
