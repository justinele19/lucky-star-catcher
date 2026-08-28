/**
 * A jar of memories.
 *
 * Used three times over: your main jar, the inbox jar of unopened stars from
 * friends, and one jar per friend or group. Same component, different contents.
 *
 * Drag a star up past the mouth and it comes free — `onPullOut(starId)` fires
 * and the parent takes over from there.
 */

import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import StarShape from './StarShape.jsx';
import JarGlass from './JarGlass.jsx';
import { useJarPhysics } from '../hooks/useJarPhysics.js';

const MasonJar = forwardRef(function MasonJar(
  {
    stars,
    label,
    labelMeta,
    emptyMessage = 'Nothing in here yet',
    showHint = false,
    onPullOut,
  },
  ref
) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [starSize, setStarSize] = useState(46);
  const jarRef = useRef(null);

  const { containerRef, registerStarEl, starHandlers, draggingId, shake, nudge } =
    useJarPhysics({ stars, onPullOut, starSize });

  // Let the parent shake the jar or nudge a specific star.
  useImperativeHandle(ref, () => ({ shake, nudge }), [shake, nudge]);

  // Keep the drawn glass and the physics walls looking at the same box, and
  // read --star-size straight off the element so the design token stays the
  // single source of truth.
  useEffect(() => {
    const el = jarRef.current;
    if (!el) return;

    const measure = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
      const raw = getComputedStyle(el).getPropertyValue('--star-size');
      const parsed = parseFloat(raw);
      if (!Number.isNaN(parsed)) setStarSize(parsed);
    };

    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  const attachRefs = (node) => {
    jarRef.current = node;
    containerRef.current = node;
  };

  return (
    <div className="jar-wrap">
      <div className="jar" ref={attachRefs}>
        <JarGlass width={size.width} height={size.height} layer="back" />

        <div className="jar__contents">
          {stars.map((star) => (
            <button
              key={star.id}
              type="button"
              ref={registerStarEl(star.id)}
              className={
                'star' +
                (draggingId === star.id ? ' star--dragging' : '') +
                (showHint && stars.length ? ' star--hint' : '')
              }
              aria-label={
                star.text
                  ? `Memory: ${star.text.slice(0, 60)}`
                  : 'A memory with photos'
              }
              {...starHandlers(star.id)}
            >
              <StarShape
                color={star.color}
                style={{ width: '100%', height: '100%' }}
              />
            </button>
          ))}
        </div>

        <JarGlass width={size.width} height={size.height} layer="front" />

        {stars.length === 0 && <p className="jar__empty">{emptyMessage}</p>}

        {showHint && stars.length > 0 && (
          <span className="jar__hint">pull a star out ↑</span>
        )}
      </div>

      {/* Whose jar this is, on a paper tag under the glass. */}
      {label && (
        <div className="jar__tag">
          <span className="jar__tag-name">{label}</span>
          {labelMeta && <span className="jar__tag-meta">{labelMeta}</span>}
        </div>
      )}
    </div>
  );
});

export default MasonJar;
