const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function getAdminConfig(env) {
  return {
    supabaseUrl: env.SUPABASE_URL || SUPABASE_URL,
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY || '',
  };
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const { supabaseUrl, serviceKey } = getAdminConfig(env);

  if (!serviceKey) {
    return json({
      error: '客戶詢問後台尚未啟用',
      message: '請在 Cloudflare Pages 設定 SUPABASE_SERVICE_ROLE_KEY。',
    }, 503);
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '120', 10) || 120, 1), 300);
  const status = url.searchParams.get('status') || '';
  const params = new URLSearchParams({
    select: '*',
    order: 'created_at.desc',
    limit: String(limit),
  });

  if (status && status !== 'all') params.set('status', `eq.${status}`);

  const response = await fetch(`${supabaseUrl}/rest/v1/customer_inquiries?${params.toString()}`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
    },
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    return json({
      error: '客戶詢問查詢失敗',
      message: data.message || response.statusText,
    }, response.status);
  }

  return json({
    inquiries: Array.isArray(data) ? data : [],
    count: Array.isArray(data) ? data.length : 0,
  });
}
