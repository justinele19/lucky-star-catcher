/**
 * Physics for the inside of the jar.
 *
 * Matter.js runs headless — no canvas. Each star is a real DOM node, and every
 * frame we copy its body's position and angle onto that node's transform. That
 * way the stars are still SVG you can style in CSS, but they tumble and settle
 * like objects in glass.
 *
 * The jar's walls are built from JAR_GEOMETRY, so the physics boundary and the
 * drawn glass always agree.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Matter from 'matter-js';
import { JAR_GEOMETRY, PHYSICS, PULL_OUT_THRESHOLD } from '../design/tokens.js';

const { Engine, Bodies, Body, Composite } = Matter;

/* Collision groups. A star being dragged keeps STAR in its mask so it still
   shoves its neighbours aside, but drops WALL so it can pass out through the
   glass instead of fighting the narrow neck. */
const CAT_WALL = 0x0001;
const CAT_STAR = 0x0002;

/** Build the jar's interior walls from the geometry fractions. */
function buildWalls(w, h) {
  const g = JAR_GEOMETRY;
  const t = g.wallThickness * w;
  const opts = {
    isStatic: true,
    restitution: PHYSICS.restitution,
    friction: PHYSICS.friction,
    collisionFilter: { category: CAT_WALL },
  };

  /** A wall between two points, thickness t. */
  const seg = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) + t;
    const body = Bodies.rectangle(
      (x1 + x2) / 2,
      (y1 + y2) / 2,
      len,
      t,
      structuredClone(opts)
    );
    Body.setAngle(body, Math.atan2(dy, dx));
    return body;
  };

  const L = g.bodyLeft * w;
  const R = g.bodyRight * w;
  const NL = g.neckLeft * w;
  const NR = g.neckRight * w;
  const NT = g.neckTop * h;
  const SH = g.shoulderY * h;
  const FL = g.floorY * h;

  return [
    seg(L, SH, L, FL), // left wall
    seg(R, SH, R, FL), // right wall
    seg(L - t, FL, R + t, FL), // floor
    seg(NL, NT, L, SH), // left shoulder, slanting out
    seg(NR, NT, R, SH), // right shoulder
    seg(NL, NT - h * 0.1, NL, NT), // left side of the neck
    seg(NR, NT - h * 0.1, NR, NT), // right side of the neck
  ];
}

export function useJarPhysics({ stars, onPullOut, starSize = 46 }) {
  const containerRef = useRef(null);
  const engineRef = useRef(null);
  const bodiesRef = useRef(new Map()); // starId -> Matter body
  const elsRef = useRef(new Map()); // starId -> DOM node
  const wallsRef = useRef([]);
  const sizeRef = useRef({ w: 0, h: 0 });
  const dragRef = useRef(null);
  const [draggingId, setDraggingId] = useState(null);

  /* --- Engine + render loop + walls ---------------------------------------
     All of this lives in one layout effect so the engine is guaranteed to
     exist before any body is added to it. */
  useLayoutEffect(() => {
    const el = containerRef.current;
    const engine = Engine.create();
    engine.gravity.y = PHYSICS.gravity;
    engineRef.current = engine;

    const applySize = (w, h) => {
      if (!w || !h) return;
      sizeRef.current = { w, h };
      Composite.remove(engine.world, wallsRef.current);
      wallsRef.current = buildWalls(w, h);
      Composite.add(engine.world, wallsRef.current);

      // Anything now outside the new shape gets dropped back in through the top.
      for (const body of bodiesRef.current.values()) {
        if (body.position.y > h || body.position.x < 0 || body.position.x > w) {
          Body.setPosition(body, { x: w * 0.5, y: h * JAR_GEOMETRY.shoulderY });
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
      const dt = Math.min(now - last, 32); // clamp after a tab switch
      last = now;
      Engine.update(engine, dt);

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

    // Add bodies for new stars — they drop in through the neck.
    const radius = starSize * 0.44;
    stars.forEach((star, i) => {
      if (bodiesRef.current.has(star.id)) return;
      const spread = (JAR_GEOMETRY.neckRight - JAR_GEOMETRY.neckLeft) * w * 0.55;
      const body = Bodies.polygon(
        w * 0.5 + (Math.random() - 0.5) * spread,
        h * (JAR_GEOMETRY.neckTop * 0.6) - i * radius * 2.1,
        5,
        radius,
        {
          chamfer: { radius: radius * 0.22 },
          restitution: PHYSICS.restitution,
          friction: PHYSICS.friction,
          frictionAir: PHYSICS.frictionAir,
          density: PHYSICS.density,
          angle: Math.random() * Math.PI * 2,
          collisionFilter: { category: CAT_STAR, mask: CAT_WALL | CAT_STAR },
        }
      );
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
    Body.setStatic(body, true); // follow the finger exactly
    body.collisionFilter.mask = CAT_STAR; // pass through the glass
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

    drag.velocity = {
      x: point.x - drag.last.x,
      y: point.y - drag.last.y,
    };
    drag.last = point;
    Body.setPosition(drag.body, point);

    // Out of the jar? The mouth is the line; a little above it and it's free.
    const { h } = sizeRef.current;
    const exitLine = h * (JAR_GEOMETRY.neckTop - PULL_OUT_THRESHOLD);
    if (!drag.pulledOut && point.y < exitLine) {
      drag.pulledOut = true;
      endDrag(event, true);
      onPullOut?.(drag.starId);
    }
  };

  const endDrag = (event, skipThrow = false) => {
    const drag = dragRef.current;
    if (!drag) return;
    dragRef.current = null;
    setDraggingId(null);

    Body.setStatic(drag.body, false);
    drag.body.collisionFilter.mask = CAT_WALL | CAT_STAR;

    if (!skipThrow) {
      Body.setVelocity(drag.body, {
        x: drag.velocity.x * PHYSICS.throwStrength,
        y: drag.velocity.y * PHYSICS.throwStrength,
      });
    }
    event?.currentTarget?.releasePointerCapture?.(event.pointerId);
  };

  /** Give one star a shove — used by the "surprise me" button. */
  const nudge = (starId, strength = 0.02) => {
    const body = bodiesRef.current.get(starId);
    if (!body) return;
    Body.applyForce(body, body.position, {
      x: (Math.random() - 0.5) * strength,
      y: -strength,
    });
  };

  /** Stir everything, like shaking the jar. */
  const shake = () => {
    for (const body of bodiesRef.current.values()) {
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
