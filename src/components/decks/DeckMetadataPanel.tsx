import type { DeckFormat } from '../../types/deck';

interface DeckMetadataPanelProps {
  name: string;
  format: DeckFormat;
  notes: string;
  icon: string | null | undefined;
  commanderName: string | null;
  commanderImageUri?: string | null;
  onNameChange: (value: string) => void;
  onFormatChange: (value: DeckFormat) => void;
  onNotesChange: (value: string) => void;
  onIconChange: (value: string | null) => void;
}

const ICON_CHOICES = ['D', 'C', 'A', 'F', 'S', 'W'];

export default function DeckMetadataPanel({
  name,
  format,
  notes,
  icon,
  commanderName,
  commanderImageUri,
  onNameChange,
  onFormatChange,
  onNotesChange,
  onIconChange,
}: DeckMetadataPanelProps) {
  return (
    <div className="bg-navy-light rounded-xl p-4 border border-cyan-dim space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-cream">Deck Metadata</h3>
        <p className="text-xs text-cream-muted mt-1">
          Manage the deck identity here instead of treating the builder like a temporary import box.
        </p>
      </div>

      <div className="grid grid-cols-[88px_minmax(0,1fr)] gap-4 items-start">
        <div className="space-y-2">
          <div className="w-[88px] h-[120px] rounded-xl overflow-hidden border border-cyan-dim bg-navy flex items-center justify-center">
            {commanderImageUri ? (
              <img src={commanderImageUri} alt={commanderName ?? name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-3xl font-black text-cream/75">{icon ?? name[0] ?? 'D'}</span>
            )}
          </div>
          <p className="text-[11px] text-cream-muted text-center">
            {commanderName ? `Cover: ${commanderName}` : 'No commander cover yet'}
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wide text-cream-muted">Deck Icon</label>
          <div className="flex flex-wrap gap-2">
            {ICON_CHOICES.map(choice => (
              <button
                key={choice}
                type="button"
                onClick={() => onIconChange(choice)}
                className={`w-9 h-9 rounded-lg border text-sm font-bold transition-colors ${
                  icon === choice
                    ? 'bg-cyan text-navy border-cyan'
                    : 'bg-navy border-cyan-dim text-cream hover:border-cyan/60'
                }`}
              >
                {choice}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onIconChange(null)}
              className="px-3 h-9 rounded-lg border border-cyan-dim bg-navy text-xs font-semibold text-cream-muted hover:text-cream"
            >
              Auto
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-cream-muted mb-1">Deck Name</label>
        <input
          type="text"
          value={name}
          onChange={event => onNameChange(event.target.value)}
          className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-cyan"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-cream-muted mb-1">Format</label>
        <select
          value={format}
          onChange={event => onFormatChange(event.target.value as DeckFormat)}
          className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm focus:outline-none focus:border-cyan"
        >
          <option value="commander">Commander</option>
          <option value="limited">Limited / Sealed</option>
          <option value="free">Freeform</option>
          <option value="modern">Modern</option>
          <option value="standard">Standard</option>
          <option value="legacy">Legacy</option>
          <option value="vintage">Vintage</option>
          <option value="pauper">Pauper</option>
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-wide text-cream-muted mb-1">Notes</label>
        <textarea
          value={notes}
          onChange={event => onNotesChange(event.target.value)}
          rows={5}
          placeholder="Deck notes, game plan, cuts to revisit..."
          className="w-full bg-navy border border-cyan-dim rounded-lg px-3 py-2 text-cream text-sm placeholder-cream-muted/40 resize-none focus:outline-none focus:border-cyan"
        />
      </div>
    </div>
  );
}
