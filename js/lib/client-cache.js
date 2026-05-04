// 客戶端快取模組：將常用資料暫存在瀏覽器（記憶體 + localStorage），減少重複請求
// 使用方式：ClientCache.get(key)、ClientCache.set(key, data, ttlMs)、ClientCache.invalidate(keyOrPrefix)

(function() {
    'use strict';

    const PREFIX = 'junyang666_cache_';
    const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 分鐘
    const memory = new Map(); // key -> { data, expiresAt }

    function get(key) {
        if (!key) return null;
        // 1. 記憶體
        const entry = memory.get(key);
        if (entry) {
            if (Date.now() > entry.expiresAt) {
                memory.delete(key);
                try { localStorage.removeItem(PREFIX + key); } catch (e) {}
                return null;
            }
            return entry.data;
        }
        // 2. localStorage（重新整理後恢復）
        try {
            if (!window.localStorage) return null;
            const raw = localStorage.getItem(PREFIX + key);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed.expiresAt !== 'number') return null;
            if (Date.now() > parsed.expiresAt) {
                localStorage.removeItem(PREFIX + key);
                return null;
            }
            const data = parsed.data;
            memory.set(key, { data: data, expiresAt: parsed.expiresAt });
            return data;
        } catch (e) {
            return null;
        }
    }

    function set(key, data, ttlMs) {
        if (!key) return;
        const ttl = typeof ttlMs === 'number' && ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
        const expiresAt = Date.now() + ttl;
        memory.set(key, { data: data, expiresAt: expiresAt });
        try {
            if (window.localStorage) {
                localStorage.setItem(PREFIX + key, JSON.stringify({ data: data, expiresAt: expiresAt }));
            }
        } catch (e) {
            if (e && e.name === 'QuotaExceededError') {
                try { localStorage.removeItem(PREFIX + key); } catch (e2) {}
            }
        }
    }

    function invalidate(keyOrPrefix) {
        if (!keyOrPrefix) {
            memory.clear();
            try {
                if (window.localStorage) {
                    const keys = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (k && k.startsWith(PREFIX)) keys.push(k);
                    }
                    keys.forEach(k => localStorage.removeItem(k));
                }
            } catch (e) {}
            return;
        }
        memory.forEach((_, k) => {
            if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) memory.delete(k);
        });
        try {
            if (window.localStorage) {
                const keys = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const k = localStorage.key(i);
                    if (k && k.startsWith(PREFIX)) {
                        const shortKey = k.slice(PREFIX.length);
                        if (shortKey === keyOrPrefix || shortKey.startsWith(keyOrPrefix)) keys.push(k);
                    }
                }
                keys.forEach(k => localStorage.removeItem(k));
            }
        } catch (e) {}
    }

    window.ClientCache = {
        get: get,
        set: set,
        invalidate: invalidate,
        DEFAULT_TTL_MS: DEFAULT_TTL_MS
    };
})();
