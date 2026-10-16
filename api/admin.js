import crypto from 'node:crypto';
import { get, set, del, hset, hdel, hgetall } from '../lib/store.js';
import { checkPin, changePin } from '../lib/auth.js';
import { loadData, cleanData, usedImageIds } from '../lib/data.js';

const TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_B64 = 3_000_000; // 약 2.2MB (관리 화면에서 자동으로 줄여서 보통 0.3~0.6MB)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 돼요' });
  const b = req.body || {};
  try {
    await checkPin(b.pin);
    switch (b.action) {
      case 'login':
      case 'load':
        return res.json({ ok: true, data: await loadData() });

      case 'save': {
        const clean = cleanData(b.data);
        await set('data', JSON.stringify(clean));
        await cleanupImages(clean);
        return res.json({ ok: true, data: clean });
      }

      case 'upload': {
        if (!TYPES.includes(b.type)) throw bad('jpg, png, webp 사진만 올릴 수 있어요');
        if (typeof b.b64 !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(b.b64)) throw bad('사진 데이터가 이상해요');
        if (b.b64.length > MAX_B64) throw bad('사진이 너무 커요');
        const id = crypto.randomBytes(12).toString('hex');
        await set('img:' + id, JSON.stringify({ type: b.type, b64: b.b64 }));
        await hset('imgs', id, Date.now());
        return res.json({ ok: true, url: '/api/img?id=' + id });
      }

      case 'setpin':
        await changePin(b.newPin);
        return res.json({ ok: true });

      default:
        throw bad('알 수 없는 요청이에요');
    }
  } catch (e) {
    res.status(e.status || 400).json({ error: e.message || '오류가 났어요' });
  }
}

const bad = (m) => Object.assign(new Error(m), { status: 400 });

// 저장된 데이터에서 더 이상 안 쓰는 업로드 사진 정리 (올린 지 하루 안 된 건 남겨둬요)
async function cleanupImages(data) {
  const used = usedImageIds(data);
  const all = await hgetall('imgs');
  const dayAgo = Date.now() - 86400_000;
  const gone = Object.entries(all).filter(([id, ts]) => !used.has(id) && Number(ts) < dayAgo).map(([id]) => id);
  if (!gone.length) return;
  await del(...gone.map((id) => 'img:' + id));
  await hdel('imgs', ...gone);
}
