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
        // 本地開發環境
        return 'http://localhost:3000/api';
    } else {
        // 生產環境 - 使用當前網域的 API
        return window.location.origin + '/api';
    }
}

// API 基礎網址
const API_BASE_URL = getApiBaseUrl();

// 從 API 載入物件資料
async function loadPropertiesFromAPI() {
    try {
        // 🔇 移除訊息，避免在刷新時顯示
        
        const response = await fetch(`${API_BASE_URL}/properties`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            mode: 'cors' // 明確指定 CORS 模式
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ API 錯誤 (${response.status}):`, errorText);
            throw new Error(`HTTP 錯誤! status: ${response.status}, message: ${errorText}`);
        }
        
        const apiProperties = await response.json();
        
        if (!Array.isArray(apiProperties)) {
            throw new Error('API 返回的資料格式不正確');
        }
        
        // 🔇 移除訊息，避免在刷新時顯示（只在開發模式顯示）
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log(`✅ 成功從 API 載入 ${apiProperties.length} 個物件`);
            console.log('📋 API 物件列表:', apiProperties.map(p => `${p.title} (${p.type})`));
        }
        
        // 如果 embeddedPropertiesData 已存在，合併資料（避免重複）
        if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
            // 檢查是否已有相同的 ID，避免重複
            const existingIds = new Set(embeddedPropertiesData.properties.map(p => p.id || p.number));
            
            // 只添加不重複的物件
            const newProperties = apiProperties.filter(p => !existingIds.has(p.id || p.number));
            
            if (newProperties.length > 0) {
                embeddedPropertiesData.properties = [
                    ...embeddedPropertiesData.properties,
                    ...newProperties
                ];
                // 🔇 移除訊息，避免在刷新時顯示
            } else {
                // 🔇 移除訊息，避免在刷新時顯示
            }
        } else {
            // 如果 embeddedPropertiesData 不存在，建立它
            window.embeddedPropertiesData = {
                properties: apiProperties,
                settings: {
                    itemsPerPage: 8,
                    maxPages: 10,
                    enableSearch: true,
                    enableFilter: true
                }
            };
            // 🔇 移除訊息，避免在刷新時顯示
        }
        
        // 🔇 移除訊息，避免在刷新時顯示
        
        return apiProperties;
        
    } catch (error) {
        console.warn('⚠️ 無法從 API 載入資料:', error.message);
        console.warn('將等待 Supabase 資料載入');
        
        // 如果 API 載入失敗，確保 embeddedPropertiesData 存在（空陣列）
        if (typeof embeddedPropertiesData === 'undefined') {
            window.embeddedPropertiesData = {
                properties: [],
                settings: {
                    itemsPerPage: 8,
                    maxPages: 10,
                    enableSearch: true,
                    enableFilter: true
                }
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

// 🚀 性能優化：如果 Supabase 已成功載入，跳過 API 載入
// 在 DOM 載入完成後載入 API 資料（僅作為備用）
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // 🚀 檢查是否已有 Supabase 資料，如果有則跳過 API 載入
        if (typeof embeddedPropertiesData !== 'undefined' && 
            embeddedPropertiesData.properties && 
            embeddedPropertiesData.properties.length > 0) {
            // Supabase 已成功載入，跳過 API 載入
            return;
        }
        
        await loadPropertiesFromAPI();
        
        // 觸發重新渲染（減少延遲）
        setTimeout(() => {
            refreshPaginationSystem();
        }, 50); // 減少到 50ms
        
        // 觸發自定義事件，通知其他模組資料已載入
        window.dispatchEvent(new CustomEvent('apiDataLoaded', { 
            detail: { properties: embeddedPropertiesData.properties } 
        }));
    });
} else {
    // DOM 已經載入完成
    // 🚀 檢查是否已有 Supabase 資料
    if (typeof embeddedPropertiesData !== 'undefined' && 
        embeddedPropertiesData.properties && 
        embeddedPropertiesData.properties.length > 0) {
        // Supabase 已成功載入，跳過 API 載入
        return;
    }
    
    loadPropertiesFromAPI().then(() => {
        setTimeout(() => {
            refreshPaginationSystem();
        }, 50); // 減少到 50ms
        
        window.dispatchEvent(new CustomEvent('apiDataLoaded', { 
            detail: { properties: embeddedPropertiesData.properties } 
        }));
    });
}

// 暴露刷新函數供手動調用
window.refreshPaginationSystem = refreshPaginationSystem;
