/**
 * Keeps track of which memories you've already been shown this session, so
 * "Surprise me" never repeats a star until you've seen the whole jar. When the
 * jar is exhausted it reshuffles and starts over.
 *
 * The set is deliberately not persisted — a session is one sitting.
 */

import { useCallback, useRef, useState } from 'react';

export function useSessionQueue() {
  const seenRef = useRef(new Set());
  const [seenCount, setSeenCount] = useState(0);
  const [cycled, setCycled] = useState(false);

  const pick = useCallback((ids) => {
    if (!ids.length) return null;

    let unseen = ids.filter((id) => !seenRef.current.has(id));

    // Been through them all — start a fresh pass.
    if (unseen.length === 0) {
      seenRef.current.clear();
      unseen = ids;
      setCycled(true);
    }

    const chosen = unseen[Math.floor(Math.random() * unseen.length)];
    seenRef.current.add(chosen);
    setSeenCount(seenRef.current.size);
    return chosen;
  }, []);

  const markSeen = useCallback((id) => {
    if (!id) return;
    seenRef.current.add(id);
    setSeenCount(seenRef.current.size);
  }, []);

  const reset = useCallback(() => {
    seenRef.current.clear();
    setSeenCount(0);
    setCycled(false);
  }, []);

  return { pick, markSeen, reset, seenCount, cycled };
}
