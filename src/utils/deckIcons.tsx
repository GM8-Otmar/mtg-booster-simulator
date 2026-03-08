/**
 * Shared deck icon definitions used by DeckMetadataPanel and DeckListItem.
 */

import {
  Sword,
  Shield,
  Crown,
  Flame,
  Skull,
  Sparkles,
  Gem,
  Heart,
  Zap,
  Leaf,
  Target,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

export interface DeckIconChoice {
  key: string;
  Icon: LucideIcon;
  label: string;
}

export const DECK_ICON_CHOICES: DeckIconChoice[] = [
  { key: 'sword',    Icon: Sword,    label: 'Sword' },
  { key: 'shield',   Icon: Shield,   label: 'Shield' },
  { key: 'crown',    Icon: Crown,    label: 'Crown' },
  { key: 'flame',    Icon: Flame,    label: 'Flame' },
  { key: 'skull',    Icon: Skull,    label: 'Skull' },
  { key: 'sparkles', Icon: Sparkles, label: 'Sparkles' },
  { key: 'gem',      Icon: Gem,      label: 'Gem' },
  { key: 'heart',    Icon: Heart,    label: 'Heart' },
  { key: 'zap',      Icon: Zap,      label: 'Zap' },
  { key: 'leaf',     Icon: Leaf,     label: 'Leaf' },
  { key: 'target',   Icon: Target,   label: 'Target' },
  { key: 'book',     Icon: BookOpen, label: 'Book' },
];

const ICON_MAP = new Map<string, LucideIcon>(
  DECK_ICON_CHOICES.map(({ key, Icon }) => [key, Icon]),
);

/** Get the Lucide icon component for a key, or null if not found. */
export function getDeckIcon(key: string | null | undefined): LucideIcon | null {
  if (!key) return null;
  return ICON_MAP.get(key) ?? null;
}
