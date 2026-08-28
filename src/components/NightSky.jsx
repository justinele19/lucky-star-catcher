/**
 * The sky behind everything.
 *
 * `shootingCount` is the number of unopened stars sitting in the inbox — one
 * streak per waiting star, so a busy inbox literally makes the sky busier.
 *
 * Each streak rolls a fresh trajectory every time it crosses: a new height,
 * angle, speed, length and direction. A CSS animation on its own would replay
 * the identical arc forever, so the re-roll happens on `animationiteration`,
 * at the moment the streak has faded out and is about to come round again.
 */

import { useMemo, useRef, useState } from 'react';

const PINPRICK_COUNT = 140; // raise for a denser sky, lower for a calmer one

const rand = (min, max) => min + Math.random() * (max - min);

/** One crossing: where it enters, how steeply it falls, how fast, how long. */
function rollTrajectory() {
  // Most fall left to right, some the other way, so the sky doesn't read as
  // a single repeating conveyor belt.
  const flip = Math.random() < 0.32;
  const angle = rand(7, 48) * (flip ? -1 : 1);
  const travel = rand(118, 152) * (flip ? -1 : 1);

  return {
    startY: rand(-4, 58),
    fromX: flip ? 108 : -14,
    angle,
    travel,
    tail: rand(90, 250),
    duration: rand(1700, 3400),
    dot: rand(2.2, 3.6),
    tailDir: flip ? -1 : 1,
  };
}

function ShootingStar({ index }) {
  const [t, setT] = useState(rollTrajectory);
  // The opening stagger is fixed per streak; re-rolling it mid-flight would
  // restart the animation instead of letting it loop.
  const delay = useRef(index * 1.9 + Math.random() * 1.4).current;

  return (
    <span
      className="shooting-star"
      onAnimationIteration={() => setT(rollTrajectory())}
      style={{
        '--start-y': `${t.startY}%`,
        '--from-x': `${t.fromX}%`,
        '--angle': `${t.angle}deg`,
        '--travel': `${t.travel}vw`,
        '--tail': `${t.tail}px`,
        '--dur': `${t.duration}ms`,
        '--dot': `${t.dot}px`,
        '--tail-dir': t.tailDir,
        '--delay': `${delay}s`,
      }}
    />
  );
}

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
        {Array.from({ length: shootingCount }, (_, i) => (
          <ShootingStar key={i} index={i} />
        ))}
      </div>
    </div>
  );
}
