# LEARNINGS (distilled, verified rules for the next Crank run)

- GitHub Pages on the `aibadge` repo serves the WHOLE repo from `main` root; any subfolder is
  live at `https://aibadge.fiveinnolabs.com/<path-from-repo-root>/`. Build lag after push is
  ~80s (verified: 7×HTTP 404 then 200). Poll, do not assume instant. (round 1)
- Headless Chrome defaults to NO WebGL, so a page with a `webglOK()`/reduced-motion gate renders
  its flat fallback and a naive screenshot reads as "broken 3D". To verify a 3D path, launch
  puppeteer with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader` AND
  `page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}])`. Expose a
  `window.__frames` counter so you can assert the render loop actually ran. (verified round 1)
- three.js r160 via an ES-module import map (`three` + `three/addons/` from jsDelivr) deploys on
  static GitHub Pages with no bundler. addons live under `examples/jsm/`. (verified)
- A "rich harness" import can carry a provenance trap: the typed brief and the attached files can
  describe different exercises. The runnable truth is whichever brief has a matching dataset. Read
  the data header before trusting the prose; decide, then flag the mismatch in the handoff. (round 1)
- Cold verifier earns its cost by RE-COMPUTING the headline numbers from raw data with its own
  script, not by reading the diagnosis. It caught a "live URL" that 404'd because `site/` was never
  `git add`ed: deploy is not done until `curl` returns 200 on the real URL. (verified round 1)
