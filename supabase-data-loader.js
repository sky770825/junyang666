// Supabase 資料載入器
// 從 Supabase 載入已上架的物件資料並合併到 embeddedPropertiesData

// 🔥 使用統一配置：優先使用 supabase-config.js 中的配置
// 如果 supabase-config.js 未載入，使用備用配置
const SUPABASE_URL = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG?.url) 
    ? SUPABASE_CONFIG.url 
    : 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG?.anonKey) 
    ? SUPABASE_CONFIG.anonKey 
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

// 初始化 Supabase 客戶端（使用單例模式）
let supabaseClient = null;

// 📦 客戶端快取設定：將已整理好的物件資料暫存在 localStorage，降低重複請求
const PROPERTY_CACHE_KEY = 'embeddedPropertiesCache_v1';
const PROPERTY_CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘，可依需求調整

function loadPropertiesFromCache() {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return null;
        const raw = window.localStorage.getItem(PROPERTY_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        if (!cache || !Array.isArray(cache.properties)) return null;
        if (typeof cache.updatedAt !== 'number') return null;
        const age = Date.now() - cache.updatedAt;
        if (age > PROPERTY_CACHE_TTL_MS) return null;
        return cache;
    } catch (e) {
        console.warn('⚠️ 讀取本地快取失敗，略過快取：', e);
        return null;
    }
}

function savePropertiesToCache(payload) {
    try {
        if (typeof window === 'undefined' || !window.localStorage) return;
        const toSave = {
            properties: payload.properties || [],
            settings: payload.settings || {
                itemsPerPage: 8,
                maxPages: 10,
                enableSearch: true,
                enableFilter: true
            },
            updatedAt: Date.now()
        };
        window.localStorage.setItem(PROPERTY_CACHE_KEY, JSON.stringify(toSave));
    } catch (e) {
        console.warn('⚠️ 儲存本地快取失敗：', e);
    }
}

// 處理地址顯示的輔助函數（根據 hide_address_number 和物件類型決定是否隱藏門牌號碼）
function formatAddressForDisplay(address, hideAddressNumber, propertyType) {
    if (!address) return '';

    // 透天、別墅、店面類型：前端只顯示到路名（例如「永美路」）
    const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
    const shouldShowOnlyRoad = propertyType && typesToShowOnlyRoad.includes(propertyType);

    // 如果不需要隱藏門牌號碼，且不是透天/別墅/店面，直接返回完整地址
    if (!hideAddressNumber && !shouldShowOnlyRoad) {
        return address;
    }

    // 透天/別墅/店面：只顯示到路名
    if (shouldShowOnlyRoad) {
        let displayAddress = address;
        const cityDistrictMatch = displayAddress.match(/^([^路街道]+[市縣區鄉鎮])/i);
        const cityDistrict = cityDistrictMatch ? cityDistrictMatch[1] : '';
        let roadPart = displayAddress.replace(/^[^路街道]+[市縣區鄉鎮]/i, '');
        const roadPattern = /([^路街道]+(?:[一二三四五六七八九十]+段)?[路街道大道])/;
        const roadMatch = roadPart.match(roadPattern);
        if (roadMatch) {
            return (cityDistrict + roadMatch[1]).trim();
        }
        const simpleRoadMatch = roadPart.match(/([^路街道]*[路街道])/);
        if (simpleRoadMatch) {
            return (cityDistrict + simpleRoadMatch[1]).trim();
        }
        return address;
    }

    // 一般物件隱藏門牌：只把門牌數字換成 **，保留其餘部分
    // 例如：「桃園市楊梅區梅獅路二段186號2樓」→「桃園市楊梅區梅獅路二段**號2樓」
    // 例如：「楊梅區文化街336號7樓」→「楊梅區文化街**號7樓」
    // 例如：「永美路445巷144弄20號」→「永美路**巷**弄**號」
    return address.replace(/(\d+)(巷|弄|號)/g, '**$2');
}

// 將輔助函數暴露到全域，供其他模組使用
window.formatAddressForDisplay = formatAddressForDisplay;

// 從 Supabase 載入已上架的物件資料
async function loadPropertiesFromSupabase() {
    try {
        // 🔇 移除載入訊息，避免在刷新時顯示
        const loadStartTime = Date.now();

        // 📦 優先嘗試從本地快取載入（避免每次重新整理都白等一輪）
        try {
            const cached = loadPropertiesFromCache();
            if (cached && (!window.embeddedPropertiesData || !window.embeddedPropertiesData.properties || window.embeddedPropertiesData.properties.length === 0)) {
                window.embeddedPropertiesData = {
                    properties: cached.properties,
                    settings: cached.settings || {
                        itemsPerPage: 8,
                        maxPages: 10,
                        enableSearch: true,
                        enableFilter: true
                    }
                };
                const cacheEvent = new CustomEvent('supabaseDataLoaded', {
                    detail: {
                        properties: cached.properties,
                        count: cached.properties.length,
                        fromCache: true,
                        timestamp: new Date().toISOString()
                    }
                });
                window.dispatchEvent(cacheEvent);
            }
        } catch (e) {
            console.warn('⚠️ 載入本地快取時發生錯誤，改為直接請求 Supabase：', e);
        }
        
        // 初始化 Supabase 客戶端（使用單例模式，避免多個實例）
        if (!supabaseClient) {
            // 🔥 優先使用全域客戶端（單例模式）
            if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
                // 🔇 移除訊息，避免在刷新時顯示
                supabaseClient = window.supabaseClient;
            } else if (typeof supabase === 'undefined') {
                console.error('❌ Supabase SDK 未載入，無法創建客戶端');
                throw new Error('Supabase SDK 未載入');
            } else {
                // 🔥 優先使用統一配置函數
                try {
                    if (typeof createSupabaseClient === 'function') {
                        supabaseClient = createSupabaseClient();
                    } else {
                        supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    }
                    
                    // 儲存到全域，供其他模組使用
                    if (supabaseClient) {
                        window.supabaseClient = supabaseClient;
                    }
                    // 🔇 移除訊息，避免在刷新時顯示
                } catch (error) {
                    console.error('❌ 創建 Supabase 客戶端失敗:', error);
                    throw error;
                }
            }
        }
        
        // 查詢已上架的物件（含本店與非本店，前端不區分顯示）
        // 🔥 重要：禁用快取，確保每次重新整理都獲取最新資料
        const { data, error } = await supabaseClient
            .from('properties')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Supabase 查詢錯誤:', error);
            throw error;
        }
        
        // 🔇 移除訊息，避免在刷新時顯示
        
        if (!data) {
            console.error('❌ Supabase 返回 null 或 undefined');
            throw new Error('Supabase 返回 null 或 undefined');
        }
        
        if (!Array.isArray(data)) {
            console.error('❌ Supabase 返回的資料格式不正確，data 類型:', typeof data, data);
            throw new Error('Supabase 返回的資料格式不正確');
        }
        
        if (data.length === 0) {
            console.warn('⚠️ Supabase 返回空陣列，沒有找到已上架的物件');
            // 🔥 即使沒有資料，也要設置空的 embeddedPropertiesData，避免其他模組等待
            window.embeddedPropertiesData = {
                properties: [],
                settings: {
                    itemsPerPage: 8,
                    maxPages: 10,
                    enableSearch: true,
                    enableFilter: true
                }
            };
            // 🔇 移除訊息，避免在刷新時顯示
            // 仍然觸發事件，讓分頁系統知道資料已載入（即使是空的）
            const event = new CustomEvent('supabaseDataLoaded', {
                detail: { 
                    properties: [],
                    count: 0,
                    timestamp: new Date().toISOString()
                }
            });
            window.dispatchEvent(event);
            return; // 提前返回，不繼續處理
        }
        
        const loadEndTime = Date.now();
        const loadDuration = loadEndTime - loadStartTime;
        
        // 🔇 移除載入成功訊息，避免在刷新時顯示
        // 只在開發模式下顯示詳細資訊
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`✅ 成功從 Supabase 載入 ${data.length} 個已上架的物件（耗時 ${loadDuration}ms）`);
            if (data.length > 0) {
                console.log('📋 物件列表（前5個）:', data.slice(0, 5).map((p, idx) => `${idx + 1}. ${p.title || p.id} (${p.type || 'N/A'}) - is_published: ${p.is_published}, status: ${p.status || 'N/A'}`));
            }
        }
        
        // 🔥 檢查資料一致性
        const publishedCount = data.filter(p => p.is_published === true).length;
        if (publishedCount !== data.length) {
            console.warn(`⚠️ 資料不一致：查詢條件是 is_published=true，但返回的資料中有 ${data.length - publishedCount} 個 is_published=false 的物件`);
        }

        // 🔥 耗時格式轉換改為非同步執行，避免阻塞 UI
        function doFormat() {
        // 轉換資料格式以符合前端需求
        const formattedProperties = data.map(prop => {
            // 處理 images（可能是陣列或 JSONB）
            let images = [];
            if (prop.images) {
                if (typeof prop.images === 'string') {
                    try {
                        images = JSON.parse(prop.images);
                    } catch (e) {
                        images = [];
                    }
                } else if (Array.isArray(prop.images)) {
                    images = prop.images;
                }
            }
            
            // 處理 transportation
            let transportation = {};
            if (prop.transportation) {
                if (typeof prop.transportation === 'string') {
                    try {
                        transportation = JSON.parse(prop.transportation);
                    } catch (e) {
                        transportation = {};
                    }
                } else if (typeof prop.transportation === 'object') {
                    transportation = prop.transportation;
                }
            }
            
            // 處理 features
            let features = [];
            if (prop.features) {
                if (typeof prop.features === 'string') {
                    try {
                        features = JSON.parse(prop.features);
                    } catch (e) {
                        features = [];
                    }
                } else if (Array.isArray(prop.features)) {
                    features = prop.features;
                }
            }
            
            // 轉換為前端格式
            // 🔒 地址隱私：當 hide_address_number 或 透天/別墅/店面 時，只傳遮罩後的地址到前端，避免完整地址出現在原始碼/Network
            const safeAddress = formatAddressForDisplay(prop.address || '', prop.hide_address_number, prop.type);

            return {
                id: prop.id,
                number: prop.number || '',
                title: prop.title || '',
                type: prop.type || '',
                address: safeAddress,
                price: prop.price || '',
                layout: prop.layout || '',
                total_area: prop.total_area || '',
                status: prop.status || '',
                statusText: prop.status_text || prop.statusText || '',
                community: prop.community || '',
                main_area: prop.main_area || '',
                auxiliary_area: prop.auxiliary_area || '',
                common_area: prop.common_area || '',
                land_area: prop.land_area || '',
                parking_area: prop.parking_area || '',
                age: prop.age || '',
                floor: prop.floor || '',
                building_type: prop.building_type || '',
                orientation: prop.orientation || '',
                management_fee: prop.management_fee || '',
                parking_type: prop.parking_type || '',
                parking_space: prop.parking_space || '',
                current_status: prop.current_status || '',
                description: prop.description || '',
                google_maps: prop.google_maps || '',
                tiktok_video_id: prop.tiktok_video_id || '',
                tiktok_username: prop.tiktok_username || '',
                tiktok_thumbnail: prop.tiktok_thumbnail || (prop.images && prop.images.length > 0 ? prop.images[0] : null), // 使用第一張圖片作為縮略圖
                reference_link: prop.reference_link || '',
                images: images,
                transportation: transportation,
                features: features,
                hide_address_number: prop.hide_address_number || false,
                created_at: prop.created_at,
                updated_at: prop.updated_at
            };
        });
        
        // 直接使用 Supabase 的資料（不再合併本地硬編碼資料）
        window.embeddedPropertiesData = {
            properties: formattedProperties,
            settings: {
                itemsPerPage: 8,
                maxPages: 10,
                enableSearch: true,
                enableFilter: true
            }
        };

        // 📦 將最新資料寫入本地快取，後續重新整理可優先從快取顯示
        savePropertiesToCache(window.embeddedPropertiesData);
        
        // 🔇 移除載入訊息，避免在刷新時顯示
        // 只在開發模式下顯示統計資訊
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`✅ 已載入 ${formattedProperties.length} 個 Supabase 物件（已上架）`);
            console.log(`📊 資料統計：總數 ${formattedProperties.length}，未售 ${formattedProperties.filter(p => p.status !== 'sold').length}，已售 ${formattedProperties.filter(p => p.status === 'sold').length}`);
        }
        console.log(`✅ window.embeddedPropertiesData 已設置，包含 ${window.embeddedPropertiesData.properties.length} 個物件`);
        
        // 🔥 驗證資料是否正確設置
        if (typeof window.embeddedPropertiesData === 'undefined' || !window.embeddedPropertiesData.properties) {
            console.error('❌ 嚴重錯誤：embeddedPropertiesData 設置失敗！');
            throw new Error('embeddedPropertiesData 設置失敗');
        }
        
        // 🔥 記錄載入時間戳，用於除錯
        if (!window.lastDataLoadTime) {
            window.lastDataLoadTime = [];
        }
        window.lastDataLoadTime.push({
            timestamp: new Date().toISOString(),
            count: formattedProperties.length,
            duration: loadDuration
        });
        // 只保留最近 10 次記錄
        if (window.lastDataLoadTime.length > 10) {
            window.lastDataLoadTime.shift();
        }
        
        // 觸發資料載入完成事件
        const event = new CustomEvent('supabaseDataLoaded', {
            detail: {
                properties: formattedProperties,
                count: formattedProperties.length,
                timestamp: new Date().toISOString()
            }
        });
        window.dispatchEvent(event);
        
        // 也觸發原有的 apiDataLoaded 事件（向後兼容）
        const apiEvent = new CustomEvent('apiDataLoaded');
        window.dispatchEvent(apiEvent);
        
        // 🔇 移除訊息，避免在刷新時顯示
        
        // 🔥 重要：不在此處直接更新分頁系統，而是通過事件讓 main-script.js 統一處理
        // 這樣可以避免重複更新和競態條件
        // 如果分頁系統已經存在，只觸發事件通知更新（由 main-script.js 處理）
        if (window.paginationSystem && typeof window.paginationSystem.renderProperties === 'function') {
            // 🔇 移除訊息，避免在刷新時顯示
        } else {
            // 如果分頁系統還不存在，觸發初始化
            // 🔇 移除訊息，避免在刷新時顯示
            // 觸發自定義事件，通知需要初始化
            const initEvent = new CustomEvent('needPaginationInit', {
                detail: { 
                    properties: formattedProperties,
                    count: formattedProperties.length
                }
            });
            window.dispatchEvent(initEvent);
        }
        }
        if (typeof window.AsyncUtils !== 'undefined' && typeof window.AsyncUtils.runAsync === 'function') {
            window.AsyncUtils.runAsync(doFormat);
        } else {
            doFormat();
        }
        
    } catch (error) {
        console.error('❌ 從 Supabase 載入物件失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            details: error.details
        });
        
        // 如果 Supabase 載入失敗，嘗試使用原有的 API 載入器
        if (typeof loadPropertiesFromAPI === 'function') {
            // 🔇 移除訊息，避免在刷新時顯示
            loadPropertiesFromAPI();
        }
    }
}

// 頁面載入時自動載入資料
// 🔥 重要：立即執行，不等待 DOMContentLoaded，確保資料盡快載入
// 🔥 防止重複載入：使用標記確保同一時間只載入一次
let isLoadingData = false;
let lastLoadTime = 0;
const MIN_LOAD_INTERVAL = 1000; // 最小載入間隔 1 秒

(function() {
    function initDataLoader() {
        const now = Date.now();
        
        // 防止短時間內重複載入
        if (isLoadingData) {
            // 🔇 移除訊息，避免在刷新時顯示
            return;
        }
        
        if (now - lastLoadTime < MIN_LOAD_INTERVAL) {
            // 🔇 移除訊息，避免在刷新時顯示
            return;
        }
        
        isLoadingData = true;
        lastLoadTime = now;
        // 🔇 移除載入訊息，避免在刷新時顯示
        
        loadPropertiesFromSupabase()
            .then(() => {
                // 🔇 移除訊息，避免在刷新時顯示
            })
            .catch((error) => {
                console.error('❌ Supabase 資料載入 Promise 失敗:', error);
            })
            .finally(() => {
                isLoadingData = false;
                // 🔇 移除訊息，避免在刷新時顯示
            });
    }
    
    // 🔥 防止重複初始化：使用標記確保只初始化一次
    if (window.supabaseDataLoaderInitialized) {
        // 🔇 移除訊息，避免在刷新時顯示
        return;
    }
    window.supabaseDataLoaderInitialized = true;
    
    // 🔥 確保 Supabase SDK 已載入後再執行
    // 🚀 性能優化：如果 SDK 已載入，立即執行；否則快速檢查
    let supabaseWaitRetries = 0;
    const MAX_SUPABASE_WAIT_RETRIES = 30; // 減少到 3 秒（30 * 100ms）
    const CHECK_INTERVAL = 50; // 減少檢查間隔到 50ms，加快響應
    
    function waitForSupabaseAndInit() {
        // 🚀 如果 SDK 已載入，立即執行（不等待）
        if (typeof supabase !== 'undefined') {
            // 如果 DOM 已經載入完成，立即執行
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                initDataLoader();
            } else {
                // 等待 DOM 載入完成
                document.addEventListener('DOMContentLoaded', function() {
                    initDataLoader();
                }, { once: true });
            }
            return;
        }
        
        // SDK 尚未載入，繼續等待
        supabaseWaitRetries++;
        if (supabaseWaitRetries >= MAX_SUPABASE_WAIT_RETRIES) {
            console.error('❌ Supabase SDK 載入超時，已重試 ' + MAX_SUPABASE_WAIT_RETRIES + ' 次');
            console.error('   請檢查網路連接或 Supabase SDK CDN 是否可訪問');
            return;
        }
        
        // 🚀 使用更短的間隔快速檢查
        setTimeout(waitForSupabaseAndInit, CHECK_INTERVAL);
    }
    
    // 開始等待 Supabase SDK
    waitForSupabaseAndInit();
})();
