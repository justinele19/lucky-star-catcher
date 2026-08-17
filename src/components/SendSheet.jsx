/**
 * Send a star to friends or a group. The original stays in your jar; each
 * recipient gets their own copy.
 */

import { useState } from 'react';

export default function SendSheet({ friends, onSend, onCancel }) {
  const [selected, setSelected] = useState([]);
  const [sending, setSending] = useState(false);

  const toggle = (id) =>
    setSelected((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const send = async () => {
    if (!selected.length || sending) return;
    setSending(true);
    await onSend(selected);
  };

  return (
    <div
      className="sheet-scrim"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Send this star">
        <h2 className="sheet__title">Send this star</h2>
        <p className="sheet__hint">
          It arrives folded. They get to open it themselves.
        </p>

        <ul className="jar-list">
          {friends.map((friend) => {
            const on = selected.includes(friend.id);
            return (
              <li key={friend.id}>
                <button
                  type="button"
                  className="jar-row"
                  aria-pressed={on}
                  onClick={() => toggle(friend.id)}
                  style={on ? { borderColor: friend.color, borderWidth: 2 } : undefined}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: '50%',
                      background: friend.color,
                      display: 'grid',
                      placeItems: 'center',
                      fontFamily: 'var(--font-display)',
                      color: 'var(--accent-ink)',
                    }}
                  >
                    {friend.name[0]}
                  </span>
                  <span>
                    <span className="jar-row__name">{friend.name}</span>
                    <br />
                    <span className="jar-row__meta">
                      {friend.kind === 'group'
                        ? `Group · ${friend.members?.join(', ') || ''}`
                        : 'Friend'}
                    </span>
                  </span>
                  <span className="jar-row__spacer" />
                  <span aria-hidden="true">{on ? '★' : '☆'}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!selected.length || sending}
            onClick={send}
          >
            {sending
              ? 'Sending…'
              : `Send${selected.length ? ` to ${selected.length}` : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
