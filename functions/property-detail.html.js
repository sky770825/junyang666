/**
 * Cloudflare Pages Function：為 property-detail.html 注入 Open Graph / Twitter Card meta
 *
 * 原因：Facebook、LINE、Discord 等爬蟲不執行 JavaScript，只讀取原始 HTML。
 * 物件頁的 og:image、標題、描述是在 JS 載入後才設定，爬蟲看到的是空值 → 沒有預覽圖。
 *
 * 此 Function 在請求 property-detail.html?number=xxx 或 ?id=xxx 時：
 * 1. 向 Supabase 查詢該物件的 images, title, price, address
 * 2. 取得靜態 property-detail.html
 * 3. 將 og:image、og:title、og:description、og:url、twitter:*、description 替換成實際內容
 * 4. 回傳修改後的 HTML
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
      const filter = number
        ? `number=eq.${encodeURIComponent(number)}`
        : `id=eq.${encodeURIComponent(id)}`;
      const res = await fetch(
        `${supabaseUrl}/rest/v1/properties?${filter}&select=images,title,price,address&limit=1`,
        {
          headers: {
            apikey: anonKey,
            Authorization: `Bearer ${anonKey}`,
            Accept: 'application/json',
          },
        }
      );
      const data = await res.json();
      const prop = Array.isArray(data) ? data[0] : null;

      if (prop) {
        const t = prop.title || '未命名物件';
        const p = prop.price || '';
        const addr = prop.address || '';
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
    console.warn('og-meta: ASSETS.fetch failed', e);
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
