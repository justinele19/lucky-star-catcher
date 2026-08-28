/**
 * Shared SVG defs, mounted once by App.
 *
 * The paper grain is a turbulence filter, which is expensive — and there can be
 * a dozen stars tumbling at 60fps. Wrapping it in a <pattern> means the browser
 * rasterises the noise a single time and every star fills from that one tile,
 * instead of each running its own filter every frame.
 */

export default function StarDefs() {
  return (
    <svg
      width="0"
      height="0"
      aria-hidden="true"
      focusable="false"
      style={{ position: 'absolute', pointerEvents: 'none' }}
    >
      <defs>
        <filter id="lsc-grain-filter" x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.82"
            numOctaves="3"
            seed="11"
            result="noise"
          />
          {/* Drain the colour out, then squeeze the range so it reads as fibre
              rather than television static. */}
          <feColorMatrix in="noise" type="saturate" values="0" result="grey" />
          <feComponentTransfer in="grey">
            <feFuncA type="linear" slope="0.55" intercept="0.24" />
          </feComponentTransfer>
        </filter>

        {/* 22 units against the star's 100-unit box — fine enough to look like
            paper, coarse enough to survive being drawn at 46px.

            The filtered rect needs no fill of its own: feTurbulence generates
            its own pixels rather than reading the source, so the noise is all
            that comes out. The white rect underneath is what it speckles. */}
        <pattern
          id="lsc-paper-grain"
          width="22"
          height="22"
          patternUnits="userSpaceOnUse"
        >
          <rect width="22" height="22" fill="#fff" />
          <rect width="22" height="22" filter="url(#lsc-grain-filter)" />
        </pattern>
      </defs>
    </svg>
  );
}
