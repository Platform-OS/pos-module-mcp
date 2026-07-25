---
id: TASK-5
title: 'Deterministic fixed test fixtures via seed-generated import migrations'
status: To Do
assignee: []
created_date: '2026-07-24'
labels:
  - pos-module-mcp
  - testing
dependencies: []
priority: medium
ordinal: 5000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current RUNTIME-seeded, randomized test fixtures (`tests/fixtures.mjs`
`user_create` + `randomBytes` tokens/passwords, per-run unique emails, and the
`revive` hack for shared-fixture cross-contamination) with DETERMINISTIC, id-stable
fixtures, mirroring the proven marketplace-dcra pattern at `pw_tests/data/seed/`.

Why: the suites are outcome-deterministic today, but they use `randomBytes` for
isolation and share 4 fixtures across ~20 groups (which forced the `revive` reset
after the abuse plane suspends `member`). Fixed, per-case fixtures make runs
bit-reproducible, inspectable, and remove all shared-state fragility. Confirmed
feasible: `import_users` / `import_models` with `_id_remap:false` preserve explicit
numeric ids on every deploy (repeatable even on a fresh reserved CI instance), and
`UserImport` accepts a plaintext `password` (no bcrypt needed).

Design (mirror pw_tests/data/seed/):
1. `tests/seed/seed.mjs` — single source of truth. Fixed entities in a reserved id
   range (e.g. 90000+, never colliding with real data), ONE user-set per test case:
   - users `{ id, email, slug, password, name }`
   - `mcp_token` rows `{ id, type_name:"modules/mcp/mcp_token", user_id,
     properties:{ token_digest: sha256(KNOWN_RAW_TOKEN), label, status } }` → tests
     use the KNOWN raw token; no runtime minting
   - `mcp_access` rows `{ id, type_name:"modules/mcp/mcp_access",
     properties:{ user_id, email, role, status } }`
2. `tests/seed/generate_migrations.mjs` — dev-time generator (NOT run per test).
   Reads the seed and emits a deterministic `app/migrations/<ts>_seed_mcp_test_
   fixtures.liquid` using batched `import_users`/`import_models` (`_id_remap:false,
   _index_rebuild:false`) with the Liquid-safety guard (no `{{`/`{%` inside embedded
   JSON). Generate ONCE; regenerate only when the seed data changes; commit the
   .liquid output.
3. Gate: the seed migration only seeds when the constant `MCP_SEED_TEST_FIXTURES=1`
   is set (a plain test-app deploy stays clean; CI sets it). Test-app migration only
   — the standalone module ships zero migrations, so nothing reaches production.
4. Rewrite `tests/coverage.mjs` and `tests/conformance.mjs` to reference the FIXED
   ids/emails/raw-tokens per case — delete `randomBytes`, runtime `user_create`, and
   `revive`. Add a start-of-run reset (re-import upserts the fixed rows to baseline)
   so LOCAL re-runs are repeatable without a full `pos-cli data clean`.

Out of scope / accepted: the two wall-clock window tests (idempotency-window,
abuse-window) stay time-based — expiry is inherently temporal.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 `tests/seed/seed.mjs` defines all fixed fixtures (users + mcp_token + mcp_access) with explicit ids in a reserved range, one user-set per test case
- [ ] #2 `tests/seed/generate_migrations.mjs` emits a deterministic `app/migrations` import migration using `import_users`/`import_models` with `_id_remap:false` (byte-identical re-runs)
- [ ] #3 seed migration is gated behind `MCP_SEED_TEST_FIXTURES=1` and lives only in the test app (not the module)
- [ ] #4 `coverage.mjs` and `conformance.mjs` reference fixed ids/emails/known raw tokens; no `randomBytes`, no runtime `user_create`, no `revive`
- [ ] #5 start-of-run reset (re-import upsert) makes local re-runs repeatable without a full `data clean`
- [ ] #6 both suites pass on the live instance with the seeded fixtures; instance left clean (or reset to seed baseline)
- [ ] #7 CI (`mcp-ci.yml`) sets `MCP_SEED_TEST_FIXTURES=1` for the live stage
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Both suites pass deterministically against the seeded fixtures on the live instance
- [ ] #2 `node --check` passes; no `randomBytes`/runtime-create/`revive` remain in the harnesses
- [ ] #3 Documented (README testing section + the generator's own header)
- [ ] #4 Generator output is deterministic (byte-identical re-runs) and committed; regenerate only on seed change
- [ ] #5 A plain test-app deploy (no constant) stays clean — no test users seeded
<!-- DOD:END -->
