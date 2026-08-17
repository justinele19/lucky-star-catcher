/**
 * The sky behind everything.
 *
 * `shootingCount` is the number of unopened stars sitting in the inbox — one
 * streak per waiting star, so a busy inbox literally makes the sky busier.
 */

import { useMemo } from 'react';

const PINPRICK_COUNT = 140; // raise for a denser sky, lower for a calmer one

export default function NightSky({ shootingCount = 0 }) {
  // Positions are generated once and kept, so the sky doesn't reshuffle on
  // every render.
  const pinpricks = useMemo(
    () =>
      Array.from({ length: PINPRICK_COUNT }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: Math.random() < 0.86 ? 1.4 : 2.6,
        delay: Math.random() * 5,
        duration: 3 + Math.random() * 4,
        min: 0.12 + Math.random() * 0.25,
        max: 0.6 + Math.random() * 0.4,
      })),
    []
  );

  const streaks = useMemo(
    () =>
      Array.from({ length: shootingCount }, (_, i) => ({
        id: i,
        startY: 6 + Math.random() * 46, // upper half of the sky
        angle: 12 + Math.random() * 16,
        delay: i * 1.9 + Math.random() * 1.4,
        tail: 130 + Math.random() * 110,
        travel: 125 + Math.random() * 25,
      })),
    [shootingCount]
  );

  return (
    <div className="sky" aria-hidden="true">
      <div className="sky__milkyway" />

      <div className="sky__stars">
        {pinpricks.map((s) => (
          <span
            key={s.id}
            className="sky__star"
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              '--twinkle-delay': `${s.delay}s`,
              '--twinkle-dur': `${s.duration}s`,
              '--twinkle-min': s.min,
              '--twinkle-max': s.max,
            }}
          />
        ))}
      </div>

      <div className="shooting-layer">
        {streaks.map((s) => (
          <span
            key={s.id}
            className="shooting-star"
            style={{
              '--start-y': `${s.startY}%`,
              '--angle': `${s.angle}deg`,
              '--delay': `${s.delay}s`,
              '--tail': `${s.tail}px`,
              '--travel': `${s.travel}vw`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
