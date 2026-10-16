// 저장소: Upstash Redis (REST). 환경변수가 없으면 테스트용 메모리 저장소를 써요.
// 모든 키 앞에 'furt:'를 붙여서 노노라무·캘린더와 같은 Redis를 써도 섞이지 않아요.

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const P = 'furt:';

const mem = globalThis.__furtMem || (globalThis.__furtMem = new Map());

async function cmd(...args) {
  if (!URL_ || !TOKEN) return memCmd(args);
  const r = await fetch(URL_, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  });
  const j = await r.json();
  if (j.error) throw new Error(j.error);
  return j.result;
}

function memCmd([c, k, ...a]) {
  c = c.toUpperCase();
  const now = Date.now();
  const e = mem.get(k);
  if (e && e.exp && e.exp < now) mem.delete(k);
  const v = mem.get(k)?.v;
  switch (c) {
    case 'GET': return v ?? null;
    case 'SET': mem.set(k, { v: a[0] }); return 'OK';
    case 'DEL': { let n = 0; for (const key of [k, ...a]) n += mem.delete(key) ? 1 : 0; return n; }
    case 'INCR': { const n = Number(v || 0) + 1; mem.set(k, { v: String(n), exp: mem.get(k)?.exp }); return n; }
    case 'EXPIRE': { const x = mem.get(k); if (x) x.exp = now + Number(a[0]) * 1000; return x ? 1 : 0; }
    case 'HSET': { const h = v || {}; for (let i = 0; i < a.length; i += 2) h[a[i]] = a[i + 1]; mem.set(k, { v: h }); return 1; }
    case 'HGETALL': { const h = v || {}; return Object.entries(h).flat(); }
    case 'HDEL': { const h = v || {}; let n = 0; for (const f of a) { if (f in h) { delete h[f]; n++; } } return n; }
    default: throw new Error('mem: unsupported ' + c);
  }
}

export const get = (k) => cmd('GET', P + k);
export const set = (k, v) => cmd('SET', P + k, v);
export const del = (...ks) => cmd('DEL', ...ks.map((k) => P + k));
export const incr = (k) => cmd('INCR', P + k);
export const expire = (k, s) => cmd('EXPIRE', P + k, String(s));
export const hset = (k, f, v) => cmd('HSET', P + k, f, String(v));
export const hdel = (k, ...fs) => cmd('HDEL', P + k, ...fs);
export async function hgetall(k) {
  const arr = (await cmd('HGETALL', P + k)) || [];
  const o = {};
  for (let i = 0; i < arr.length; i += 2) o[arr[i]] = arr[i + 1];
  return o;
}
export const usingMemory = !URL_ || !TOKEN;
