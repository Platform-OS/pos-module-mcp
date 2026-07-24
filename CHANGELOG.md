# Changelog

All notable changes to **pos-module-mcp** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

_Nothing yet._

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
- **Test harnesses** (`modules/mcp/tests/`) — `conformance.mjs` (full pipeline over
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
