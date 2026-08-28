/**
 * One folded lucky star.
 *
 * A real lucky star isn't a flat five-pointed outline — it's a pentagon of
 * paper with ten triangular facets pushed out into a little pillow. Each point
 * has a raised ridge running from the centre to its tip, and a crease falling
 * into the valley on either side.
 *
 * So that's how it's built: ten facets, each shaded by which way it faces
 * relative to a light up and to the left. That per-facet shading is what makes
 * it read as puffed paper rather than a sticker. On top of that go the ridge
 * highlights, the crease shadows, and a grain overlay from StarDefs.
 *
 * Every facet is its own <path> with a `--facet-dir` custom property, which is
 * what lets the unfold animation peel the points back one direction at a time.
 */

import { useId, useMemo } from 'react';

const VIEW = 100;
const C = VIEW / 2;

/* Light sits up and to the left, the way it does on everything else here.
   The lift/sink pair is the contrast between a facet turned into the light and
   one turned away — push them up and the star reads as more sharply folded. */
const LIGHT_ANGLE = (-125 * Math.PI) / 180;
const LIFT = 0.52; // how much a facet turned into the light brightens
const SINK = 0.44; // how much one turned away darkens

/* Within a single facet the paper still curves: brightest along the raised
   ridge near the middle of the star, falling away toward the outer edge. */
const FACET_CREST = 0.2;
const FACET_FALL = 0.26;

/* --- Colour maths ---------------------------------------------------------
   Facet fills are computed from the paper colour rather than listed, so a new
   entry in STAR_COLORS needs no extra work here. */

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

const mix = (rgb, target, amount) => ({
  r: Math.round(rgb.r + (target - rgb.r) * amount),
  g: Math.round(rgb.g + (target - rgb.g) * amount),
  b: Math.round(rgb.b + (target - rgb.b) * amount),
});

const css = ({ r, g, b }) => `rgb(${r},${g},${b})`;

/** Shade a colour by how far its facet is turned toward the light (-1…1). */
function shadeRgb(rgb, facing) {
  return facing >= 0
    ? mix(rgb, 255, facing * LIFT)
    : mix(rgb, 12, -facing * SINK);
}

/* --- Geometry -------------------------------------------------------------- */

/**
 * @param outer      radius out to the five points
 * @param innerRatio how deep the valleys cut in (smaller = spikier)
 * @param bulge      where the edge between two points bows. Under 1 the edge
 *                   curves inward, which is what a real lucky star does — the
 *                   plumpness comes from the shading, not from a fat outline.
 */
function buildStar({ outer = 47, innerRatio = 0.5, bulge = 0.88, points = 5 }) {
  const step = (Math.PI * 2) / points;
  const start = -Math.PI / 2; // first point straight up
  const inner = outer * innerRatio;

  const tips = Array.from({ length: points }, (_, i) => {
    const angle = start + i * step;
    return {
      angle,
      x: C + Math.cos(angle) * outer,
      y: C + Math.sin(angle) * outer,
    };
  });

  const facets = [];
  const valleys = [];
  const outline = [];

  tips.forEach((tip, i) => {
    const next = tips[(i + 1) % points];
    const valleyAngle = tip.angle + step / 2;

    // Control point for the bulged edge running tip → tip.
    const ctrl = {
      x: C + Math.cos(valleyAngle) * inner * bulge,
      y: C + Math.sin(valleyAngle) * inner * bulge,
    };

    // Split that edge in half (de Casteljau at t=0.5). The midpoint is the
    // valley, and each half becomes the outer edge of one facet.
    const h0 = { x: (tip.x + ctrl.x) / 2, y: (tip.y + ctrl.y) / 2 };
    const h1 = { x: (ctrl.x + next.x) / 2, y: (ctrl.y + next.y) / 2 };
    const valley = {
      x: (h0.x + h1.x) / 2,
      y: (h0.y + h1.y) / 2,
      angle: valleyAngle,
    };
    valleys.push(valley);

    if (i === 0) outline.push(`M ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`);
    outline.push(
      `Q ${ctrl.x.toFixed(2)} ${ctrl.y.toFixed(2)} ${next.x.toFixed(
        2
      )} ${next.y.toFixed(2)}`
    );

    // A quadratic reversed keeps the same control point, so both halves are
    // described the same way: centre → tip → curve → valley.
    facets.push({
      key: `${i}a`,
      tip,
      ctrl: h0,
      edge: valley,
      facing: tip.angle + step / 4,
    });
    facets.push({
      key: `${i}b`,
      tip: next,
      ctrl: h1,
      edge: valley,
      facing: next.angle - step / 4,
    });
  });

  outline.push('Z');

  const facetPath = (f) =>
    `M ${C} ${C} L ${f.tip.x.toFixed(2)} ${f.tip.y.toFixed(2)} ` +
    `Q ${f.ctrl.x.toFixed(2)} ${f.ctrl.y.toFixed(2)} ` +
    `${f.edge.x.toFixed(2)} ${f.edge.y.toFixed(2)} Z`;

  return {
    tips,
    valleys,
    outline: outline.join(' '),
    facets: facets.map((f) => ({
      ...f,
      d: facetPath(f),
      // Where this facet's outer edge sits, for the gradient to aim at.
      out: { x: (f.tip.x + f.edge.x) / 2, y: (f.tip.y + f.edge.y) / 2 },
    })),
  };
}

export default function StarShape({
  color = '#ffd75e',
  bulge = 0.88,
  innerRatio = 0.5,
  showCreases = true,
  showGrain = true,
  className,
  style,
  ...rest
}) {
  const uid = useId().replace(/:/g, '');
  const { tips, valleys, outline, facets } = useMemo(
    () => buildStar({ bulge, innerRatio }),
    [bulge, innerRatio]
  );

  const rgb = useMemo(() => hexToRgb(color), [color]);
  const rim = useMemo(() => css(mix(rgb, 12, 0.34)), [rgb]);

  /* Each facet gets its own two-stop gradient running from the middle of the
     star out to its edge. The base tone comes from which way the facet faces;
     the gradient is the curve of the paper across it. Together they're what
     makes the thing look inflated rather than printed. */
  const shaded = useMemo(
    () =>
      facets.map((f) => {
        const base = shadeRgb(rgb, Math.cos(f.facing - LIGHT_ANGLE));
        return {
          ...f,
          crest: css(mix(base, 255, FACET_CREST)),
          fall: css(mix(base, 16, FACET_FALL)),
        };
      }),
    [facets, rgb]
  );

  return (
    <svg
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      className={'star-svg' + (className ? ` ${className}` : '')}
      style={style}
      aria-hidden="true"
      {...rest}
    >
      <defs>
        {/* The overall dome — brightest where the light lands, falling off to
            a shaded underside. Ties the ten facets into one object; kept light
            now that each facet carries its own gradient. */}
        <radialGradient id={`dome-${uid}`} cx="33%" cy="26%" r="82%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.24" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0.02" />
          <stop offset="100%" stopColor="#1a1206" stopOpacity="0.26" />
        </radialGradient>

        {/* A tight specular where the paper is most sharply curved. */}
        <radialGradient id={`spec-${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>

        <clipPath id={`clip-${uid}`}>
          <path d={outline} />
        </clipPath>

        {shaded.map((f) => (
          <linearGradient
            key={f.key}
            id={`f-${uid}-${f.key}`}
            gradientUnits="userSpaceOnUse"
            x1={C}
            y1={C}
            x2={f.out.x}
            y2={f.out.y}
          >
            <stop offset="0%" stopColor={f.crest} />
            <stop offset="100%" stopColor={f.fall} />
          </linearGradient>
        ))}
      </defs>

      {/* Ten facets — two per point, meeting along the raised ridge that runs
          out to it. Each is filled by which way it faces the light and how the
          paper curves across it. That's the whole reason it reads as folded
          rather than drawn. */}
      <g className="star__facets">
        {shaded.map((f) => (
          <path
            key={f.key}
            className="star__facet"
            d={f.d}
            fill={`url(#f-${uid}-${f.key})`}
            style={{ '--facet-dir': `${(f.facing * 180) / Math.PI + 90}deg` }}
          />
        ))}
      </g>

      <g clipPath={`url(#clip-${uid})`}>
        {/* Paper fibre. The pattern lives in StarDefs so every star on screen
            shares one rasterised copy of it. */}
        {showGrain && (
          <path
            d={outline}
            fill="url(#lsc-paper-grain)"
            opacity="0.5"
            style={{ mixBlendMode: 'multiply' }}
          />
        )}

        <path d={outline} fill={`url(#dome-${uid})`} />

        {showCreases && (
          <g className="star__creases">
            {/* Creases falling into each valley — where the paper folds in. */}
            {valleys.map((v, i) => (
              <line
                key={`v${i}`}
                x1={C}
                y1={C}
                x2={v.x}
                y2={v.y}
                stroke="#2a1c08"
                strokeOpacity="0.3"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ))}
            {/* Ridges running out to each point — raised, so they catch light,
                with a thin shadow alongside to give the fold an edge. */}
            {tips.map((t, i) => (
              <g key={`t${i}`}>
                <line
                  x1={C}
                  y1={C}
                  x2={C + (t.x - C) * 0.95}
                  y2={C + (t.y - C) * 0.95}
                  stroke="#fff"
                  strokeOpacity="0.55"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <line
                  x1={C}
                  y1={C}
                  x2={C + (t.x - C) * 0.95}
                  y2={C + (t.y - C) * 0.95}
                  stroke="#2a1c08"
                  strokeOpacity="0.12"
                  strokeWidth="0.7"
                  strokeLinecap="round"
                  transform="translate(1.1 1.1)"
                />
              </g>
            ))}
          </g>
        )}

        {/* Cut edge of the paper strip, catching a little light all round. */}
        <path
          d={outline}
          fill="none"
          stroke={rim}
          strokeOpacity="0.5"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <ellipse
          cx="34"
          cy="30"
          rx="15"
          ry="11"
          fill={`url(#spec-${uid})`}
          transform="rotate(-24 34 30)"
        />
      </g>
    </svg>
  );
}
