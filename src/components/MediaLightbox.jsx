/**
 * A photo or video from a memory, opened full size.
 *
 * Sits above the unfolded star and swallows its own clicks, so zooming into a
 * picture never refolds the memory underneath — you come back out to the paper
 * you were already reading.
 */

import { useCallback, useEffect } from 'react';

export default function MediaLightbox({ media, index, onIndex, onClose }) {
  const item = media[index];
  const many = media.length > 1;

  const step = useCallback(
    (by) => onIndex((index + by + media.length) % media.length),
    [index, media.length, onIndex]
  );

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
      if (!many) return;
      if (event.key === 'ArrowRight') step(1);
      if (event.key === 'ArrowLeft') step(-1);
    };
    // Capture, so this closes before the overlay behind it sees the Escape.
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [many, onClose, step]);

  if (!item) return null;

  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="Photo"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <button
        type="button"
        className="lightbox__close"
        onClick={onClose}
        aria-label="Close photo"
      >
        ✕
      </button>

      {many && (
        <>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--prev"
            onClick={() => step(-1)}
            aria-label="Previous"
          >
            ‹
          </button>
          <button
            type="button"
            className="lightbox__nav lightbox__nav--next"
            onClick={() => step(1)}
            aria-label="Next"
          >
            ›
          </button>
        </>
      )}

      <figure className="lightbox__frame" key={item.id}>
        {item.type === 'video' ? (
          <video
            className="lightbox__media"
            src={item.url}
            controls
            autoPlay
            playsInline
          />
        ) : (
          <img className="lightbox__media" src={item.url} alt="" />
        )}
        {many && (
          <figcaption className="lightbox__count">
            {index + 1} / {media.length}
          </figcaption>
        )}
      </figure>
    </div>
  );
}
