/**
 * 首頁初始化 - 從 index.html 抽出，便於維護
 * 含：收合/展開、已售分頁、相關連結載入、開發除錯
 */
function toggleCollapsible(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    
    const isCollapsed = section.classList.contains('collapsed');
    
    if (isCollapsed) {
        section.classList.remove('collapsed');
        // 保存展開狀態
        localStorage.setItem(`collapsible_${sectionId}`, 'expanded');
    } else {
        section.classList.add('collapsed');
        // 保存收合狀態
        localStorage.setItem(`collapsible_${sectionId}`, 'collapsed');
    }
}
// 確保 onclick="toggleCollapsible('filter-section')" 能正確找到函式
window.toggleCollapsible = toggleCollapsible;

// 載入保存的收合狀態（預設為展開）
function loadCollapsibleStates() {
    const section = document.getElementById('filter-section');
    if (!section) return;
    
    // 確保預設是展開狀態（移除可能存在的 collapsed class）
    section.classList.remove('collapsed');
    
    // 只有在用戶明確保存了收合狀態時才收合
    const savedState = localStorage.getItem('collapsible_filter-section');
    if (savedState === 'collapsed') {
        section.classList.add('collapsed');
    }
}

// ✅ 模組化版本初始化
// 注意：主要初始化邏輯在 main-script.js 中，這裡只處理已售物件分頁系統
let soldPaginationSystem;

// 頁面載入完成後初始化已售物件分頁系統
document.addEventListener('DOMContentLoaded', function() {
    // 綁定「搜尋與篩選」收合按鈕（改用 addEventListener，不依賴 onclick 的全域）
    var filterHeader = document.querySelector('#filter-section .collapsible-header');
    if (filterHeader) {
        filterHeader.addEventListener('click', function() { toggleCollapsible('filter-section'); });
    }
    // 載入收合/展開狀態
    loadCollapsibleStates();
    
    // 等待資料載入完成後再初始化已售物件分頁系統
    window.addEventListener('supabaseDataLoaded', function() {
        console.log('📦 Supabase 資料已載入，初始化已售物件分頁系統');
        if (typeof SoldPropertyPaginationSystem !== 'undefined' && !soldPaginationSystem) {
            soldPaginationSystem = new SoldPropertyPaginationSystem();
        }
    });
    
    window.addEventListener('apiDataLoaded', function() {
        console.log('📦 API 資料已載入，初始化已售物件分頁系統');
        if (typeof SoldPropertyPaginationSystem !== 'undefined' && !soldPaginationSystem) {
            soldPaginationSystem = new SoldPropertyPaginationSystem();
        }
    });
    
    // 🚀 性能優化：減少最終檢查延遲時間
    setTimeout(() => {
        if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            if (!soldPaginationSystem && typeof SoldPropertyPaginationSystem !== 'undefined') {
                soldPaginationSystem = new SoldPropertyPaginationSystem();
            }
        }
    }, 1500); // 從 3000ms 減少到 1500ms
    
    // 載入相關連結（從後端 API，使用與備份檔案一致的樣式）
    // 🔥 防止重複載入：使用全域標記
    if (!window.relatedLinksLoading) {
        window.relatedLinksLoading = true;
        
        function loadRelatedLinksOnPage() {
            // 🔇 移除初始化訊息
            const maxRetries = 40; // 增加重試次數，但減少間隔
            let retries = 0;
            let hasLoaded = false;
            let tryLoadTimer = null;
            
            function tryLoad() {
                // 如果已經載入成功，不再重試
                if (hasLoaded) {
                    if (tryLoadTimer) clearTimeout(tryLoadTimer);
                    return;
                }
                
                // 檢查新模組是否已載入
                const hasModule = typeof window.RelatedLinksFrontend !== 'undefined' && 
                                 typeof window.RelatedLinksFrontend.renderRelatedLinks === 'function';
                
                if (hasModule) {
                    // 🔇 移除載入訊息
                    window.RelatedLinksFrontend.renderRelatedLinks('related-links-container')
                        .then(() => {
                            hasLoaded = true;
                            if (tryLoadTimer) clearTimeout(tryLoadTimer);
                            // 🔇 移除完成訊息
                        })
                        .catch(error => {
                            console.error('❌ 載入相關連結失敗:', error);
                            const container = document.getElementById('related-links-container');
                            if (container) {
                                container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 1rem;">載入連結失敗</p>';
                            }
                        });
                } else if (retries < maxRetries) {
                    retries++;
                    // 🚀 性能優化：減少檢查間隔到 200ms
                    tryLoadTimer = setTimeout(tryLoad, 200);
                } else {
                    console.error('❌ 載入相關連結超時');
                    const container = document.getElementById('related-links-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="text-align: center; color: #dc3545; padding: 1rem;">
                                <p>載入連結失敗，請重新整理頁面</p>
                                <button onclick="location.reload()" style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">重新整理</button>
                            </div>
                        `;
                    }
                }
            }
            
            // 監聽自定義事件（優先使用，只執行一次）
            let eventHandled = false;
            window.addEventListener('relatedLinksFrontendReady', function handler() {
                if (eventHandled) return;
                eventHandled = true;
                // 🔇 移除事件訊息
                window.removeEventListener('relatedLinksFrontendReady', handler);
                if (!hasLoaded) {
                    // 🚀 立即執行，不延遲
                    tryLoad();
                }
            }, { once: true });
            
            // 🚀 立即檢查一次（不延遲）
            tryLoad();
        }
        
        loadRelatedLinksOnPage();
    } else {
        console.log('⏭️ 相關連結載入器已在執行中，跳過重複初始化');
    }
});

// 🔍 開發模式調試（生產環境可移除）
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('✅ 模組化版本已載入');
    setTimeout(() => {
        console.log('🔍 模組載入狀態：');
        console.log('- embeddedPropertiesData:', typeof embeddedPropertiesData !== 'undefined' ? '✅' : '❌');
        console.log('- EmbeddedPropertyPaginationSystem:', typeof EmbeddedPropertyPaginationSystem !== 'undefined' ? '✅' : '❌');
        console.log('- SoldPropertyPaginationSystem:', typeof SoldPropertyPaginationSystem !== 'undefined' ? '✅' : '❌');
        console.log('- window.paginationSystem:', typeof window.paginationSystem !== 'undefined' ? '✅' : '❌');
        
        // 🔥 如果分頁系統未初始化，嘗試強制初始化（僅在開發模式）
        // 注意：生產環境應該由 main-script.js 的事件監聽器處理
        if (typeof window.paginationSystem === 'undefined' && typeof EmbeddedPropertyPaginationSystem !== 'undefined' && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            // 🔥 檢查是否已經有 embeddedPaginationSystem（避免重複初始化）
            if (typeof embeddedPaginationSystem === 'undefined') {
                console.log('🔧 檢測到分頁系統未初始化，嘗試強制初始化（開發模式）...');
                window.embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
                window.paginationSystem = window.embeddedPaginationSystem;
                console.log('✅ 分頁系統已強制初始化');
            } else {
                window.paginationSystem = embeddedPaginationSystem;
                console.log('✅ 使用現有的 embeddedPaginationSystem');
            }
        }
    }, 2000);
}
