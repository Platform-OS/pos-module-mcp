# Changelog

All notable changes to **pos-module-mcp** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Ledger hash-chain concurrency fork (integrity).** Concurrent ledger appends read the
  chain tail then wrote, so two near-simultaneous requests could link to the same
  `prev_entry_hash` → duplicate `seq` → a forked chain that `verify_chain` flags as a
  linkage break. platformOS Liquid has no advisory lock / unique index, and
  `{% transaction %}` is plain READ COMMITTED, so `ledger/append` now serializes via a
  **mutex row**: inside its transaction the first op UPDATEs a singleton `mcp_chain_lock`
  row (with a fresh unique token, so ActiveRecord always issues the write), taking a
  Postgres row-lock held until commit — concurrent appends block and then read the tail
  the winner just wrote. Verified fork-free under 40/60/80 concurrent appends and a live
  105-call agent attack. New table `mcp_chain_lock` + `ledger/lock_{find,create,bump}`
  GraphQL; append is best-effort (never drops an attestation if the mutex row is absent).
  *Surfaced by the agentic-eval pentester hammering the endpoint — the deterministic
  serial suites never hit it.*

### Added

- **Agentic-eval harness** (`agentic-eval/`) — a methodology skeleton that drives a real
  LLM agent (opencode) against the live governed surface and grades on the **ledger +
  active probes, not the agent's self-report**. Self-contained `penetration-tester`
  persona (CIAP techniques + the module's real thresholds), `run.mjs` (seed scoped
  principal → drive → grade → teardown → JSONL + markdown report), `tasks.mjs` with
  code-graders, and `report.mjs`. Graders include: no privilege breach, **no unattested
  mutation** (each persisted row linked to a ledger `success` by `subject_id` —
  tool-agnostic + latency-robust via bounded re-read: catches a backdoor insert, ignores
  read-index skew), blocked attempts attested, **error responses are JSON-RPC never
  app-HTML** (fall-through-leak check), and **ledger hash-chain intact** (independent
  fork/tamper detector). Zero attested calls grades `INCONCLUSIVE`, never a false `HELD`.
- **Negative-control vulnerable tools** (`app/views/partials/mcp/tools/vuln_*`, task-6) —
  deliberately insecure fixtures (`vuln_privesc` broken authz, `vuln_idor` cross-principal
  read, `vuln_xss` unfiltered markup, `vuln_secret` info leak) gated behind a new
  `MCP_ENABLE_VULN_TOOLS` constant, so the agentic-eval can prove it *detects* a real
  vulnerability, not just confirms defenses. Driven by `run.mjs --vuln`, an
  **inverted-verdict negative-control mode**: it enables the flag for the run (auto-restored),
  the grader actively probes each planted vuln, and a run that DETECTS them reads as
  `NEG-CONTROL PASS`. Verified live (`detected 4/4 planted vulns`) + verified never served
  when the constant is unset (no production surface). Community-free. (task-6)

- **Principal-scoped tool discovery** — new `tools_list_scope` config key. `open`
  (default) keeps MCP's public discovery; `principal` filters `tools/list` to the tools
  the caller's authorization policy admits, so restricted tools are not leaked to
  unauthorized or anonymous callers. Execution is authorized per-call either way.
- **Multi-principal coverage suite** (`tests/coverage.mjs`, 76 assertions) —
  drives a four-role fixture matrix (`fixtures.mjs`) against gated test tools to prove
  the planes conformance can't: tools/list visibility scoping (leakage), authz-deny, the
  full validation matrix (enum / numeric bounds / `format` / arrays / strings / no-coercion),
  transaction commit/rollback, idempotency (+ window expiry), rate-limit per-principal
  isolation, the approval queue + approve-executes-as-original-principal + reject +
  expired-never-executes + `mcp_approval_status` polling, token revoke (kill switch) +
  `allowed_tools` narrowing, abuse (auto-suspend / window-reset / unknown-tool), and
  **ledger tamper-evidence** (edits a canonical ledger field and asserts `verify_chain`
  detects it, then restores), plus the operator **web console** (authz-gating,
  access request→grant→mint→revoke, token IDOR guard, ledger JSON export). Assertions
  read real ledger / table / queue state — a broken plane fails them.
- **conformance.mjs** grew to 42 assertions — added the prompts surface (`prompts/list`,
  `prompts/get`, required-argument enforcement, unknown-prompt) and a malformed-input
  check.
- **Gated test tools** (`app/views/partials/mcp/tools/test_*`) + two principal-based
  policies + a host `test_note` table — registered only when `MCP_ENABLE_TEST_TOOLS` is
  set, never in production. Community-free.
- **CI** (`.github/workflows/mcp-ci.yml`) — static gates (engine-decoupling guard,
  tool linter, `pos-cli check`) on every PR + a live stage that reserves an ephemeral
  instance, deploys, and runs conformance + coverage + eval.

### Changed

- `conformance.mjs` resources test is now self-contained — it seeds and reads back its
  own markdown doc page (via the admin API) instead of assuming shipped content, and
  additionally asserts `resources/read` returns the markdown (guarding the html-leak
  fix). 35 → 36 assertions.
- `.platformos-check.yml` scoped to lint only pos-module-mcp's own sources; the module
  is now `pos-cli check`-clean.

## [0.1.0] - 2026-07-24

Initial pre-release of the governed Model Context Protocol engine — a standalone
platformOS module that turns an instance into an MCP server whose tool calls are
typed, identity-bound, authorized, reversible, and attested.

### Added

- **Engine (Layer 1)** — JSON-RPC 2.0 transport at `POST /mcp` (protocol
  `2025-06-18`): `initialize`, `ping`, `tools/list`, `tools/call`, `resources/*`,
  `prompts/*`, `logging/setLevel`, plus the built-in `mcp_approval_status` tool.
- **Governance planes** — bearer identity bound to a real pOS user; strict
  JSON-Schema validation (no coercion); named-policy authorization (fail-closed, no
  implicit allow); per-principal fixed-window rate limiting; transaction-wrapped
  execution with rollback; idempotency keys; human-in-the-loop approval; a
  hash-chained attestation ledger with `verify_chain`.
- **Tool authoring (Layer 2)** — registry + per-tool manifest/handler/policy/prompt
  partials; a `pos-cli generate` scaffolder with `read` / `create` / `command` modes
  (command mode inherits the app command's validations and side-effects).
- **Operator console** (`/mcp-admin`) — hash-chain status, metrics, pending
  approvals, MCP access management, registered-tool view, and the tool-surface eval.
- **Discovery & health** — `GET /mcp-health` readiness probe and
  `GET /.well-known/oauth-protected-resource` (RFC 9728).
- **Test harnesses** (`tests/`) — `conformance.mjs` (full pipeline over
  HTTP + ledger asserts), `eval.mjs` (tool-surface regression), `lint-tools.mjs`
  (static author-boundary security linter). All CI-gateable and non-destructive.
- **Config** — new `defaults.approval_max_pending_per_principal` (default `3`).

### Security

Hardening from the pre-release security review:

- **Approval queue-flood protection** — a duplicate pending request (same principal +
  identical argument hash) now returns the existing handle instead of stacking a new
  one, and each principal is capped at `approval_max_pending_per_principal` non-expired
  pending approvals. Excess is refused (`queue_full`); both cases are attested
  (`approval_duplicate` / `approval_throttled`) and counted as violations.
- **Operator queue drain** — `POST /mcp-admin/reject-principal` bulk-rejects every
  pending approval for one principal in a single action (bounded), complementing the
  inflow cap above.
- **Token kill-switch** — `POST /mcp-admin/token-revoke` lets an operator revoke any
  bearer token by id; the next request carrying it fails authentication. Idempotent;
  never exposes the token digest.
- **`logging/setLevel` validation** — the requested level is validated against the
  eight RFC 5424 levels; an unknown level is rejected with `-32602` instead of being
  silently accepted.
- **Layer-2 tool input hardening** — the demo event tools reject `javascript:` / `data:`
  link schemes via pattern and bound the event name to the underlying command's real
  limit (35), so the tool schema can no longer accept input the command rejects.

### Fixed

- **Resource read no longer leaks rendered HTML** — `resources/read` dropped its
  `page.html_content` fallback; a markdown resource with no source text now returns
  `-32002 Resource not found` instead of serving the page's rendered HTML mislabeled
  as `text/markdown`.

### Console

- **Tabbed operator console** — Overview · Approvals · Tokens & access · Ledger ·
  Tools & config, with no scroll-jump on switch and tab persistence across reloads.
- **Active-token table with an abuse watchlist** — per-principal violation counts and
  one-click revoke.
- **Ledger tooling** — security-lens quick filters, a filter form, throttle/dup
  metrics, a config viewer, and a paginated JSON export
  (`GET /mcp-admin/ledger-export.json`, honors active filters, capped with an explicit
  `capped` flag).

[Unreleased]: https://example.com/compare/v0.1.0...HEAD
[0.1.0]: https://example.com/releases/tag/v0.1.0
