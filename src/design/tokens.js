/**
 * JS side of the design system.
 *
 * Only the values that JavaScript genuinely needs live here — colours the
 * physics engine assigns to new stars, and the jar's interior shape. Anything
 * purely visual belongs in src/styles/tokens.css instead.
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
  neckTop: 0.14, // where the glass opening begins
  neckLeft: 0.33,
  neckRight: 0.67,
  shoulderY: 0.3, // where the jar has flared out to full width
  bodyLeft: 0.06,
  bodyRight: 0.94,
  floorY: 0.94,
  wallThickness: 0.06, // as a fraction of jar width
};

/** Physics feel. Tune these if the stars are too bouncy or too sluggish. */
export const PHYSICS = {
  gravity: 1.05,
  restitution: 0.28, // bounciness
  friction: 0.35,
  frictionAir: 0.014,
  density: 0.0016,
  throwStrength: 0.22, // how much of your flick speed carries into the throw
};

/** How far above the jar's mouth a dragged star must travel to open. */
export const PULL_OUT_THRESHOLD = 0.06; // fraction of jar height above the lid

/** Unfold timings, mirrored from tokens.css so the state machine can wait. */
export const UNFOLD_TIMING = {
  flatten: 420,
  unroll: 760,
  settle: 300,
};
