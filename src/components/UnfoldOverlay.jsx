/**
 * A star, opened.
 *
 * Runs the fold sequence from the tutorial photo in reverse: the puffed star
 * presses flat into its pentagon, then the pentagon unwinds to the right and
 * pays out the paper strip it was folded from. Photos and video rise above the
 * paper once it's flat.
 *
 * Closing runs the same phases backwards, then the parent drops the star back
 * into the jar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import StarShape from './StarShape.jsx';
import { UNFOLD_TIMING } from '../design/tokens.js';
import { formatMemoryDate } from '../utils/format.js';

const PHASES = ['star', 'flatten', 'unroll', 'open'];

export default function UnfoldOverlay({
  star,
  authorName, // undefined for your own memories
  actions = [], // [{ label, onClick, tone: 'primary' | 'ghost' }]
  onClose,
}) {
  const [phase, setPhase] = useState('star');
  const [closing, setClosing] = useState(false);
  const timers = useRef([]);
  const paperRef = useRef(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const runForward = useCallback(() => {
    clearTimers();
    setPhase('star');
    // A beat to let the star float free of the jar before it gives way.
    timers.current.push(setTimeout(() => setPhase('flatten'), 280));
    timers.current.push(
      setTimeout(() => setPhase('unroll'), 280 + UNFOLD_TIMING.flatten)
    );
    timers.current.push(
      setTimeout(
        () => setPhase('open'),
        280 + UNFOLD_TIMING.flatten + UNFOLD_TIMING.unroll
      )
    );
  }, []);

  const runBackward = useCallback(() => {
    if (closing) return;
    setClosing(true);
    clearTimers();
    setPhase('unroll');
    timers.current.push(setTimeout(() => setPhase('flatten'), 160));
    timers.current.push(
      setTimeout(() => setPhase('star'), 160 + UNFOLD_TIMING.unroll * 0.5)
    );
    timers.current.push(
      setTimeout(
        () => onClose?.(),
        160 + UNFOLD_TIMING.unroll * 0.5 + UNFOLD_TIMING.flatten
      )
    );
  }, [closing, onClose]);

  useEffect(() => {
    runForward();
    return clearTimers;
  }, [runForward]);

  // Escape closes, same as the X.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') runBackward();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runBackward]);

  if (!star) return null;

  const dateText = formatMemoryDate(star);
  const hasText = Boolean(star.text?.trim());
  const media = star.media || [];

  // Clicking anywhere outside the paper refolds the star.
  const onScrimClick = (event) => {
    if (paperRef.current?.contains(event.target)) return;
    runBackward();
  };

  return (
    <div
      className="unfold-scrim"
      onPointerDown={onScrimClick}
      role="dialog"
      aria-modal="true"
      aria-label="Memory"
    >
      <button
        type="button"
        className="unfold__close"
        onClick={runBackward}
        aria-label="Fold this star back up"
      >
        ✕
      </button>

      <div className="unfold" data-phase={phase}>
        {media.length > 0 && (
          <div className="unfold__media">
            {media.map((item, i) =>
              item.type === 'video' ? (
                <video
                  key={item.id}
                  className="unfold__photo"
                  src={item.url}
                  controls
                  playsInline
                  style={{ '--tilt': `${(i % 2 ? 2.5 : -2.5) + i * 0.4}deg` }}
                />
              ) : (
                <img
                  key={item.id}
                  className="unfold__photo"
                  src={item.url}
                  alt=""
                  style={{ '--tilt': `${(i % 2 ? 2.5 : -2.5) + i * 0.4}deg` }}
                />
              )
            )}
          </div>
        )}

        <div className="unfold__paper-wrap" ref={paperRef}>
          <StarShape color={star.color} className="unfold__star" />

          <div
            className={
              'unfold__strip' + (hasText ? '' : ' unfold__strip--date-only')
            }
          >
            <span className="unfold__creases" aria-hidden="true" />
            {hasText && <p className="unfold__text">{star.text}</p>}
            <span className="unfold__date">{dateText}</span>
          </div>
        </div>

        <div className="unfold__actions">
          {authorName && (
            <span className="unfold__from">from {authorName}</span>
          )}
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={`btn btn--${action.tone || 'ghost'}`}
              onClick={() => action.onClick(star)}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
