import { useState } from 'react';
import { getCardImageUrl, getCardPrice, formatPrice } from '../../types/card';
import type { ScryfallCard, ScryfallCardFace } from '../../types/card';

interface CardInspectPanelProps {
  card: ScryfallCard | null;
  title?: string;
}

const RARITY_COLORS: Record<string, string> = {
  common:   'text-cream-muted',
  uncommon: 'text-slate-300',
  rare:     'text-yellow-300',
  mythic:   'text-orange-400',
  special:  'text-magenta',
  bonus:    'text-magenta',
};

function priceColor(price: number | null): string {
  if (price === null) return 'text-cream-muted';
  if (price >= 1)    return 'text-cyan';
  if (price >= 0.25) return 'text-magenta';
  return 'text-cream-muted';
}

function FaceDetail({ face }: { face: ScryfallCardFace }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-cream">{face.name}</p>
      {face.mana_cost && <p className="text-cyan text-xs font-medium">{face.mana_cost}</p>}
      <p className="text-cream-muted text-xs">{face.type_line}</p>
      {face.oracle_text && (
        <p className="text-cream-muted text-xs leading-relaxed whitespace-pre-line">{face.oracle_text}</p>
      )}
    </div>
  );
}

export default function CardInspectPanel({ card, title = 'Inspect' }: CardInspectPanelProps) {
  const [faceIndex, setFaceIndex] = useState(0);

  const isDFC = !!(card?.card_faces && card.card_faces.length >= 2);
  const activeFace: ScryfallCardFace | null = isDFC ? (card!.card_faces![faceIndex] ?? null) : null;

  // Image: use active face if DFC, else card-level
  const imageUrl = isDFC
    ? (activeFace?.image_uris?.normal ?? null)
    : (card ? getCardImageUrl(card, 'normal') : null);

  const price = card ? getCardPrice(card) : null;

  // Oracle text for single-faced cards
  const singleFaceOracle = !isDFC
    ? (card?.oracle_text ?? card?.card_faces?.[0]?.oracle_text ?? null)
    : null;

  // P/T or Loyalty — prefer face level for DFCs
  const pt = isDFC
    ? ((activeFace as any)?.power != null ? `${(activeFace as any).power}/${(activeFace as any).toughness}` : null)
    : ((card as any)?.power != null ? `${(card as any).power}/${(card as any).toughness}` : null);

  const loyalty = isDFC
    ? ((activeFace as any)?.loyalty ?? null)
    : ((card as any)?.loyalty ?? null);

  return (
    <aside
      className="fixed top-4 right-4 w-64 rounded-lg p-3 bg-navy-light/95 backdrop-blur border border-cyan-dim shadow-xl z-40 max-h-[calc(100vh-2rem)] overflow-y-auto transition-opacity duration-200"
      style={{ opacity: card ? 1 : 0.5 }}
    >
      <p className="text-cyan text-xs font-semibold mb-2">{title}</p>

      {card ? (
        <>
          {/* Image + DFC flip button */}
          <div className="relative mb-2">
            {imageUrl ? (
              <img src={imageUrl} alt={card.name} className="rounded-lg w-full" />
            ) : (
              <div className="h-36 rounded-lg bg-navy flex items-center justify-center text-cream-muted text-xs p-2">
                {card.name}
              </div>
            )}
            {isDFC && (
              <button
                type="button"
                onClick={() => setFaceIndex(i => i === 0 ? 1 : 0)}
                className="absolute bottom-2 right-2 bg-navy/80 hover:bg-navy text-cyan text-xs font-bold px-2 py-1 rounded-full border border-cyan-dim backdrop-blur-sm"
                aria-label="Flip card"
              >
                ↩ Flip
              </button>
            )}
          </div>

          {isDFC && activeFace ? (
            <>
              <FaceDetail face={activeFace} />
              <p className="text-cream-muted/50 text-[10px] mt-1">
                Face {faceIndex + 1} of {card.card_faces!.length}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-sm font-bold text-cream truncate" title={card.name}>{card.name}</h3>
              <p className="text-cream-muted text-xs">{card.type_line}</p>
              {card.mana_cost && <p className="text-cyan text-xs font-medium mt-0.5">{card.mana_cost}</p>}
              {singleFaceOracle && (
                <>
                  <hr className="border-cyan-dim my-2" />
                  <p className="text-cream-muted text-xs leading-relaxed whitespace-pre-line">{singleFaceOracle}</p>
                </>
              )}
            </>
          )}

          {/* P/T or Loyalty */}
          {(pt || loyalty) && (
            <div className="flex gap-2 mt-2">
              {pt && (
                <span className="text-xs font-bold text-cream bg-navy px-2 py-0.5 rounded border border-cyan-dim">
                  {pt}
                </span>
              )}
              {loyalty && (
                <span className="text-xs font-bold text-magenta bg-navy px-2 py-0.5 rounded border border-magenta/40">
                  ◆ {loyalty}
                </span>
              )}
            </div>
          )}

          <hr className="border-cyan-dim my-2" />
          <div className="flex justify-between items-center text-xs">
            <span className={`font-medium capitalize ${RARITY_COLORS[card.rarity] ?? 'text-cream-muted'}`}>
              {card.rarity}
              {card.isFoilPull && <span className="ml-1 text-magenta">· Foil</span>}
            </span>
            <span className={`font-semibold ${priceColor(price)}`}>{formatPrice(price)}</span>
          </div>
        </>
      ) : (
        <p className="text-cream-muted text-xs">Hover a card to inspect</p>
      )}
    </aside>
  );
}
