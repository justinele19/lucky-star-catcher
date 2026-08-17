/**
 * The glass itself.
 *
 * Drawn from JAR_GEOMETRY, the exact numbers useJarPhysics builds its walls
 * from — so a star can never rest somewhere the glass isn't.
 *
 * Rendered in two layers: `back` (glass body, lid, inner shading) sits behind
 * the stars, `front` (highlights, rim) sits in front, so light passes over the
 * stars the way it would through real glass.
 */

import { JAR_GEOMETRY as G } from '../design/tokens.js';

export default function JarGlass({ width, height, layer = 'back' }) {
  if (!width || !height) return null;

  const L = G.bodyLeft * width;
  const R = G.bodyRight * width;
  const NL = G.neckLeft * width;
  const NR = G.neckRight * width;
  const NT = G.neckTop * height;
  const SH = G.shoulderY * height;
  const FL = G.floorY * height;

  const corner = Math.min(width, height) * 0.055;
  const lidTop = NT - height * 0.075;
  const lidOverhang = width * 0.045;

  // Jar body: neck → shoulder → straight sides → rounded base.
  const body = [
    `M ${NL} ${NT}`,
    // shoulder: drops away from the neck, then curves out to the full body
    `C ${NL} ${NT + (SH - NT) * 0.55} ${L} ${NT + (SH - NT) * 0.45} ${L} ${SH}`,
    `L ${L} ${FL - corner}`,
    `Q ${L} ${FL} ${L + corner} ${FL}`,
    `L ${R - corner} ${FL}`,
    `Q ${R} ${FL} ${R} ${FL - corner}`,
    `L ${R} ${SH}`,
    `C ${R} ${NT + (SH - NT) * 0.45} ${NR} ${NT + (SH - NT) * 0.55} ${NR} ${NT}`,
  ].join(' ');

  if (layer === 'back') {
    return (
      <svg
        className="jar__glass"
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="jar-body" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" style={{ stopColor: 'var(--glass-edge)', stopOpacity: 0.5 }} />
            <stop offset="22%" style={{ stopColor: 'var(--glass)', stopOpacity: 0.9 }} />
            <stop offset="78%" style={{ stopColor: 'var(--glass)', stopOpacity: 0.9 }} />
            <stop offset="100%" style={{ stopColor: 'var(--glass-edge)', stopOpacity: 0.5 }} />
          </linearGradient>
          <linearGradient id="jar-lid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e6eaf0" />
            <stop offset="35%" style={{ stopColor: 'var(--lid)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--lid-dark)' }} />
          </linearGradient>
        </defs>

        {/* glass body */}
        <path d={body} fill="url(#jar-body)" />

        {/* screw threads on the neck */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            x={NL}
            y={NT + i * (height * 0.018)}
            width={NR - NL}
            height={height * 0.008}
            rx={height * 0.004}
            style={{ fill: 'var(--glass-edge)' }}
            opacity="0.5"
          />
        ))}

        {/* lid */}
        <rect
          x={NL - lidOverhang}
          y={lidTop}
          width={NR - NL + lidOverhang * 2}
          height={NT - lidTop}
          rx={Math.min(6, width * 0.02)}
          fill="url(#jar-lid)"
        />
        {/* knurling on the lid edge */}
        {Array.from({ length: 18 }, (_, i) => {
          const x =
            NL - lidOverhang + ((NR - NL + lidOverhang * 2) / 18) * (i + 0.5);
          return (
            <line
              key={i}
              x1={x}
              y1={lidTop + 3}
              x2={x}
              y2={NT - 3}
              style={{ stroke: 'var(--lid-dark)' }}
              strokeOpacity="0.5"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    );
  }

  // --- front layer -------------------------------------------------------
  return (
    <svg
      className="jar__glass jar__front"
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
    >
      {/* outline */}
      <path
        d={body}
        fill="none"
        style={{ stroke: 'var(--glass-edge)' }}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* long specular highlight down the left */}
      <path
        d={`M ${L + width * 0.055} ${SH + height * 0.05}
            L ${L + width * 0.055} ${FL - height * 0.09}`}
        style={{ stroke: 'var(--glass-shine)' }}
        strokeWidth={width * 0.028}
        strokeLinecap="round"
        opacity="0.35"
      />
      {/* short highlight on the right */}
      <path
        d={`M ${R - width * 0.05} ${SH + height * 0.12}
            L ${R - width * 0.05} ${SH + height * 0.3}`}
        style={{ stroke: 'var(--glass-shine)' }}
        strokeWidth={width * 0.016}
        strokeLinecap="round"
        opacity="0.22"
      />
      {/* embossed panel line near the base, like a real Ball jar */}
      <rect
        x={L + width * 0.02}
        y={FL - height * 0.075}
        width={R - L - width * 0.04}
        height={height * 0.004}
        style={{ fill: 'var(--glass-edge)' }}
        opacity="0.4"
      />
    </svg>
  );
}
