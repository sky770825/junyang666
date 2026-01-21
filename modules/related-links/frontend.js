// ============================================
// 相關連結前端顯示模組
// ============================================
// 負責在前端頁面載入和顯示相關連結
// 前端從後端 API 獲取資料，不直接連接 Supabase

(function() {
    'use strict';
    
    // 獲取後端 API 基礎網址
    function getApiBaseUrl() {
        // 檢查是否有手動設定的 API URL
        const savedApiUrl = localStorage.getItem('api-url');
        if (savedApiUrl) {
            return savedApiUrl;
        }
        
        // 判斷環境 - 支援多種本地開發環境
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || 
                           hostname === '127.0.0.1' ||
                           hostname === '' ||
                           hostname.startsWith('127.');
        
        if (isLocalhost) {
            // 本地開發環境 - 嘗試多個可能的端口
            // 優先使用 3000，如果失敗會自動降級
            return 'http://localhost:3000/api';
        } else {
            // 生產環境 - 使用當前網域的 API
            return window.location.origin + '/api';
        }
    }
    
    // 載入相關連結（從後端 API）
    async function loadRelatedLinks() {
        try {
            const apiBaseUrl = getApiBaseUrl();
            const apiUrl = `${apiBaseUrl}/related-links`;
            
            console.log('🔄 正在從後端 API 載入相關連結...', apiUrl);
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // 增加超時處理
                signal: AbortSignal.timeout(10000) // 10 秒超時
            }).catch(fetchError => {
                // 處理網路錯誤
                if (fetchError.name === 'AbortError') {
                    throw new Error('請求超時，請檢查後端伺服器是否運行');
                } else if (fetchError.name === 'TypeError' && fetchError.message.includes('Failed to fetch')) {
                    throw new Error('無法連接到後端 API，請確認後端伺服器是否運行在 http://localhost:3000');
                }
                throw fetchError;
            });
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}: ${response.statusText}${errorText ? ' - ' + errorText : ''}`);
            }
            
            // 檢查響應內容類型
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // 如果返回的不是 JSON（可能是 HTML 404 頁面），直接使用預設資料
                const responseText = await response.text();
                if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
                    console.warn('⚠️ 後端 API 返回 HTML（可能是 404 頁面），在生產環境中直接使用預設資料');
                    if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                        console.log('📋 使用預設連結資料（生產環境）');
                        return DEFAULT_RELATED_LINKS.filter(l => l.is_active !== false);
                    }
                    return [];
                }
            }
            
            const result = await response.json();
            
            if (result.success && result.data) {
                console.log(`✅ 成功從後端 API 載入 ${result.data.length} 個連結（後台儲存的資料）`);
                return result.data;
            } else if (result.data && Array.isArray(result.data)) {
                // 如果沒有 success 標記，但 data 是陣列，也接受
                console.log(`✅ 成功從後端 API 載入 ${result.data.length} 個連結`);
                return result.data;
            } else {
                console.warn('⚠️ 後端 API 返回格式異常，使用預設資料');
                if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                    return DEFAULT_RELATED_LINKS.filter(l => l.is_active !== false);
                }
                return [];
            }
        } catch (error) {
            console.error('❌ 從後端 API 載入連結失敗:', error);
            
            // 檢查是否是 JSON 解析錯誤（通常是因為返回了 HTML）
            if (error instanceof SyntaxError && error.message.includes('JSON')) {
                console.warn('⚠️ API 返回了非 JSON 格式（可能是 HTML 404 頁面），在生產環境中直接使用預設資料');
            } else {
                console.warn('⚠️ 使用預設資料作為備用');
            }
            
            // 如果後端 API 失敗，使用預設資料
            if (typeof DEFAULT_RELATED_LINKS !== 'undefined') {
                console.log('📋 使用預設連結資料');
                return DEFAULT_RELATED_LINKS.filter(l => l.is_active !== false);
            }
            console.warn('⚠️ 沒有預設資料可用');
            return [];
        }
    }
    
    // 渲染相關連結到容器
    async function renderRelatedLinks(containerId) {
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
                console.warn('⚠️ 沒有找到任何連結資料');
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
    
    // 觸發準備就緒事件
    if (typeof window.dispatchEvent !== 'undefined') {
        window.dispatchEvent(new CustomEvent('relatedLinksFrontendReady'));
    }
    
    console.log('✅ 相關連結前端顯示模組已載入');
})();
