/**
 * The glass itself.
 *
 * Drawn from JAR_GEOMETRY through the same helpers useJarPhysics builds its
 * walls from — so a star can never rest somewhere the glass isn't.
 *
 * Rendered in two layers with the stars sandwiched between them: `back` is
 * everything you'd see through the jar (the far wall, the inside of the base,
 * the shadowed corners), `front` is everything that sits between you and the
 * contents (near rim, highlights, the screw band). Splitting it that way is
 * most of what makes the jar feel like it has a volume rather than an outline.
 *
 * The mouth is drawn open — an ellipse, not a flat line — because that's both
 * how a jar reads in perspective and how you get stars in and out of this one.
 */

import { jarBodyPath, jarMetrics } from '../design/tokens.js';

/**
 * A highlight shaped like light actually sits on glass: pinched to nothing at
 * both ends, swelling through the middle, and bowed to follow the curve of the
 * jar. `bow` pushes the waist sideways; positive leans it right.
 *
 * This is what a plain stroked line can't do — a round-capped stroke is the
 * same width all the way down, which is why it reads as a drawn oval instead
 * of a reflection.
 */
function lensPath(cx, yTop, yBot, halfW, bow = 0) {
  const k = (yBot - yTop) * 0.32;
  const mx = cx + bow;
  return [
    `M ${cx} ${yTop}`,
    `C ${mx - halfW} ${yTop + k} ${mx - halfW} ${yBot - k} ${cx + bow * 0.35} ${yBot}`,
    `C ${mx + halfW} ${yBot - k} ${mx + halfW} ${yTop + k} ${cx} ${yTop}`,
    'Z',
  ].join(' ');
}

export default function JarGlass({ width: w, height: h, layer = 'back' }) {
  if (!w || !h) return null;

  const { L, R, NL, NR, NT, NB, SH, FL } = jarMetrics(w, h);
  const body = jarBodyPath(w, h);

  const halfBody = (R - L) / 2;
  const halfNeck = (NR - NL) / 2;
  const floorRy = halfBody * 0.15;
  const baseThickness = h * 0.028;

  /* The lid: a metal disc sitting over the mouth, overhanging the neck the way
     a mason jar's does, with the screw band gripping the threads below it. */
  const lidRx = halfNeck + w * 0.03;
  const lidRy = lidRx * 0.17; // how much of the top face you can see
  const lidCy = NT + lidRy; // top face, so nothing rises above the rim
  const lidDepth = h * 0.026; // the disc's own thickness

  const bandTop = lidCy + lidDepth - h * 0.002;
  const bandBottom = NB - h * 0.004;

  /* ---------------------------------------------------------------- back -- */
  if (layer === 'back') {
    return (
      <svg
        className="jar__glass jar__back"
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
      >
        <defs>
          {/* Across the jar: nearly clear through the middle where you're
              looking through two thin walls, dense at the edges where the
              glass turns away and you're looking through a lot of it. */}
          <linearGradient id="jar-across" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--glass-edge)" stopOpacity="0.62" />
            <stop offset="12%" stopColor="var(--glass)" stopOpacity="0.9" />
            <stop offset="38%" stopColor="var(--glass)" stopOpacity="0.42" />
            <stop offset="62%" stopColor="var(--glass)" stopOpacity="0.42" />
            <stop offset="88%" stopColor="var(--glass)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--glass-edge)" stopOpacity="0.62" />
          </linearGradient>

          {/* Down the jar: the shoulder catches the sky, the base pools. */}
          <linearGradient id="jar-down" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dceaff" stopOpacity="0.16" />
            <stop offset="34%" stopColor="#dceaff" stopOpacity="0.03" />
            <stop offset="100%" stopColor="var(--glass-deep)" stopOpacity="0.5" />
          </linearGradient>

          {/* The far wall, seen through the jar behind the stars. */}
          <linearGradient id="jar-farwall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--glass-deep)" stopOpacity="0.55" />
            <stop offset="45%" stopColor="var(--glass-deep)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--glass-deep)" stopOpacity="0.46" />
          </linearGradient>

          <radialGradient id="jar-floor" cx="50%" cy="34%" r="72%">
            <stop offset="0%" stopColor="var(--glass-deep)" stopOpacity="0.62" />
            <stop offset="100%" stopColor="var(--glass-edge)" stopOpacity="0.3" />
          </radialGradient>

          <linearGradient id="jar-band" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--metal-hi)" />
            <stop offset="18%" stopColor="var(--metal)" />
            <stop offset="52%" stopColor="var(--metal-dark)" />
            <stop offset="74%" stopColor="var(--metal)" />
            <stop offset="100%" stopColor="var(--metal-dark)" />
          </linearGradient>

          {/* Metal curves across the lid, so it reads as a disc rather than a
              flat grey shape: bright where it faces the light, dark as it
              turns away, with a second glint on the far side. */}
          <linearGradient id="jar-lid-top" x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0%" stopColor="var(--metal-hi)" />
            <stop offset="34%" stopColor="var(--metal)" />
            <stop offset="66%" stopColor="var(--metal-dark)" />
            <stop offset="100%" stopColor="var(--metal)" />
          </linearGradient>
          <linearGradient id="jar-lid-edge" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--metal-dark)" />
            <stop offset="16%" stopColor="var(--metal)" />
            <stop offset="34%" stopColor="var(--metal-hi)" />
            <stop offset="62%" stopColor="var(--metal)" />
            <stop offset="100%" stopColor="var(--metal-dark)" />
          </linearGradient>

          <clipPath id="jar-cavity">
            <path d={`${body} Z`} />
          </clipPath>
        </defs>

        {/* Body of the glass. */}
        <path d={`${body} Z`} fill="url(#jar-across)" />
        <path d={`${body} Z`} fill="url(#jar-down)" />

        <g clipPath="url(#jar-cavity)">
          {/* The wall on the far side, behind everything in the jar. */}
          <path d={`${body} Z`} fill="url(#jar-farwall)" />

          {/* Inside the base: an ellipse, because you're looking slightly down
              into it. Stars come to rest on its near edge. */}
          <ellipse
            cx={w / 2}
            cy={FL - floorRy}
            rx={halfBody}
            ry={floorRy}
            fill="url(#jar-floor)"
          />
          {/* Thick pressed-glass base under that. */}
          <rect
            x={L}
            y={FL - baseThickness}
            width={R - L}
            height={baseThickness + 2}
            fill="var(--glass-deep)"
            opacity="0.34"
          />

          {/* Corners darken where the wall curves out of sight. */}
          <rect
            x={L}
            y={SH - h * 0.02}
            width={(R - L) * 0.13}
            height={FL - SH}
            fill="var(--glass-deep)"
            opacity="0.4"
            style={{ filter: 'blur(6px)' }}
          />
          <rect
            x={R - (R - L) * 0.13}
            y={SH - h * 0.02}
            width={(R - L) * 0.13}
            height={FL - SH}
            fill="var(--glass-deep)"
            opacity="0.4"
            style={{ filter: 'blur(6px)' }}
          />
        </g>

        {/* Screw threads on the neck, tilted the way a real thread climbs. */}
        {[0, 1].map((i) => (
          <path
            key={i}
            d={`M ${NL} ${bandBottom + h * 0.006 + i * h * 0.016}
                L ${NR} ${bandBottom + h * 0.001 + i * h * 0.016}`}
            stroke="var(--glass-edge)"
            strokeOpacity="0.4"
            strokeWidth={h * 0.006}
            strokeLinecap="round"
          />
        ))}

        {/* --- The lid ------------------------------------------------------
            Three pieces: the screw band round the neck, the thickness of the
            disc above it, then the flat top face closing the jar off. Drawn
            back-to-front so each sits on the one below. */}

        {/* Screw band. */}
        <rect
          x={NL - w * 0.026}
          y={bandTop}
          width={NR - NL + w * 0.052}
          height={bandBottom - bandTop}
          rx={w * 0.008}
          fill="url(#jar-band)"
        />
        {Array.from({ length: 24 }, (_, i) => {
          const x = NL - w * 0.026 + ((NR - NL + w * 0.052) / 24) * (i + 0.5);
          return (
            <line
              key={i}
              x1={x}
              y1={bandTop + 2}
              x2={x}
              y2={bandBottom - 2}
              stroke="var(--metal-dark)"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
          );
        })}

        {/* The disc's edge — this is the thickness you can see from the side. */}
        <path
          d={`M ${w / 2 - lidRx} ${lidCy}
              L ${w / 2 - lidRx} ${lidCy + lidDepth}
              A ${lidRx} ${lidRy} 0 0 0 ${w / 2 + lidRx} ${lidCy + lidDepth}
              L ${w / 2 + lidRx} ${lidCy} Z`}
          fill="url(#jar-lid-edge)"
        />

        {/* The top face, closing the jar. */}
        <ellipse
          cx={w / 2}
          cy={lidCy}
          rx={lidRx}
          ry={lidRy}
          fill="url(#jar-lid-top)"
        />
        {/* The pressed ring a mason jar lid has stamped into it. */}
        <ellipse
          cx={w / 2}
          cy={lidCy}
          rx={lidRx * 0.7}
          ry={lidRy * 0.7}
          fill="none"
          stroke="var(--metal-dark)"
          strokeOpacity="0.4"
          strokeWidth="1.1"
        />
        <ellipse
          cx={w / 2}
          cy={lidCy - lidRy * 0.12}
          rx={lidRx * 0.7}
          ry={lidRy * 0.7}
          fill="none"
          stroke="var(--metal-hi)"
          strokeOpacity="0.5"
          strokeWidth="1"
        />
      </svg>
    );
  }

  /* --------------------------------------------------------------- front -- */
  return (
    <svg
      className="jar__glass jar__front"
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="jar-sheen" x1="0" y1="0" x2="0.7" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="38%" stopColor="#fff" stopOpacity="0.03" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jar-leftedge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#eaf4ff" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#eaf4ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="jar-rightedge" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#eaf4ff" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#eaf4ff" stopOpacity="0" />
        </linearGradient>

        {/* Highlight fills. Each fades out across its own width, so the
            reflection has no edge to give itself away as a drawn shape. */}
        <linearGradient id="hl-broad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="70%" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hl-crisp" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#fff" stopOpacity="0" />
          <stop offset="50%" stopColor="#fff" stopOpacity="0.78" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hl-soft" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dceaff" stopOpacity="0" />
          <stop offset="50%" stopColor="#dceaff" stopOpacity="0.17" />
          <stop offset="100%" stopColor="#dceaff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="hl-pool" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <clipPath id="jar-cavity-front">
          <path d={`${body} Z`} />
        </clipPath>
      </defs>

      <g clipPath="url(#jar-cavity-front)">
        {/* Thickness at the turn of the glass, on both sides. */}
        <rect
          x={L}
          y={SH - h * 0.05}
          width={(R - L) * 0.1}
          height={FL - SH + h * 0.06}
          fill="url(#jar-leftedge)"
        />
        <rect
          x={R - (R - L) * 0.1}
          y={SH - h * 0.05}
          width={(R - L) * 0.1}
          height={FL - SH + h * 0.06}
          fill="url(#jar-rightedge)"
        />
        {/* Broad sheen across the shoulder. */}
        <path d={`${body} Z`} fill="url(#jar-sheen)" />
      </g>

      {/* Outline. */}
      <path
        d={body}
        fill="none"
        stroke="var(--glass-edge)"
        strokeWidth="1.7"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* --- Reflections ----------------------------------------------------
          Four of them, all tapered and soft-edged: a broad diffuse sheen on
          the lit side, a crisp core inside it, a short one riding the
          shoulder where the glass turns, and a wide dim band on the right
          picking up bounced light. Real glass never shows one even stripe. */}
      <g clipPath="url(#jar-cavity-front)">
        <path
          d={lensPath(
            L + w * 0.11,
            SH + h * 0.02,
            FL - h * 0.08,
            w * 0.055,
            w * 0.015
          )}
          fill="url(#hl-broad)"
        />
        <path
          d={lensPath(
            L + w * 0.075,
            SH + h * 0.05,
            FL - h * 0.16,
            w * 0.016,
            w * 0.008
          )}
          fill="url(#hl-crisp)"
        />
        {/* The turn of the shoulder catches its own short highlight. */}
        <path
          d={lensPath(NL - w * 0.02, NB + h * 0.012, SH + h * 0.03, w * 0.026, -w * 0.03)}
          fill="url(#hl-broad)"
          opacity="0.85"
        />
        {/* Bounced light down the far side — wide, dim, no hard edge. */}
        <path
          d={lensPath(R - w * 0.06, SH + h * 0.07, FL - h * 0.12, w * 0.032)}
          fill="url(#hl-soft)"
        />
        {/* Light pooling in the thick glass of the base. */}
        <ellipse
          cx={w / 2}
          cy={FL - h * 0.012}
          rx={halfBody * 0.52}
          ry={h * 0.009}
          fill="url(#hl-pool)"
        />
      </g>

      {/* Embossed rings near the base, like a real Ball jar. */}
      {[0.075, 0.048].map((k, i) => (
        <path
          key={i}
          d={`M ${L + w * 0.015} ${FL - h * k}
              Q ${w / 2} ${FL - h * k + h * 0.012} ${R - w * 0.015} ${FL - h * k}`}
          fill="none"
          stroke="var(--glass-edge)"
          strokeOpacity={0.4 - i * 0.14}
          strokeWidth="1.3"
        />
      ))}

      {/* Highlight riding the screw band, and the bright line where the lid's
          edge turns under. */}
      <rect
        x={NL - w * 0.026}
        y={bandTop + (bandBottom - bandTop) * 0.2}
        width={NR - NL + w * 0.052}
        height={h * 0.004}
        fill="var(--metal-hi)"
        opacity="0.45"
      />
      <path
        d={`M ${w / 2 - lidRx * 0.72} ${lidCy + lidDepth * 0.34}
            L ${w / 2 - lidRx * 0.1} ${lidCy + lidDepth * 0.5}`}
        stroke="var(--metal-hi)"
        strokeOpacity="0.6"
        strokeWidth={h * 0.003}
        strokeLinecap="round"
      />
    </svg>
  );
}
