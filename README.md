# Lucky Star Catcher

Memories folded into origami lucky stars, kept in a mason jar under a night sky.

## Running it

```bash
npm install
npm run dev
```

The dev server binds to `0.0.0.0`, so once it's up you can open the LAN address
it prints on your phone and test touch dragging on a real device.

## What's built

- **Main jar** — real physics (Matter.js). Stars tumble, settle, and jostle each
  other. Drag one up past the mouth of the jar and it comes free.
- **The unfold** — the star presses flat, then unwinds into the paper strip it
  was folded from, carrying the memory text and its date. Photos and video rise
  above the paper. The jar blurs behind it. Close with the X, the Escape key, or
  a click anywhere off the paper, and the star refolds and drops back in.
- **Surprise me** — pulls a random star, and won't repeat one until you've been
  through the whole jar.
- **Inbox jar** — unopened stars from friends. The shooting-star button top
  right lights up and counts them, and one streak crosses the sky behind the jar
  for every star waiting.
- **Friend jars** — opening a received star moves it out of the inbox and into
  that friend's jar, where everything you two have traded lives together. "Keep
  in my jar" copies it into your own.
- **Sending** — open one of your own stars and send it to any friends or groups.

## Where things live

```
src/
  styles/tokens.css        ← the design system. Start here.
  design/tokens.js         ← the few token values JS needs (jar shape, physics)

  App.jsx                  ← view state and all the wiring
  services/starService.js  ← every read and write goes through this one file

  hooks/
    useJarPhysics.js       ← Matter.js engine, walls, dragging
    useSessionQueue.js     ← "don't repeat a star" logic

  components/
    NightSky.jsx           ← gradient, twinkling stars, shooting stars
    MasonJar.jsx           ← one jar (used for all three kinds)
    JarGlass.jsx           ← the glass, drawn from JAR_GEOMETRY
    StarShape.jsx          ← the folded star SVG, generated from geometry
    UnfoldOverlay.jsx      ← the unfold sequence
    ComposeSheet.jsx / SendSheet.jsx / FriendsSheet.jsx / TopBar.jsx

  styles/sky.css, jar.css, unfold.css
```

## Changing how it looks

Everything visual reads from `src/styles/tokens.css` — colours, the two type
faces plus the handwriting face, spacing, radii, the jar's size, how big the
stars are, and the four timings that control the unfold. Nothing else hard-codes
a colour or a duration.

Two things live in `src/design/tokens.js` instead, because JavaScript needs
them:

- `JAR_GEOMETRY` — the jar's interior as fractions of its box. Both the drawn
  glass and the physics walls are built from it, so they can never disagree.
  Nudge `neckLeft` / `shoulderY` / `floorY` and the jar reshapes, glass and
  physics together.
- `PHYSICS` — gravity, bounciness, friction, throw strength.
- `STAR_COLORS` — mirror of the `--star-*` colours in the CSS. Keep the two in
  sync.

To change the *shape* of the folded stars, `StarShape.jsx` generates its path
from two numbers: `innerRatio` (how deep the valleys between points are) and
`bulge` (how inflated the edges look). No SVG coordinate wrangling.

## Moving to Supabase

`src/services/starService.js` is the only file that touches storage. Every
method is async and resolves to `{ stars, friends }`. Write a
`createSupabaseStarService()` with the same method names, change the single
export at the bottom, and nothing else in the app has to move.

The table shapes are in the comment at the top of that file. Two other things to
handle at the same time:

1. **Media.** Files are currently read into data URLs, which is why there's a
   4MB cap in `ComposeSheet.jsx`. Upload to Supabase Storage instead and keep
   the same `{ id, type, url }` shape.
2. **Delivery.** `sendStar` writes the recipient's copy locally so you can see
   both sides on one device. With a real backend it becomes an insert the
   recipient receives; subscribe to their inbox with Supabase Realtime and the
   shooting-star indicator will light up on its own.

There's a "Simulate an incoming star" button in the Friends sheet standing in
for that. Delete it once realtime is live.

## Mobile

This is a responsive web app and it already works on a phone — pointer events
cover touch, the layout reflows, and safe-area insets are respected. For app
stores, wrap it with Capacitor:

```bash
npm install @capacitor/core @capacitor/cli
npx cap init && npx cap add ios && npx cap add android
npm run build && npx cap sync
```

Nothing in the codebase assumes a desktop browser, so that step shouldn't
require changes.

## Not built yet

- Accounts and real friend connections (waiting on the backend).
- Editing or deleting a memory after it's folded.
- Sending from inside a friend's jar — right now you send by opening one of your
  own stars and choosing "Send to a friend".
- Push notifications. The in-app indicator and toast are there; the push side
  needs the backend.
