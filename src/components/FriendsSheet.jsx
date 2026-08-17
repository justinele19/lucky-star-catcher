/**
 * Every friend and group has a jar holding the stars the two of you have sent
 * each other. This is the way in.
 */

export default function FriendsSheet({
  friends,
  countFor, // (friendId) => number of stars in that jar
  onOpenJar,
  onSimulateIncoming, // dev helper; delete this prop once the backend is real
  onCancel,
}) {
  return (
    <div
      className="sheet-scrim"
      onPointerDown={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Friends">
        <h2 className="sheet__title">Friends</h2>
        <p className="sheet__hint">
          Every friend has a jar. Stars you've traded live in it.
        </p>

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
                      {count === 0
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
        <div className="sheet__actions" style={{ justifyContent: 'space-between' }}>
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
