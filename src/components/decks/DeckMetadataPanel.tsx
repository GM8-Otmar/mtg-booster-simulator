import type { DeckFormat } from '../../types/deck';

interface DeckMetadataPanelProps {
  name: string;
  format: DeckFormat;
  notes: string;
  onNameChange: (value: string) => void;
  onFormatChange: (value: DeckFormat) => void;
  onNotesChange: (value: string) => void;
}

export default function DeckMetadataPanel({
  name,
  format,
  notes,
  onNameChange,
  onFormatChange,
  onNotesChange,
}: DeckMetadataPanelProps) {
  return (
    <div className="bg-navy-light rounded-xl p-4 border border-cyan-dim space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-cream">Deck Metadata</h3>
        <p className="text-xs text-cream-muted mt-1">
          Manage the deck identity here instead of treating the builder like a temporary import box.
        </p>
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
