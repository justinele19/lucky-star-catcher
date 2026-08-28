/**
 * Every friend and group has a jar holding the stars the two of you have sent
 * each other. This is the way in — and the way to add new ones.
 *
 * One sheet, three modes: the list of jars, the form for a new friend, and the
 * form for a new group. A group is just a friend with `kind: 'group'` and a
 * list of members, so both forms end up in the same shape.
 */

import { useState } from 'react';
import { STAR_COLORS } from '../design/tokens.js';

function Avatar({ friend, size = 34 }) {
  return (
    <span
      aria-hidden="true"
      className="avatar"
      style={{ width: size, height: size, background: friend.color }}
    >
      {friend.name[0]}
    </span>
  );
}

function ColorField({ value, onChange }) {
  return (
    <div className="field">
      <span className="field__label">Paper</span>
      <div className="swatches">
        {STAR_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`Colour ${c}`}
            aria-pressed={c === value}
            className={'swatch' + (c === value ? ' swatch--on' : '')}
            style={{ background: c }}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

export default function FriendsSheet({
  friends,
  countFor, // (friendId) => number of stars in that jar
  onOpenJar,
  onAddFriend, // ({ name, color }) => Promise
  onAddGroup, // ({ name, color, memberIds }) => Promise
  onSimulateIncoming, // dev helper; delete this prop once the backend is real
  onCancel,
}) {
  const [mode, setMode] = useState('list'); // 'list' | 'friend' | 'group'
  const [name, setName] = useState('');
  const [color, setColor] = useState(STAR_COLORS[0]);
  const [memberIds, setMemberIds] = useState([]);
  const [busy, setBusy] = useState(false);

  const people = friends.filter((f) => f.kind !== 'group');

  const openForm = (which) => {
    setName('');
    setColor(STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)]);
    setMemberIds([]);
    setMode(which);
  };

  const toggleMember = (id) =>
    setMemberIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );

  const canSave =
    name.trim().length > 0 && (mode !== 'group' || memberIds.length > 0);

  const save = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    if (mode === 'friend') await onAddFriend({ name, color });
    else await onAddGroup({ name, color, memberIds });
    setBusy(false);
    setMode('list');
  };

  /* ------------------------------------------------------------ the list -- */
  if (mode === 'list') {
    return (
      <div
        className="sheet-scrim"
        onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
      >
        <div
          className="sheet"
          role="dialog"
          aria-modal="true"
          aria-label="Friends"
        >
          <h2 className="sheet__title">Friends</h2>
          <p className="sheet__hint">
            Every friend has a jar. Stars you've traded live in it.
          </p>

          <div className="sheet__add-row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => openForm('friend')}
            >
              + Add a friend
            </button>
            <button
              type="button"
              className="btn btn--outline"
              onClick={() => openForm('group')}
              disabled={people.length < 2}
              title={
                people.length < 2
                  ? 'Add a couple of friends first'
                  : undefined
              }
            >
              + New group
            </button>
          </div>

          <ul className="jar-list">
            {friends.map((friend) => {
              const count = countFor(friend.id);
              return (
                <li key={friend.id}>
                  <button
                    type="button"
                    className="jar-row"
                    onClick={() => onOpenJar(friend.id)}
                  >
                    <Avatar friend={friend} />
                    <span>
                      <span className="jar-row__name">{friend.name}</span>
                      <br />
                      <span className="jar-row__meta">
                        {friend.kind === 'group' && friend.members?.length
                          ? `Group · ${friend.members.join(', ')}`
                          : count === 0
                          ? 'Empty jar'
                          : `${count} star${count === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <span className="jar-row__spacer" />
                    <span aria-hidden="true">→</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ---- Dev helper -------------------------------------------------
              Stands in for a friend sending you something. Remove this block
              once Supabase realtime is wired up. */}
          <div
            className="sheet__actions"
            style={{ justifyContent: 'space-between' }}
          >
            <button
              type="button"
              className="btn"
              style={{ fontSize: 'var(--size-small)', color: 'var(--ink-soft)' }}
              onClick={onSimulateIncoming}
            >
              Simulate an incoming star
            </button>
            <button type="button" className="btn btn--primary" onClick={onCancel}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------ the form -- */
  const isGroup = mode === 'group';

  return (
    <div
      className="sheet-scrim"
      onPointerDown={(e) => e.target === e.currentTarget && setMode('list')}
    >
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={isGroup ? 'New group' : 'Add a friend'}
      >
        <h2 className="sheet__title">
          {isGroup ? 'New group' : 'Add a friend'}
        </h2>
        <p className="sheet__hint">
          {isGroup
            ? 'A shared jar. Everything sent to it lands in one place.'
            : 'They get a jar of their own, empty until one of you fills it.'}
        </p>

        <label className="field">
          <span className="field__label">
            {isGroup ? 'What to call it' : 'Their name'}
          </span>
          <input
            className="field__input"
            value={name}
            autoFocus
            placeholder={isGroup ? 'The Roomies' : 'Mira'}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        {isGroup && (
          <div className="field">
            <span className="field__label">Who's in it</span>
            <ul className="jar-list">
              {people.map((friend) => {
                const on = memberIds.includes(friend.id);
                return (
                  <li key={friend.id}>
                    <button
                      type="button"
                      className="jar-row"
                      aria-pressed={on}
                      onClick={() => toggleMember(friend.id)}
                      style={
                        on
                          ? { borderColor: friend.color, borderWidth: 2 }
                          : undefined
                      }
                    >
                      <Avatar friend={friend} size={28} />
                      <span className="jar-row__name">{friend.name}</span>
                      <span className="jar-row__spacer" />
                      <span aria-hidden="true">{on ? '★' : '☆'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <ColorField value={color} onChange={setColor} />

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={() => setMode('list')}>
            Back
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!canSave || busy}
            onClick={save}
          >
            {busy ? 'Saving…' : isGroup ? 'Make the group' : 'Add them'}
          </button>
        </div>
      </div>
    </div>
  );
}
