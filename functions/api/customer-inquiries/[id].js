const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const VALID_STATUSES = new Set(['new', 'contacted', 'scheduled', 'closed']);

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

export async function onRequestPatch(context) {
  const { request, env, params } = context;
  const { supabaseUrl, serviceKey } = getAdminConfig(env);
  const id = params.id;

  if (!serviceKey) {
    return json({
      error: '客戶詢問後台尚未啟用',
      message: '請在 Cloudflare Pages 設定 SUPABASE_SERVICE_ROLE_KEY。',
    }, 503);
  }

  const body = await request.json().catch(() => ({}));
  const status = String(body.status || '').trim();

  if (!VALID_STATUSES.has(status)) {
    return json({
      error: '狀態不正確',
      message: 'status 必須是 new、contacted、scheduled 或 closed',
    }, 400);
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/customer_inquiries?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      status,
      updated_at: new Date().toISOString(),
    }),
  });

  const data = await response.json().catch(() => []);
  if (!response.ok) {
    return json({
      error: '客戶詢問狀態更新失敗',
      message: data.message || response.statusText,
    }, response.status);
  }

  const inquiry = Array.isArray(data) ? data[0] : null;
  if (!inquiry) return json({ error: '找不到此詢問紀錄' }, 404);

  return json({
    success: true,
    inquiry,
  });
}
