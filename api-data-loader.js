// API 資料載入器
// 從後端 API 載入物件資料並合併到 embeddedPropertiesData

// 自動偵測 API 基礎網址
function getApiBaseUrl() {
    // 檢查是否有手動設定的 API URL（從 localStorage）
    const savedApiUrl = localStorage.getItem('api-url');
    if (savedApiUrl) {
        return savedApiUrl;
    }
    
    // 判斷環境
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.hostname === '';
    
    if (isLocalhost) {
        // 本地開發環境：跟著目前頁面的 port，避免 localhost:3001 卻打到 3000
        if (window.location.origin && window.location.protocol !== 'file:') {
            return window.location.origin + '/api';
        }
        return 'http://localhost:3000/api';
    } else {
        // 生產環境 - 使用當前網域的 API
        return window.location.origin + '/api';
    }
}

// API 基礎網址
const API_BASE_URL = getApiBaseUrl();

// 客戶端快取鍵（與 js/lib/client-cache.js、js/lib/query-client.js 搭配）
const CACHE_KEY_PROPERTIES_API = 'properties:api:list';

// React Query 風格：快取時間與重新驗證
var QUERY_STALE_TIME_MS = 30 * 1000;       // 物件資料需快速同步，30 秒後重新驗證
var QUERY_GC_TIME_MS = 10 * 60 * 1000;    // 10 分鐘後回收

// 將 API 物件列表寫入 embeddedPropertiesData（共用邏輯：快取命中與 API 回傳）
function applyPropertiesToEmbedded(apiProperties) {
    if (!Array.isArray(apiProperties)) return;
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
        const existingIds = new Set(embeddedPropertiesData.properties.map(p => p.id || p.number));
        const newProperties = apiProperties.filter(p => !existingIds.has(p.id || p.number));
        if (newProperties.length > 0) {
            embeddedPropertiesData.properties = [...embeddedPropertiesData.properties, ...newProperties];
        }
    } else {
        window.embeddedPropertiesData = {
            properties: apiProperties,
            settings: { itemsPerPage: 8, maxPages: 10, enableSearch: true, enableFilter: true }
        };
    }
}

// 純 fetcher：只負責從 API 取得陣列（供 DataQuery 使用）
function fetchPropertiesFromApi() {
    return fetch(`${API_BASE_URL}/properties`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        mode: 'cors'
    }).then(function(res) {
        if (!res.ok) return res.text().then(function(t) { throw new Error('HTTP ' + res.status + ': ' + t); });
        return res.json();
    }).then(function(json) {
        if (!Array.isArray(json)) throw new Error('API 返回的資料格式不正確');
        return json;
    });
}

// 從 API 載入物件資料（優先使用 DataQuery：staleTime、refetchOnWindowFocus、refetchOnReconnect）
async function loadPropertiesFromAPI() {
    try {
        if (typeof window.DataQuery !== 'undefined') {
            var data = await window.DataQuery.fetchQuery(CACHE_KEY_PROPERTIES_API, fetchPropertiesFromApi, {
                staleTime: QUERY_STALE_TIME_MS,
                gcTime: QUERY_GC_TIME_MS,
                refetchOnWindowFocus: true,
                refetchOnReconnect: true
            });
            applyPropertiesToEmbedded(data);
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('✅ 從 DataQuery 取得 API 物件列表（含快取/重新驗證）');
            }
            return data;
        }
        if (typeof window.ClientCache !== 'undefined') {
            var cached = window.ClientCache.get(CACHE_KEY_PROPERTIES_API);
            if (cached && Array.isArray(cached) && cached.length >= 0) {
                applyPropertiesToEmbedded(cached);
                return cached;
            }
        }

        var apiProperties = await fetchPropertiesFromApi();
        applyPropertiesToEmbedded(apiProperties);
        if (typeof window.ClientCache !== 'undefined') {
            window.ClientCache.set(CACHE_KEY_PROPERTIES_API, apiProperties);
        }
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('✅ 成功從 API 載入 ' + apiProperties.length + ' 個物件');
        }
        return apiProperties;
    } catch (error) {
        console.warn('⚠️ 無法從 API 載入資料:', error.message);
        if (typeof embeddedPropertiesData === 'undefined') {
            window.embeddedPropertiesData = {
                properties: [],
                settings: { itemsPerPage: 8, maxPages: 10, enableSearch: true, enableFilter: true }
            };
        }
        return [];
    }
}

// 確保分頁系統重新載入資料的函數
function refreshPaginationSystem() {
        // 等待一下確保分頁系統已經初始化
        setTimeout(() => {
        // 如果分頁系統已存在，重新設定資料並渲染
        if (window.paginationSystem && typeof window.paginationSystem.renderProperties === 'function') {
            // 🔇 移除訊息，避免在刷新時顯示
            
            // 重新設定資料
            if (typeof embeddedPropertiesData !== 'undefined') {
                const oldCount = window.paginationSystem.properties.length;
                
                window.paginationSystem.allProperties = embeddedPropertiesData.properties;
                window.paginationSystem.properties = window.paginationSystem.allProperties.filter(p => p.status !== 'sold');
                window.paginationSystem.soldProperties = window.paginationSystem.allProperties.filter(p => p.status === 'sold');
                
                // 清除緩存
                window.paginationSystem.filteredCache = null;
                window.paginationSystem.cacheKey = '';
                
                const newCount = window.paginationSystem.properties.length;
                
                // 重新渲染
                window.paginationSystem.renderProperties();
                
                // 更新篩選計數
                if (typeof window.paginationSystem.updateFilterCounts === 'function') {
                    window.paginationSystem.updateFilterCounts();
                }
                
                // 🔇 移除訊息，避免在刷新時顯示
            }
        } else {
            // 這是正常的，分頁系統會在 DOMContentLoaded 時初始化
            // 🔇 移除訊息，避免在刷新時顯示
        }
    }, 500); // 等待 500ms 確保分頁系統已初始化
}

// 🚀 性能優化：先給 Supabase 載入時間，API 只作為備用
(function initApiDataLoader() {
    let supabaseLoaded = false;

    window.addEventListener('supabaseDataLoaded', function() {
        supabaseLoaded = true;
    }, { once: true });

    function hasPropertyData() {
        return typeof embeddedPropertiesData !== 'undefined' &&
            embeddedPropertiesData.properties &&
            embeddedPropertiesData.properties.length > 0;
    }

    function runApiFallback() {
        if (supabaseLoaded || hasPropertyData()) return;

        loadPropertiesFromAPI().then(function() {
            setTimeout(refreshPaginationSystem, 50);
            window.dispatchEvent(new CustomEvent('apiDataLoaded', {
                detail: { properties: embeddedPropertiesData.properties }
            }));
        });
    }

    function scheduleApiFallback() {
        setTimeout(runApiFallback, 2200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleApiFallback);
    } else {
        scheduleApiFallback();
    }
})();

// 暴露刷新函數供手動調用
window.refreshPaginationSystem = refreshPaginationSystem;

// DataQuery 背景重新驗證後更新分頁
if (typeof window.addEventListener !== 'undefined') {
    window.addEventListener('dataQueryUpdated', function(e) {
        if (e.detail && e.detail.queryKey === CACHE_KEY_PROPERTIES_API && Array.isArray(e.detail.data)) {
            applyPropertiesToEmbedded(e.detail.data);
            setTimeout(refreshPaginationSystem, 50);
        }
    });
}
