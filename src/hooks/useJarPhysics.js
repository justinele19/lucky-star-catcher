/**
 * Physics for the inside of the jar.
 *
 * Matter.js runs headless — no canvas. Each star is a real DOM node, and every
 * frame we copy its body's position and angle onto that node's transform. That
 * way the stars are still SVG you can style in CSS, but they tumble and settle
 * like objects in glass.
 *
 * --- Keeping stars in the jar --------------------------------------------
 * The only way out is the top. Three things enforce that, because collision
 * walls alone don't:
 *
 *   1. The walls follow the drawn glass, shoulder curve included, sampled from
 *      the same helpers JarGlass draws with.
 *   2. The engine steps in fixed slices no bigger than PHYSICS.maxStepMs. A
 *      long frame used to advance a star further than the glass is thick,
 *      letting it tunnel straight through.
 *   3. After every step, each body is clamped inside the jar's profile. That's
 *      the actual guarantee — whatever the solver does, nothing ends a frame
 *      outside the glass. Above the mouth the profile narrows to the neck, so a
 *      star thrown hard travels up the neck and drops back rather than sailing
 *      off sideways.
 *
 * Dragging is clamped the same way, so pulling toward a wall slides the star
 * along the glass and up toward the only opening.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import {
  JAR_GEOMETRY,
  PHYSICS,
  jarExitY,
  jarMetrics,
  makeJarInterior,
  shoulderPoints,
} from '../design/tokens.js';

const { Engine, Bodies, Body, Composite, Sleeping } = Matter;

/** Nudge a body out of Matter's sleep so a force actually lands on it. */
const wake = (body) => Sleeping.set(body, false);

/* Collision groups. A star being dragged keeps STAR in its mask so it still
   shoves its neighbours aside, but drops WALL so it can be moved freely — the
   clamp below is what stops it leaving through the glass. */
const CAT_WALL = 0x0001;
const CAT_STAR = 0x0002;

/** Build the jar's interior walls, following the drawn glass. */
function buildWalls(w, h) {
  const { L, R, NL, NR, NT, NB, SH, FL, t } = jarMetrics(w, h);
  const cx = w / 2;
  const cy = (SH + FL) / 2;

  const opts = {
    isStatic: true,
    restitution: PHYSICS.restitution,
    friction: PHYSICS.friction,
    collisionFilter: { category: CAT_WALL },
  };

  /**
   * A wall between two points. It's nudged outward along its own normal by
   * half its thickness, so its inner face lands exactly on the glass and stars
   * come to rest against what you can see rather than short of it.
   */
  const seg = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy);
    if (len < 0.5) return null;

    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;

    // Normal, pointed away from the middle of the jar.
    let nx = -dy / len;
    let ny = dx / len;
    if ((mx - cx) * nx + (my - cy) * ny < 0) {
      nx = -nx;
      ny = -ny;
    }

    const body = Bodies.rectangle(
      mx + nx * (t / 2),
      my + ny * (t / 2),
      len + t,
      t,
      structuredClone(opts)
    );
    Body.setAngle(body, Math.atan2(dy, dx));
    return body;
  };

  const walls = [
    seg(L, SH, L, FL), // left wall
    seg(R, SH, R, FL), // right wall
    seg(L - t, FL, R + t, FL), // floor
    seg(NL, NT - h * 0.12, NL, NB), // left side of the neck
    seg(NR, NT - h * 0.12, NR, NB), // right side of the neck
  ];

  // Shoulders, as a chain of short segments across the same bezier the glass
  // is drawn from. A single straight segment used to leave a gap you could see
  // a star sitting in.
  for (const side of ['left', 'right']) {
    const pts = shoulderPoints(w, h, side, 10);
    for (let i = 1; i < pts.length; i += 1) {
      walls.push(seg(pts[i - 1].x, pts[i - 1].y, pts[i].x, pts[i].y));
    }
  }

  return walls.filter(Boolean);
}

/**
 * A star's body radius, as a fraction of its rendered size.
 *
 * This has to match what you can actually see. StarShape draws its points at
 * radius 47 in a 100-unit box, so a star rendered at S pixels reaches 0.47·S
 * from its centre — and the body has to be that big too, or the drawn star
 * hangs outside the glass its body is resting against.
 *
 * The body is a circle rather than a pentagon for the same reason: a polygon's
 * distance to the wall changes with its rotation, so a tip can point at the
 * glass and poke through even while the body is legally inside. A circle is
 * always exactly its radius from the wall, whichever way the star has spun.
 */
const STAR_RADIUS = 0.47;

/**
 * How far from the glass the clamp holds a star's centre, as a fraction of
 * that body radius.
 *
 * It must be UNDER 1, or the clamp fights the collision walls: the wall settles
 * the star at exactly one radius from the glass, the clamp shoves it somewhere
 * else, gravity pulls it back, and it buzzes in place forever. Under 1 the
 * walls own resting contact and this stays what it's for — the catch for a
 * star that tunnelled somewhere it shouldn't be.
 */
const CONTAIN = 0.96;

/** Ignore sub-pixel excursions, so rounding alone can't start a buzz. */
const CLAMP_TOLERANCE = 0.75;

export function useJarPhysics({ stars, onPullOut, starSize = 46 }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const bodiesRef = useRef(new Map()); // starId -> Matter body
  const elsRef = useRef(new Map()); // starId -> DOM node
  const wallsRef = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const interiorRef = useRef(null); // (y) => [minX, maxX]
  const dragRef = useRef(null);
  const radiusRef = useRef(starSize * STAR_RADIUS);
  const [draggingId, setDraggingId] = useState(null);

  /** How far this body's centre must stay from the glass. */
  const marginFor = (body) =>
    (body?.starRadius || radiusRef.current) * CONTAIN;

  /**
   * Nearest position inside the jar. `margin` is roughly a star's half-width,
   * so we're clamping the silhouette rather than the centre point.
   */
  const clampInside = (x, y, margin) => {
    const interior = interiorRef.current;
    const { h } = sizeRef.current;
    if (!interior || !h) return { x, y };

    const { FL } = jarMetrics(sizeRef.current.w, h);
    const cy = Math.min(y, FL - margin);
    const [minX, maxX] = interior(cy);
    const lo = minX + margin;
    const hi = maxX - margin;
    // A jar narrower than a star would invert the bounds; centre it instead.
    const cx = lo > hi ? (minX + maxX) / 2 : Math.min(Math.max(x, lo), hi);
    return { x: cx, y: cy };
  };

  /* --- Engine + render loop + walls ---------------------------------------
     All of this lives in one layout effect so the engine is guaranteed to
     exist before any body is added to it. */
  useLayoutEffect(() => {
    const el = containerRef.current;
    const engine = Engine.create();
    engine.gravity.y = PHYSICS.gravity;
    // A little more solver effort, so a pile of stars doesn't squeeze apart.
    engine.positionIterations = 8;
    engine.velocityIterations = 6;
    /* Let settled stars fall asleep. Without this the solver keeps nudging a
       resting pile forever, which shows up as a faint permanent shimmer. */
    engine.enableSleeping = true;
    engineRef.current = engine;

    const applySize = (w, h) => {
      if (!w || !h) return;
      sizeRef.current = { w, h };
      interiorRef.current = makeJarInterior(w, h);

      Composite.remove(engine.world, wallsRef.current);
      wallsRef.current = buildWalls(w, h);
      Composite.add(engine.world, wallsRef.current);

      // Anything now outside the new shape gets put back where it belongs.
      for (const body of bodiesRef.current.values()) {
        const safe = clampInside(
          body.position.x,
          body.position.y,
          marginFor(body)
        );
        if (safe.x !== body.position.x || safe.y !== body.position.y) {
          Body.setPosition(body, safe);
          Body.setVelocity(body, { x: 0, y: 0 });
        }
      }
    };

    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      applySize(width, height);
    });
    if (el) {
      ro.observe(el);
      applySize(el.clientWidth, el.clientHeight);
    }

    let raf;
    let last = performance.now();

    const loop = (now) => {
      const frame = Math.min(now - last, 48); // clamp after a tab switch
      last = now;

      // Fixed slices: one long frame must never move a star further than the
      // glass is thick, or it goes straight through.
      const steps = Math.max(1, Math.ceil(frame / PHYSICS.maxStepMs));
      const dt = frame / steps;
      for (let i = 0; i < steps; i += 1) Engine.update(engine, dt);

      // The hard guarantee: nothing ends a frame outside the jar. Only acts on
      // a real excursion — anything within a pixel is left to the solver, which
      // is what stops the clamp and the walls arguing over a resting star.
      const dragging = dragRef.current?.body;
      for (const body of bodiesRef.current.values()) {
        if (body === dragging) continue;
        const { x, y } = body.position;
        const safe = clampInside(x, y, marginFor(body));
        const dx = safe.x - x;
        const dy = safe.y - y;
        if (Math.abs(dx) > CLAMP_TOLERANCE || Math.abs(dy) > CLAMP_TOLERANCE) {
          Body.setPosition(body, safe);
          // Drop the velocity that carried it out, so it settles instead of
          // grinding along the wall it just tried to leave through.
          Body.setVelocity(body, {
            x: Math.abs(dx) > CLAMP_TOLERANCE ? 0 : body.velocity.x,
            y:
              Math.abs(dy) > CLAMP_TOLERANCE
                ? Math.min(body.velocity.y, 0)
                : body.velocity.y,
          });
        }
      }

      for (const [id, body] of bodiesRef.current) {
        const node = elsRef.current.get(id);
        if (!node) continue;
        node.style.transform = `translate(${body.position.x}px, ${body.position.y}px) rotate(${body.angle}rad)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      Engine.clear(engine);
      Composite.clear(engine.world, false);
      engineRef.current = null;
      bodiesRef.current.clear();
      wallsRef.current = [];
    };
  }, []);

  /* --- Bodies follow the star list ---------------------------------------- */
  useEffect(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const { w, h } = sizeRef.current;
    if (!w || !h) return;

    const wanted = new Set(stars.map((s) => s.id));

    // Remove bodies for stars that left the jar.
    for (const [id, body] of bodiesRef.current) {
      if (!wanted.has(id)) {
        Composite.remove(engine.world, body);
        bodiesRef.current.delete(id);
      }
    }

    const radius = starSize * STAR_RADIUS;

    /* --star-size is read off the DOM a beat after mount, so the first bodies
       get built at the fallback size and then the real one arrives. Resize
       what already exists rather than leaving it mismatched — a body smaller
       than the star drawn on it is a star hanging outside the glass. */
    if (Math.abs(radius - radiusRef.current) > 0.5) {
      const factor = radius / radiusRef.current;
      for (const body of bodiesRef.current.values()) {
        Body.scale(body, factor, factor);
        body.starRadius = radius;
      }
    }
    radiusRef.current = radius;

    // New stars arrive just under the shoulder and fall to their place.
    stars.forEach((star, i) => {
      if (bodiesRef.current.has(star.id)) return;
      const spread = (JAR_GEOMETRY.bodyRight - JAR_GEOMETRY.bodyLeft) * w * 0.5;
      const body = Bodies.circle(
        w * 0.5 + (Math.random() - 0.5) * spread,
        h * JAR_GEOMETRY.shoulderY + i * radius * 1.7,
        radius,
        {
          restitution: PHYSICS.restitution,
          friction: PHYSICS.friction,
          frictionAir: PHYSICS.frictionAir,
          density: PHYSICS.density,
          angle: Math.random() * Math.PI * 2,
          collisionFilter: { category: CAT_STAR, mask: CAT_WALL | CAT_STAR },
        }
      );
      body.starRadius = radius;
      bodiesRef.current.set(star.id, body);
      Composite.add(engine.world, body);
    });
  }, [stars, starSize]);

  /* --- Dragging ------------------------------------------------------------ */

  const toLocal = (event) => {
    const rect = containerRef.current.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const handlePointerDown = (starId) => (event) => {
    const body = bodiesRef.current.get(starId);
    if (!body) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);

    const point = toLocal(event);
    wake(body);
    Body.setStatic(body, true); // follow the finger exactly
    body.collisionFilter.mask = CAT_STAR; // shove neighbours, ignore the glass
    dragRef.current = {
      starId,
      body,
      last: point,
      velocity: { x: 0, y: 0 },
      pulledOut: false,
    };
    setDraggingId(starId);
  };

  const handlePointerMove = (event) => {
    const drag = dragRef.current;
    if (!drag) return;
    const point = toLocal(event);
    const { h } = sizeRef.current;
    const exitLine = jarExitY(h);

    drag.velocity = { x: point.x - drag.last.x, y: point.y - drag.last.y };
    drag.last = point;

    // Above the mouth the star is free. Below it, the drag is held inside the
    // glass — pull sideways and it slides along the wall, pull up and the neck
    // funnels it to the one way out.
    if (point.y >= exitLine) {
      Body.setPosition(
        drag.body,
        clampInside(point.x, point.y, marginFor(drag.body))
      );
      return;
    }

    Body.setPosition(drag.body, point);
    if (!drag.pulledOut) {
      drag.pulledOut = true;
      const { starId } = drag;
      endDrag(event, true);
      onPullOut?.(starId);
    }
  };

  const endDrag = (event, skipThrow = false) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);

    Body.setStatic(drag.body, false);
    wake(drag.body);
    drag.body.collisionFilter.mask = CAT_WALL | CAT_STAR;

    if (!skipThrow) {
      Body.setVelocity(drag.body, {
        x: drag.velocity.x * PHYSICS.throwStrength,
        y: drag.velocity.y * PHYSICS.throwStrength,
      });
    }
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
  };

  /* Sleeping bodies ignore forces, so anything that pushes a star has to wake
     it first. */

  /** Give one star a shove — used by the "surprise me" button. */
  const nudge = (starId, strength = 0.02) => {
    const body = bodiesRef.current.get(starId);
    if (!body) return;
    wake(body);
    Body.applyForce(body, body.position, {
      x: (Math.random() - 0.5) * strength,
      y: -strength,
    });
  };

  /** Stir everything, like shaking the jar. */
  const shake = () => {
    for (const body of bodiesRef.current.values()) {
      wake(body);
      Body.applyForce(body, body.position, {
        x: (Math.random() - 0.5) * 0.012,
        y: -Math.random() * 0.016,
      });
    }
  };

  const registerStarEl = (starId) => (node) => {
    if (node) elsRef.current.set(starId, node);
    else elsRef.current.delete(starId);
  };

  return {
    containerRef,
    registerStarEl,
    draggingId,
    starHandlers: (starId) => ({
      onPointerDown: handlePointerDown(starId),
      onPointerMove: handlePointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }),
    nudge,
    shake,
  };
}
