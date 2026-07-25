#!/usr/bin/env node
/**
 * pos-module-mcp — eval harness runner (spec §19.3).
 *
 * Triggers the in-platform deterministic eval (tool-surface + golden-case checks),
 * reads the resulting mcp_eval_run record, and EXITS NON-ZERO on any failure so CI
 * gates on tool-surface regression. This is the automation around the eval/run
 * command, which stores results as queryable records.
 *
 * Run:  node tests/eval.mjs
 * Env (optional; falls back to the repo .pos "ps" env + demo operator):
 *   MCP_URL, MCP_TOKEN         - instance url + ADMIN api token
 *   MCP_OP_EMAIL, MCP_OP_PASS  - operator login (defaults to the demo operator)
 *
 * ── LLM-based selection eval (the other half of §19.3) ─────────────────────────
 * The module MUST NOT call LLMs (spec §2), so the "do the tool DESCRIPTIONS actually
 * lead a model to the expected tool" check runs HERE, not in the module. To enable
 * it: for each golden case (read via GraphQL below), send { case.prompt, tools/list }
 * to your model, ask it to pick a tool + arguments, and compare to case.expected_tool
 * / expected_args_json. Record pass/fail alongside the deterministic run. It is left
 * as an explicit, keyed extension so this runner has no network/LLM dependency by
 * default and stays CI-cheap; wire it in where marked LLM_SELECTION_HOOK.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

function loadEnv() {
  let url = process.env.MCP_URL, token = process.env.MCP_TOKEN;
  if (!url || !token) {
    const here = dirname(fileURLToPath(import.meta.url));
    const dotpos = JSON.parse(readFileSync(resolve(here, '../.pos'), 'utf8'));
    const env = dotpos.ps || Object.values(dotpos)[0];
    url = url || env.url; token = token || env.token;
  }
  if (!url.endsWith('/')) url += '/';
  return {
    base: url, admin: token,
    opEmail: process.env.MCP_OP_EMAIL || 'admin@mcp-demo.local',
    opPass: process.env.MCP_OP_PASS || 'McpAdmin!2026',
  };
}
const { base, admin, opEmail, opPass } = loadEnv();

// minimal cookie jar over fetch
let cookies = {};
function applySetCookie(res) {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(';'); const i = pair.indexOf('=');
    cookies[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
}
const cookieHeader = () => Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; ');
async function get(path) {
  const res = await fetch(base + path, { headers: { Cookie: cookieHeader() }, redirect: 'manual' });
  applySetCookie(res); return res;
}
async function postForm(path, fields) {
  const body = new URLSearchParams(fields).toString();
  const res = await fetch(base + path, {
    method: 'POST', redirect: 'manual',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookieHeader() },
    body,
  });
  applySetCookie(res); return res;
}
async function gql(query) {
  const res = await fetch(base + 'api/graph', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Token ' + admin },
    body: JSON.stringify({ query }),
  });
  return res.json();
}
const meta = (html, name) => (html.match(new RegExp(`name="${name}"[^>]*content="([^"]*)"`)) || [])[1];
const formTok = (html) => (html.match(/name="authenticity_token"\s+value="([^"]*)"/) || [])[1];

async function main() {
  console.log(`pos-module-mcp eval → ${base}`);

  // 1. operator login
  const loginPage = await (await get('sessions/new')).text();
  const csrf = meta(loginPage, 'csrf-token');
  await postForm('sessions', { authenticity_token: csrf, email: opEmail, password: opPass });

  // 2. trigger the eval
  const adminPage = await (await get('mcp-admin')).text();
  if (/403|Operators only/.test(adminPage)) { console.error('operator login failed (check MCP_OP_EMAIL/MCP_OP_PASS)'); process.exit(2); }
  await postForm('mcp-admin/eval', { authenticity_token: formTok(adminPage) });

  // 3. read the latest run
  const q = `{ records(per_page:1, filter:{table:{value:"modules/mcp/mcp_eval_run"}}, sort:[{id:{order:DESC}}]) { results { total: property(name:"total") passed: property(name:"passed") failed: property(name:"failed") failures_json: property(name:"failures_json") } } }`;
  const run = (await gql(q))?.data?.records?.results?.[0];
  if (!run) { console.error('no eval run recorded'); process.exit(2); }

  // ── LLM_SELECTION_HOOK: run model-based selection eval over golden cases here ──

  const failed = parseInt(run.failed, 10);
  console.log(`${run.passed}/${run.total} checks passed`);
  if (failed > 0) {
    const fails = JSON.parse(run.failures_json || '[]');
    for (const f of fails) console.log(`  ✗ [${f.category}] ${f.check} · ${f.target} — ${f.detail}`);
    process.exit(1);
  }
  console.log('Tool-surface eval passed.');
}

main().catch(e => { console.error(e); process.exit(2); });
