Now, your question — what to add to /mcp-admin

  Here's what the console currently has: chain-verify banner, metrics (calls/blocked/suspends/rollbacks/p95), pending approvals, access management, registered tools, eval + hygiene, and a
  filterable ledger. It's solid. The highest-value additions, ranked:

  Tier 1 — real operational gaps
  1. Active tokens view — who has live tokens, label, last-used, and a revoke button per token. Right now an operator can't see or kill agent tokens from the console (only the token's own
  user can, on /mcp-tools). For an operator that's a genuine gap.
  2. Ledger filters as actual UI — the backing query already filters by tool/principal/decision/outcome; expose them as dropdowns/inputs (currently you'd hand-edit the URL).
  3. Export the ledger (CSV/JSON, current filter) — the spec's retention model is export-then-purge; an operator needs the export half.

  Tier 2 — visibility
  4. Per-client/agent activity — group ledger by agent: calls, denials, suspends, last seen. Spot a misbehaving agent at a glance.
  5. Approvals history — approved/rejected/expired, not just the pending queue (audit of operator decisions).
  6. Time-window toggle (last 1h/24h/7d) on the metrics so numbers mean something.

  Tier 3 — polish
  7. Config viewer — show the effective MCP_CONFIG (rate limit, abuse threshold, resource toggle) read-only, so an operator sees the live settings.
  8. Live chain-verify button + last-verified timestamp (currently it verifies on every page load, which is also a perf cost as the ledger grows — a manual button + cached status would be
  better).


pos-supervisor logs and everything produced by it are only used for observation and feeding the dashboard—yes, this directory should be added to .gitignore.
