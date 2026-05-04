// ============================================
// 相關連結後台管理模組
// ============================================
// 負責後台管理系統中的相關連結 CRUD 操作

(function() {
    'use strict';
    
    // 確保配置已載入
    if (typeof SUPABASE_CONFIG === 'undefined') {
        console.error('❌ SUPABASE_CONFIG 未載入，請先載入 supabase-config.js');
        return;
    }
    
    let supabaseClient = null;
    let editingLinkId = null;
    let linkItems = [];
    
    // 初始化 Supabase 客戶端（使用單例模式，避免多個實例）
    function initClient() {
        if (!supabaseClient) {
            // 檢查是否已經有全域的 Supabase 客戶端
            if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
                console.log('🔄 使用現有的 Supabase 客戶端（避免多個實例）');
                supabaseClient = window.supabaseClient;
            } else {
                supabaseClient = createSupabaseClient({
                    global: { headers: { 'x-client-info': 'admin-dashboard-links' } }
                });
                // 儲存到全域，供其他模組使用
                window.supabaseClient = supabaseClient;
            }
        }
        return supabaseClient;
    }
    
    // 載入連結列表
    async function loadRelatedLinks() {
        const listContainer = document.getElementById('links-list');
        if (!listContainer) return;
        
        try {
            listContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">載入中...</p>';
            
            const client = initClient();
            if (!client) {
                throw new Error('無法初始化 Supabase 客戶端');
            }
            
            console.log('🔄 開始從 Supabase 載入連結列表...');
            let links = null;
            let linksError = null;
            
            // 優先嘗試使用 REST API（更可靠）
            try {
                console.log('🔄 嘗試使用 REST API 查詢...');
                const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/related_links?select=*&order=display_order.asc`, {
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
                
                if (response.ok) {
                    links = await response.json();
                    console.log('✅ 使用 REST API 查詢成功，載入到', links.length, '個連結');
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ REST API 查詢失敗:', response.status, errorText);
                    linksError = new Error(`REST API 錯誤: ${response.status}`);
                }
            } catch (fetchError) {
                console.warn('⚠️ REST API 查詢失敗:', fetchError);
                linksError = fetchError;
            }
            
            // 如果 REST API 失敗，嘗試使用 Supabase SDK
            if (!links || links.length === 0) {
                console.log('🔄 嘗試使用 Supabase SDK 查詢...');
                const { data: sdkLinks, error: sdkError } = await client
                    .from('related_links')
                    .select('*')
                    .order('display_order', { ascending: true });
                
                if (!sdkError && sdkLinks && sdkLinks.length > 0) {
                    links = sdkLinks;
                    linksError = null;
                    console.log('✅ 使用 Supabase SDK 查詢成功，載入到', links.length, '個連結');
                } else if (sdkError) {
                    console.warn('⚠️ Supabase SDK 查詢也失敗:', sdkError);
                    if (!linksError) {
                        linksError = sdkError;
                    }
                }
            }
            
            // 如果還是沒有資料，使用預設資料
            if (!links || links.length === 0) {
                console.warn('⚠️ 無法從 Supabase 載入連結，使用預設資料');
                if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                    links = DEFAULT_RELATED_LINKS.map(link => ({ ...link }));
                    console.log('✅ 使用預設資料，共', links.length, '個連結');
                } else {
                    links = [];
                }
                linksError = null;
            }
            
            console.log('📋 成功載入', links.length, '個連結');
            
            // 載入下拉選單項目（使用 REST API）
            let items = [];
            if (links && links.length > 0) {
                try {
                    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/related_link_items?select=*&order=display_order.asc`, {
                        headers: {
                            'apikey': SUPABASE_CONFIG.anonKey,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        items = await response.json();
                        console.log('✅ 使用 REST API 載入到', items.length, '個下拉選單項目');
                    } else {
                        // 如果 REST API 失敗，嘗試使用 SDK
                        const { data: itemsData, error: itemsError } = await client
                            .from('related_link_items')
                            .select('*')
                            .order('display_order', { ascending: true });
                        
                        if (!itemsError && itemsData) {
                            items = itemsData;
                            console.log('✅ 使用 SDK 載入到', items.length, '個下拉選單項目');
                        }
                    }
                } catch (fetchError) {
                    console.warn('⚠️ REST API 載入下拉選單項目失敗，嘗試使用 SDK...', fetchError);
                    // 嘗試使用 SDK
                    const { data: itemsData, error: itemsError } = await client
                        .from('related_link_items')
                        .select('*')
                        .order('display_order', { ascending: true });
                    
                    if (!itemsError && itemsData) {
                        items = itemsData;
                    } else if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                        // 如果查詢失敗，從預設資料中提取項目
                        const defaultLink = DEFAULT_RELATED_LINKS.find(l => l.link_type === 'dropdown');
                        if (defaultLink && defaultLink.items) {
                            items = defaultLink.items;
                        }
                    }
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
            
            // 渲染連結列表
            renderLinksList(links, itemsByParent);
            
        } catch (error) {
            console.error('❌ 載入連結失敗:', error);
            listContainer.innerHTML = `
                <div class="alert alert-error">
                    <strong>載入失敗：</strong>${escapeHtml(error.message || '未知錯誤')}
                    <div style="margin-top: 1rem;">
                        <button class="btn btn-primary" onclick="RelatedLinksBackend.loadRelatedLinks()">
                            🔄 重新載入
                        </button>
                    </div>
                </div>
            `;
        }
    }
    
    // 渲染連結列表
    function renderLinksList(links, itemsByParent) {
        const listContainer = document.getElementById('links-list');
        if (!listContainer) return;
        
        if (links.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <p style="margin-bottom: 1rem;">目前沒有相關連結</p>
                    <button class="btn btn-primary" onclick="RelatedLinksBackend.showAddLinkModal()">
                        ➕ 新增第一個連結
                    </button>
                </div>
            `;
            return;
        }
        
        // 檢測是否為手機版
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            // 手機版：使用網格卡片佈局
            listContainer.innerHTML = `
                <div class="links-grid-mobile">
                    ${links.map(link => {
                        const safeTitle = escapeHtml(link.title);
                        const safeUrl = escapeHtml(link.url);
                        const safeId = escapeHtml(link.id);
                        const itemsCount = link.link_type === 'dropdown' && itemsByParent[link.id] ? itemsByParent[link.id].length : 0;
                        const urlDisplay = safeUrl.length > 40 ? safeUrl.substring(0, 40) + '...' : safeUrl;
                        
                        return `
                            <div class="link-card-mobile">
                                <div class="link-card-mobile-header">
                                    <div class="link-card-mobile-order">#${link.display_order || 0}</div>
                                    <div class="link-card-mobile-title">
                                        <span style="font-size: 1.2rem; margin-right: 0.5rem;">${link.icon || ''}</span>
                                        <span>${safeTitle}</span>
                                    </div>
                                </div>
                                <div class="link-card-mobile-content">
                                    <div class="link-card-mobile-item">
                                        <span class="link-card-mobile-label">網址：</span>
                                        <a href="${safeUrl}" target="_blank" class="link-card-mobile-url" title="${safeUrl}">
                                            ${urlDisplay}
                                        </a>
                                    </div>
                                    <div class="link-card-mobile-item">
                                        <span class="link-card-mobile-label">類型：</span>
                                        <span class="badge ${link.link_type === 'dropdown' ? 'badge-warning' : 'badge-success'}">
                                            ${link.link_type === 'dropdown' ? '下拉選單' : '按鈕'}
                                        </span>
                                        ${itemsCount > 0 ? `<span style="color: #666; font-size: 0.85rem; margin-left: 0.5rem;">(${itemsCount} 個項目)</span>` : ''}
                                    </div>
                                    <div class="link-card-mobile-item">
                                        <span class="link-card-mobile-label">狀態：</span>
                                        <span class="badge ${link.is_active ? 'badge-success' : 'badge-danger'}">
                                            ${link.is_active ? '啟用' : '停用'}
                                        </span>
                                    </div>
                                </div>
                                <div class="link-card-mobile-actions">
                                    <button class="btn btn-primary btn-small" onclick="RelatedLinksBackend.editLink('${safeId}')" style="flex: 1;">
                                        ✏️ 編輯
                                    </button>
                                    <button class="btn btn-danger btn-small" onclick="RelatedLinksBackend.deleteLink('${safeId}')" style="flex: 1;">
                                        🗑️ 刪除
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            // 桌面版：使用表格佈局
            listContainer.innerHTML = `
                <table class="table">
                    <thead>
                        <tr>
                            <th style="width: 50px;">順序</th>
                            <th>標題</th>
                            <th>網址</th>
                            <th>類型</th>
                            <th>狀態</th>
                            <th style="width: 200px;">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${links.map(link => `
                            <tr>
                                <td>${link.display_order || 0}</td>
                                <td>
                                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                                        <span style="font-size: 1.2rem;">${link.icon || ''}</span>
                                        <span>${escapeHtml(link.title)}</span>
                                    </div>
                                </td>
                                <td>
                                    <a href="${escapeHtml(link.url)}" target="_blank" style="color: #667eea; text-decoration: none; max-width: 300px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                        ${escapeHtml(link.url)}
                                    </a>
                                </td>
                                <td>
                                    <span class="badge ${link.link_type === 'dropdown' ? 'badge-warning' : 'badge-success'}">
                                        ${link.link_type === 'dropdown' ? '下拉選單' : '按鈕'}
                                    </span>
                                    ${link.link_type === 'dropdown' && itemsByParent[link.id] ? 
                                        `(${itemsByParent[link.id].length} 個項目)` : ''}
                                </td>
                                <td>
                                    <span class="badge ${link.is_active ? 'badge-success' : 'badge-secondary'}">
                                        ${link.is_active ? '啟用' : '停用'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn btn-primary btn-small" onclick="RelatedLinksBackend.editLink('${link.id}')">
                                            ✏️ 編輯
                                        </button>
                                        <button class="btn btn-danger btn-small" onclick="RelatedLinksBackend.deleteLink('${link.id}')">
                                            🗑️ 刪除
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
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
    
    // 顯示提示訊息
    function showAlert(type, message) {
        const container = document.getElementById('links-alert-container');
        if (!container) {
            if (typeof showAlert === 'function') {
                showAlert(type, message);
            }
            return;
        }
        
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'error' ? 'alert-error' : 'alert-info';
        
        container.innerHTML = `<div class="alert ${alertClass}">${escapeHtml(message)}</div>`;
        
        setTimeout(() => {
            container.innerHTML = '';
        }, 3000);
    }
    
    // 顯示新增連結彈窗
    function showAddLinkModal() {
        editingLinkId = null;
        linkItems = [];
        document.getElementById('link-modal-title').textContent = '新增連結';
        document.getElementById('link-title').value = '';
        document.getElementById('link-url').value = '';
        document.getElementById('link-icon').value = '';
        document.getElementById('link-color').value = 'linear-gradient(45deg, #667eea, #764ba2)';
        document.getElementById('link-order').value = '0';
        document.getElementById('link-active').checked = true;
        document.getElementById('link-type').value = 'button';
        document.getElementById('link-items-container').style.display = 'none';
        document.getElementById('link-items-list').innerHTML = '';
        document.getElementById('link-modal').style.display = 'flex';
    }
    
    // 編輯連結（可以更換網址與標題）
    async function editLink(linkId) {
        try {
            console.log('🔄 開始編輯連結，ID:', linkId);
            
            const client = initClient();
            if (!client) {
                throw new Error('無法初始化 Supabase 客戶端');
            }
            
            // 載入連結資料（使用多層備用機制）
            console.log('🔄 正在從 Supabase 載入連結資料，ID:', linkId);
            let link = null;
            let linkError = null;
            
            // 優先嘗試使用 REST API（更可靠）
            try {
                console.log('🔄 嘗試使用 REST API 查詢單一連結...');
                const encodedId = encodeURIComponent(linkId);
                const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/related_links?select=*&id=eq.${encodedId}`, {
                    headers: {
                        'apikey': SUPABASE_CONFIG.anonKey,
                        'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
                
                if (response.ok) {
                    const linksArray = await response.json();
                    if (linksArray && linksArray.length > 0) {
                        link = linksArray[0];
                        console.log('✅ 使用 REST API 查詢成功，找到連結:', link.title);
                    } else {
                        console.warn('⚠️ REST API 返回空陣列');
                    }
                } else {
                    const errorText = await response.text();
                    console.warn('⚠️ REST API 查詢失敗:', response.status, errorText);
                    linkError = new Error(`REST API 錯誤: ${response.status}`);
                }
            } catch (fetchError) {
                console.warn('⚠️ REST API 查詢失敗:', fetchError);
                linkError = fetchError;
            }
            
            // 如果 REST API 失敗，嘗試使用 Supabase SDK
            if (!link) {
                console.log('🔄 嘗試使用 Supabase SDK 查詢...');
                const { data: sdkLink, error: sdkError } = await client
                    .from('related_links')
                    .select('*')
                    .eq('id', linkId)
                    .maybeSingle(); // 使用 maybeSingle 而不是 single，避免 406 錯誤
                
                if (!sdkError && sdkLink) {
                    link = sdkLink;
                    linkError = null;
                    console.log('✅ 使用 Supabase SDK 查詢成功，找到連結:', link.title);
                } else if (sdkError) {
                    console.warn('⚠️ Supabase SDK 查詢失敗:', sdkError);
                    if (!linkError) {
                        linkError = sdkError;
                    }
                }
            }
            
            // 如果還是找不到，嘗試查詢所有連結並過濾
            if (!link) {
                console.log('🔄 嘗試查詢所有連結並過濾...');
                try {
                    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/related_links?select=*`, {
                        headers: {
                            'apikey': SUPABASE_CONFIG.anonKey,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        const allLinks = await response.json();
                        const foundLink = allLinks.find(l => l.id === linkId);
                        if (foundLink) {
                            link = foundLink;
                            linkError = null;
                            console.log('✅ 從所有連結中找到目標連結:', link.title);
                        }
                    }
                } catch (fetchError) {
                    console.warn('⚠️ 查詢所有連結也失敗:', fetchError);
                }
            }
            
            if (!link) {
                throw new Error(`找不到指定的連結（ID: ${linkId}）`);
            }
            
            editingLinkId = linkId;
            
            // 填充表單（重點：標題和網址可以編輯）
            const modalTitle = document.getElementById('link-modal-title');
            const titleInput = document.getElementById('link-title');
            const urlInput = document.getElementById('link-url');
            const iconInput = document.getElementById('link-icon');
            const colorInput = document.getElementById('link-color');
            const orderInput = document.getElementById('link-order');
            const activeCheckbox = document.getElementById('link-active');
            const typeSelect = document.getElementById('link-type');
            
            if (!titleInput || !urlInput || !iconInput || !colorInput || !orderInput || !activeCheckbox || !typeSelect || !modalTitle) {
                throw new Error('找不到必要的表單元素，請重新整理頁面');
            }
            
            modalTitle.textContent = '編輯連結';
            // 標題和網址可以自由編輯
            titleInput.value = link.title || '';
            titleInput.disabled = false; // 確保可以編輯
            urlInput.value = link.url || '';
            urlInput.disabled = false; // 確保可以編輯
            iconInput.value = link.icon || '';
            colorInput.value = link.color_gradient || 'linear-gradient(45deg, #667eea, #764ba2)';
            orderInput.value = link.display_order || 0;
            activeCheckbox.checked = link.is_active !== false;
            typeSelect.value = link.link_type || 'button';
            
            // 如果是下拉選單，載入子項目（使用 REST API）
            if (link.link_type === 'dropdown') {
                let items = [];
                try {
                    const encodedLinkId = encodeURIComponent(linkId);
                    const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/related_link_items?select=*&parent_link_id=eq.${encodedLinkId}&order=display_order.asc`, {
                        headers: {
                            'apikey': SUPABASE_CONFIG.anonKey,
                            'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        items = await response.json();
                        console.log('✅ 使用 REST API 載入到', items.length, '個子項目');
                    } else {
                        // 如果 REST API 失敗，嘗試使用 SDK
                        const { data: itemsData, error: itemsError } = await client
                            .from('related_link_items')
                            .select('*')
                            .eq('parent_link_id', linkId)
                            .order('display_order', { ascending: true });
                        
                        if (!itemsError && itemsData) {
                            items = itemsData;
                        }
                    }
                } catch (fetchError) {
                    console.warn('⚠️ 載入子項目失敗，嘗試使用 SDK...', fetchError);
                    // 嘗試使用 SDK
                    const { data: itemsData, error: itemsError } = await client
                        .from('related_link_items')
                        .select('*')
                        .eq('parent_link_id', linkId)
                        .order('display_order', { ascending: true });
                    
                    if (!itemsError && itemsData) {
                        items = itemsData;
                    }
                }
                
                linkItems = items || [];
                console.log('✅ 成功載入', linkItems.length, '個子項目');
                
                document.getElementById('link-items-container').style.display = 'block';
                renderLinkItems();
            } else {
                linkItems = [];
                document.getElementById('link-items-container').style.display = 'none';
            }
            
            document.getElementById('link-modal').style.display = 'flex';
            console.log('✅ 編輯彈窗已顯示，可以編輯標題和網址');
        } catch (error) {
            console.error('❌ 載入連結失敗:', error);
            showAlert('error', `載入連結失敗：${error.message || '未知錯誤'}`);
        }
    }
    
    // 關閉連結彈窗
    function closeLinkModal() {
        document.getElementById('link-modal').style.display = 'none';
        editingLinkId = null;
        linkItems = [];
    }
    
    // 新增下拉選單項目
    function addLinkItem() {
        linkItems.push({
            id: null,
            title: '',
            url: '',
            display_order: linkItems.length
        });
        renderLinkItems();
    }
    
    // 刪除下拉選單項目
    function removeLinkItem(index) {
        linkItems.splice(index, 1);
        renderLinkItems();
    }
    
    // 渲染下拉選單項目列表
    function renderLinkItems() {
        const container = document.getElementById('link-items-list');
        if (!container) return;
        
        container.innerHTML = linkItems.map((item, index) => `
            <div style="background: white; padding: 1rem; border-radius: 6px; margin-bottom: 0.5rem; border: 1px solid #ddd;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <strong>項目 ${index + 1}</strong>
                    <button type="button" class="btn btn-danger btn-small" onclick="RelatedLinksBackend.removeLinkItem(${index})">
                        🗑️ 刪除
                    </button>
                </div>
                <div class="form-group" style="margin-bottom: 0.5rem;">
                    <label>標題</label>
                    <input type="text" class="link-item-title" data-index="${index}" 
                           value="${escapeHtml(item.title)}" 
                           placeholder="例如：2026年楊梅趨勢引擊"
                           onchange="RelatedLinksBackend.updateLinkItem(${index}, 'title', this.value)">
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                    <label>網址</label>
                    <input type="url" class="link-item-url" data-index="${index}" 
                           value="${escapeHtml(item.url)}" 
                           placeholder="https://example.com"
                           onchange="RelatedLinksBackend.updateLinkItem(${index}, 'url', this.value)">
                </div>
            </div>
        `).join('');
    }
    
    // 更新下拉選單項目
    function updateLinkItem(index, field, value) {
        if (linkItems[index]) {
            linkItems[index][field] = value;
        }
    }
    
    // 儲存連結（新增或更新）
    async function saveLink() {
        console.log('🔄 開始儲存連結...', editingLinkId ? '(更新模式)' : '(新增模式)');
        
        const client = initClient();
        if (!client) {
            showAlert('error', '無法初始化 Supabase 客戶端，請重新整理頁面');
            return;
        }
        
        // 獲取表單資料
        const titleInput = document.getElementById('link-title');
        const urlInput = document.getElementById('link-url');
        const iconInput = document.getElementById('link-icon');
        const colorInput = document.getElementById('link-color');
        const orderInput = document.getElementById('link-order');
        const activeCheckbox = document.getElementById('link-active');
        const typeSelect = document.getElementById('link-type');
        
        if (!titleInput || !urlInput || !iconInput || !colorInput || !orderInput || !activeCheckbox || !typeSelect) {
            showAlert('error', '找不到表單元素，請重新整理頁面');
            return;
        }
        
        const title = titleInput.value.trim();
        const url = urlInput.value.trim();
        const icon = iconInput.value.trim();
        const color = colorInput.value.trim();
        const order = parseInt(orderInput.value) || 0;
        const isActive = activeCheckbox.checked;
        const linkType = typeSelect.value;
        
        // 驗證必填欄位
        if (!title || !url) {
            showAlert('error', '請填寫標題和網址（必填）');
            return;
        }
        
        // 驗證網址格式
        if (url && !url.startsWith('http://') && !url.startsWith('https://') && url !== '#') {
            showAlert('error', '網址格式不正確，請以 http:// 或 https:// 開頭');
            return;
        }
        
        try {
            const linkData = {
                title,
                url,
                icon: icon || null,
                color_gradient: color || 'linear-gradient(45deg, #667eea, #764ba2)',
                display_order: order,
                is_active: isActive,
                link_type: linkType
            };
            
            let linkId;
            
            if (editingLinkId) {
                // 更新連結（可以更換標題和網址）
                console.log('🔄 正在更新連結，ID:', editingLinkId);
                const { data, error } = await client
                    .from('related_links')
                    .update(linkData)
                    .eq('id', editingLinkId)
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ 更新連結失敗:', error);
                    throw error;
                }
                linkId = data.id;
                console.log('✅ 連結已更新，標題和網址已變更');
                
                // 刪除舊的子項目（如果有的話）
                const { error: deleteItemsError } = await client
                    .from('related_link_items')
                    .delete()
                    .eq('parent_link_id', linkId);
                
                if (deleteItemsError) {
                    console.warn('⚠️ 刪除舊子項目時發生錯誤（可能沒有子項目）:', deleteItemsError);
                }
            } else {
                // 新增連結
                console.log('🔄 正在新增連結...');
                const { data, error } = await client
                    .from('related_links')
                    .insert([linkData])
                    .select()
                    .single();
                
                if (error) {
                    console.error('❌ 新增連結失敗:', error);
                    throw error;
                }
                linkId = data.id;
                console.log('✅ 連結已新增，ID:', linkId);
            }
            
            // 如果是下拉選單，儲存子項目
            if (linkType === 'dropdown' && linkItems.length > 0) {
                const itemsToInsert = linkItems
                    .filter(item => item.title && item.url)
                    .map((item, index) => ({
                        parent_link_id: linkId,
                        title: item.title,
                        url: item.url,
                        display_order: index,
                        is_active: true
                    }));
                
                if (itemsToInsert.length > 0) {
                    console.log('🔄 正在儲存', itemsToInsert.length, '個子項目...');
                    const { error: itemsError } = await client
                        .from('related_link_items')
                        .insert(itemsToInsert);
                    
                    if (itemsError) {
                        console.error('❌ 儲存子項目失敗:', itemsError);
                        throw itemsError;
                    }
                    console.log('✅ 子項目已儲存');
                }
            }
            
            showAlert('success', editingLinkId ? '連結已更新！標題和網址已變更。' : '連結已新增！');
            closeLinkModal();
            await loadRelatedLinks();
            console.log('✅ 儲存流程完成');
        } catch (error) {
            console.error('❌ 儲存連結失敗:', error);
            showAlert('error', `儲存失敗：${error.message || '未知錯誤'}`);
        }
    }
    
    // 刪除連結（同步控制：同時刪除主連結和所有子項目）
    async function deleteLink(linkId) {
        if (!confirm('確定要刪除這個連結嗎？\n\n⚠️ 此操作將同時刪除：\n- 主連結\n- 所有相關的子項目\n\n此操作無法復原！')) {
            return;
        }
        
        try {
            const client = initClient();
            if (!client) {
                throw new Error('無法初始化 Supabase 客戶端');
            }
            
            console.log('🔄 開始刪除連結，ID:', linkId);
            
            // 步驟1：先刪除所有子項目（同步控制）
            console.log('🔄 正在刪除子項目...');
            const { error: deleteItemsError } = await client
                .from('related_link_items')
                .delete()
                .eq('parent_link_id', linkId);
            
            if (deleteItemsError) {
                console.warn('⚠️ 刪除子項目時發生錯誤（可能沒有子項目）:', deleteItemsError);
                // 繼續執行，因為可能沒有子項目
            } else {
                console.log('✅ 子項目已刪除');
            }
            
            // 步驟2：刪除主連結
            console.log('🔄 正在刪除主連結...');
            const { error: deleteLinkError } = await client
                .from('related_links')
                .delete()
                .eq('id', linkId);
            
            if (deleteLinkError) throw deleteLinkError;
            
            console.log('✅ 連結和所有子項目已同步刪除');
            showAlert('success', '連結已刪除！所有相關的子項目也已同步刪除。');
            await loadRelatedLinks();
        } catch (error) {
            console.error('❌ 刪除連結失敗:', error);
            showAlert('error', `刪除失敗：${error.message || '未知錯誤'}`);
        }
    }
    
    // 暴露 API
    window.RelatedLinksBackend = {
        loadRelatedLinks,
        showAddLinkModal,
        editLink,
        saveLink,
        deleteLink,
        closeLinkModal,
        addLinkItem,
        removeLinkItem,
        updateLinkItem
    };
    
    console.log('✅ 相關連結後台管理模組已載入');
})();
