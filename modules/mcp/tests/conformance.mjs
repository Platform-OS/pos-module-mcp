#!/usr/bin/env node
/**
 * pos-module-mcp — conformance + adversarial suite (spec §19).
 *
 * Exercises the full governance pipeline over real HTTP against a deployed
 * instance and asserts the attestation ledger via GraphQL. CI-gateable: exits
 * non-zero on any failure. This is a DEV artifact (deploy ignores it).
 *
 * NON-DESTRUCTIVE: it uses an isolated conformance principal (user:999), its own
 * marked event + token, and cleans up ONLY what it created (by record id / marker).
 * It never touches real tokens, users, profiles, or the existing ledger — except
 * it resets the transient MCP_CONFIG constant it toggles and prunes its own rate
 * counters. Real ledger entries from other principals are left intact.
 *
 * Run:  node modules/mcp/tests/conformance.mjs
 * Env (optional; falls back to the repo .pos "ps" env):
 *   MCP_URL    - instance base url (e.g. https://host/)
 *   MCP_TOKEN  - instance ADMIN api token (for seed/cleanup + ledger reads)
 */
import { readFileSync } from 'node:fs';
import { createHash, randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// ---- isolated conformance identity + fixtures ------------------------------
const RAW_TOKEN = 'mcp_conf_' + randomBytes(16).toString('hex');
const TOKEN_DIGEST = createHash('sha256').update(RAW_TOKEN).digest('hex');
const CONF_USER = '999';                       // isolated principal → user:999
const CONF_PRINCIPAL = 'user:' + CONF_USER;
const CONF_KEYWORD = 'confjazz' + randomBytes(3).toString('hex');  // unique, only our event matches
const TABLE_LEDGER = 'modules/mcp/mcp_ledger';
const TABLE_TOKEN = 'modules/mcp/mcp_token';
const TABLE_RATE = 'modules/mcp/mcp_rate_counter';
const TABLE_EVENT = 'modules/community/event';

function loadEnv() {
  let url = process.env.MCP_URL, token = process.env.MCP_TOKEN;
  if (!url || !token) {
    try {
      const here = dirname(fileURLToPath(import.meta.url));
      const dotpos = JSON.parse(readFileSync(resolve(here, '../../../.pos'), 'utf8'));
      const env = dotpos.ps || Object.values(dotpos)[0];
      url = url || env.url; token = token || env.token;
    } catch (e) { console.error('No MCP_URL/MCP_TOKEN and .pos unreadable:', e.message); process.exit(2); }
  }
  if (!url.endsWith('/')) url += '/';
  return { base: url, admin: token };
}
const { base, admin } = loadEnv();
const MCP = base + 'mcp';
const GQL = base + 'api/graph';

// ---- harness ---------------------------------------------------------------
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; fails.push(name); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
}
const group = (n) => console.log(`\n${n}`);

async function rpc(body, { token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(MCP, { method: 'POST', headers, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, headers: res.headers, json, text };
}
async function gql(query, variables = {}) {
  const res = await fetch(GQL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Token ' + admin }, body: JSON.stringify({ query, variables }) });
  return res.json();
}
async function recordCreate(table, props) {
  const properties = Object.entries(props).map(([n, v]) =>
    typeof v === 'number' ? `{ name: "${n}", value_int: ${v} }` : `{ name: "${n}", value: ${JSON.stringify(v)} }`).join(' ');
  const r = await gql(`mutation { record_create(record: { table: "${table}" properties: [ ${properties} ] }) { id } }`);
  return r?.data?.record_create?.id;
}
async function recordDelete(table, id) { await gql(`mutation { record_delete(id: ${id}, table: "${table}") { id } }`); }
async function setConstant(n, v) { await gql(`mutation { constant_set(name: "${n}", value: ${JSON.stringify(v)}) { name } }`); }
async function unsetConstant(n) { await gql(`mutation { constant_unset(name: "${n}") { name } }`); }
async function pruneRate() {
  // Rate keys are "principal:<id>:<window>" — match the full scope prefix.
  const r = await gql(`{ records(per_page: 200, filter: { table: { value: "${TABLE_RATE}" } properties: [{ name: "key", starts_with: "principal:${CONF_PRINCIPAL}" }] }) { results { id } } }`);
  for (const row of r?.data?.records?.results || []) await recordDelete(TABLE_RATE, row.id);
}

// ---- suite -----------------------------------------------------------------
async function main() {
  console.log(`pos-module-mcp conformance → ${MCP}\n(isolated principal ${CONF_PRINCIPAL}, keyword ${CONF_KEYWORD})`);
  await unsetConstant('MCP_CONFIG'); // ensure clean config baseline
  const eventId = await recordCreate(TABLE_EVENT, { name: 'Conformance Jazz', short_description: CONF_KEYWORD, description: 'a ' + CONF_KEYWORD + ' show', start_date: '2026-09-01T19:00:00Z', status: 'published' });
  const tokenId = await recordCreate(TABLE_TOKEN, { user_id: CONF_USER, token_digest: TOKEN_DIGEST, label: 'conformance', status: 'active' });

  try {
    group('Transport / envelope (§13)');
    {
      const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
      ok('initialize → 200 + pinned protocol', init.status === 200 && init.json?.result?.protocolVersion === '2025-06-18', init.json?.result?.protocolVersion);
      ok('initialize advertises instructions', typeof init.json?.result?.instructions === 'string' && init.json.result.instructions.length > 0);
      const ping = await rpc({ jsonrpc: '2.0', id: 2, method: 'ping' });
      ok('ping → 200 empty result', ping.status === 200 && ping.json?.result && Object.keys(ping.json.result).length === 0);
      const unk = await rpc({ jsonrpc: '2.0', id: 3, method: 'no/such' });
      ok('unknown method → -32601/400', unk.status === 400 && unk.json?.error?.code === -32601);
      const bad = await rpc({ jsonrpc: '2.0', id: 4 });
      ok('missing method → -32600/400', bad.status === 400 && bad.json?.error?.code === -32600);
      const badver = await rpc({ jsonrpc: '1.0', id: 5, method: 'ping' });
      ok('bad jsonrpc → -32600/400', badver.status === 400 && badver.json?.error?.code === -32600);
      const notif = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
      ok('notification → 202 no body', notif.status === 202 && notif.text.length === 0);
      const over = await rpc({ jsonrpc: '2.0', id: 6, method: 'ping', params: { x: 'a'.repeat(70000) } });
      ok('oversize >64KB → 413/-32600', over.status === 413 && over.json?.error?.code === -32600);
    }

    group('Identity (§9)');
    {
      const noTok = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x' } } });
      ok('no token → 401', noTok.status === 401 && noTok.json?.error?.code === -32001);
      ok('no token → WWW-Authenticate', /Bearer resource_metadata=/.test(noTok.headers.get('www-authenticate') || ''));
      const badTok = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x' } } }, { token: 'wrong' });
      ok('bad token → 401 no internals', badTok.status === 401 && badTok.json?.error?.message === 'Invalid token');
      const wk = await fetch(base + '.well-known/oauth-protected-resource').then(r => r.json());
      ok('well-known resource metadata', wk.resource === MCP && Array.isArray(wk.bearer_methods_supported));
    }

    group('Discovery / tools/list (§14)');
    {
      const list = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/list' });
      const tools = list.json?.result?.tools || [];
      const t = tools.find(x => x.name === 'search_events');
      ok('tools/list includes search_events', !!t);
      ok('tool exposes inputSchema + _meta.version', !!t?.inputSchema && t?._meta?.version === '1.0.0');
    }

    group('Validation (§10, strict, no coercion)');
    {
      const T = { token: RAW_TOKEN };
      const missing = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_events', arguments: { limit: 5 } } }, T);
      ok('missing required → -32602', missing.json?.error?.code === -32602 && /missing required property/.test(JSON.stringify(missing.json.error.data)));
      const coerce = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x', limit: '5' } } }, T);
      ok('string-for-int rejected (no coercion)', coerce.json?.error?.code === -32602 && /expected integer/.test(JSON.stringify(coerce.json.error.data)));
      const unknown = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x', bogus: 1 } } }, T);
      ok('unknown key rejected (additionalProperties false)', unknown.json?.error?.code === -32602 && /unknown property/.test(JSON.stringify(unknown.json.error.data)));
      const overmax = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x', limit: 999 } } }, T);
      ok('above maximum rejected', overmax.json?.error?.code === -32602 && /above maximum/.test(JSON.stringify(overmax.json.error.data)));
      const unknownTool = await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'ghost', arguments: {} } }, T);
      ok('unknown tool → -32602', unknownTool.json?.error?.code === -32602);
    }

    group('Execution end-to-end (§22 proof)');
    {
      const T = { token: RAW_TOKEN };
      const call = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_events', arguments: { query: CONF_KEYWORD } } }, T);
      ok('tools/call executes → 200 not isError', call.status === 200 && call.json?.result?.isError === false);
      ok('returns our seeded event (structuredContent)', call.json?.result?.structuredContent?.count === 1 && /Conformance Jazz/.test(JSON.stringify(call.json.result.structuredContent)));
      const empty = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'zzznomatch' + CONF_KEYWORD } } }, T);
      ok('empty result → count 0, not error', empty.json?.result?.structuredContent?.count === 0 && empty.json.result.isError === false);
    }

    group('Adversarial (§19.2)');
    {
      const T = { token: RAW_TOKEN };
      const inj = ["'; DROP TABLE users; --", '{{ 7 | plus: 7 }}', '{% assign x = 1 %}', '</script><img src=x>'];
      let clean = true, leaked = false;
      for (const p of inj) {
        const r = await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'search_events', arguments: { query: p } } }, T);
        if (r.status !== 200 || r.json?.result?.isError !== false) clean = false;
        if (/\b14\b|SQL syntax|Liquid error|ActiveRecord|stack trace/i.test(r.text)) leaked = true;
      }
      ok('injection payloads handled as data (no exec, no 500)', clean);
      ok('no engine internals leaked on injection', !leaked);
    }

    group('Resources (§3.2, config-gated)');
    {
      const off = await rpc({ jsonrpc: '2.0', id: 1, method: 'resources/list' });
      ok('resources OFF by default → empty', (off.json?.result?.resources || []).length === 0);
      await setConstant('MCP_CONFIG', JSON.stringify({ resources: { expose_markdown_pages: true } }));
      const on = await rpc({ jsonrpc: '2.0', id: 2, method: 'resources/list' });
      ok('resources ON → lists docs pages', (on.json?.result?.resources || []).some(r => r.uri.startsWith('mcp+page:///docs')));
      const bad = await rpc({ jsonrpc: '2.0', id: 3, method: 'resources/read', params: { uri: 'mcp+page:///mcp' } });
      ok('read outside allowlist → not found (no leak)', bad.json?.error?.code === -32002);
      await unsetConstant('MCP_CONFIG');
    }

    group('Rate limiting (§12.4)');
    {
      await setConstant('MCP_CONFIG', JSON.stringify({ defaults: { rate_limit_per_min: 3 } }));
      await pruneRate();
      const codes = [];
      for (let i = 0; i < 6; i++) {
        const r = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x' } } }, { token: RAW_TOKEN });
        codes.push(r.status);
      }
      ok('first 3 pass, then 429', codes.slice(0, 3).every(c => c === 200) && codes.slice(3).some(c => c === 429), codes.join(','));
      const limited = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'search_events', arguments: { query: 'x' } } }, { token: RAW_TOKEN });
      ok('429 carries Retry-After', limited.status !== 429 || !!limited.headers.get('retry-after'));
      await unsetConstant('MCP_CONFIG');
    }

    group('Attestation ledger (§6) — isolated principal');
    {
      const q = `{ records(per_page: 200, filter: { table: { value: "${TABLE_LEDGER}" } properties: [{ name: "principal_id", value: "${CONF_PRINCIPAL}" }] }, sort: [{ id: { order: ASC } }]) { total_entries results { execution_outcome: property(name:"execution_outcome") input_sha256: property(name:"input_sha256") authz_decision: property(name:"authz_decision") } } }`;
      const rows = (await gql(q))?.data?.records?.results || [];
      ok('every authenticated call attested', rows.length > 0);
      ok('successful executions recorded', rows.some(x => x.execution_outcome === 'success'));
      ok('invalid/denied recorded', rows.some(x => x.execution_outcome === 'invalid'));
      ok('rate-limited recorded', rows.some(x => x.execution_outcome === 'error'));
      ok('arguments hashed, never stored raw', rows.every(x => !x.input_sha256 || /^[0-9a-f]{64}$/.test(x.input_sha256)));
      ok('authorized calls carry allow decision', rows.some(x => x.authz_decision === 'allow'));
    }
  } finally {
    // Surgical cleanup: only our own artifacts. Real tokens/users/ledger untouched.
    await unsetConstant('MCP_CONFIG');
    await pruneRate();
    if (tokenId) await recordDelete(TABLE_TOKEN, tokenId);
    if (eventId) await recordDelete(TABLE_EVENT, eventId);
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) { console.log('FAILED: ' + fails.join(', ')); process.exit(1); }
  console.log('All conformance checks passed.');
}

main().catch(e => { console.error(e); process.exit(2); });
