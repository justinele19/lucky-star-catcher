/**
 * Fold a new memory into a star.
 *
 * Files become data URLs so everything works offline with no backend. When you
 * move to Supabase, swap `readFile` for an upload to Storage and keep the same
 * { id, type, url } shape — nothing else has to change.
 */

import { useRef, useState } from 'react';
import { STAR_COLORS } from '../design/tokens.js';
import { todayISO } from '../utils/format.js';

const MAX_FILE_MB = 4;

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve({
        id: `${file.name}-${Date.now()}`,
        type: file.type.startsWith('video') ? 'video' : 'image',
        url: reader.result,
      });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * `sendToName` switches the sheet from "fold this into my jar" to "fold this
 * and send it" — same form, different destination, set by whoever opened it.
 */
export default function ComposeSheet({ onSave, onCancel, sendToName }) {
  const [text, setText] = useState('');
  const [occurredOn, setOccurredOn] = useState('');
  const [color, setColor] = useState(STAR_COLORS[0]);
  const [media, setMedia] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const addFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    const tooBig = files.find((f) => f.size > MAX_FILE_MB * 1024 * 1024);
    if (tooBig) {
      setError(
        `${tooBig.name} is over ${MAX_FILE_MB}MB. Pick a smaller file, or hook up storage.`
      );
      return;
    }
    setError('');
    const loaded = await Promise.all(files.map(readFile));
    setMedia((current) => [...current, ...loaded]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const canSave = text.trim().length > 0 || media.length > 0;

  const save = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    await onSave({ text, occurredOn, color, media });
  };

  return (
    <div className="sheet-scrim" onPointerDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={sendToName ? `Send a star to ${sendToName}` : 'Fold a memory'}
      >
        <h2 className="sheet__title">
          {sendToName ? `Send a star to ${sendToName}` : 'Fold a memory'}
        </h2>
        <p className="sheet__hint">
          {sendToName
            ? 'It arrives folded. They get to open it themselves.'
            : "It goes in the jar as a star. You'll find it again when you pull it out."}
        </p>

        <label className="field">
          <span className="field__label">What happened</span>
          <textarea
            className="field__textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write it the way you'd tell it…"
          />
        </label>

        <label className="field">
          <span className="field__label">When it happened (optional)</span>
          <input
            className="field__input"
            type="date"
            value={occurredOn}
            max={todayISO()}
            onChange={(e) => setOccurredOn(e.target.value)}
          />
        </label>

        <div className="field">
          <span className="field__label">Photos &amp; video</span>
          <button
            type="button"
            className="btn btn--ghost"
            style={{ color: 'var(--ink)', borderColor: 'var(--card-edge)' }}
            onClick={() => fileRef.current?.click()}
          >
            Add files
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={addFiles}
          />
          {media.length > 0 && (
            <div className="thumbs">
              {media.map((m) => (
                <span className="thumb" key={m.id}>
                  {m.type === 'video' ? (
                    <video src={m.url} muted />
                  ) : (
                    <img src={m.url} alt="" />
                  )}
                  <button
                    type="button"
                    className="thumb__remove"
                    aria-label="Remove"
                    onClick={() =>
                      setMedia((cur) => cur.filter((x) => x.id !== m.id))
                    }
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="field">
          <span className="field__label">Paper</span>
          <div className="swatches">
            {STAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Paper colour ${c}`}
                aria-pressed={c === color}
                className={'swatch' + (c === color ? ' swatch--on' : '')}
                style={{ background: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>

        {error && (
          <p style={{ color: '#b3402f', fontSize: 'var(--size-small)' }}>{error}</p>
        )}

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave || saving}
            onClick={save}
          >
            {saving
              ? sendToName
                ? 'Sending…'
                : 'Folding…'
              : sendToName
              ? 'Fold & send'
              : 'Fold it'}
          </button>
        </div>
      </div>
    </div>
  );
}
