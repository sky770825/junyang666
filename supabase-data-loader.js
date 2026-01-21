// Supabase 資料載入器
// 從 Supabase 載入已上架的物件資料並合併到 embeddedPropertiesData

// Supabase 設定
const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

// 初始化 Supabase 客戶端
let supabaseClient = null;

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
    
    // 需要隱藏門牌號碼的情況（勾選隱藏 或 透天/別墅/店面類型）
    // 提取地址：保留縣市區域、路名，以及樓層資訊（如果有的話）
    // 例如：「桃園市楊梅區永美路445巷144弄20號」→「桃園市楊梅區永美路」
    // 例如：「新北市板橋區文化路一段123號3F」→「新北市板橋區文化路一段3F」
    // 例如：「永美路15號3樓」→「永美路3樓」
    
    let displayAddress = address;
    
    // 方法1：提取縣市區域前綴（例如「桃園市」、「楊梅區」）
    const cityDistrictMatch = displayAddress.match(/^([^路街道]+[市縣區鄉鎮])/i);
    const cityDistrict = cityDistrictMatch ? cityDistrictMatch[1] : '';
    
    // 方法2：移除縣市區域前綴，準備提取路名
    let roadPart = displayAddress.replace(/^[^路街道]+[市縣區鄉鎮]/i, '');
    
    // 方法3：匹配路名模式（包含「一段」、「二段」等）
    // 匹配：路名 + 可選的「一段」、「二段」等 + 「路/街/道/大道」
    // 例如：「永美路」或「文化路一段」
    const roadPattern = /([^路街道]+(?:[一二三四五六七八九十]+段)?[路街道大道])/;
    const roadMatch = roadPart.match(roadPattern);
    
    let roadName = '';
    if (roadMatch) {
        roadName = roadMatch[1];
    } else {
        // 方法4：如果方法3失敗，使用更簡單的匹配
        // 匹配第一個「XX路」、「XX街」、「XX道」等
        const simpleRoadMatch = roadPart.match(/([^路街道]*[路街道])/);
        if (simpleRoadMatch) {
            roadName = simpleRoadMatch[1];
        }
    }
    
    // 方法5：提取樓層資訊（在門牌號碼之後）
    // 匹配模式：在路名之後，找到「號」後面的樓層資訊
    // 例如：「永美路15號3F」→「3F」
    // 例如：「永美路15號3樓」→「3樓」
    // 例如：「永美路15號3樓F」→「3樓F」
    let floorInfo = '';
    if (roadName) {
        // 找到路名在原始地址中的位置
        const roadIndex = displayAddress.indexOf(roadName);
        if (roadIndex !== -1) {
            // 從路名之後開始查找樓層資訊
            const afterRoad = displayAddress.substring(roadIndex + roadName.length);
            // 匹配：號 + 數字 + 可選的「樓」或「F」或「樓F」
            const floorMatch = afterRoad.match(/號[\d\w\-\s]*?([\d]+[樓層F]+)/i);
            if (floorMatch) {
                floorInfo = floorMatch[1];
            }
        }
    }
    
    // 組合：縣市區域 + 路名 + 樓層資訊（如果有）
    if (roadName) {
        displayAddress = (cityDistrict + roadName + (floorInfo ? floorInfo : '')).trim();
    } else {
        // 如果找不到路名，使用備用方法
        roadPart = roadPart.replace(/號[\d\w\-\s]*?([\d]+[樓層F]+)/i, floorInfo || '');
        roadPart = roadPart.replace(/[\d]+[巷弄號].*$/i, '');
        roadPart = roadPart.replace(/[巷弄號][\d\w\-\s]*.*$/i, '');
        displayAddress = (cityDistrict + roadPart).trim();
    }
    
    // 清理多餘空格和結尾符號
    displayAddress = displayAddress.replace(/[\s\-]+$/, '').trim();
    
    return displayAddress;
}

// 將輔助函數暴露到全域，供其他模組使用
window.formatAddressForDisplay = formatAddressForDisplay;

// 從 Supabase 載入已上架的物件資料
async function loadPropertiesFromSupabase() {
    try {
        console.log('🔄 正在從 Supabase 載入已上架的物件資料...');
        const loadStartTime = Date.now();
        
        // 初始化 Supabase 客戶端
        if (!supabaseClient) {
            if (typeof supabase === 'undefined') {
                console.error('❌ Supabase SDK 未載入');
                return;
            }
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        
        // 查詢已上架的本店物件（不包含非本店物件）
        // 🔥 重要：禁用快取，確保每次重新整理都獲取最新資料
        const { data, error } = await supabaseClient
            .from('properties')
            .select('*')
            .eq('is_published', true)
            .eq('is_external', false)  // 只載入本店物件
            .order('created_at', { ascending: false });
        
        if (error) {
            throw error;
        }
        
        if (!Array.isArray(data)) {
            throw new Error('Supabase 返回的資料格式不正確');
        }
        
        const loadEndTime = Date.now();
        const loadDuration = loadEndTime - loadStartTime;
        
        console.log(`✅ 成功從 Supabase 載入 ${data.length} 個已上架的物件（耗時 ${loadDuration}ms）`);
        console.log('📋 物件列表:', data.map((p, idx) => `${idx + 1}. ${p.title || p.id} (${p.type || 'N/A'}) - is_published: ${p.is_published}, status: ${p.status || 'N/A'}`));
        
        // 🔥 檢查資料一致性
        const publishedCount = data.filter(p => p.is_published === true).length;
        if (publishedCount !== data.length) {
            console.warn(`⚠️ 資料不一致：查詢條件是 is_published=true，但返回的資料中有 ${data.length - publishedCount} 個 is_published=false 的物件`);
        }
        
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
            return {
                id: prop.id,
                number: prop.number || '',
                title: prop.title || '',
                type: prop.type || '',
                address: prop.address || '',
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
        
        console.log(`✅ 已載入 ${formattedProperties.length} 個 Supabase 物件（已上架）`);
        console.log(`📊 資料統計：總數 ${formattedProperties.length}，未售 ${formattedProperties.filter(p => p.status !== 'sold').length}，已售 ${formattedProperties.filter(p => p.status === 'sold').length}`);
        
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
        
        console.log('✅ Supabase 資料載入完成，已觸發事件通知分頁系統');
        
        // 🔥 重要：不在此處直接更新分頁系統，而是通過事件讓 main-script.js 統一處理
        // 這樣可以避免重複更新和競態條件
        // 如果分頁系統已經存在，只觸發事件通知更新（由 main-script.js 處理）
        if (window.paginationSystem && typeof window.paginationSystem.renderProperties === 'function') {
            console.log('📦 分頁系統已存在，通過事件通知更新（避免重複更新）');
        } else {
            // 如果分頁系統還不存在，觸發初始化
            console.log('⏳ 分頁系統尚未初始化，等待初始化...');
            // 觸發自定義事件，通知需要初始化
            const initEvent = new CustomEvent('needPaginationInit', {
                detail: { 
                    properties: formattedProperties,
                    count: formattedProperties.length
                }
            });
            window.dispatchEvent(initEvent);
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
            console.log('🔄 嘗試使用 API 載入器作為備用方案...');
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
            console.log('⏳ 資料正在載入中，跳過重複請求');
            return;
        }
        
        if (now - lastLoadTime < MIN_LOAD_INTERVAL) {
            console.log(`⏳ 距離上次載入時間太短（${now - lastLoadTime}ms），跳過重複請求`);
            return;
        }
        
        isLoadingData = true;
        lastLoadTime = now;
        console.log('📦 開始載入 Supabase 資料...');
        
        loadPropertiesFromSupabase().finally(() => {
            isLoadingData = false;
        });
    }
    
    // 如果 DOM 已經載入完成，立即執行
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        console.log('📦 DOM 已準備好，立即載入資料');
        initDataLoader();
    } else {
        // 等待 DOM 載入完成，但也要設置立即執行的備用
        console.log('📦 等待 DOM 載入完成...');
        document.addEventListener('DOMContentLoaded', function() {
            console.log('📦 DOM 載入完成，開始載入資料');
            initDataLoader();
        });
        
        // 備用：如果 DOMContentLoaded 已經觸發，立即執行
        setTimeout(() => {
            if (document.readyState !== 'loading') {
                console.log('📦 DOM 已載入（備用檢查），開始載入資料');
                initDataLoader();
            }
        }, 100);
    }
})();
