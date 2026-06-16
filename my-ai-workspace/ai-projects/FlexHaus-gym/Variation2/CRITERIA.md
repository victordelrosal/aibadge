# CRITERIA (frozen at FRAME) — Inkwell Rewritten

Binary. Drawn from context.md §6 (deliverables) and §7 (cold-verify gate).

C1. diagnosis.md exists: names ONE at-risk cohort, sizes the prize with visible step-by-step
    maths, gives 3 root causes EACH tied to a figure computed from inkwell_pos_transactions.csv
    (query/filter stated), names the ONE primary metric. [env-checkable: file + numbers reconcile
    with §2 summaries]

C2. Every headline number used anywhere (page hero, email) is computed from the CSV and cited;
    nothing is invented; anything assumed is marked [ASSUMPTION]. [judge + spot-check]

C3. design-spec.md exists: section-by-section wireframe, the 3D scene concept, scroll
    choreography, single primary CTA, reduced-motion + no-WebGL fallback, accessibility plan. [env]

C4. /site/index.html exists and actually runs: three.js r160+ loads, the scroll-driven 3D scene
    renders (ink bloom → drift → proof → card), no console errors on load. [env: headless render]

C5. The sign-up form captures a real email (Formspree/free-tier or documented mailto fallback),
    shows the plain-English consent line, no pre-tick, has success + error states. [env: inspect DOM]

C6. prefers-reduced-motion serves a still hero + normal page; no-WebGL path renders a styled
    static hero + working form. Both degrade gracefully. [env: toggle + simulate]

C7. Accessibility: keyboard-reachable form, visible focus rings, AA contrast on text, real
    <label>s, canvas aria-hidden with real content in DOM, alt text. [env: axe-style check]

C8. marketing.md exists: one launch email (subject + preview + body + single CTA + GDPR footer
    with unsubscribe) + 3 platform-native posts (IG, TikTok/Reels script, Facebook over-50), each
    with asset note + target metric, no invented stats. [env + judge]

C9. One spine throughout: "Inkwell Rewritten / Library Card" hook + §3 brand voice/palette thread
    page + email + posts; none generic enough to be any other shop. [judge, rubric stated]

C10. cold-verify.md exists: a FRESH cold verifier scored §7's 6 criteria pass/fail with evidence,
     AND caught + named ONE specific moment a specialist got something wrong. [env: file + the catch]

C11. Deployed: a GitHub Pages URL is produced and the page loads there (or, if propagation lags,
     the committed+pushed path is shown with the URL it will serve at). [env: curl/load]
