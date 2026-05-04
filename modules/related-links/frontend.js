// ============================================
// 相關連結前端顯示模組
// ============================================
// 負責在前端頁面載入和顯示相關連結
// 首頁由此模組直接查詢 Supabase（與 server.js /api/related-links 資料同源，快取各自獨立）

(function() {
    'use strict';
    
    // 初始化 Supabase 客戶端（單例模式，避免多個實例）
    function initSupabaseClient() {
        if (typeof supabase === 'undefined') {
            console.error('❌ Supabase SDK 未載入');
            return null;
        }
        
        // 檢查是否已經有全域的 Supabase 客戶端
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            console.log('🔄 使用現有的 Supabase 客戶端（避免多個實例）');
            return window.supabaseClient;
        }
        
        // 優先使用統一配置函數
        let client = null;
        if (typeof createSupabaseClient === 'function') {
            client = createSupabaseClient();
        } else if (typeof SUPABASE_CONFIG !== 'undefined') {
            client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
        } else {
            console.error('❌ Supabase 配置未載入，請確認 supabase-config.js 已載入');
            return null;
        }
        
        // 儲存到全域，供其他模組使用
        window.supabaseClient = client;
        console.log('✅ 創建新的 Supabase 客戶端（單例模式）');
        return client;
    }
    
    // 客戶端快取鍵（與 js/lib/client-cache.js、js/lib/query-client.js 搭配）
    const CACHE_KEY_RELATED_LINKS = 'related-links:list';
    var RELATED_LINKS_STALE_MS = 5 * 60 * 1000;
    var RELATED_LINKS_GC_MS = 10 * 60 * 1000;
    var HIDDEN_RELATED_LINK_TITLES = ['tiktok短影音', '預售團購區'];

    function isHiddenRelatedLink(link) {
        var normalizedTitle = String((link && link.title) || '').replace(/\s+/g, '').toLowerCase();
        return HIDDEN_RELATED_LINK_TITLES.indexOf(normalizedTitle) !== -1;
    }

    function getVisibleRelatedLinks(links) {
        if (!Array.isArray(links)) return [];
        return links.filter(function(link) {
            return link && link.is_active !== false && !isHiddenRelatedLink(link);
        });
    }

    // 純 fetcher：從 Supabase 取得連結列表（供 DataQuery 使用）
    async function fetchRelatedLinksFromSupabase() {
        var client = initSupabaseClient();
        if (!client) throw new Error('無法初始化 Supabase 客戶端');
        var res = await client.from('related_links').select('*').eq('is_active', true).order('display_order', { ascending: true });
        if (res.error) throw res.error;
        var links = res.data || [];
        var items = [];
        if (links.length > 0) {
            var r = await client.from('related_link_items').select('*').eq('is_active', true).order('display_order', { ascending: true });
            if (!r.error && r.data) items = r.data;
        }
        var itemsByParent = {};
        items.forEach(function(item) {
            if (!itemsByParent[item.parent_link_id]) itemsByParent[item.parent_link_id] = [];
            itemsByParent[item.parent_link_id].push(item);
        });
        return getVisibleRelatedLinks(links.map(function(link) {
            return Object.assign({}, link, { items: itemsByParent[link.id] || [] });
        }));
    }

    // 載入相關連結（優先使用 DataQuery / 客戶端快取，再從 Supabase 載入；支援 refetchOnWindowFocus）
    async function loadRelatedLinks() {
        try {
            if (typeof window.DataQuery !== 'undefined') {
                var data = await window.DataQuery.fetchQuery(CACHE_KEY_RELATED_LINKS, fetchRelatedLinksFromSupabase, {
                    staleTime: RELATED_LINKS_STALE_MS,
                    gcTime: RELATED_LINKS_GC_MS,
                    refetchOnWindowFocus: true,
                    refetchOnReconnect: true
                });
                if (data && data.length >= 0) {
                    if (data.length === 0 && typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                        return getVisibleRelatedLinks(DEFAULT_RELATED_LINKS);
                    }
                    return getVisibleRelatedLinks(data);
                }
            }
            if (typeof window.ClientCache !== 'undefined') {
                var cached = window.ClientCache.get(CACHE_KEY_RELATED_LINKS);
                if (cached && Array.isArray(cached) && cached.length >= 0) {
                    return getVisibleRelatedLinks(cached);
                }
            }

            const client = initSupabaseClient();
            if (!client) {
                throw new Error('無法初始化 Supabase 客戶端');
            }
            
            console.log('🔄 正在從 Supabase 載入相關連結...');
            
            // 從 Supabase 載入啟用的連結
            const { data: links, error: linksError } = await client
                .from('related_links')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            
            if (linksError) {
                console.warn('⚠️ Supabase 查詢失敗:', linksError);
                throw linksError;
            }
            
            // 載入下拉選單項目
            let items = [];
            if (links && links.length > 0) {
                const { data: itemsData, error: itemsError } = await client
                    .from('related_link_items')
                    .select('*')
                    .eq('is_active', true)
                    .order('display_order', { ascending: true });
                
                if (!itemsError && itemsData) {
                    items = itemsData;
                }
            }
            
            // 將項目分組到對應的連結
            const itemsByParent = {};
            items.forEach(item => {
                if (!itemsByParent[item.parent_link_id]) {
                    itemsByParent[item.parent_link_id] = [];
                }
                itemsByParent[item.parent_link_id].push(item);
            });
            
            // 組合連結和項目
            const result = getVisibleRelatedLinks((links || []).map(link => ({
                ...link,
                items: itemsByParent[link.id] || []
            })));

            if (typeof window.DataQuery !== 'undefined') {
                window.DataQuery.setQueryData(CACHE_KEY_RELATED_LINKS, result, { staleTime: RELATED_LINKS_STALE_MS, gcTime: RELATED_LINKS_GC_MS });
            }
            if (typeof window.ClientCache !== 'undefined') {
                window.ClientCache.set(CACHE_KEY_RELATED_LINKS, result);
            }
            
            if (result.length > 0) {
                console.log(`✅ 成功從 Supabase 載入 ${result.length} 個連結（後台儲存的資料）`);
                return result;
            } else {
                // 這是正常的，如果 Supabase 中沒有連結，會使用後端 API 的資料
                console.log('ℹ️ Supabase 中沒有啟用的連結，將嘗試從後端 API 載入');
                if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                    return getVisibleRelatedLinks(DEFAULT_RELATED_LINKS);
                }
                return [];
            }
        } catch (error) {
            console.error('❌ 從 Supabase 載入連結失敗:', error);
            console.warn('⚠️ 使用預設資料作為備用');
            
            // 如果 Supabase 失敗，使用預設資料
            if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                console.log('📋 使用預設連結資料');
                return getVisibleRelatedLinks(DEFAULT_RELATED_LINKS);
            }
            console.warn('⚠️ 沒有預設資料可用');
            return [];
        }
    }
    
    var _lastRelatedLinksContainerId = null;

    // 渲染相關連結到容器
    async function renderRelatedLinks(containerId) {
        if (containerId) _lastRelatedLinksContainerId = containerId;
        // 等待 DOM 完全載入
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                if (document.readyState === 'loading') {
                    document.addEventListener('DOMContentLoaded', resolve);
                } else {
                    resolve();
                }
            });
        }
        
        const container = document.getElementById(containerId);
        if (!container) {
            console.error(`❌ 找不到容器: ${containerId}，請確認 HTML 中有此 ID 的元素`);
            // 嘗試延遲再找一次
            setTimeout(() => {
                const retryContainer = document.getElementById(containerId);
                if (retryContainer) {
                    console.log(`✅ 延遲後找到容器: ${containerId}`);
                    renderRelatedLinks(containerId);
                } else {
                    console.error(`❌ 延遲後仍找不到容器: ${containerId}`);
                }
            }, 500);
            return;
        }
        
        console.log(`🔄 開始載入相關連結到容器: ${containerId}`);
        container.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem; width: 100%;">載入中...</p>';
        
        try {
            const links = await loadRelatedLinks();
            console.log(`📋 從後端 API 載入到 ${links.length} 個連結（後台儲存的資料），準備渲染到 ${containerId}`);
            
            if (!links || links.length === 0) {
                console.log('ℹ️ 目前沒有相關連結資料');
                container.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem; width: 100%;">目前沒有相關連結</p>';
                return;
            }
            
            console.log('✅ 準備渲染連結，來源：後端 API（後台儲存的資料）');
        
            let html = '';
        
            links.forEach((link, linkIndex) => {
                if (link.link_type === 'dropdown') {
                    // 下拉選單類型 - 使用 propertyInfoDropdown 和 propertyInfoMenu（與備份檔案一致）
                    // 為每個下拉選單使用唯一的 ID（如果有多個）
                    const dropdownId = linkIndex === 0 ? 'propertyInfoDropdown' : `propertyInfoDropdown-${link.id}`;
                    const menuId = linkIndex === 0 ? 'propertyInfoMenu' : `propertyInfoMenu-${link.id}`;
                    html += `
                        <div style="position: relative; display: inline-block;">
                            <button id="${dropdownId}" onclick="RelatedLinksFrontend.togglePropertyInfoMenu('${menuId}')"
                                    style="background: ${link.color_gradient || 'linear-gradient(45deg, #667eea, #764ba2)'}; 
                                           color: white; 
                                           padding: 0.6rem 1.2rem; 
                                           border-radius: 20px; 
                                           border: none; 
                                           font-weight: bold; 
                                           display: inline-flex; 
                                           align-items: center; 
                                           gap: 0.4rem; 
                                           transition: all 0.3s ease; 
                                           box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3); 
                                           min-width: 180px; 
                                           text-align: center; 
                                           justify-content: center; 
                                           font-size: 0.9rem; 
                                           cursor: pointer;"
                                    onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(102, 126, 234, 0.4)'"
                                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(102, 126, 234, 0.3)'">
                                ${link.icon || ''} ${escapeHtml(link.title)} <span style="font-size: 0.8rem;">▼</span>
                            </button>
                            <div id="${menuId}" style="position: absolute; top: 100%; left: 0; background: white; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); min-width: 250px; z-index: 1000; display: none; margin-top: 0.5rem; overflow: hidden;">
                                ${(link.items || []).map((item, index) => {
                                    // 根據標題自動添加圖示（與備份檔案一致）
                                    let icon = '';
                                    if (item.title.includes('趨勢') || item.title.includes('引擊')) {
                                        icon = '📈 ';
                                    } else if (item.title.includes('青安') || item.title.includes('政策')) {
                                        icon = '🏦 ';
                                    } else if (item.title.includes('分析')) {
                                        icon = '📊 ';
                                    }
                                    
                                    return `
                                    <a href="${escapeHtml(item.url)}" target="_blank" 
                                       style="display: block; padding: 0.8rem 1rem; color: #2c3e50; text-decoration: none; ${index < (link.items.length - 1) ? 'border-bottom: 1px solid #f0f0f0;' : ''} transition: all 0.3s ease; font-size: 0.9rem;"
                                       onmouseover="this.style.background='linear-gradient(135deg, #667eea, #764ba2)'; this.style.color='white'; this.style.transform='translateX(5px)'"
                                       onmouseout="this.style.background='white'; this.style.color='#2c3e50'; this.style.transform='translateX(0)'">
                                        ${icon}${escapeHtml(item.title)}
                                    </a>
                                `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    // 按鈕類型 - 使用 contact-button class（與備份檔案一致）
                    // 根據不同的漸層色計算對應的陰影顏色
                    let shadowColor = 'rgba(102, 126, 234, 0.3)'; // 預設
                    if (link.color_gradient) {
                        // 根據常見的漸層色設定對應的陰影
                        if (link.color_gradient.includes('#2ecc71') || link.color_gradient.includes('#27ae60')) {
                            shadowColor = 'rgba(46, 204, 113, 0.3)'; // 綠色
                        } else if (link.color_gradient.includes('#000000') || link.color_gradient.includes('#333333')) {
                            shadowColor = 'rgba(0, 0, 0, 0.3)'; // 黑色
                        } else if (link.color_gradient.includes('#ff6b6b') || link.color_gradient.includes('#ee5a24')) {
                            shadowColor = 'rgba(255, 107, 107, 0.3)'; // 紅色
                        } else if (link.color_gradient.includes('#9b59b6') || link.color_gradient.includes('#8e44ad')) {
                            shadowColor = 'rgba(155, 89, 182, 0.3)'; // 紫色
                        } else if (link.color_gradient.includes('#f9a825') || link.color_gradient.includes('#ff9800')) {
                            shadowColor = 'rgba(255, 152, 0, 0.3)'; // 橙色
                        }
                    }
                    
                    html += `
                        <a href="${escapeHtml(link.url)}" class="contact-button" target="_blank" 
                           style="background: ${link.color_gradient || 'linear-gradient(45deg, #667eea, #764ba2)'}; 
                                  color: white; 
                                  padding: 0.6rem 1.2rem; 
                                  border-radius: 20px; 
                                  text-decoration: none; 
                                  font-weight: bold; 
                                  display: inline-flex; 
                                  align-items: center; 
                                  gap: 0.4rem; 
                                  transition: all 0.3s ease; 
                                  box-shadow: 0 3px 12px ${shadowColor}; 
                                  min-width: 180px; 
                                  text-align: center; 
                                  justify-content: center; 
                                  font-size: 0.9rem;"
                           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px ${shadowColor.replace('0.3', '0.4')}'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px ${shadowColor}'">
                            ${link.icon || ''} ${escapeHtml(link.title)}
                        </a>
                    `;
                }
            });
        
            container.innerHTML = html;
            console.log(`✅ 相關連結已成功渲染到 ${containerId}，共 ${links.length} 個連結`);
        } catch (error) {
            console.error(`❌ 渲染相關連結時發生錯誤 (${containerId}):`, error);
            container.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: #dc3545;">
                    <p>載入連結時發生錯誤</p>
                    <small>${escapeHtml(error.message || '未知錯誤')}</small>
                </div>
            `;
        }
    }
    
    // HTML 轉義函數
    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }
    
    // 切換下拉選單顯示/隱藏（與備份檔案一致）
    function togglePropertyInfoMenu(menuId) {
        const menu = document.getElementById(menuId || 'propertyInfoMenu');
        if (menu) {
            const isHidden = menu.style.display === 'none' || menu.style.display === '';
            menu.style.display = isHidden ? 'block' : 'none';
            
            // 關閉其他下拉選單（如果有多個）
            document.querySelectorAll('[id^="propertyInfoMenu"]').forEach(otherMenu => {
                if (otherMenu.id !== menuId) {
                    otherMenu.style.display = 'none';
                }
            });
        }
    }
    
    // 點擊外部關閉所有下拉選單
    document.addEventListener('click', function(event) {
        // 檢查是否點擊在下拉選單按鈕或選單內部
        const clickedDropdown = event.target.closest('[id^="propertyInfoDropdown"]');
        const clickedMenu = event.target.closest('[id^="propertyInfoMenu"]');
        
        if (!clickedDropdown && !clickedMenu) {
            // 如果點擊外部，關閉所有下拉選單
            document.querySelectorAll('[id^="propertyInfoMenu"]').forEach(menu => {
                menu.style.display = 'none';
            });
        }
    });
    
    // 暴露 API
    window.RelatedLinksFrontend = {
        loadRelatedLinks,
        renderRelatedLinks,
        togglePropertyInfoMenu
    };
    
    if (typeof window.addEventListener !== 'undefined') {
        window.addEventListener('dataQueryUpdated', function(e) {
            if (e.detail && e.detail.queryKey === CACHE_KEY_RELATED_LINKS && _lastRelatedLinksContainerId) {
                renderRelatedLinks(_lastRelatedLinksContainerId);
            }
        });
    }

    // 觸發準備就緒事件
    if (typeof window.dispatchEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('relatedLinksFrontendReady'));
    }
    
    console.log('✅ 相關連結前端顯示模組已載入');
})();
