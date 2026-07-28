#!/usr/bin/env node
/**
 * pos-module-mcp — coverage suite (multi-principal governance planes; spec §12/§11/§16/§9.6).
 *
 * Complements conformance.mjs (single-principal protocol) by driving the FOUR-user
 * fixture matrix against the gated TEST TOOLS to prove the planes conformance cannot:
 *   • tools/list visibility scoping (leakage) — open vs principal, per tier
 *   • authorization DENY — a principal calling above its tier is refused + attested
 *   • transaction COMMIT — a mutation persists its row
 *   • IDEMPOTENCY — same key → exactly one write; same key + different args → 409
 *   • transaction ROLLBACK — a write-then-fail leaves NO row + a rolled_back ledger entry
 *   • APPROVAL queue — requires_approval is queued (not executed), dedup'd, and capped
 *
 * Every assertion can FAIL on a real regression — no test is written merely to pass.
 * CI-gateable (exit non-zero). NON-DESTRUCTIVE: seeds its own users/rows, enables
 * MCP_ENABLE_TEST_TOOLS for the run, and restores all of it in `finally`.
 *
 * Run: node tests/coverage.mjs
 * Env: MCP_URL, MCP_TOKEN (instance admin api token) — falls back to the repo .pos "ps".
 */
import { loadEnv, makeAdmin, pruneRate } from './fixtures.mjs';
import { FIXT, applyReset, seededRecordIds } from './seed/seed.mjs';

// Ids of the persistent seeded rows — NEVER delete these (a deleted fixed id cannot be
// re-imported); cleanup removes only web-flow-created EXTRA rows.
const SEEDED = seededRecordIds();

const { base, admin } = loadEnv();
const MCP = base.endsWith('/') ? base + 'mcp' : base + '/mcp';
const adm = makeAdmin({ base, admin });

const T_NOTE = 'test_note';
const T_LEDGER = 'modules/mcp/mcp_ledger';
const T_PENDING = 'modules/mcp/mcp_pending_approval';

// ---- harness ---------------------------------------------------------------
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
const group = (n) => console.log(`\n${n}`);
let _id = 0;

async function rpc(body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(MCP, { method: 'POST', headers, body: JSON.stringify(body) });
  const text = await res.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, json, text };
}
async function listNames(token) {
  const r = await rpc({ jsonrpc: '2.0', id: ++_id, method: 'tools/list', params: {} }, token);
  return (r.json?.result?.tools || []).map(t => t.name);
}
async function callTool(token, name, args, meta) {
  const params = { name, arguments: args || {} };
  if (meta) params._meta = meta;
  return rpc({ jsonrpc: '2.0', id: ++_id, method: 'tools/call', params }, token);
}
const isDenied = (r) => r.json?.result?.isError === true || !!r.json?.error;
const isOkResult = (r) => !!r.json?.result && r.json.result.isError !== true;

async function setConstant(n, v) { await adm.gql(`mutation { constant_set(name: "${n}", value: ${JSON.stringify(v)}) { name } }`); }
async function unsetConstant(n) { await adm.gql(`mutation { constant_unset(name: "${n}") { name } }`); }

async function notesFor(userId) {
  const r = await adm.gql(`{ records(per_page: 100, filter: { table: { value: "${T_NOTE}" } properties: [{ name: "user_id", value: "${userId}" }] }) { results { id source: property(name: "source") label: property(name: "label") } } }`);
  return r?.data?.records?.results || [];
}
async function deleteNotesFor(userId) { for (const row of await notesFor(userId)) await adm.recordDelete(T_NOTE, row.id); }
async function ledgerFor(principalId) {
  const r = await adm.gql(`{ records(per_page: 200, filter: { table: { value: "${T_LEDGER}" } properties: [{ name: "principal_id", value: "${principalId}" }] }, sort: [{ id: { order: ASC } }]) { results { outcome: property(name: "execution_outcome") tool: property(name: "tool_name") authz: property(name: "authz_decision") } } }`);
  return r?.data?.records?.results || [];
}
async function pendingFor(principalId) {
  const r = await adm.gql(`{ records(per_page: 100, filter: { table: { value: "${T_PENDING}" } properties: [{ name: "principal_id", value: "${principalId}" }, { name: "status", value: "pending" }] }) { results { id } } }`);
  return r?.data?.records?.results || [];
}
async function clearPendingFor(principalId) {
  const r = await adm.gql(`{ records(per_page: 100, filter: { table: { value: "${T_PENDING}" } properties: [{ name: "principal_id", value: "${principalId}" }] }) { results { id } } }`);
  for (const row of (r?.data?.records?.results || [])) await adm.recordDelete(T_PENDING, row.id);
}
async function clearAbuse(principal) {
  const r = await adm.gql(`{ records(per_page: 200, filter: { table: { value: "modules/mcp/mcp_rate_counter" } properties: [{ name: "key", starts_with: "abuse:${principal}" }] }) { results { id } } }`);
  for (const row of (r?.data?.records?.results || [])) await adm.recordDelete('modules/mcp/mcp_rate_counter', row.id);
}
// Clear a principal's idempotency records — the fixed fixtures use FIXED keys, so a prior
// run's cached result would otherwise replay (no new write) and break re-runs.
async function clearIdempotencyFor(principalId) {
  const r = await adm.gql(`{ records(per_page: 200, filter: { table: { value: "modules/mcp/mcp_idempotency" } properties: [{ name: "principal_id", value: "${principalId}" }] }) { results { id } } }`);
  for (const row of (r?.data?.records?.results || [])) await adm.recordDelete('modules/mcp/mcp_idempotency', row.id);
}
async function pendingRecordsFor(principalId) {
  const r = await adm.gql(`{ records(per_page: 100, filter: { table: { value: "${T_PENDING}" } properties: [{ name: "principal_id", value: "${principalId}" }, { name: "status", value: "pending" }] }, sort: [{ id: { order: DESC } }]) { results { id handle: property(name: "handle") } } }`);
  return r?.data?.records?.results || [];
}
async function recordUpdate(table, id, props) {
  const p = Object.entries(props).map(([k, v]) => `{ name: "${k}", value: ${JSON.stringify(String(v))} }`).join(' ');
  const r = await adm.gql(`mutation { record_update(id: ${id}, record: { table: "${table}" properties: [ ${p} ] }) { id } }`);
  if (r?.errors) throw new Error('record_update failed: ' + JSON.stringify(r.errors));
}

// ---- operator browser session (the approval-decision path has no API mutation;
//      an operator must POST the /mcp-admin decision pages with a real session) ----
let _cookies = {};
const _applyCookie = (r) => { for (const c of r.headers.getSetCookie?.() || []) { const [p] = c.split(';'); const i = p.indexOf('='); _cookies[p.slice(0, i).trim()] = p.slice(i + 1).trim(); } };
const _cookieHeader = () => Object.entries(_cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function webGet(path) { const r = await fetch(base + path, { headers: { Cookie: _cookieHeader() }, redirect: 'manual' }); _applyCookie(r); return r; }
async function webPost(path, fields) { const r = await fetch(base + path, { method: 'POST', redirect: 'manual', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: _cookieHeader() }, body: new URLSearchParams(fields).toString() }); _applyCookie(r); return r; }
const _formTok = (html) => (html.match(/name="authenticity_token"\s+value="([^"]*)"/) || [])[1];
async function operatorLogin(op) {
  // Retry with backoff: a freshly-created user can take a moment to become
  // authenticatable, and session establishment is occasionally transient. Verify
  // /mcp-admin is actually reachable before returning success.
  for (let attempt = 0; attempt < 6; attempt++) {
    _cookies = {};
    const lp = await (await webGet('sessions/new')).text();
    const csrf = (lp.match(/name="csrf-token"[^>]*content="([^"]*)"/) || [])[1];
    await webPost('sessions', { authenticity_token: csrf, email: op.email, password: op.password });
    const adminPage = await (await webGet('mcp-admin')).text();
    if (!/403|Operators only|name="password"/i.test(adminPage)) return true;
    await new Promise(r => setTimeout(r, 500 + attempt * 500));
  }
  return false;
}
// Generic browser login for ANY fixture user (a successful sign-in 302-redirects).
async function sessionLogin(user) {
  for (let attempt = 0; attempt < 4; attempt++) {
    _cookies = {};
    const lp = await (await webGet('sessions/new')).text();
    const csrf = (lp.match(/name="csrf-token"[^>]*content="([^"]*)"/) || [])[1];
    const res = await webPost('sessions', { authenticity_token: csrf, email: user.email, password: user.password });
    if (res.status === 302) return true;
    await new Promise(r => setTimeout(r, 800));
  }
  return false;
}
async function accessRowFor(userId) {
  const r = await adm.gql(`{ records(per_page: 1, filter: { table: { value: "modules/mcp/mcp_access" } properties: [{ name: "user_id", value: "${userId}" }] }, sort: [{ id: { order: DESC } }]) { results { role: property(name: "role") status: property(name: "status") } } }`);
  return r?.data?.records?.results?.[0];
}
async function tokensFor(userId) {
  const r = await adm.gql(`{ records(per_page: 50, filter: { table: { value: "modules/mcp/mcp_token" } properties: [{ name: "user_id", value: "${userId}" }] }) { results { id label: property(name: "label") status: property(name: "status") } } }`);
  return r?.data?.records?.results || [];
}
// Remove a user's WEB-FLOW-created access + token rows (mint/grant create rows the fixtures
// don't track). SKIPS seeded fixture ids — those persist and are re-baselined by applyReset.
async function purgeUserRecords(userId) {
  for (const t of await tokensFor(userId)) { if (SEEDED.has(String(t.id))) continue; try { await adm.recordDelete('modules/mcp/mcp_token', t.id); } catch {} }
  const a = await adm.gql(`{ records(per_page: 50, filter: { table: { value: "modules/mcp/mcp_access" } properties: [{ name: "user_id", value: "${userId}" }] }) { results { id } } }`);
  for (const row of (a?.data?.records?.results || [])) { if (SEEDED.has(String(row.id))) continue; try { await adm.recordDelete('modules/mcp/mcp_access', row.id); } catch {} }
}

async function main() {
  console.log(`pos-module-mcp coverage → ${MCP}`);
  await setConstant('MCP_ENABLE_TEST_TOOLS', 'true');
  // Deterministic fixtures (TASK-5): (re-)import the fixed users/tokens/access to baseline.
  // Idempotent upsert resets any state a prior run mutated — no runtime user_create, no
  // randomBytes, no `revive`. One dedicated user per stateful plane so nothing cross-contaminates.
  await applyReset(adm.gql);
  const op = FIXT.users.operator, mem = FIXT.users.member, out = FIXT.users.outsider, req = FIXT.users.requester;
  const rate = FIXT.users.rate, abuseA = FIXT.users.abuseA, abuseB = FIXT.users.abuseB, abuseC = FIXT.users.abuseC, validator = FIXT.users.validator;
  const narrowTok = mem.tokens.find(t => t.label === 'fixt-narrow');   // pre-seeded, allowed_tools:[test_public]
  const revokeTok = mem.tokens.find(t => t.label === 'fixt-revoke');   // pre-seeded, revoked+reset per run
  console.log(`(fixtures: operator=${op.principal} member=${mem.principal} outsider=${out.principal})`);

  try {
    // ---- tools/list visibility scoping (§14.2) ----
    group('tools/list visibility scoping (§14.2)');
    await unsetConstant('MCP_CONFIG'); // 'open' (default)
    {
      const memN = await listNames(mem.rawToken);
      ok('open mode: member sees test_admin (nothing filtered)', memN.includes('test_admin'));
    }
    await setConstant('MCP_CONFIG', JSON.stringify({ tools_list_scope: 'principal' }));
    {
      const tiers = ['test_public', 'test_member', 'test_admin'];
      const opN = await listNames(op.rawToken);
      const memN = await listNames(mem.rawToken);
      const outN = await listNames(out.rawToken);
      const anonN = await listNames(null);
      ok('principal: operator sees all 3 tiers', tiers.every(t => opN.includes(t)), opN.filter(n => n.startsWith('test_')).join(','));
      ok('principal: member sees public+member but NOT admin', memN.includes('test_public') && memN.includes('test_member') && !memN.includes('test_admin'), memN.filter(n => n.startsWith('test_')).join(','));
      ok('principal: outsider sees ONLY public (no member/admin leak)', outN.includes('test_public') && !outN.includes('test_member') && !outN.includes('test_admin'), outN.filter(n => n.startsWith('test_')).join(','));
      ok('principal: anon sees NO test tiers', !tiers.some(t => anonN.includes(t)), anonN.filter(n => n.startsWith('test_')).join(','));
    }
    await unsetConstant('MCP_CONFIG');

    // ---- authorization deny (§12) ----
    group('Authorization — deny path (§12)');
    ok('member → test_member allowed', isOkResult(await callTool(mem.rawToken, 'test_member', {})));
    ok('outsider → test_member DENIED', isDenied(await callTool(out.rawToken, 'test_member', {})));
    ok('member → test_admin DENIED', isDenied(await callTool(mem.rawToken, 'test_admin', {})));
    {
      const led = await ledgerFor(out.principal);
      ok('deny is attested in the ledger', led.some(x => x.authz === 'deny'));
    }

    // ---- transaction commit ----
    group('Execution — transaction commit (§11)');
    await deleteNotesFor(mem.userId);
    ok('member test_write → ok', isOkResult(await callTool(mem.rawToken, 'test_write', { label: 'commit1' })));
    {
      const notes = await notesFor(mem.userId);
      ok('committed row persists, owned by member', notes.some(x => x.source === 'test_write' && x.label === 'commit1'));
    }

    // ---- idempotency (§16) ----
    group('Idempotency (§16)');
    await deleteNotesFor(mem.userId);
    await clearIdempotencyFor(mem.principal);
    {
      const key = 'cov-idem-' + mem.userId;
      await callTool(mem.rawToken, 'test_write', { label: 'idem' }, { idempotencyKey: key });
      await callTool(mem.rawToken, 'test_write', { label: 'idem' }, { idempotencyKey: key });
      const rows = (await notesFor(mem.userId)).filter(x => x.source === 'test_write');
      ok('same key twice → exactly one row written', rows.length === 1, 'rows=' + rows.length);
      const conflict = await callTool(mem.rawToken, 'test_write', { label: 'different' }, { idempotencyKey: key });
      ok('same key + different args → 409', conflict.status === 409, 'status=' + conflict.status);
    }

    // ---- transaction rollback (§11) ----
    group('Transaction rollback (§11)');
    await deleteNotesFor(mem.userId);
    ok('test_fail → isError', (await callTool(mem.rawToken, 'test_fail', { label: 'rollme' })).json?.result?.isError === true);
    {
      const rows = (await notesFor(mem.userId)).filter(x => x.source === 'test_fail');
      ok('rolled back → NO row persisted', rows.length === 0, 'rows=' + rows.length);
      const led = await ledgerFor(mem.principal);
      ok('ledger records a rolled_back outcome', led.some(x => x.outcome === 'rolled_back'));
    }

    // ---- approval queue (§9.6) ----
    group('Approval — queue / dedup / cap (§9.6)');
    await deleteNotesFor(mem.userId);
    await clearPendingFor(mem.principal);
    {
      const r1 = await callTool(mem.rawToken, 'test_approve', { label: 'appr' });
      ok('requires_approval → queued (isError pending), not executed', /pending/i.test(JSON.stringify(r1.json?.result || {})));
      ok('no row written before approval', (await notesFor(mem.userId)).filter(x => x.source === 'test_approve').length === 0);
      ok('one pending approval recorded', (await pendingFor(mem.principal)).length === 1, 'pending=' + (await pendingFor(mem.principal)).length);
      // dedup: identical proposal (same input hash) must not stack a second pending
      await callTool(mem.rawToken, 'test_approve', { label: 'appr' });
      ok('duplicate proposal deduped (still one pending)', (await pendingFor(mem.principal)).length === 1, 'pending=' + (await pendingFor(mem.principal)).length);
      // cap: fill to approval_max_pending_per_principal (default 3) with distinct args, then overflow
      await callTool(mem.rawToken, 'test_approve', { label: 'appr2' });
      await callTool(mem.rawToken, 'test_approve', { label: 'appr3' });
      const overflow = await callTool(mem.rawToken, 'test_approve', { label: 'appr4' });
      ok('queue cap → overflow refused (queue_full)', /queue_full|full|throttl/i.test(JSON.stringify(overflow.json?.result || {})), JSON.stringify(overflow.json?.result?.structuredContent || overflow.json?.result || {}).slice(0, 120));
      ok('cap holds pending at the max (3)', (await pendingFor(mem.principal)).length === 3, 'pending=' + (await pendingFor(mem.principal)).length);
    }

    // ---- approval: operator approves → executes AS the original principal ----
    group('Approval — approve executes as original principal (§9.6)');
    await clearPendingFor(mem.principal);
    await deleteNotesFor(mem.userId);
    await deleteNotesFor(op.userId);
    await callTool(mem.rawToken, 'test_approve', { label: 'execnow' });
    {
      const pend = await pendingRecordsFor(mem.principal);
      ok('one pending queued for member', pend.length === 1, 'pending=' + pend.length);
      const handle = pend[0]?.handle;
      const loggedIn = await operatorLogin(op);
      ok('operator reaches the console (login ok)', loggedIn);
      const adminPage = await (await webGet('mcp-admin')).text();
      const approveRes = await webPost('mcp-admin/approve', { authenticity_token: _formTok(adminPage), handle });
      ok('approve POST accepted', approveRes.status === 302 || approveRes.status === 200, 'status=' + approveRes.status);
      const memNotes = (await notesFor(mem.userId)).filter(x => x.source === 'test_approve');
      const opNotes = (await notesFor(op.userId)).filter(x => x.source === 'test_approve');
      ok('approved action EXECUTED (row now exists)', memNotes.length === 1 && memNotes[0].label === 'execnow', 'member rows=' + memNotes.length);
      ok('executed AS THE ORIGINAL PRINCIPAL (member owns it, not the operator)', memNotes.length === 1 && opNotes.length === 0, 'op rows=' + opNotes.length);
    }

    // ---- approval: operator rejects → never executes ----
    group('Approval — reject never executes (§9.6)');
    await clearPendingFor(mem.principal);
    await deleteNotesFor(mem.userId);
    await callTool(mem.rawToken, 'test_approve', { label: 'rejectme' });
    {
      const pend = await pendingRecordsFor(mem.principal);
      const handle = pend[0]?.handle;
      const adminPage = await (await webGet('mcp-admin')).text();
      const rejectRes = await webPost('mcp-admin/reject', { authenticity_token: _formTok(adminPage), handle });
      ok('reject POST accepted', rejectRes.status === 302 || rejectRes.status === 200, 'status=' + rejectRes.status);
      const memNotes = (await notesFor(mem.userId)).filter(x => x.source === 'test_approve' && x.label === 'rejectme');
      ok('rejected action NEVER executed (no row)', memNotes.length === 0, 'rows=' + memNotes.length);
    }

    // ---- abuse: auto-suspend after repeated violations (§12.4) ----
    // Dedicated principal (abuseA) so a suspend never contaminates the shared fixtures.
    group('Abuse — auto-suspend after threshold (§12.4)');
    await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { abuse_threshold: 3, abuse_window_seconds: 600 } }));
    await clearAbuse(abuseA.principal);
    await pruneRate(adm, abuseA.principal);
    {
      // abuseA is a member (role=user); each abuseA→test_admin is an authorization denial = a counted violation.
      for (let i = 0; i < 4; i++) await callTool(abuseA.rawToken, 'test_admin', {});
      const after = await callTool(abuseA.rawToken, 'test_public', {});
      ok('token auto-suspended past threshold → 401', after.status === 401, 'status=' + after.status);
    }
    await unsetConstant('MCP_CONFIG');

    // ---- token lifecycle: revoke (kill switch) + allowed_tools narrowing ----
    group('Token lifecycle — revoke + allowed_tools narrowing (§9, §6.2)');
    {
      // Pre-seeded revoke fixture starts active; applyReset restores it to active next run.
      ok('active token works', isOkResult(await callTool(revokeTok.raw, 'test_public', {})));
      await recordUpdate('modules/mcp/mcp_token', revokeTok.id, { status: 'revoked' });
      const after = await callTool(revokeTok.raw, 'test_public', {});
      ok('revoked token → 401 (central kill switch)', after.status === 401, 'status=' + after.status);
    }
    {
      // Pre-seeded narrow fixture: allowed_tools = ['test_public'].
      ok('narrowed token: an allowed tool works', isOkResult(await callTool(narrowTok.raw, 'test_public', {})));
      const denied = await callTool(narrowTok.raw, 'test_member', {});
      ok('narrowed token: a NON-allowed tool is refused (never widens)', isDenied(denied), 'status=' + denied.status);
    }

    // ---- expired approval never executes ----
    group('Approval — expired approval never executes (§9.6)');
    await clearPendingFor(mem.principal);
    await deleteNotesFor(mem.userId);
    await callTool(mem.rawToken, 'test_approve', { label: 'expireme' });
    {
      const pend = await pendingRecordsFor(mem.principal);
      ok('one pending to expire', pend.length === 1, 'pending=' + pend.length);
      // expires_at is a unix timestamp — force it into the past.
      await recordUpdate(T_PENDING, pend[0].id, { expires_at: '1' });
      const adminPage = await (await webGet('mcp-admin')).text();
      await webPost('mcp-admin/approve', { authenticity_token: _formTok(adminPage), handle: pend[0].handle });
      const memNotes = (await notesFor(mem.userId)).filter(x => x.source === 'test_approve' && x.label === 'expireme');
      ok('approving an EXPIRED approval does NOT execute (no row)', memNotes.length === 0, 'rows=' + memNotes.length);
    }

    // ---- ledger tamper-evidence (the core immutability claim) ----
    group('Ledger — tamper-evidence via verify_chain (§6)');
    {
      const chainOk = (h) => /entries intact|chain verified/i.test(h) && !/CHAIN BROKEN/i.test(h);
      const chainBroken = (h) => /CHAIN BROKEN/i.test(h);
      let page = await (await webGet('mcp-admin')).text();
      ok('chain intact before tamper', chainOk(page));
      const q = `{ records(per_page: 1, filter: { table: { value: "${T_LEDGER}" } }, sort: [{ id: { order: DESC } }]) { results { id outcome: property(name: "execution_outcome") } } }`;
      const row = (await adm.gql(q))?.data?.records?.results?.[0];
      const original = row?.outcome;
      try {
        // execution_outcome is a canonical (hashed) field — editing it MUST break the chain.
        await recordUpdate(T_LEDGER, row.id, { execution_outcome: original === 'success' ? 'rolled_back' : 'success' });
        page = await (await webGet('mcp-admin')).text();
        ok('verify_chain DETECTS the tampered ledger row', chainBroken(page));
      } finally {
        // restore the EXACT original value → recomputed hash matches again → chain valid.
        await recordUpdate(T_LEDGER, row.id, { execution_outcome: original });
      }
      page = await (await webGet('mcp-admin')).text();
      ok('chain valid again after exact restore', chainOk(page));
    }

    // ---- validation matrix (strict, no coercion) ----
    group('Validation matrix (§10, strict, no coercion)');
    {
      const V = (args) => callTool(validator.rawToken, 'test_validate', args); // dedicated: its many arg-rejections don't accrue on `member`
      const rej = (r) => r.json?.error?.code === -32602;
      const valid = { kind: 'alpha', count: 5, ratio: 0.5, email: 'a@b.co', uid: '123e4567-e89b-12d3-a456-426614174000', when: '2026-01-01T00:00:00Z', tags: ['x'], code: 'abc' };
      ok('fully valid input accepted', isOkResult(await V(valid)));
      const bad = async (name, patch) => ok(name, rej(await V({ ...valid, ...patch })));
      await bad('enum: unknown value rejected', { kind: 'delta' });
      await bad('integer: below minimum rejected', { count: 0 });
      await bad('integer: above maximum rejected', { count: 11 });
      await bad('integer: string not coerced', { count: '5' });
      await bad('number: exclusiveMinimum rejected', { ratio: 0 });
      await bad('format email: bad value rejected', { email: 'not-an-email' });
      await bad('format uuid: bad value rejected', { uid: 'nope' });
      await bad('format date-time: bad value rejected', { when: 'yesterday' });
      await bad('array: minItems rejected', { tags: [] });
      await bad('array: maxItems rejected', { tags: ['a', 'b', 'c', 'd'] });
      await bad('array: item type rejected', { tags: [1, 2] });
      await bad('string: minLength rejected', { code: 'a' });
      await bad('string: pattern rejected', { code: 'AB' });
      ok('additionalProperties:false → unknown key rejected', rej(await V({ ...valid, surprise: 1 })));
    }

    // ---- rate limiting: per-principal isolation ----
    group('Rate limiting — per-principal isolation (§12.4)');
    await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { rate_limit_per_min: 3 } }));
    await pruneRate(adm, rate.principal);
    await pruneRate(adm, op.principal);
    {
      const codes = [];
      for (let i = 0; i < 5; i++) codes.push((await callTool(rate.rawToken, 'test_public', {})).status);
      ok('a principal exhausts its own limit → 429', codes.slice(0, 3).every(c => c === 200) && codes.slice(3).some(c => c === 429), codes.join(','));
      const other = (await callTool(op.rawToken, 'test_public', {})).status;
      ok('a DIFFERENT principal is unaffected (isolation)', other === 200, 'status=' + other);
    }
    await unsetConstant('MCP_CONFIG');
    await pruneRate(adm, rate.principal);

    // ---- abuse: windowed counter resets across windows ----
    group('Abuse — windowed counter resets across windows (§12.4)');
    {
      await clearAbuse(abuseB.principal); // dedicated principal = clean slate
      await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { abuse_threshold: 3, abuse_window_seconds: 1 } }));
      await callTool(abuseB.rawToken, 'test_admin', {}); // deny = violation (window A)
      await callTool(abuseB.rawToken, 'test_admin', {});
      await new Promise(r => setTimeout(r, 1500)); // roll to window B
      await callTool(abuseB.rawToken, 'test_admin', {}); // window B
      await callTool(abuseB.rawToken, 'test_admin', {});
      const after = await callTool(abuseB.rawToken, 'test_public', {});
      ok('violations split across windows do NOT accumulate to suspend', after.status === 200, 'status=' + after.status);
      await unsetConstant('MCP_CONFIG');
    }

    // ---- abuse: unknown-tool attempts count as violations ----
    group('Abuse — unknown-tool attempts trigger suspend (§12.4)');
    {
      await clearAbuse(abuseC.principal);
      await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { abuse_threshold: 3, abuse_window_seconds: 600 } }));
      for (let i = 0; i < 4; i++) await callTool(abuseC.rawToken, 'no_such_tool_xyz', {}); // unknown-tool violations
      const after = await callTool(abuseC.rawToken, 'test_public', {});
      ok('repeated unknown-tool attempts → token suspended (401)', after.status === 401, 'status=' + after.status);
      await unsetConstant('MCP_CONFIG');
    }

    // ---- mcp_approval_status polling ----
    group('Approval status polling — mcp_approval_status (§9.6)');
    await clearAbuse(mem.principal);
    await clearPendingFor(mem.principal);
    await callTool(mem.rawToken, 'test_approve', { label: 'pollme' });
    {
      const pend = await pendingRecordsFor(mem.principal);
      const handle = pend[0]?.handle;
      const st = await callTool(mem.rawToken, 'mcp_approval_status', { handle });
      ok('owner polls handle → status pending', st.json?.result?.structuredContent?.status === 'pending', JSON.stringify(st.json?.result?.structuredContent || {}).slice(0, 80));
      const stOther = await callTool(op.rawToken, 'mcp_approval_status', { handle });
      ok('another principal polling the handle → not found (no enumeration)', stOther.json?.result?.isError === true);
    }

    // ---- idempotency window expiry ----
    group('Idempotency — window expiry re-executes (§16.3)');
    await clearAbuse(mem.principal);
    await deleteNotesFor(mem.userId);
    await clearIdempotencyFor(mem.principal);
    await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { idempotency_window_seconds: 1 } }));
    {
      const key = 'cov-idemexp-' + mem.userId;
      await callTool(mem.rawToken, 'test_write', { label: 'exp' }, { idempotencyKey: key });
      await new Promise(r => setTimeout(r, 2000)); // let the idempotency record expire
      await callTool(mem.rawToken, 'test_write', { label: 'exp' }, { idempotencyKey: key });
      const rows = (await notesFor(mem.userId)).filter(x => x.source === 'test_write');
      ok('after window expiry, same key RE-executes (2 rows)', rows.length === 2, 'rows=' + rows.length);
    }
    await unsetConstant('MCP_CONFIG');

    // ==== Tier 3: operator / token WEB CONSOLE flows ===============================

    // ---- console web-authz gating ----
    group('Operator console — web authz gating (§5.1)');
    {
      await sessionLogin(mem); // member is NOT an operator
      const adminRes = await webGet('mcp-admin');
      ok('non-operator GET /mcp-admin → 403', adminRes.status === 403, 'status=' + adminRes.status);
      const expRes = await webGet('mcp-admin/ledger-export.json');
      ok('non-operator GET /mcp-admin/ledger-export.json → 403', expRes.status === 403, 'status=' + expRes.status);
    }

    // ---- access lifecycle: request → grant → mint → revoke ----
    group('Access lifecycle — request → grant → mint → revoke (§5)');
    {
      await purgeUserRecords(out.userId); // outsider starts with no access row
      await sessionLogin(out);
      let tools = await (await webGet('mcp-tools')).text();
      ok('no-access user sees "Request access"', /Request access/i.test(tools));
      await webPost('mcp-tools/request', { authenticity_token: _formTok(tools) });
      ok('request → mcp_access status=requested', (await accessRowFor(out.userId))?.status === 'requested');

      await operatorLogin(op);
      let adminPage = await (await webGet('mcp-admin')).text();
      await webPost('mcp-admin/access', { authenticity_token: _formTok(adminPage), decision: 'make_user', user_id: out.userId, email: out.email });
      const granted = await accessRowFor(out.userId);
      ok('operator grant → access active, role user', granted?.status === 'active' && granted?.role === 'user', JSON.stringify(granted));

      await sessionLogin(out);
      tools = await (await webGet('mcp-tools')).text();
      ok('granted user now sees the mint form', /mcp-tools\/mint/.test(tools));
      const before = (await tokensFor(out.userId)).length;
      await webPost('mcp-tools/mint', { authenticity_token: _formTok(tools), label: 'ci-web-mint' });
      ok('mint → a new token row for the user', (await tokensFor(out.userId)).length === before + 1);

      await operatorLogin(op);
      adminPage = await (await webGet('mcp-admin')).text();
      await webPost('mcp-admin/access', { authenticity_token: _formTok(adminPage), decision: 'revoke', user_id: out.userId, email: out.email });
      ok('operator revoke → access revoked', (await accessRowFor(out.userId))?.status === 'revoked');
    }

    // ---- token console IDOR guard ----
    group('Token console — IDOR revoke guard (§20)');
    {
      await sessionLogin(mem);
      let memTools = await (await webGet('mcp-tools')).text();
      ok('member (approved) sees the mint form', /mcp-tools\/mint/.test(memTools));
      await webPost('mcp-tools/mint', { authenticity_token: _formTok(memTools), label: 'idor-victim' });
      const victim = (await tokensFor(mem.userId)).find(t => t.label === 'idor-victim' && t.status === 'active');
      ok('member minted a token', !!victim);
      // operator (a DIFFERENT user, even an admin) tries to revoke it via /mcp-tools
      await operatorLogin(op);
      const opTools = await (await webGet('mcp-tools')).text();
      await webPost('mcp-tools/revoke', { authenticity_token: _formTok(opTools), id: victim?.id });
      ok('IDOR: another user (even an operator) CANNOT revoke your token', (await tokensFor(mem.userId)).find(t => t.id === victim?.id)?.status === 'active');
      // owner CAN revoke their own
      await sessionLogin(mem);
      memTools = await (await webGet('mcp-tools')).text();
      await webPost('mcp-tools/revoke', { authenticity_token: _formTok(memTools), id: victim?.id });
      ok('owner CAN revoke their own token', (await tokensFor(mem.userId)).find(t => t.id === victim?.id)?.status === 'revoked');
    }

    // ---- ledger export (operator JSON, filters, cap) ----
    group('Ledger export — operator JSON (§9.6)');
    {
      await operatorLogin(op);
      const res = await webGet('mcp-admin/ledger-export.json');
      ok('operator GET ledger-export.json → 200', res.status === 200, 'status=' + res.status);
      let j = null; try { j = JSON.parse(await res.text()); } catch {}
      ok('export is JSON with rows[] + count + capped flag', j && Array.isArray(j.rows) && typeof j.count === 'number' && ('capped' in j), Object.keys(j || {}).join(','));
      let jf = null; try { jf = JSON.parse(await (await webGet('mcp-admin/ledger-export.json?execution_outcome=success')).text()); } catch {}
      ok('export honors a filter param (echoed)', jf?.filter?.execution_outcome === 'success', 'filter=' + JSON.stringify(jf?.filter));
    }
  } finally {
    // ---- reset transient state + restore fixtures to baseline (no user teardown) ----
    await unsetConstant('MCP_CONFIG');
    const principals = [op, mem, out, req, rate, abuseA, abuseB, abuseC, validator];
    for (const h of principals) { if (!h) continue; try { await deleteNotesFor(h.userId); } catch {} try { await clearPendingFor(h.principal); } catch {} try { await pruneRate(adm, h.principal); } catch {} try { await clearAbuse(h.principal); } catch {} try { await clearIdempotencyFor(h.principal); } catch {} }
    // Remove web-flow-created rows (granted access + minted tokens), then re-import so every
    // fixture (incl. the revoked/narrowed tokens and any purged seeded token) returns to baseline.
    for (const h of [out, mem]) { try { await purgeUserRecords(h.userId); } catch {} }
    try { await applyReset(adm.gql); } catch {}
    await unsetConstant('MCP_ENABLE_TEST_TOOLS');
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('FAILED: ' + fails.join(' · ')); process.exit(1); }
  console.log('All coverage checks passed.');
}

main().catch(e => { console.error(e); process.exit(2); });
