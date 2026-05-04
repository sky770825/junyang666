const ADMIN_PATHS = [
  '/admin-dashboard',
  '/admin-dashboard.html',
  '/property-admin-db',
  '/property-admin-db.html',
  '/js/admin/',
  '/js/property-admin-db.js',
  '/css/admin-dashboard.css',
  '/css/property-admin-db.css',
  '/modules/related-links/backend.js',
  '/api/customer-inquiries',
  '/api/customer-inquiries/',
];

const REMOVED_PUBLIC_PATHS = [
  '/games',
  '/games.html',
  '/mobile-games.js',
];

function isAdminPath(pathname) {
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return ADMIN_PATHS.some((path) => {
    if (path.endsWith('/')) return pathname.startsWith(path);
    return normalizedPathname === path;
  });
}

function isRemovedPublicPath(pathname) {
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return REMOVED_PUBLIC_PATHS.includes(normalizedPathname);
}

function challenge() {
  return new Response('Admin authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Junyang Admin", charset="UTF-8"',
      'Cache-Control': 'no-store',
    },
  });
}

function unauthorized(message, status = 403) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith('Basic ')) return null;

  try {
    const decoded = atob(header.slice('Basic '.length));
    const separator = decoded.indexOf(':');
    if (separator === -1) return null;

    return {
      username: decoded.slice(0, separator),
      password: decoded.slice(separator + 1),
    };
  } catch (error) {
    return null;
  }
}

function timingSafeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;

  let result = 0;
  for (let i = 0; i < left.length; i += 1) {
    result |= left.charCodeAt(i) ^ right.charCodeAt(i);
  }
  return result === 0;
}

export async function onRequest(context) {
  const { request, env } = context;
  const { pathname } = new URL(request.url);

  if (isRemovedPublicPath(pathname)) {
    return new Response('Not found', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  }

  if (!isAdminPath(pathname)) {
    return context.next();
  }

  const expectedUsername = env.ADMIN_USERNAME || env.ADMIN_USER;
  const expectedPassword = env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return unauthorized('Admin access is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD in Cloudflare Pages.', 503);
  }

  const credentials = parseBasicAuth(request.headers.get('Authorization'));
  if (!credentials) {
    return challenge();
  }

  const validUsername = timingSafeEqual(credentials.username, expectedUsername);
  const validPassword = timingSafeEqual(credentials.password, expectedPassword);

  if (!validUsername || !validPassword) {
    return challenge();
  }

  const response = await context.next();
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
