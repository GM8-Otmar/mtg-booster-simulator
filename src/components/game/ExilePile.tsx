import GraveyardPile from './GraveyardPile';
import type { BattlefieldCard } from '../../types/game';

interface ExilePileProps {
  cards: BattlefieldCard[];
}

/** Exile zone reuses GraveyardPile with a different colour accent */
export default function ExilePile({ cards }: ExilePileProps) {
  return (
    <GraveyardPile
      cards={cards}
      label="Exile"
      borderColor="border-magenta/40"
      dropZone="exile"
    />
  );
}
