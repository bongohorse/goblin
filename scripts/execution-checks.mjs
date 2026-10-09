import {readFile, realpath} from 'node:fs/promises';
import {resolve, dirname, relative, isAbsolute, join} from 'node:path';

function integer(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) throw Error(`${name}: expected nonnegative safe integer`);
}

// No scene import or Start click. The caller supplies its existing read-only observer.
export async function waitForStep(page, step, readSteps, timeout = 30000) {
  integer(step, 'step');
  if (typeof readSteps !== 'function') throw Error('readSteps: expected browser observer function');
  if (!Number.isFinite(timeout) || timeout <= 0) throw Error('timeout: expected positive milliseconds');
  return page.waitForFunction(({source, target}) => {
    const current = (0, eval)(`(${source})`)();
    if (!Number.isSafeInteger(current) || current < 0) throw Error('observer: invalid step count');
    return current >= target;
  }, {source: readSteps.toString(), target: step}, {timeout});
}

// Policy is supplied by the frozen protocol, never derived from a desired result.
export function requireEventPreconditions(event, observed, policy) {
  integer(policy.step, 'planned step');
  integer(observed.step, 'observed step');
  if (observed.step !== policy.step) throw Error(`${event}: missed planned step; do not apply late or retry`);
  if (observed.invalid !== false) throw Error(`${event}: safety state not confirmed valid`);
  if (policy.upright && observed.upright !== true) throw Error(`${event}: upright figure required`);
  if (policy.activeTarget && observed.activeTarget !== true) throw Error(`${event}: active target required`);
}

// Compare served HTML AND its referenced assets to the explicitly selected local build.
// This works on main and PR builds without changing historical provenance or Vite inputs.
export async function checkPreview({url, dist, entry, fetcher = fetch}) {
  const base = new URL(url);
  if (!['http:', 'https:'].includes(base.protocol) || base.search || base.hash) throw Error('preview: expected HTTP entry URL without query/hash');
  let root;
  try { root = await realpath(dist); }
  catch { throw Error('preview: selected build directory missing/inaccessible; build first'); }
  async function local(file) {
    let actual;
    try { actual = await realpath(resolve(root, file)); }
    catch { throw Error('preview: selected entry/asset missing/inaccessible; check build and entry'); }
    const rel = relative(root, actual);
    if (rel.startsWith('..') || isAbsolute(rel)) throw Error('preview: asset escapes build directory');
    return readFile(actual);
  }
  async function match(remote, bytes) {
    let response;
    try { response = await fetcher(remote, {signal: AbortSignal.timeout(5000), redirect: 'error'}); }
    catch { throw Error('preview: unreachable/redirected; check owned server and port, no automatic restart'); }
    if (!response.ok) throw Error(`preview: HTTP ${response.status}; wrong route/build or missing asset`);
    if (!Buffer.from(await response.arrayBuffer()).equals(bytes)) throw Error('preview: build bytes differ; stale/wrong server or build');
  }
  const html = await local(entry);
  await match(base, html);
  const refs = [...html.toString('utf8').matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map(m => m[1]).filter(r => /\.(?:js|css)(?:[?#]|$)/.test(r));
  if (!refs.some(r => /\.js(?:[?#]|$)/.test(r))) throw Error('preview: no built JavaScript entry found');
  for (const ref of new Set(refs)) {
    const remote = new URL(ref, base);
    if (remote.origin !== base.origin || ref.startsWith('/')) throw Error('preview: expected relative same-origin build assets');
    await match(remote, await local(join(dirname(entry), decodeURIComponent(ref.split(/[?#]/)[0]))));
  }
  return {entry, matchedAssets: new Set(refs).size};
}
