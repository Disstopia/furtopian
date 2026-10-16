import crypto from 'node:crypto';
import { get, set, incr, expire, del } from './store.js';

const hash = (pin) => crypto.createHash('sha256').update('furtopian:' + pin).digest('hex');
const MAX_FAIL = 10;
const LOCK_SEC = 600;

// PIN 확인. 틀리면 Error를 던져요. 10번 틀리면 10분 잠금.
export async function checkPin(pin) {
  const fails = Number((await get('fail')) || 0);
  if (fails >= MAX_FAIL) throw Object.assign(new Error('PIN을 너무 많이 틀렸어요. 10분 뒤에 다시 해 주세요.'), { status: 429 });

  const saved = await get('pinhash');
  const ok = typeof pin === 'string' && pin.length > 0 && (
    saved ? safeEq(hash(pin), saved) : (process.env.OWNER_PIN ? safeEq(pin, process.env.OWNER_PIN) : false)
  );
  if (!ok) {
    const n = await incr('fail');
    if (n === 1) await expire('fail', LOCK_SEC);
    if (!saved && !process.env.OWNER_PIN) throw Object.assign(new Error('OWNER_PIN 환경변수가 아직 없어요. README를 확인해 주세요.'), { status: 401 });
    throw Object.assign(new Error(`PIN이 틀렸어요 (${Math.min(n, MAX_FAIL)}/${MAX_FAIL})`), { status: 401 });
  }
  await del('fail');
}

export async function changePin(newPin) {
  if (typeof newPin !== 'string' || !/^\S{4,40}$/.test(newPin)) throw Object.assign(new Error('새 PIN은 공백 없이 4~40자로 해 주세요'), { status: 400 });
  await set('pinhash', hash(newPin));
}

function safeEq(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
