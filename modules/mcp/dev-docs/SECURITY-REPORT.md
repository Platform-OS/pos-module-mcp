# MCP Security Assessment Report

**Target**: pos-module-mcp.ps-01-platformos.com/mcp
**Date**: 2026-07-23
**Tester**: Rafal
**Scope**: MCP protocol attacks only (per engagement agreement)
**Scenario**: External attacker who discovered the MCP endpoint exists

---

## Executive Summary

The MCP server exposes 4 tools for community event management (`search_events`, `create_event`, `broadcast_event`, `mcp_approval_status`) over JSON-RPC 2.0 with Bearer token authentication.

**Authentication and authorization are solid.** All tool calls require a valid token, invalid tokens are rejected cleanly, and the server resists common auth bypass techniques (fake JWTs, SQL injection in tokens, scheme manipulation).

**Input validation is mostly effective** on the post-patch v2.0.0 schema, with server-side enforcement of field lengths, types, required fields, and additional property rejection.

**Three significant issues were found:**

1. The original `create_event` tool wrote directly to the database, bypassing all application-level validation and allowing stored XSS (patched mid-test)
2. The `link` field accepts dangerous URI schemes (`javascript:`, `data:`) that could become XSS in other rendering contexts
3. No rate limiting on `broadcast_event`, allowing approval queue flooding

**10 findings total**: 1 High, 1 Medium, 3 Low, 5 Informational.

---

## Methodology Note

The instance was being actively patched by an AI agent (Claude) during the first phase of testing. After the stored XSS finding landed, the tool schema was updated (v1.0.0 to v2.0.0), validation rules were added, and the malicious database record was deleted — all before the tester could fully document the finding. Testing was paused and resumed after the instance owner confirmed a freeze at approximately 21:00.

Findings 1-3 reflect the original server state. Findings 4-10 reflect the patched state. The post-patch `create_event` (v2.0.0) passed all injection tests, though some fixes introduced new issues (see Findings 9 and 10).

---

## Findings Summary

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1 | Unauthenticated MCP discovery (`tools/list`, `prompts/list`) | Informational | Open |
| 2 | Stored XSS via `create_event` — no input sanitization | **High** | Patched mid-test (needs retest) |
| 3 | `create_event` bypasses application-level validation (direct DB write) | **Medium** | Patched mid-test (needs retest) |
| 4 | Different error messages for missing vs invalid tokens | Informational | Open |
| 5 | `Accept` header required — 404 without it | Informational | Open |
| 6 | Inconsistent HTTP status on validation errors | Informational | Open |
| 7 | `logging/setLevel` accepts arbitrary input without auth | Low | Open |
| 8 | No rate limiting or deduplication on `broadcast_event` | Low | Open |
| 9 | `link` field accepts non-HTTP URI schemes (`javascript:`, `data:`) | Low | Open |
| 10 | Overly restrictive field length after XSS patch (name maxLength 35) | Low (design) | Open |

---

## Detailed Findings

### Finding 1: Unauthenticated MCP discovery

- **Severity**: Informational
- **Vector**: `tools/list` and `prompts/list` return full schemas without authentication
- **Impact**: Attacker can enumerate all available tools, parameters, types, constraints, and prompt templates without a token. Low risk with 4 public-facing event tools, but becomes a real issue if privileged tools are added later.
- **Evidence**: Identical `tools/list` responses with and without Bearer token. `prompts/list` exposes `draft_announcement` prompt template without auth.
- **Recommendation**: Gate discovery methods behind auth, or ensure they only return resources the caller is authorized to use.

### Finding 2: Stored XSS via `create_event` — no input sanitization

- **Severity**: High
- **Vector**: `create_event` `name` field accepted arbitrary HTML/JS without sanitization
- **Payload**: `<img src=x onerror=alert('xss_name')>`
- **Impact**: Event created with `"status": "published"` immediately. Unsanitized HTML stored in database. Any browser rendering of the event name (community page, admin panel, notifications, emails) would execute the script.
- **Evidence**: Server returned event ID 230 with payload stored verbatim. The instance owner confirmed the attack succeeded and that the record was written directly to the database.
- **Note**: Patched mid-test — schema updated, record deleted. The fix added a `^[^<>]*$` pattern and reduced maxLength from 100 to 35. See Findings 9 and 10 for issues introduced by the patch.
- **Recommendation**: Implement proper HTML sanitization at the MCP tool layer (strip or encode HTML entities) rather than restricting character sets via regex. Apply output escaping at every rendering layer as defense in depth.

### Finding 3: `create_event` bypasses application-level validation

- **Severity**: Medium
- **Vector**: The MCP tool wrote directly to the database instead of going through the application's event creation pipeline
- **Impact**: All UI-side validation, business rules, and sanitization were bypassed. Events could be created with missing required fields, no moderation, and immediate publication.
- **Evidence**: Event created with only `name` and `start_date`. The instance owner confirmed the tool wrote directly to the database instead of using the application's create flow.
- **Note**: Patched mid-test — tool now uses "community module native create pipeline" with moderation queue.
- **Recommendation**: All MCP tools that create or modify data must use the same code paths as the application UI. Direct database writes from MCP tools are an architectural anti-pattern that bypasses security controls.

### Finding 4: Different error messages for missing vs invalid tokens

- **Severity**: Informational
- **Vector**: No token returns `"Authorization required"`, invalid token returns `"Invalid token"`
- **Impact**: Allows attacker to distinguish between absent and rejected credentials, confirming auth mechanism presence.
- **Recommendation**: Return a single generic error (e.g. `"Unauthorized"`) for all auth failures.

### Finding 5: `Accept` header required — 404 without it

- **Severity**: Informational
- **Vector**: Requests to `/mcp` without an `Accept: */*` header return an HTML 404 page instead of a JSON-RPC error
- **Impact**: Inconsistent error handling. MCP clients that don't send Accept headers receive unexpected responses.
- **Recommendation**: The MCP endpoint should return JSON-RPC errors regardless of the Accept header.

### Finding 6: Inconsistent HTTP status on validation errors

- **Severity**: Informational
- **Vector**: `create_event` with a past date returns HTTP 200 with error data in the body, while schema-level validation failures (maxLength, unknown properties) return HTTP 400
- **Impact**: Clients relying on HTTP status codes may miss application-level validation errors.
- **Recommendation**: All validation errors should return HTTP 400 consistently. Distinguish schema errors from business rule errors in the response body, not via HTTP status.

### Finding 7: `logging/setLevel` accepts arbitrary input without auth

- **Severity**: Low
- **Vector**: The MCP `logging/setLevel` method accepts any input without authentication and returns `{"result": {}}`
- **Evidence**: Tested with `"debug"`, `"emergency"`, `"../../etc/passwd"` — all return success, with and without token.
- **Impact**: If functional, an unauthenticated attacker could manipulate logging verbosity. If a no-op, it's still a control method returning success for invalid input without auth.
- **Recommendation**: Gate behind authentication, validate input against known log levels, or return method-not-found if not implemented.

### Finding 8: No rate limiting or deduplication on `broadcast_event`

- **Severity**: Low (Medium when feature is fully implemented)
- **Vector**: `broadcast_event` accepts unlimited identical proposals with no rate limiting or deduplication
- **Evidence**: Multiple identical broadcast proposals sent in rapid succession — all accepted and entered the approval queue.
- **Impact**: Attacker can flood the operator's approval queue with garbage, burying legitimate proposals. When broadcasts reach the whole community, this becomes a spam/DoS vector.
- **Recommendation**: Implement per-token rate limiting (e.g. max 3 pending proposals per hour), deduplicate identical proposals, cap total pending proposals per user.

### Finding 9: `link` field accepts non-HTTP URI schemes

- **Severity**: Low (Medium if events are consumed by other clients)
- **Vector**: `create_event` `link` field accepts `javascript:` and `data:` URI schemes
- **Evidence**: `javascript:alert(document.cookie)` and `data:text/html,alert(document.cookie)` both accepted and stored. Current community site renders them as non-clickable text or blocks navigation.
- **Impact**: The current UI is protected, but the malicious URIs are stored in the database. Any other consumer (mobile app, email template, RSS feed, different frontend) that renders the link as `<a href="...">` without the same protections would be vulnerable to XSS.
- **Recommendation**: Validate the `link` field at the MCP tool layer — reject any URI not starting with `https://` (or `http://`).

### Finding 10: Overly restrictive field length after XSS patch

- **Severity**: Low (design issue)
- **Vector**: The mid-test XSS patch reduced `name` maxLength from 100 to 35 and added a `^[^<>]*$` pattern
- **Impact**: 35 characters is too restrictive for realistic event names (e.g. "Annual Community Developer Conference 2026" = 43 chars). The length restriction limits XSS payload space but doesn't address the root cause.
- **Recommendation**: Restore a reasonable maxLength (100+) and implement proper HTML sanitization on input or output escaping on render. Character set restrictions via regex are a defense-in-depth layer, not a primary control.

---

## What Passed

### Authentication & Authorization
The auth layer is well-implemented. All tool calls require a valid Bearer token. The server correctly rejects:
- Requests with no Authorization header
- Empty, garbage, and fake JWT tokens
- SQL injection payloads in the token
- Tokens without the Bearer prefix
- Basic auth scheme
- Tokens in non-standard headers (X-API-Key)

### Input Validation — `search_events`
Server-side schema enforcement is thorough:
- XSS payloads HTML-encoded in responses
- Liquid/SSTI templates returned as literal text
- maxLength (80 chars) enforced
- Maximum limit (20) enforced
- Extra fields rejected (`additionalProperties: false`)

### Input Validation — `create_event` (v2.0.0, post-patch)
The patched version handles injection attempts well:
- XSS without angle brackets: stored but not rendered
- Liquid/SSTI: stored as literal text, not executed by template engine
- Past dates: rejected with validation error
- Mass assignment: rejected (unknown properties)
- Unicode angle bracket bypass: stored but browsers don't interpret as HTML

### `mcp_approval_status` — IDOR
Approval handles use 32-character hex tokens with an `mcp_pa_` prefix. Handle enumeration is impractical, and all invalid handles return a consistent error message with no information leakage.

### Error Message Handling
Error responses are clean across all tested scenarios:
- Malformed JSON: generic parse error, no stack traces
- Missing required params: clear validation list
- Wrong param types: clear type mismatch errors
- Unknown tool: generic "Unknown tool", no tool list leaked
- Missing method: generic "Invalid Request"

### Protocol-Level
- JSON-RPC batch requests: rejected
- Unknown/undocumented methods: rejected or return empty results

---

## Out of Scope

The following were not tested per engagement agreement (MCP-only scope):
- Web application vulnerabilities outside the `/mcp` endpoint
- Infrastructure, network, and cloud security
- Authentication system internals (token generation, storage, rotation)
- Other PlatformOS modules and functionality

The following were deprioritized during testing:
- Oversized payload handling (server-level size limits)
- Resource exhaustion via `create_event` (mitigated by unique name constraint)
- CORS configuration

---

## Recommendations Summary

**Immediate (address before production use):**
1. Ensure all MCP tools use application-level code paths, not direct DB writes (Finding 3)
2. Implement HTML sanitization at the MCP input layer for all user-facing string fields (Finding 2)
3. Validate URI schemes on the `link` field — allow only `https://` and `http://` (Finding 9)

**Short-term:**
4. Add rate limiting to `broadcast_event` (Finding 8)
5. Gate `logging/setLevel` behind auth or disable it (Finding 7)
6. Standardize error responses — consistent HTTP status codes, JSON-RPC format for all errors (Findings 5, 6)
7. Restore reasonable field lengths and rely on sanitization instead of restrictive character limits (Finding 10)

**Consideration:**
8. Gate `tools/list` and `prompts/list` behind auth if privileged tools are ever added (Finding 1)
9. Unify auth error messages (Finding 4)

---

*Report prepared 2026-07-23. Token used during testing should be rotated.*
