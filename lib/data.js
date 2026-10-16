import { get } from './store.js';
import { SEED } from './seed.js';

export async function loadData() {
  const raw = await get('data');
  if (!raw) return SEED;
  try { return JSON.parse(raw); } catch { return SEED; }
}

// ---- 검사: 이상한 값이 저장되지 않게 ----
const IMG_RE = /^(https:\/\/[^\s"'<>]{4,600}|\/api\/img\?id=[a-f0-9]{24})$/;
const LINK_RE = /^https:\/\/[^\s"'<>]{4,600}$/;

function str(v, max, field) {
  if (v == null) return '';
  if (typeof v !== 'string') throw new Error(`${field}: 글자가 아니에요`);
  v = v.trim();
  if (v.length > max) throw new Error(`${field}: ${max}자 이하로 적어 주세요`);
  return v;
}
function img(v, field) {
  v = str(v, 700, field);
  if (!IMG_RE.test(v)) throw new Error(`${field}: 이미지 주소가 올바르지 않아요 (https:// 로 시작해야 해요)`);
  return v;
}
function arr(v, max, field) {
  if (v == null) return [];
  if (!Array.isArray(v)) throw new Error(`${field}: 목록이 아니에요`);
  if (v.length > max) throw new Error(`${field}: 최대 ${max}개까지예요`);
  return v;
}
const ID_RE = /^[a-zA-Z0-9_-]{1,40}$/;
function id(v, field) {
  if (typeof v !== 'string' || !ID_RE.test(v)) throw new Error(`${field}: id가 올바르지 않아요`);
  return v;
}

export function cleanData(d) {
  if (!d || typeof d !== 'object') throw new Error('데이터가 비어 있어요');
  const makers = arr(d.makers, 100, '메이커').map((m, i) => {
    const f = `메이커 ${i + 1}`;
    const name = str(m.name, 60, f + ' 이름');
    if (!name) throw new Error(`${f}: 이름을 적어 주세요`);
    return {
      id: id(m.id, f),
      name,
      emoji: str(m.emoji, 16, f + ' 아이콘'),
      desc: str(m.desc, 200, f + ' 설명'),
      hidden: !!m.hidden,
      images: arr(m.images, 60, f + ' 사진').map((u, j) => img(u, `${f} 사진 ${j + 1}`)),
    };
  });

  const pricing = arr(d.pricing, 20, '가격표 탭').map((c, i) => {
    const f = `가격표 탭 ${i + 1}`;
    const name = str(c.name, 30, f + ' 이름');
    if (!name) throw new Error(`${f}: 탭 이름을 적어 주세요`);
    return {
      id: id(c.id, f),
      icon: str(c.icon, 16, f + ' 아이콘'),
      name,
      footnote: str(c.footnote, 300, f + ' 아래 안내'),
      hidden: !!c.hidden,
      items: arr(c.items, 40, f + ' 항목').map((it, j) => {
        const g = `${name} > 항목 ${j + 1}`;
        const title = str(it.title, 60, g + ' 이름');
        if (!title) throw new Error(`${g}: 이름을 적어 주세요`);
        let note = null;
        if (it.note && (it.note.text || it.note.image)) {
          note = { text: str(it.note.text, 300, g + ' 안내 박스'), image: it.note.image ? img(it.note.image, g + ' 안내 이미지') : '' };
        }
        return {
          id: id(it.id, g),
          icon: str(it.icon, 16, g + ' 아이콘'),
          title,
          sub: str(it.sub, 60, g + ' 영문/부제'),
          amount: str(it.amount, 30, g + ' 가격'),
          from: str(it.from, 60, g + ' 가격 아래 글'),
          features: arr(it.features, 20, g + ' 포함 내용').map((s) => str(s, 120, g + ' 포함 내용')).filter(Boolean),
          options: arr(it.options, 20, g + ' 추가 옵션').map((s) => str(s, 40, g + ' 추가 옵션')).filter(Boolean),
          note,
          badge: str(it.badge, 12, g + ' 리본'),
          button: it.button === 'order' ? 'order' : 'quote',
          hidden: !!it.hidden,
        };
      }),
    };
  });

  const gallery = arr(d.gallery, 500, '갤러리').map((u, i) => img(u, `갤러리 사진 ${i + 1}`));
  return { makers, pricing, gallery };
}

// 저장된 데이터 안에서 쓰이는 업로드 사진 id 목록
export function usedImageIds(d) {
  const s = JSON.stringify(d);
  return new Set([...s.matchAll(/\/api\/img\?id=([a-f0-9]{24})/g)].map((m) => m[1]));
}

export { LINK_RE };
