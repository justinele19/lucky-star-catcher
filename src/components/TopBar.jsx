/**
 * Title on the left, the shooting-star inbox on the right.
 *
 * The icon lights up and pulses the moment a star is waiting, and carries the
 * count so you know how many.
 */

function ShootingStarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      {/* the tail */}
      <path
        d="M3 20 L10.5 12.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M6.5 21.5 L11.5 16.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.3"
      />
      {/* the star */}
      <path
        d="M15.5 4.2 l1.85 3.75 4.15.6-3 2.93.71 4.13-3.71-1.95-3.71 1.95.71-4.13-3-2.93 4.15-.6z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function TopBar({
  title,
  subtitle,
  inboxCount = 0,
  onInboxClick,
  onBack,
}) {
  return (
    <header className="topbar">
      {onBack ? (
        <button type="button" className="btn btn--ghost" onClick={onBack}>
          ← Back
        </button>
      ) : (
        <div>
          <h1 className="topbar__title">{title}</h1>
          {subtitle && <p className="topbar__sub">{subtitle}</p>}
        </div>
      )}

      {onBack && (
        <div style={{ textAlign: 'right' }}>
          <h1 className="topbar__title">{title}</h1>
          {subtitle && <p className="topbar__sub">{subtitle}</p>}
        </div>
      )}

      {!onBack && (
        <button
          type="button"
          className={'inbox-btn' + (inboxCount > 0 ? ' inbox-btn--lit' : '')}
          onClick={onInboxClick}
          aria-label={
            inboxCount > 0
              ? `${inboxCount} star${inboxCount === 1 ? '' : 's'} waiting`
              : 'No stars waiting'
          }
        >
          <ShootingStarIcon />
          {inboxCount > 0 && <span className="inbox-btn__count">{inboxCount}</span>}
        </button>
      )}
    </header>
  );
}
