/**
 * React Query 風格的資料獲取與快取層（vanilla JS）
 * 提供：staleTime、gcTime、refetchOnWindowFocus、refetchOnReconnect
 * 使用：DataQuery.fetchQuery(key, fetcher, options)、getQueryData、invalidateQueries
 */
(function() {
    'use strict';

    var DEFAULT_STALE_TIME_MS = 5 * 60 * 1000;   // 5 分鐘內視為新鮮，不重複請求
    var DEFAULT_GC_TIME_MS = 10 * 60 * 1000;     // 10 分鐘後從記憶體回收（仍可從 localStorage 恢復）
    var REFETCH_ON_FOCUS_MIN_AGE_MS = 30 * 1000;  // 視窗重新取得焦點時，若資料超過 30 秒才在背景重新驗證

    var memory = new Map(); // queryKey -> { data, dataUpdatedAt, staleAt, gcAt, fetcher, options }
    var PREFIX = 'junyang666_query_';

    function getStorageKey(queryKey) {
        var k = typeof queryKey === 'string' ? queryKey : (Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey));
        return PREFIX + k;
    }

    function getFromMemory(queryKey) {
        var key = typeof queryKey === 'string' ? queryKey : (Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey));
        return memory.get(key);
    }

    function setInMemory(queryKey, entry) {
        var key = typeof queryKey === 'string' ? queryKey : (Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey));
        memory.set(key, entry);
    }

    function persistQuery(queryKey, data, dataUpdatedAt, gcAt) {
        try {
            if (!window.localStorage) return;
            var sk = getStorageKey(queryKey);
            window.localStorage.setItem(sk, JSON.stringify({ data: data, dataUpdatedAt: dataUpdatedAt, gcAt: gcAt }));
        } catch (e) {
            if (e && e.name === 'QuotaExceededError') {
                try { window.localStorage.removeItem(getStorageKey(queryKey)); } catch (e2) {}
            }
        }
    }

    function getPersistedQuery(queryKey) {
        try {
            if (!window.localStorage) return null;
            var raw = window.localStorage.getItem(getStorageKey(queryKey));
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    function removePersistedQuery(queryKey) {
        try {
            if (window.localStorage) window.localStorage.removeItem(getStorageKey(queryKey));
        } catch (e) {}
    }

    /**
     * 取得快取資料（不觸發請求）
     * @param {string|string[]} queryKey
     * @returns {any|null}
     */
    function getQueryData(queryKey) {
        var entry = getFromMemory(queryKey);
        if (entry) {
            if (Date.now() > entry.gcAt) {
                memory.delete(typeof queryKey === 'string' ? queryKey : queryKey.join(':'));
                removePersistedQuery(queryKey);
                return null;
            }
            return entry.data;
        }
        var persisted = getPersistedQuery(queryKey);
        if (persisted && persisted.data !== undefined && typeof persisted.gcAt === 'number' && Date.now() <= persisted.gcAt) {
            var keyStr = typeof queryKey === 'string' ? queryKey : queryKey.join(':');
            memory.set(keyStr, {
                data: persisted.data,
                dataUpdatedAt: persisted.dataUpdatedAt,
                staleAt: persisted.dataUpdatedAt + DEFAULT_STALE_TIME_MS,
                gcAt: persisted.gcAt,
                fetcher: null,
                options: null
            });
            return persisted.data;
        }
        return null;
    }

    /**
     * 手動設定快取資料
     */
    function setQueryData(queryKey, data, options) {
        var now = Date.now();
        var opts = options || {};
        var staleTime = typeof opts.staleTime === 'number' ? opts.staleTime : DEFAULT_STALE_TIME_MS;
        var gcTime = typeof opts.gcTime === 'number' ? opts.gcTime : DEFAULT_GC_TIME_MS;
        var keyStr = typeof queryKey === 'string' ? queryKey : queryKey.join(':');
        var entry = getFromMemory(queryKey) || {};
        var entryNew = {
            data: data,
            dataUpdatedAt: now,
            staleAt: now + staleTime,
            gcAt: now + gcTime,
            fetcher: entry.fetcher || null,
            options: entry.options || opts
        };
        setInMemory(queryKey, entryNew);
        persistQuery(queryKey, data, now, entryNew.gcAt);
    }

    /**
     * 主要：帶快取與重新驗證的取得資料
     * @param {string|string[]} queryKey
     * @param {() => Promise<any>} fetcher
     * @param {{ staleTime?: number, gcTime?: number, refetchOnWindowFocus?: boolean, refetchOnReconnect?: boolean }} options
     * @returns {Promise<any>}
     */
    function fetchQuery(queryKey, fetcher, options) {
        var opts = options || {};
        var staleTime = typeof opts.staleTime === 'number' ? opts.staleTime : DEFAULT_STALE_TIME_MS;
        var gcTime = typeof opts.gcTime === 'number' ? opts.gcTime : DEFAULT_GC_TIME_MS;
        var refetchOnWindowFocus = opts.refetchOnWindowFocus !== false;
        var refetchOnReconnect = opts.refetchOnReconnect !== false;
        var now = Date.now();
        var keyStr = typeof queryKey === 'string' ? queryKey : queryKey.join(':');

        function saveEntry(data, updatedAt) {
            var at = typeof updatedAt === 'number' ? updatedAt : Date.now();
            var entry = {
                data: data,
                dataUpdatedAt: at,
                staleAt: at + staleTime,
                gcAt: at + gcTime,
                fetcher: fetcher,
                options: opts
            };
            setInMemory(queryKey, entry);
            persistQuery(queryKey, data, at, entry.gcAt);
        }

        function doRefetch() {
            return fetcher().then(function(data) {
                saveEntry(data);
                window.dispatchEvent(new CustomEvent('dataQueryUpdated', { detail: { queryKey: keyStr, data: data } }));
                return data;
            });
        }

        var entry = getFromMemory(queryKey);
        if (!entry) {
            var persisted = getPersistedQuery(queryKey);
            if (persisted && persisted.data !== undefined && typeof persisted.gcAt === 'number' && now <= persisted.gcAt) {
                entry = {
                    data: persisted.data,
                    dataUpdatedAt: persisted.dataUpdatedAt,
                    staleAt: persisted.dataUpdatedAt + staleTime,
                    gcAt: persisted.gcAt,
                    fetcher: fetcher,
                    options: opts
                };
                setInMemory(queryKey, entry);
                if (now >= entry.staleAt) {
                    doRefetch().catch(function() {});
                    return Promise.resolve(entry.data);
                }
                return Promise.resolve(entry.data);
            }
            return doRefetch();
        }

        if (now > entry.gcAt) {
            memory.delete(keyStr);
            removePersistedQuery(queryKey);
            return doRefetch();
        }

        if (now < entry.staleAt) {
            return Promise.resolve(entry.data);
        }

        entry.fetcher = fetcher;
        entry.options = opts;
        setInMemory(queryKey, entry);
        doRefetch().catch(function() {});
        return Promise.resolve(entry.data);
    }

    function refetchQueriesByPredicate(predicate) {
        var keys = [];
        memory.forEach(function(entry, key) {
            if (entry.fetcher && predicate(key, entry)) keys.push(key);
        });
        keys.forEach(function(key) {
            var entry = memory.get(key);
            if (entry && entry.fetcher) {
                entry.fetcher().then(function(data) {
                    var opts = entry.options || {};
                    var staleTime = typeof opts.staleTime === 'number' ? opts.staleTime : DEFAULT_STALE_TIME_MS;
                    var gcTime = typeof opts.gcTime === 'number' ? opts.gcTime : DEFAULT_GC_TIME_MS;
                    var now = Date.now();
                    setQueryData(key, data, { staleTime: staleTime, gcTime: gcTime });
                    window.dispatchEvent(new CustomEvent('dataQueryUpdated', { detail: { queryKey: key, data: data } }));
                }).catch(function() {});
            }
        });
    }

    function onWindowFocus() {
        refetchQueriesByPredicate(function(key, entry) {
            if (entry.options && entry.options.refetchOnWindowFocus === false) return false;
            var age = Date.now() - entry.dataUpdatedAt;
            return age >= REFETCH_ON_FOCUS_MIN_AGE_MS && Date.now() >= entry.staleAt;
        });
    }

    function onReconnect() {
        refetchQueriesByPredicate(function(key, entry) {
            return entry.options && entry.options.refetchOnReconnect !== false;
        });
    }

    if (typeof window !== 'undefined') {
        window.addEventListener('focus', onWindowFocus);
        window.addEventListener('online', onReconnect);
    }

    /**
     * 使指定查詢失效（下次會重新請求）
     */
    function invalidateQueries(queryKeyOrPrefix) {
        if (!queryKeyOrPrefix) {
            memory.clear();
            try {
                if (window.localStorage) {
                    var i = 0;
                    var keys = [];
                    while (i < window.localStorage.length) {
                        var k = window.localStorage.key(i);
                        if (k && k.indexOf(PREFIX) === 0) keys.push(k);
                        i++;
                    }
                    keys.forEach(function(k) { window.localStorage.removeItem(k); });
                }
            } catch (e) {}
            return;
        }
        var prefix = typeof queryKeyOrPrefix === 'string' ? queryKeyOrPrefix : queryKeyOrPrefix.join(':');
        var toDelete = [];
        memory.forEach(function(entry, key) {
            if (key === prefix || key.indexOf(prefix) === 0) toDelete.push(key);
        });
        toDelete.forEach(function(key) {
            memory.delete(key);
            removePersistedQuery(key);
        });
        try {
            if (window.localStorage) {
                var j = 0;
                var toRemove = [];
                while (j < window.localStorage.length) {
                    var k2 = window.localStorage.key(j);
                    if (k2 && k2.indexOf(PREFIX) === 0) {
                        var short = k2.slice(PREFIX.length);
                        if (short === prefix || short.indexOf(prefix) === 0) toRemove.push(k2);
                    }
                    j++;
                }
                toRemove.forEach(function(k) { window.localStorage.removeItem(k); });
            }
        } catch (e) {}
    }

    window.DataQuery = {
        fetchQuery: fetchQuery,
        getQueryData: getQueryData,
        setQueryData: setQueryData,
        invalidateQueries: invalidateQueries,
        defaults: {
            staleTime: DEFAULT_STALE_TIME_MS,
            gcTime: DEFAULT_GC_TIME_MS
        }
    };
})();
