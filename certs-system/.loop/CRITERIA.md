# Binary acceptance criteria — credential engagement analytics

C1  D1 database `aibadge-certs-stats` exists, is bound as STATS_DB in wrangler.toml, and
    `wrangler d1 execute --remote --command "SELECT name FROM sqlite_master WHERE type='table'"`
    lists a table named `events`.
C2  `GET /e/o/<ucid>.png` returns 200 with content-type image/png, a body byte-identical to
    `/<ucid>/badge.png`, and writes exactly one row with event='open'.
C3  `GET /e/c/<ucid>/verify` returns 302 to the credential page and writes exactly one row
    event='email_verify'; `/e/c/<ucid>/linkedin` returns 302 to linkedin.com and writes
    exactly one row event='email_linkedin'.
C4  Fetching `/<ucid>/credential.pdf` writes exactly one row event='pdf'; `/badge.png` writes
    'png'; `/og.png` writes 'preview'; `/credential.json` writes 'vc'.
C5  `GET /<ucid>` writes exactly one row event='view'.
C6  `POST /api/track` with a known ucid and allow-listed event writes one row and returns 204;
    an unknown ucid returns 400 and writes nothing; a non-allow-listed event returns 400 and
    writes nothing.
C7  The events table has no column holding a raw IP address, and a dump of every stored row
    contains no value matching an IPv4 or IPv6 pattern.
C8  `GET /api/stats` returns 401 without a valid issuer token; with one it returns JSON
    carrying per-credential aggregates.
C9  `/api/stats` responses carry Access-Control-Allow-Origin for https://aibadge.fiveinnolabs.com
    and an OPTIONS preflight returns 200 with Allow-Headers including Authorization.
C10 With the D1 binding forced to throw, every tracked route still returns its normal status
    code and body. Tracking never breaks delivery.
C11 Generated email HTML uses `/e/o/<ucid>.png` as the badge img src and `/e/c/<ucid>/verify`
    and `/e/c/<ucid>/linkedin` as its two link hrefs.
C12 No regression: `/api/verify/y8i52` returns the same signed VC and its Ed25519 signature
    still verifies in the browser on the live credential page.
