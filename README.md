# Nailong Gallery

An immersive twenty-image gallery built with React, TypeScript, Three.js and GSAP.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. `npm run build` checks TypeScript and produces the production site in `dist`; `npm run preview` serves that build.

Run `node scripts/motion.test.mjs` (Node 24+) to verify drag latency, refresh-rate independence, immediate reversal, wheel settling and stale-inertia cancellation. Motion uses separate drag following, analytic coast decay and wheel buffering; pointer input takes over at the visible position. Geometry reuses column-level surface calculations and samples its edges for DOM hit bounds.

Desktop: scroll, drag or use left/right arrow keys to browse the continuous curved strip. Mobile: swipe vertically through the card feed. Click a portrait to open it; close with the × button, Escape or browser Back. About, All and Collection contain local content. Images are bundled in `public/images` and listed in `src/data.ts`.

The layout and motion reference is https://jesperlandberg.com/. The gallery uses a continuous depth surface with a gentle fixed bank and height slope, with bounded speed-driven twist (up to 0.15 radians) and depth response (up to 15%), tapering to zero at both edges, a deforming sheet/hero transition, and a post-processing height field for the cursor trail. The About and Collection rings refract the live gallery rather than rendering a separate decorative object. `src/motion.ts` holds the sheet timing curve; `src/PostEffects.ts` implements the lens and cursor surface effects. The reference's webfont is bundled under `public/fonts` for local visual comparison; its original vendor is Dinamo (ABC Diatype Plus).


A soft normal-based sheen is evaluated on the live ribbon surface and fades out during detail expansion. It is not baked into the images.
