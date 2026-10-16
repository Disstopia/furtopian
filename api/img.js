import { get } from '../lib/store.js';

// 관리 화면에서 올린 사진을 보여줘요. 한 번 올린 사진은 바뀌지 않아서 오래 캐시해요.
export default async function handler(req, res) {
  const id = String(req.query.id || '');
  if (!/^[a-f0-9]{24}$/.test(id)) return res.status(400).end();
  const raw = await get('img:' + id);
  if (!raw) return res.status(404).end();
  const { type, b64 } = JSON.parse(raw);
  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
  res.status(200).send(Buffer.from(b64, 'base64'));
}
