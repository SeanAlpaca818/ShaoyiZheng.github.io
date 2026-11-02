# ASCII koi pond animation

Editable source for `assets/js/koi-pond-preview.js`. Jekyll ignores this underscore directory. The animation adapts the MIT-licensed `stackedlol/ascii-sharks` spine simulation and ASCII rasterizer; its license is included here and in `assets/js/ascii-sharks.LICENSE.txt`.

From the website checkout, rebuild with:

```sh
npx --yes esbuild@0.28.2 _animation/koi-pond/preview.ts --bundle --format=iife --target=es2020 --outfile=assets/js/koi-pond-preview.js --banner:js='/* ASCII koi pond, adapted from stackedlol/ascii-sharks (MIT). See ascii-sharks.LICENSE.txt. */'
```

The population and movement are in `src/world.ts`; silhouettes, body-anchored color patterns and water are in `src/renderer.ts`. The upstream internal names `Shark` and `OceanEngine` are retained to keep the adaptation small. Both site themes, reduced motion and pausing outside the viewport are supported. No external assets or requests are needed at runtime.

The light theme keeps the original pale jade pond. The site's dark-theme setting selects an alternate warm paper-and-ink treatment for this hero. Eight koi roam the pond. Click empty water to create two softly fading ASCII ripples, drawn on the same character grid as the fish. The koi continue their dispersed roaming and body avoidance; clicks do not attract them. Links and the portrait do not trigger ripples. Reduced-motion mode keeps the pond still.

Visual references: [K.O.I. variety poster with Kodama Koi Farm photographs](https://koiorganisationinternational.org/sites/default/files/24x36%20Poster_KoiVarieties.pdf) and [ZNA Northwest identification guide](https://nwkg.org/koi-identification/). The animation uses original procedural shapes; reference photographs are not bundled.

The approved seven-shark preview is preserved at local Git tag `preview-seven-sharks-2026-11-02` (commit `3641cf3`).
