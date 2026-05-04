/**
 * Cloudflare Pages Function：為 /property-detail（無 .html）注入 Open Graph / Twitter Card meta
 *
 * 與 property-detail.html.js 相同邏輯，但對應路徑為 /property-detail。
 * 許多連結或分享使用 /property-detail?number=xxx，若無此 Function 則不會走 OG 注入，預覽會是預設圖與文案。
 *
 * 1. 向 Supabase 查詢該物件的 images, title, price, address, hide_address_number, type
 * 2. 取得靜態 property-detail.html
 * 3. 將 og:image、og:title、og:description、og:url、twitter:*、description 替換成實際內容
 * 4. 回傳修改後的 HTML（地址依 hide_address_number / 透天|別墅|店面 遮罩，避免完整外洩）
 *
 * 環境變數（可選，有預設）：SUPABASE_URL、SUPABASE_ANON_KEY
 */

const DEFAULT_OG_IMAGE = 'https://placehold.co/1200x630/667eea/ffffff/png?text=Property';
const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

function escapeAttr(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function getFirstImageUrl(images) {
  if (!Array.isArray(images) || images.length === 0) return null;
  const first = images[0];
  const url = typeof first === 'string' ? first : (first && (first.url || first));
  return url && url.startsWith('http') ? url : null;
}

/** 正規化物件編號，例如 VI-002 → VI00002、TT-012 → TT00012 */
function normalizePropertyNumber(number) {
  if (!number || typeof number !== 'string') return number;
  const t = number.trim().toUpperCase();
  if (/^[A-Z]{2}\d{5}$/i.test(t) || /^EX[A-Z]{2}\d{4}$/i.test(t)) return t;
  const m = t.match(/^([A-Z]{2})[-]?(\d+)$/i);
  if (m) {
    const seq = parseInt(m[2], 10);
    if (!isNaN(seq) && seq > 0) return m[1].toUpperCase() + String(seq).padStart(5, '0');
  }
  return t;
}

/** 🔒 依 hide_address_number 或 透天/別墅/店面 回傳遮罩後地址，避免 OG/description 洩漏完整地址 */
function formatAddressForDisplay(address, hideAddressNumber, propertyType) {
  if (!address) return '';
  const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
  const shouldShowOnlyRoad = propertyType && typesToShowOnlyRoad.includes(propertyType);
  if (!hideAddressNumber && !shouldShowOnlyRoad) return address;
  let display = address;
  const cityDistrictMatch = display.match(/^([^路街道]+[市縣區鄉鎮])/i);
  const cityDistrict = cityDistrictMatch ? cityDistrictMatch[1] : '';
  display = display.replace(/^[^路街道]+[市縣區鄉鎮]/i, '');
  const roadPattern = /([^路街道]+(?:[一二三四五六七八九十]+段)?[路街道大道])/;
  const roadMatch = display.match(roadPattern);
  if (roadMatch) {
    display = (cityDistrict + roadMatch[1]).trim();
  } else {
    const simple = display.match(/([^路街道]*[路街道])/);
    display = simple ? (cityDistrict + simple[1]).trim() : (cityDistrict + display).trim();
  }
  return display.replace(/[\s\-]+$/, '').trim();
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const number = url.searchParams.get('number');
  const id = url.searchParams.get('id');

  const supabaseUrl = env.SUPABASE_URL || SUPABASE_URL;
  const anonKey = env.SUPABASE_ANON_KEY || SUPABASE_ANON_KEY;

  let title = '物件詳細資訊 | 住商不動產';
  let description = '查看物件詳細資訊';
  let pageTitle = title;
  let ogUrl = url.href;
  let imageUrl = DEFAULT_OG_IMAGE;
  let imageAlt = '物件預覽';

  if (number || id) {
    try {
      let prop = null;

      if (id) {
        const res = await fetch(
          `${supabaseUrl}/rest/v1/properties?id=eq.${encodeURIComponent(id)}&select=images,title,price,address,hide_address_number,type&limit=1`,
          { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' } }
        );
        const data = await res.json();
        prop = Array.isArray(data) ? data[0] : null;
      } else if (number) {
        const variants = [number.trim().toUpperCase()];
        const norm = normalizePropertyNumber(number);
        if (norm && !variants.includes(norm)) variants.push(norm);

        for (const v of variants) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/properties?number=eq.${encodeURIComponent(v)}&select=images,title,price,address,hide_address_number,type&limit=1`,
            { headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Accept: 'application/json' } }
          );
          const data = await res.json();
          prop = Array.isArray(data) ? data[0] : null;
          if (prop) break;
        }
      }

      if (prop) {
        const t = prop.title || '未命名物件';
        const p = prop.price || '';
        const rawAddr = prop.address || '';
        const addr = formatAddressForDisplay(rawAddr, prop.hide_address_number, prop.type) || rawAddr;
        title = t;
        pageTitle = p ? `${t} - ${p} | 住商不動產` : `${t} | 住商不動產`;
        description = [t, p, addr].filter(Boolean).join(' | ');
        imageAlt = t;

        const img = getFirstImageUrl(prop.images);
        if (img) imageUrl = img;
      }
    } catch (e) {
      console.warn('og-meta: Supabase fetch failed', e);
    }
  }

  let html;
  try {
    const assetRequest = new Request(new URL('/property-detail.html', url.origin).href);
    const assetRes = await env.ASSETS.fetch(assetRequest);
    html = await assetRes.text();
  } catch (e) {
    console.warn('og-meta: ASSETS.fetch /property-detail.html failed', e);
    return context.next ? context.next() : new Response('Service Unavailable', { status: 503 });
  }

  const safeImage = escapeAttr(imageUrl);
  const safeTitle = escapeAttr(pageTitle);
  const safeDesc = escapeAttr(description);
  const safeUrl = escapeAttr(ogUrl);
  const safeImageAlt = escapeAttr(imageAlt);

  html = html
    .replace(/<meta property="og:image" content="[^"]*">/, `<meta property="og:image" content="${safeImage}">`)
    .replace(/<meta property="og:image:alt" content="[^"]*">/, `<meta property="og:image:alt" content="${safeImageAlt}">`)
    .replace(/<meta property="og:title" content="[^"]*">/, `<meta property="og:title" content="${safeTitle}">`)
    .replace(/<meta property="og:description" content="[^"]*">/, `<meta property="og:description" content="${safeDesc}">`)
    .replace(/<meta property="og:url" content="[^"]*">/, `<meta property="og:url" content="${safeUrl}">`)
    .replace(/<meta name="twitter:image" content="[^"]*">/, `<meta name="twitter:image" content="${safeImage}">`)
    .replace(/<meta name="twitter:image:alt" content="[^"]*">/, `<meta name="twitter:image:alt" content="${safeImageAlt}">`)
    .replace(/<meta name="twitter:url" content="[^"]*">/, `<meta name="twitter:url" content="${safeUrl}">`)
    .replace(/<meta name="twitter:title" content="[^"]*">/, `<meta name="twitter:title" content="${safeTitle}">`)
    .replace(/<meta name="twitter:description" content="[^"]*">/, `<meta name="twitter:description" content="${safeDesc}">`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${safeDesc}">`)
    .replace(/<title>[^<]*<\/title>/, `<title>${safeTitle}</title>`);

  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
