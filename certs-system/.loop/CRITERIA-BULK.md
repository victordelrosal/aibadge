# Binary acceptance criteria — bulk issuance

B1  Issuing writes a KV index key `email:<lowercased email>` whose value is the ucid;
    confirmed with `wrangler kv key get`.
B2  Issuing a second credential for an email that already has a live one returns HTTP 409
    with the existing ucid in the body, and creates no new credential.
B3  409 is bypassable only by an explicit `allowDuplicate: true` in the request body.
B4  `POST /api/send` re-sends the graduation email for an existing ucid, returns 401
    unauthenticated, and 404 for an unknown ucid.
B5  `GET /api/list` returns `email`, `level` and `cohort` for every credential, so the bulk
    panel can detect duplicates before issuing anything.
B6  The issuer console HTML contains a Bulk panel: a CSV textarea, a Validate button, an
    Issue button, an email toggle and a per-row status table.
B7  The bulk panel's client JS parses without syntax error (extracted and checked with node).
B8  Validation is pure and non-mutating: pressing Validate performs no write of any kind.
B9  Every name is normalised to Unicode NFC before it is signed, so a decomposed marksheet
    name and a precomposed one produce identical credential bytes.
B10 A row already present in `/api/list` by email is marked "already issued" and skipped.
B11 No regression: the single-issue form still issues, and `/api/verify/n0m37` is unchanged.
B12 Revoked credentials free their email index, so a revoked-then-reissued holder is possible.
