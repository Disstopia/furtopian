import { loadData } from '../lib/data.js';

// 공개 화면이 읽는 데이터 (숨김 처리한 항목은 빼고 보내요)
export default async function handler(req, res) {
  try {
    const d = await loadData();
    const pub = {
      makers: d.makers.filter((m) => !m.hidden),
      pricing: d.pricing.filter((c) => !c.hidden).map((c) => ({ ...c, items: c.items.filter((i) => !i.hidden) })),
      gallery: d.gallery,
    };
    res.setHeader('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=30');
    res.status(200).json(pub);
  } catch (e) {
    res.status(500).json({ error: '데이터를 불러오지 못했어요' });
  }
}
