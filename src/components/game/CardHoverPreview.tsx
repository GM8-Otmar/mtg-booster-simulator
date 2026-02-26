/**
 * CardHoverPreview — DISABLED. All exports are no-ops so nothing renders.
 */
import type { ReactNode } from 'react';

export function CardPreviewProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useCardPreview(_imageUri?: string | null, _name?: string) {
  return { onMouseEnter: undefined, onMouseMove: undefined, onMouseLeave: undefined };
}
