/**
 * A star, opened.
 *
 * Runs the folding sequence backwards, in six phases, so you can actually
 * watch it come apart rather than see it cut from star to paper:
 *
 *   star     floating free of the jar
 *   deflate  the puff presses out of it and it goes flat
 *   unwrap   the five points peel back off the knot
 *   unknot   the pentagon unwinds and turns into a strip end
 *   unroll   the strip pays out to full width
 *   open     the memory is readable; photos rise above it
 *
 * The phase list and its timings live in design/tokens.js, mirrored by the
 * --t-unfold-* variables in tokens.css. Closing walks the same road backwards
 * at REFOLD_SPEED, because you don't need to watch it twice.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import StarShape from './StarShape.jsx';
import PaperPentagon from './PaperPentagon.jsx';
import MediaLightbox from './MediaLightbox.jsx';
import { REFOLD_SPEED, UNFOLD_PHASES, UNWIND_TURNS } from '../design/tokens.js';
import { formatMemoryDate } from '../utils/format.js';

/**
 * Regions that are part of the memory — clicking them must not refold it.
 * The lightbox is in that list because it renders inside this scrim: without
 * it, dismissing a zoomed photo would bubble up and close the star as well.
 */
const KEEP_OPEN =
  '.unfold__paper-wrap, .unfold__media, .unfold__actions, .unfold__close, .lightbox';

export default function UnfoldOverlay({
  star,
  authorName, // undefined for your own memories
  actions = [], // [{ label, onClick, tone: 'primary' | 'ghost' }]
  onClose,
}) {
  const [phase, setPhase] = useState(UNFOLD_PHASES[0].name);
  const [closing, setClosing] = useState(false);
  const [zoomed, setZoomed] = useState(null); // index into media
  const timers = useRef([]);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  /** Walk the phase list, holding each one for its own duration. */
  const run = useCallback((sequence, speed, done) => {
    clearTimers();
    setPhase(sequence[0].name);
    let elapsed = 0;
    sequence.slice(0, -1).forEach((step, i) => {
      elapsed += step.ms * speed;
      const next = sequence[i + 1].name;
      timers.current.push(setTimeout(() => setPhase(next), elapsed));
    });
    if (done) {
      // Let the final phase play before handing back — otherwise the refolded
      // star never gets a frame on screen.
      elapsed += sequence[sequence.length - 1].ms * speed;
      timers.current.push(setTimeout(done, elapsed));
    }
  }, []);

  const runForward = useCallback(() => {
    run(UNFOLD_PHASES, 1);
  }, [run]);

  const runBackward = useCallback(() => {
    if (closing) return;
    setClosing(true);
    setZoomed(null);
    // The same phases in reverse. Each keeps its own duration, since folding
    // back up is the same distance travelled; 'open' only needs a beat before
    // the paper starts drawing in.
    const back = [...UNFOLD_PHASES]
      .reverse()
      .map((step) => ({ ...step, ms: step.name === 'open' ? 140 : step.ms }));
    run(back, REFOLD_SPEED, () => onClose?.());
  }, [closing, onClose, run]);

  useEffect(() => {
    runForward();
    return clearTimers;
  }, [runForward]);

  // Escape closes, same as the X — unless a photo is zoomed, in which case the
  // lightbox handles it and only the photo closes.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && zoomed === null) runBackward();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [runBackward, zoomed]);

  if (!star) return null;

  const dateText = formatMemoryDate(star);
  const hasText = Boolean(star.text?.trim());
  const media = star.media || [];

  // Clicking the empty space around the memory refolds it. Clicking the paper,
  // a photo, or a button does what that thing does.
  const onScrimPointerDown = (event) => {
    if (event.target.closest?.(KEEP_OPEN)) return;
    runBackward();
  };

  return (
    <div
      className="unfold-scrim"
      onPointerDown={onScrimPointerDown}
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

      <div
        className="unfold"
        data-phase={phase}
        style={{ '--unwind-turns': UNWIND_TURNS }}
      >
        {media.length > 0 && (
          <div className="unfold__media">
            {media.map((item, i) => (
              <button
                type="button"
                key={item.id}
                className="unfold__photo-btn"
                style={{ '--tilt': `${(i % 2 ? 2.5 : -2.5) + i * 0.4}deg` }}
                onClick={() => setZoomed(i)}
                aria-label={
                  item.type === 'video' ? 'Play this video' : 'Zoom into this photo'
                }
              >
                {item.type === 'video' ? (
                  <>
                    {/* Muted and controlless in the memory, so a tap zooms
                        instead of landing on a scrub bar. */}
                    <video
                      className="unfold__photo"
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                    />
                    <span className="unfold__play" aria-hidden="true">
                      ▶
                    </span>
                  </>
                ) : (
                  <img className="unfold__photo" src={item.url} alt="" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="unfold__paper-wrap">
          {/* The star presses flat into the pentagon, the pentagon spins the
              wraps off itself, and the strip below pays out as it does. */}
          <StarShape color={star.color} className="unfold__star" />
          <PaperPentagon color={star.color} className="unfold__pentagon" />

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
          {authorName && <span className="unfold__from">from {authorName}</span>}
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

      {zoomed !== null && (
        <MediaLightbox
          media={media}
          index={zoomed}
          onIndex={setZoomed}
          onClose={() => setZoomed(null)}
        />
      )}
    </div>
  );
}
