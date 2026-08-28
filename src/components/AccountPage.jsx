/**
 * Your account.
 *
 * There's no sign-in yet — everything lives on this device — so this page is
 * what it honestly can be: who you are on the paper, a count of what's in the
 * jars, and the one destructive button, kept behind a confirm.
 *
 * When auth arrives, the header here is where the real profile goes and
 * `onReset` gets company.
 */

import { useState } from 'react';

function Stat({ value, label }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function AccountPage({ user, stats, friends, onRename, onReset }) {
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const dirty = name.trim() && name.trim() !== user?.name;

  const save = async () => {
    if (!dirty) return;
    await onRename(name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const groups = friends.filter((f) => f.kind === 'group').length;
  const people = friends.length - groups;

  return (
    <div className="page">
      <div className="page__card">
        <div className="account__head">
          <span className="avatar avatar--xl" aria-hidden="true">
            {(user?.name || '?')[0]}
          </span>
          <div>
            <h2 className="account__name">{user?.name}</h2>
            <p className="account__sub">
              {people} friend{people === 1 ? '' : 's'}
              {groups > 0 && ` · ${groups} group${groups === 1 ? '' : 's'}`}
            </p>
          </div>
        </div>

        <label className="field">
          <span className="field__label">What your friends see</span>
          <div className="field__row">
            <input
              className="field__input"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && save()}
            />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!dirty}
              onClick={save}
            >
              {saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </label>
      </div>

      <div className="page__card">
        <h3 className="page__heading">Your jars</h3>
        <div className="stats">
          <Stat value={stats.folded} label="folded" />
          <Stat value={stats.sent} label="sent" />
          <Stat value={stats.received} label="received" />
          <Stat value={stats.waiting} label="waiting" />
        </div>
      </div>

      <div className="page__card page__card--warn">
        <h3 className="page__heading">Start over</h3>
        <p className="page__note">
          Everything is stored in this browser, on this device. Clearing it puts
          the app back to its first run — the stars you folded don't come back.
        </p>
        {confirming ? (
          <div className="sheet__actions" style={{ marginTop: 'var(--sp-4)' }}>
            <button
              type="button"
              className="btn"
              onClick={() => setConfirming(false)}
            >
              Keep them
            </button>
            <button type="button" className="btn btn--danger" onClick={onReset}>
              Yes, clear everything
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn--outline btn--danger-outline"
            style={{ marginTop: 'var(--sp-3)' }}
            onClick={() => setConfirming(true)}
          >
            Clear all my data
          </button>
        )}
      </div>
    </div>
  );
}
