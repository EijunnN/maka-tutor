import { useCallback, useEffect, useState } from 'react';
import type { Nudge } from '@shared/types';

export function useNudges(activeConversationKey: string) {
  const [nudges, setNudges] = useState<Nudge[]>([]);

  const refresh = useCallback(async () => {
    try {
      const list = await window.api.getNudges();
      setNudges(list);
    } catch {
      setNudges([]);
    }
  }, []);

  // Refresca al cambiar la conversación activa (cuando se abre una
  // nueva o se navega a otra). Así el empty state siempre tiene
  // sugerencias fresh.
  useEffect(() => {
    void refresh();
  }, [activeConversationKey, refresh]);

  return { nudges, refresh };
}
