/**
 * The flat pentagon a lucky star is before you pinch it into shape.
 *
 * Between the puffed star and the strip of paper there's this: the knot, with
 * the long tail wound round it until it ran out and the end tucked under. The
 * criss-cross inside is those wraps — each one crosses the pentagon from a
 * corner to the far side, which is exactly the pattern you see on a real one
 * before you pop it.
 *
 * `tail` is the tucked end, drawn folded flat against the edge; the unfold
 * animation swings it back out.
 */

const VIEW = 100;
const C = VIEW / 2;
const R = 42;

const corners = Array.from({ length: 5 }, (_, i) => {
  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
  return { x: C + Math.cos(a) * R, y: C + Math.sin(a) * R };
});

const body = corners
  .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
  .join(' ');

export default function PaperPentagon({ color = '#ffd75e', className }) {
  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={'pentagon' + (className ? ` ${className}` : '')}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="pent-shade" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1a1206" stopOpacity="0.2" />
        </linearGradient>
        <clipPath id="pent-clip">
          <path d={`${body} Z`} />
        </clipPath>
      </defs>

      {/* The tucked-in end, folded flat under the edge until it's let go. */}
      <g className="pentagon__tail">
        <path
          d={`M ${corners[3].x} ${corners[3].y}
              L ${corners[3].x - 20} ${corners[3].y + 11}
              L ${corners[3].x - 17} ${corners[3].y + 21}
              L ${corners[4].x - 2} ${corners[4].y + 9} Z`}
          fill={color}
          stroke="#2a1c08"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
      </g>

      <path d={`${body} Z`} fill={color} />

      <g clipPath="url(#pent-clip)">
        {/* Paper grain, shared with the stars. */}
        <path
          d={`${body} Z`}
          fill="url(#lsc-paper-grain)"
          opacity="0.45"
          style={{ mixBlendMode: 'multiply' }}
        />

        {/* The wraps. Each crosses from one corner to the far side, the way
            the strip actually lies once it's been wound round. */}
        {corners.map((p, i) => {
          const q = corners[(i + 2) % 5];
          return (
            <line
              key={i}
              x1={p.x}
              y1={p.y}
              x2={q.x}
              y2={q.y}
              stroke="#2a1c08"
              strokeOpacity="0.16"
              strokeWidth="1.2"
            />
          );
        })}

        <path d={`${body} Z`} fill="url(#pent-shade)" />
      </g>

      <path
        d={`${body} Z`}
        fill="none"
        stroke="#2a1c08"
        strokeOpacity="0.28"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
