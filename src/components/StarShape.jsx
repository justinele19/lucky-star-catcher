/**
 * One folded lucky star.
 *
 * The path is generated rather than hard-coded, so you can change how puffy or
 * how sharp the stars look by editing `bulge` and `innerRatio` below instead of
 * fighting a wall of SVG coordinates.
 */

const VIEW = 100;
const CENTER = VIEW / 2;

/**
 * @param outer      radius of the five points
 * @param innerRatio how far in the valleys sit (smaller = spikier)
 * @param bulge      pushes the valley control points outward, giving the
 *                   inflated look of a real folded star (1 = flat edges)
 */
function starPath({ outer = 47, innerRatio = 0.46, bulge = 1.34, points = 5 }) {
  const step = (Math.PI * 2) / points;
  const start = -Math.PI / 2; // first point straight up
  const inner = outer * innerRatio;
  const d = [];

  for (let i = 0; i < points; i += 1) {
    const tipAngle = start + i * step;
    const nextTip = start + (i + 1) * step;
    const valley = tipAngle + step / 2;

    const tip = [
      CENTER + Math.cos(tipAngle) * outer,
      CENTER + Math.sin(tipAngle) * outer,
    ];
    const next = [
      CENTER + Math.cos(nextTip) * outer,
      CENTER + Math.sin(nextTip) * outer,
    ];
    // Control point sits in the valley, pushed out to inflate the edge.
    const ctrl = [
      CENTER + Math.cos(valley) * inner * bulge,
      CENTER + Math.sin(valley) * inner * bulge,
    ];

    if (i === 0) d.push(`M ${tip[0].toFixed(2)} ${tip[1].toFixed(2)}`);
    d.push(
      `Q ${ctrl[0].toFixed(2)} ${ctrl[1].toFixed(2)} ${next[0].toFixed(
        2
      )} ${next[1].toFixed(2)}`
    );
  }
  d.push('Z');
  return d.join(' ');
}

/** The five creases running from the centre out to each point. */
function creaseLines({ outer = 47, points = 5 }) {
  const step = (Math.PI * 2) / points;
  const start = -Math.PI / 2;
  return Array.from({ length: points }, (_, i) => {
    const a = start + i * step;
    return {
      x: CENTER + Math.cos(a) * outer * 0.94,
      y: CENTER + Math.sin(a) * outer * 0.94,
    };
  });
}

export default function StarShape({
  color = '#ffd75e',
  bulge = 1.25,
  innerRatio = 0.44,
  showCreases = true,
  className,
  style,
  ...rest
}) {
  const path = starPath({ bulge, innerRatio });
  const creases = creaseLines({});
  const gradientId = `star-shade-${color.replace('#', '')}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={className}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        <radialGradient id={gradientId} cx="36%" cy="30%" r="78%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.22" />
        </radialGradient>
      </defs>

      <path d={path} fill={color} />
      <path d={path} fill={`url(#${gradientId})`} />

      {showCreases &&
        creases.map((p, i) => (
          <line
            key={i}
            x1={CENTER}
            y1={CENTER}
            x2={p.x}
            y2={p.y}
            stroke="#000"
            strokeOpacity="0.1"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        ))}
    </svg>
  );
}
