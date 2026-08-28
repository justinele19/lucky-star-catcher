/**
 * JS side of the design system.
 *
 * Only the values that JavaScript genuinely needs live here — colours the
 * physics engine assigns to new stars, and the jar's interior shape. Anything
 * purely visual belongs in src/styles/tokens.css instead.
 *
 * The jar geometry is the important part: JarGlass draws from it and
 * useJarPhysics builds its walls from it, through the same helpers below. That
 * shared maths is what guarantees a star can never rest somewhere the glass
 * isn't.
 */

/** Keep in sync with the --star-* colours in tokens.css. */
export const STAR_COLORS = [
  '#ff8fb1', // pink
  '#ff9a76', // coral
  '#ffd75e', // butter
  '#b6e36a', // lime
  '#7fd8c0', // mint
  '#7ec5f5', // sky
  '#c4a7f2', // lilac
];

export const pickStarColor = (seed = Math.random()) =>
  STAR_COLORS[Math.floor(seed * STAR_COLORS.length) % STAR_COLORS.length];

/**
 * The jar's interior, described as fractions of the jar's rendered box.
 * 0,0 is the top-left of the jar container; 1,1 is the bottom-right.
 *
 * Nudging these changes both the drawn glass AND the physics walls, so the
 * stars always settle inside the shape you can see.
 */
export const JAR_GEOMETRY = {
  neckTop: 0.105, // the mouth — the rim you drop stars through
  neckLeft: 0.355,
  neckRight: 0.645,
  neckBottom: 0.175, // where the threads end and the shoulder starts falling
  shoulderY: 0.3, // where the jar has flared out to full width
  bodyLeft: 0.05,
  bodyRight: 0.95,
  floorY: 0.945,
  wallThickness: 0.026, // as a fraction of jar width
  /* How the shoulder bows, as a fraction of the neck→shoulder drop. Used by
     both the drawn bezier and the sampled physics wall. */
  shoulderBend: [0.62, 0.34],
};

/** Physics feel. Tune these if the stars are too bouncy or too sluggish. */
export const PHYSICS = {
  gravity: 1.05,
  restitution: 0.24, // bounciness
  friction: 0.36,
  frictionAir: 0.014,
  density: 0.0016,
  throwStrength: 0.2, // how much of your flick speed carries into the throw
  /* Physics runs in fixed slices no longer than this, however long the frame
     took. Big steps are what let a fast star tunnel through the glass. */
  maxStepMs: 8,
};

/** How far above the jar's mouth a dragged star must travel to open. */
export const PULL_OUT_THRESHOLD = 0.06; // fraction of jar height above the lid

/* --------------------------------------------------------------------------
   Jar geometry helpers
   -------------------------------------------------------------------------- */

/** One point on a cubic bezier. */
function cubicAt(p0, p1, p2, p3, t) {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

/** Absolute pixel positions of the geometry, for a jar of w × h. */
export function jarMetrics(w, h) {
  const g = JAR_GEOMETRY;
  return {
    L: g.bodyLeft * w,
    R: g.bodyRight * w,
    NL: g.neckLeft * w,
    NR: g.neckRight * w,
    NT: g.neckTop * h,
    NB: g.neckBottom * h,
    SH: g.shoulderY * h,
    FL: g.floorY * h,
    t: g.wallThickness * w,
  };
}

/** The two control points of one shoulder curve, left or right. */
function shoulderControls(w, h, side) {
  const { L, R, NL, NR, NB, SH } = jarMetrics(w, h);
  const [b1, b2] = JAR_GEOMETRY.shoulderBend;
  const drop = SH - NB;
  const nx = side === 'left' ? NL : NR;
  const bx = side === 'left' ? L : R;
  return [
    { x: nx, y: NB },
    { x: nx, y: NB + drop * b1 },
    { x: bx, y: NB + drop * b2 },
    { x: bx, y: SH },
  ];
}

/**
 * The shoulder sampled into points, from the neck down to the full body.
 * JarGlass draws this stretch as one bezier; the physics walls it as a chain of
 * short segments across the same curve.
 */
export function shoulderPoints(w, h, side, samples = 12) {
  const [p0, p1, p2, p3] = shoulderControls(w, h, side);
  return Array.from({ length: samples + 1 }, (_, i) =>
    cubicAt(p0, p1, p2, p3, i / samples)
  );
}

/**
 * The `d` for the whole jar — mouth, neck, shoulders, body, rounded base.
 *
 * Starts and ends at the rim, so closing it with Z seals the shape across the
 * mouth and the neck is part of the glass rather than a gap above it.
 */
export function jarBodyPath(w, h) {
  const { L, R, NL, NR, NT, NB, SH, FL } = jarMetrics(w, h);
  const [lc1, lc2] = shoulderControls(w, h, 'left').slice(1, 3);
  const [rc1, rc2] = shoulderControls(w, h, 'right').slice(1, 3);
  const corner = Math.min(w, h) * 0.06;

  return [
    `M ${NL} ${NT}`,
    `L ${NL} ${NB}`,
    `C ${lc1.x} ${lc1.y} ${lc2.x} ${lc2.y} ${L} ${SH}`,
    `L ${L} ${FL - corner}`,
    `Q ${L} ${FL} ${L + corner} ${FL}`,
    `L ${R - corner} ${FL}`,
    `Q ${R} ${FL} ${R} ${FL - corner}`,
    `L ${R} ${SH}`,
    `C ${rc2.x} ${rc2.y} ${rc1.x} ${rc1.y} ${NR} ${NB}`,
    `L ${NR} ${NT}`,
  ].join(' ');
}

/**
 * Build a lookup of how wide the jar is at any height.
 *
 * Returns `(y) => [minX, maxX]` in pixels — the inside faces of the glass at
 * that height. Above the mouth it reports the neck, so a star thrown upward
 * travels up the neck column rather than sailing off sideways.
 *
 * This is the single source of truth for "inside the jar", used to keep every
 * star contained and to steer a dragged star toward the only way out: the top.
 */
export function makeJarInterior(w, h) {
  const { L, R, NL, NR, NT, NB, SH, FL } = jarMetrics(w, h);
  const left = shoulderPoints(w, h, 'left', 20);

  return function interiorAt(y) {
    if (y <= NB) return [NL, NR]; // the neck, and the open air above it
    if (y >= SH) return [L, R]; // straight sides

    // Somewhere on the shoulder: walk the sampled curve for the x at this y.
    for (let i = 1; i < left.length; i += 1) {
      const a = left[i - 1];
      const b = left[i];
      if (y <= b.y) {
        const span = b.y - a.y;
        const k = span <= 0 ? 0 : (y - a.y) / span;
        const x = a.x + (b.x - a.x) * k;
        return [x, w - x];
      }
    }
    return [L, R];
  };
}

/** Convenience: the y a star must rise above to count as out of the jar. */
export const jarExitY = (h) => h * (JAR_GEOMETRY.neckTop - PULL_OUT_THRESHOLD);

/* --------------------------------------------------------------------------
   The unfold
   -------------------------------------------------------------------------- */

/**
 * The fold sequence, run in reverse, one entry per phase.
 *
 * These follow the way the paper actually goes together, backwards. Folding a
 * lucky star is: knot a long strip into a pentagon, tuck the short tail in,
 * wrap the long tail round and round the pentagon until it runs out, tuck that
 * end in too, then pinch the five edges to pop it into three dimensions.
 *
 * So opening one is:
 *
 *   star     the finished, puffed star            (the last thing you do)
 *   unpuff   the five points press flat again → a pentagon
 *   untuck   the tucked-in end flicks back out
 *   unwind   the pentagon spins as the wraps come off and paper pays out
 *   unknot   the first knot loosens and lets go
 *   open     one flat strip of paper, readable
 *
 * `ms` is how long the app sits in that phase. Mirrored by --t-unfold-* in
 * tokens.css — change one, change the other.
 */
export const UNFOLD_PHASES = [
  { name: 'star', ms: 240 },
  { name: 'unpuff', ms: 340 },
  { name: 'untuck', ms: 260 },
  { name: 'unwind', ms: 620 },
  { name: 'unknot', ms: 340 },
  { name: 'open', ms: 0 },
];

/** Turns the pentagon makes as the wrapped paper comes off it. */
export const UNWIND_TURNS = 2.5;

/** Refolding is the same road, driven faster. */
export const REFOLD_SPEED = 0.55;
