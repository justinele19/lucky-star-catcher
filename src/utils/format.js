/**
 * How a date reads on the paper.
 *
 * If someone typed in when the memory actually happened, that date wins — it's
 * the one they cared about. Otherwise we fall back to when the star was folded,
 * and say so, so the two are never confused.
 */

const LONG = { day: 'numeric', month: 'long', year: 'numeric' };

export function formatMemoryDate(star) {
  if (star?.occurredOn) {
    // Parse as local noon so timezones can't shift the day backwards.
    const d = new Date(`${star.occurredOn}T12:00:00`);
    if (!Number.isNaN(d.valueOf())) {
      return d.toLocaleDateString(undefined, LONG);
    }
  }
  if (star?.createdAt) {
    const d = new Date(star.createdAt);
    if (!Number.isNaN(d.valueOf())) {
      return `Folded ${d.toLocaleDateString(undefined, LONG)}`;
    }
  }
  return '';
}

export function formatRelative(iso) {
  const then = new Date(iso).valueOf();
  if (Number.isNaN(then)) return '';
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

/** Today as YYYY-MM-DD, for the date input's default. */
export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
