// 分頁系統模組 - 從標準版本提取
// 包含完整的物件分頁、搜尋、篩選功能

// 修改分頁系統以使用內嵌資料
class EmbeddedPropertyPaginationSystem {
    constructor() {
        // 🔥 分離已售和未售物件
        // 確保 embeddedPropertiesData 存在
        if (typeof embeddedPropertiesData === 'undefined' || !embeddedPropertiesData.properties) {
            console.warn('⚠️ embeddedPropertiesData 尚未載入，使用空陣列');
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
        
        this.allProperties = embeddedPropertiesData.properties || [];
        this.properties = this.allProperties.filter(p => p.status !== 'sold'); // 只顯示未售物件
        this.soldProperties = this.allProperties.filter(p => p.status === 'sold'); // 已售物件
        
        this.currentPage = 1;
        // 根據模式調整每頁顯示數量
        this.baseItemsPerPage = embeddedPropertiesData.settings.itemsPerPage || 4;
        this.itemsPerPage = this.baseItemsPerPage; // 卡片模式
        
        // 🎨 網格模式可以顯示更多項目
        this.gridItemsPerPage = 12; // 網格模式每頁12個
        this.currentFilter = 'all'; // 保留舊版相容性
        this.searchTerm = '';
        
        // 🔥 新增：雙重篩選
        this.buildingFilter = 'all'; // 建築類型篩選
        this.roomFilter = 'all'; // 房型篩選
        this.districtFilter = ''; // 行政區篩選
        
        // 🔥 新增：緩存機制
        this.filteredCache = null;
        this.cacheKey = '';
        this.cardCache = new Map(); // 緩存已創建的卡片 DOM
        
        // 🔥 搜尋防抖：使用者停止輸入 300ms 後才觸發搜尋與渲染
        this.searchDebounceTimer = null;
        this.debounceDelay = 300;
        
        // 🚀 新增：篩選狀態管理
        this.isFiltering = false;
        this.loadingElement = null;
        
        // 🎨 新增：預覽模式（grid 或 card）
        const savedViewMode = localStorage.getItem('property-view-mode');
        this.viewMode = savedViewMode || 'card'; // 預設卡片模式
        
        this.init();
    }

    init() {
        this.setupViewModeToggle(); // 🎨 設置預覽模式切換
        
        // 🔥 先嘗試從 embeddedPropertiesData 更新資料（如果還沒更新）
        if ((!this.properties || this.properties.length === 0) && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            console.log('🔄 初始化時發現資料已載入，更新分頁系統資料...');
            this.allProperties = embeddedPropertiesData.properties;
            this.properties = this.allProperties.filter(p => p.status !== 'sold');
            this.soldProperties = this.allProperties.filter(p => p.status === 'sold');
        }
        
        // 確保有資料才渲染
        if (this.properties && this.properties.length > 0) {
            console.log(`✅ 初始化時有 ${this.properties.length} 個物件，立即渲染`);
            // 動態生成房型篩選按鈕
            this.updateRoomFilterButtons();
            this.renderProperties();
        } else {
            console.warn('⚠️ 初始化時沒有物件資料，顯示載入中狀態');
            // 顯示載入中狀態
            const container = document.getElementById('properties-container');
            if (container) {
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                        <h3>載入中...</h3>
                        <p>正在從 Supabase 載入物件資料</p>
                    </div>
                `;
            }
            
            // 🚀 性能優化：如果資料還沒載入，快速檢查（減少延遲）
            const checkData = (attempt = 1, maxAttempts = 20) => {
                if (attempt > maxAttempts) {
                    console.warn('⚠️ 資料載入超時，請檢查 Supabase 連接');
                    const container = document.getElementById('properties-container');
                    if (container) {
                        container.innerHTML = `
                            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #dc3545;">
                                <div style="font-size: 3rem; margin-bottom: 1rem;">❌</div>
                                <h3>資料載入失敗</h3>
                                <p>請檢查 Supabase 連接或重新整理頁面</p>
                            </div>
                        `;
                    }
                    return;
                }
                
                // 🚀 使用更短的檢查間隔（100ms），但增加最大檢查次數
                const checkInterval = 100; // 固定 100ms 間隔，不遞增
                
                setTimeout(() => {
                    // 再次檢查資料是否已載入
                    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
                        // 更新資料
                        this.allProperties = embeddedPropertiesData.properties || [];
                        this.properties = this.allProperties.filter(p => p.status !== 'sold');
                        this.soldProperties = this.allProperties.filter(p => p.status === 'sold');
                        
                        // 清除緩存
                        this.filteredCache = null;
                        this.cacheKey = '';
                        if (this.cardCache) {
                            this.cardCache.clear();
                        }
                        
                        // 更新行政區選項與房型按鈕（避免非同步載入時只顯示靜態 2/3/4 房）
                        this.updateDistrictOptions();
                        this.updateRoomFilterButtons();
                        
                        // 重新渲染
                        this.renderProperties();
                    } else if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
                        // 資料已載入但為空陣列，也要渲染（顯示「目前沒有物件」）
                        this.allProperties = embeddedPropertiesData.properties || [];
                        this.properties = this.allProperties.filter(p => p.status !== 'sold');
                        this.soldProperties = this.allProperties.filter(p => p.status === 'sold');
                        
                        // 更新行政區選項與房型按鈕
                        this.updateDistrictOptions();
                        this.updateRoomFilterButtons();
                        
                        this.renderProperties();
                    } else {
                        // 繼續檢查
                        checkData(attempt + 1, maxAttempts);
                    }
                }, checkInterval);
            };
            
            checkData();
        }
        
        this.setupEventListeners();
        this.setupEventDelegation(); // 🚀 新增：設置事件委託
        
        // 🚀 立即開始預渲染（不等待空閒時間）
        setTimeout(() => {
            this.preRenderFilters();
        }, 100); // 100ms 後立即開始預渲染
    }

    /**
     * 從 property 取得用於篩選的房型（2房、3房、4房等）。
     * 透天、別墅、華廈、公寓的 type 是建築類型，需從 layout（如「4房3廳3衛」）解析房間數。
     * @returns {'開放式'|'1房'|'2房'|'3房'|'4房'|'5房'|'店面'|'店住'|null}
     */
    getRoomTypeFromProperty(property) {
        const type = property.type || '';
        const layout = (property.layout || '').trim();
        // type 為套房 → 1房
        if (type === '套房') return '1房';
        // type 為店面、店住 → 直接回傳，供房型篩選對應
        if (type === '店面' || type === '店住') return type;
        // 從 layout 解析
        if (layout) {
            if (layout.includes('0房') || layout.includes('開放式')) return '開放式';
            if (layout.includes('1房') || layout.includes('套房')) return '1房';
            const m = layout.match(/(\d+)房/);
            if (m) {
                const n = parseInt(m[1], 10);
                if (n >= 1) return n + '房';
            }
        }
        // 若 layout 無法解析，但 type 已是 X房、開放式、店面、店住，沿用 type
        if (/^\d+房$/.test(type) || ['開放式', '店面', '店住'].includes(type)) return type;
        return null;
    }

    getFilteredProperties() {
        // 🔥 新增：檢查緩存（包含雙重篩選和行政區篩選）
        const newCacheKey = `${this.buildingFilter}_${this.roomFilter}_${this.districtFilter}_${this.searchTerm}`;
        if (this.cacheKey === newCacheKey && this.filteredCache) {
            console.log('📦 使用緩存的篩選結果');
            return this.filteredCache;
        }
        
        console.log('🔄 重新計算篩選結果');
        let filtered = this.properties;
        
        // 🔥 行政區篩選（優先處理）
        if (this.districtFilter) {
            filtered = filtered.filter(property => {
                // 檢查物件的 district 欄位或從 address 中提取行政區
                const propertyDistrict = property.district || '';
                const propertyAddress = property.address || '';
                
                // 如果 district 欄位存在且匹配
                if (propertyDistrict && propertyDistrict.includes(this.districtFilter)) {
                    return true;
                }
                
                // 如果 district 欄位不存在，從 address 中提取行政區
                if (propertyAddress.includes(this.districtFilter)) {
                    return true;
                }
                
                return false;
            });
        }
        
        // 🔥 建築類型篩選
        if (this.buildingFilter !== 'all') {
            filtered = filtered.filter(property => {
                // 預設為「電梯大樓」，確保所有物件都有分類
                const buildingType = property.building_type || property.property_type || '電梯大樓';
                
                // 統一處理建築類型名稱
                if (this.buildingFilter === '電梯大樓') {
                    return buildingType.includes('電梯') || buildingType === '大樓' || buildingType === '大廈';
                } else if (this.buildingFilter === '華廈') {
                    return buildingType === '華廈';
                } else if (this.buildingFilter === '透天別墅') {
                    return buildingType.includes('透天') || buildingType.includes('別墅');
                }
                return false;
            });
        }
        
        // 🔥 房型篩選：只要有 layout 或 type 可解析出房間數，全部用 getRoomTypeFromProperty 比對
        if (this.roomFilter !== 'all') {
            filtered = filtered.filter(property => this.getRoomTypeFromProperty(property) === this.roomFilter);
        }
        
        // 搜尋功能
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(property => 
                property.title.toLowerCase().includes(term) ||
                property.address.toLowerCase().includes(term) ||
                (property.community && property.community.toLowerCase().includes(term))
            );
        }
        
        // 自動排序：有標籤的物件排在前面
        filtered.sort((a, b) => {
            const aHasTag = a.status && a.statusText;
            const bHasTag = b.status && b.statusText;
            
            // 有標籤的排在前面
            if (aHasTag && !bHasTag) return -1;
            if (!aHasTag && bHasTag) return 1;
            
            // 如果都有標籤或都沒有標籤，保持原有順序
            return 0;
        });
        
        // 🔥 新增：儲存到緩存
        this.filteredCache = filtered;
        this.cacheKey = newCacheKey;
        
        return filtered;
    }

    getPaginatedProperties() {
        const filtered = this.getFilteredProperties();
        // 🎨 根據預覽模式調整每頁數量
        const itemsPerPage = this.viewMode === 'grid' ? this.gridItemsPerPage : this.itemsPerPage;
        const startIndex = (this.currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }

    getTotalPages() {
        const filtered = this.getFilteredProperties();
        // 🎨 根據預覽模式調整每頁數量
        const itemsPerPage = this.viewMode === 'grid' ? this.gridItemsPerPage : this.itemsPerPage;
        return Math.ceil(filtered.length / itemsPerPage);
    }

    renderProperties() {
        // 🔥 防止重複渲染：使用防抖機制
        if (this._isRendering) {
            console.log('⏭️ 正在渲染中，跳過重複調用');
            return;
        }
        
        // 設置渲染標記
        this._isRendering = true;
        
        // 清除之前的防抖計時器
        if (this._renderDebounceTimer) {
            clearTimeout(this._renderDebounceTimer);
        }
        
        // 使用防抖：延遲 50ms 執行，如果 50ms 內再次調用則取消之前的調用
        this._renderDebounceTimer = setTimeout(() => {
            this._isRendering = false;
            this._renderDebounceTimer = null;
        }, 50);
        
        const container = document.getElementById('properties-container');
        if (!container) {
            console.warn('⚠️ properties-container 元素不存在');
            this._isRendering = false;
            return;
        }

        // 檢查是否有資料，如果沒有則嘗試從 embeddedPropertiesData 更新
        if (!this.properties || this.properties.length === 0) {
            // 🔥 檢查 embeddedPropertiesData 是否已設置（即使資料是空的）
            const hasEmbeddedData = typeof embeddedPropertiesData !== 'undefined' && 
                                   embeddedPropertiesData !== null &&
                                   embeddedPropertiesData.properties !== undefined;
            
            if (hasEmbeddedData) {
                // 資料已載入（可能是空的），更新分頁系統資料
                const oldCount = this.allProperties ? this.allProperties.length : 0;
                const newCount = embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0;
                
                console.log(`🔄 資料已載入，更新分頁系統資料... (舊: ${oldCount} → 新: ${newCount})`);
                this.allProperties = embeddedPropertiesData.properties || [];
                this.properties = this.allProperties.filter(p => p.status !== 'sold');
                this.soldProperties = this.allProperties.filter(p => p.status === 'sold');
                // 清除緩存
                this.filteredCache = null;
                this.cacheKey = '';
                if (this.cardCache) {
                    this.cardCache.clear();
                }
                
                if (oldCount !== newCount) {
                    console.log(`📊 物件數量變化：${oldCount} → ${newCount}`);
                }
                
                // 🔥 資料已更新，繼續執行渲染邏輯（不 return）
                console.log('✅ 資料已更新，準備渲染物件卡片');
            } else {
                // 資料尚未載入，顯示載入中訊息
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                        <div style="font-size: 3rem; margin-bottom: 1rem;">⏳</div>
                        <h3>載入中...</h3>
                        <p>正在從 Supabase 載入物件資料</p>
                    </div>
                `;
                return;
            }
        }
        
        // 🔥 再次檢查：確保更新後有資料才繼續渲染
        if (!this.properties || this.properties.length === 0) {
            console.warn('⚠️ 沒有物件資料可顯示');
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                    <div style="font-size: 3rem; margin-bottom: 1rem;">📭</div>
                    <h3>目前沒有物件</h3>
                    <p>請稍後再試或聯繫管理員</p>
                </div>
            `;
            return;
        }

        const paginatedProperties = this.getPaginatedProperties();

        // 🔥 首屏圖片預載入：優化後 URL + 多張預載（壓縮畫質、WebP 由 Supabase 自動）
        if (this.currentPage === 1 && paginatedProperties.length > 0 && typeof window.ImageOptimizer !== 'undefined') {
            const preloadUrls = [];
            const limit = Math.min(paginatedProperties.length, 8);
            for (let i = 0; i < limit; i++) {
                const prop = paginatedProperties[i];
                const img = prop.images && prop.images.length > 0 ? (typeof prop.images[0] === 'string' ? prop.images[0] : prop.images[0].url) : null;
                if (img) preloadUrls.push(window.ImageOptimizer.getOptimizedImageUrl(img, { width: 600, quality: 80 }));
            }
            if (preloadUrls.length > 0) window.ImageOptimizer.preloadFirstScreenImages(preloadUrls, 8);
        }

        var self = this;
        var runHeavyRender = function() {
            if (self._renderDebounceTimer) {
                clearTimeout(self._renderDebounceTimer);
                self._renderDebounceTimer = null;
            }
            // 🔥 耗時 DOM 建構改為下一幀執行，避免阻塞 UI
            var doRender = function() {
                // 🔥 優化：使用 DocumentFragment 減少重排次數
                const fragment = document.createDocumentFragment();

                if (paginatedProperties.length === 0) {
                    container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #666;">
                    <i class="fas fa-search" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>找不到符合條件的物件</h3>
                    <p>請嘗試調整搜尋條件或篩選條件</p>
                </div>
            `;
                    self._isRendering = false;
                    return;
                }

                // 🎨 根據預覽模式渲染
                if (self.viewMode === 'grid') {
            // 網格模式：創建緊湊的網格項目（傳入 index 供首屏優化）
            paginatedProperties.forEach((property, index) => {
                const gridItem = self.createPropertyGridItem(property, index);
                fragment.appendChild(gridItem);
            });
            
            // 更新容器樣式為網格佈局（響應式）
            container.className = 'properties-grid-view';
            container.style.display = 'grid';
            
            // 根據視窗寬度動態調整網格列數 - 手機版改為 2 列網格
            const screenWidth = window.innerWidth;
            if (screenWidth <= 400) {
                // 超小螢幕：2 列，較小間距
                container.style.gridTemplateColumns = 'repeat(2, 1fr)';
                container.style.gap = '0.4rem';
                container.style.padding = '0.5rem';
            } else if (screenWidth <= 600) {
                // 小螢幕：2 列網格
                container.style.gridTemplateColumns = 'repeat(2, 1fr)';
                container.style.gap = '0.6rem';
                container.style.padding = '0.5rem';
            } else if (screenWidth <= 800) {
                container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(200px, 1fr))';
                container.style.gap = '0.8rem';
                container.style.padding = '0.5rem';
            } else if (screenWidth <= 1024) {
                container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(240px, 1fr))';
                container.style.gap = '1rem';
                container.style.padding = '1rem';
            } else {
                container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
                container.style.gap = '1.5rem';
                container.style.padding = '1rem';
            }
                } else {
                // 卡片模式：使用原有的卡片渲染
            const cards = [];
            paginatedProperties.forEach(property => {
                let card;
                const preRenderKey = `pre_${self.buildingFilter}_${self.roomFilter}_${property.id}`;
                if (self.cardCache.has(preRenderKey)) {
                    card = self.cardCache.get(preRenderKey).cloneNode(true);
                } else if (self.cardCache.has(property.id)) {
                    card = self.cardCache.get(property.id).cloneNode(true);
                } else {
                    card = self.createPropertyCard(property);
                    self.cardCache.set(property.id, card.cloneNode(true));
                }
                cards.push(card);
            });
            cards.forEach(card => fragment.appendChild(card));
            container.className = 'properties-grid';
        }

                container.innerHTML = '';
                container.appendChild(fragment);
                paginatedProperties.forEach(property => {
                    const element = container.querySelector(`[data-property-id="${property.id}"]`);
                    if (element) self.rebindCardEvents(element, property);
                });
                self.renderPagination(self.getTotalPages());
                self.updateStats();
                requestAnimationFrame(function() { self.adjustTitleFontSize(); });
                self._isRendering = false;
            };
            if (window.AsyncUtils && typeof window.AsyncUtils.runOnNextFrame === 'function') {
                window.AsyncUtils.runOnNextFrame(doRender);
            } else {
                doRender();
            }
        };
        if (window.AsyncUtils && typeof window.AsyncUtils.runOnNextFrame === 'function') {
            window.AsyncUtils.runOnNextFrame(runHeavyRender);
        } else {
            runHeavyRender();
        }
    }

    // 🚀 新增：設置事件委託
    setupEventDelegation() {
        const container = document.getElementById('properties-container');
        if (!container) return;
        
        // 🔥 防止重複添加事件監聽器
        if (container.hasAttribute('data-event-delegation-setup')) {
            return;
        }
        container.setAttribute('data-event-delegation-setup', 'true');
        
        // 使用事件委託處理所有卡片和網格項目的點擊事件
        container.addEventListener('click', (e) => {
            const target = e.target;
            const element = target.closest('.property-card, .property-grid-item');
            if (!element) return;
            
            const propertyId = element.getAttribute('data-property-id');
            if (!propertyId) return;
            
            // 處理照片點擊
            const photoItem = target.closest('.photo-item');
            if (photoItem) {
                const photoIndex = parseInt(photoItem.getAttribute('data-photo-index')) || 0;
                if (typeof openLightbox === 'function') {
                    openLightbox(photoIndex, propertyId);
                } else {
                    console.error('openLightbox 函數未定義');
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            
            // 如果點擊的是連結（<a> 標籤），不處理 data-action，讓連結自然跳轉
            if (target.tagName === 'A' || target.closest('a')) {
                return; // 讓連結自然跳轉，不觸發事件委託
            }
            
            // 處理按鈕點擊或網格項目點擊
            // 🔥 優先檢查點擊的元素，然後檢查父元素（包括網格項目本身）
            let action = target.getAttribute('data-action');
            if (!action) {
                const actionElement = target.closest('[data-action]');
                if (actionElement) {
                    action = actionElement.getAttribute('data-action');
                }
            }
            
            // 🔥 網格項目：如果點擊的是網格項目本身（沒有其他 data-action），視為查看詳情
            if (!action && element.classList.contains('property-grid-item')) {
                // 檢查是否點擊在連結上
                if (!target.closest('a')) {
                    action = 'details';
                }
            }
            
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                switch (action) {
                    case 'details':
                        // 直接導航到獨立頁面
                        const property = this.allProperties.find(p => p.id === propertyId);
                        if (property) {
                            const url = `property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}`;
                            window.open(url, '_blank');
                        } else if (typeof showPropertyDetails === 'function') {
                            // 備用方案：使用舊的函數
                            showPropertyDetails(propertyId);
                        }
                        break;
                    case 'loan':
                        if (typeof showLoanCalculator === 'function') {
                            showLoanCalculator(propertyId);
                        }
                        break;
                    case 'map':
                        if (typeof showMapModal === 'function') {
                            showMapModal(propertyId);
                        } else {
                            console.error('showMapModal 函數未定義');
                        }
                        break;
                    case 'tiktok':
                        if (typeof showTikTokModal === 'function') {
                            showTikTokModal(propertyId);
                        }
                        break;
                }
                return;
            }
        });
    }

    // 🔥 新增：重新綁定事件監聽器（同時處理卡片和網格項目）
    rebindCardEvents(element, property) {
        // 🚀 優化：使用 data 屬性而不是重新綁定事件
        // 設置 data 屬性，讓事件委託處理
        element.setAttribute('data-property-id', property.id);
        
        // 設置編號為 data 屬性（如果有的話）
        if (property.number) {
            element.setAttribute('data-property-number', property.number);
        }
        
        // 為照片項目設置索引（卡片模式才有）
        const photoItems = element.querySelectorAll('.photo-item');
        photoItems.forEach((item, index) => {
            item.setAttribute('data-photo-index', index);
        });
        
        // 為按鈕設置 data 屬性（卡片模式）
        const detailBtn = element.querySelector('button[onclick*="showPropertyDetails"]');
        if (detailBtn) {
            detailBtn.setAttribute('data-action', 'details');
        }
        
        const loanBtn = element.querySelector('button[onclick*="showLoanCalculator"]');
        if (loanBtn) {
            loanBtn.setAttribute('data-action', 'loan');
        }
        
        const mapIframe = element.querySelector('div[onclick*="showMapModal"], .map-preview-container[data-action="map"]');
        if (mapIframe) {
            mapIframe.setAttribute('data-action', 'map');
        }
        
        const tiktokPreview = element.querySelector('div[onclick*="showTikTokModal"]');
        if (tiktokPreview) {
            tiktokPreview.setAttribute('data-action', 'tiktok');
        }
        
        // 🔥 網格項目：確保整個項目可以點擊（如果沒有設置 data-action）
        if (element.classList.contains('property-grid-item')) {
            // 網格項目的主容器應該有 data-action="details"
            const mainContainer = element.querySelector('[data-action="details"]');
            if (!mainContainer && !element.hasAttribute('data-action')) {
                // 如果網格項目的主容器沒有 data-action，設置到元素本身
                element.setAttribute('data-action', 'details');
            }
        }
    }

    createPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'property-card';
        card.setAttribute('data-property-id', property.id); // 🚀 設置 data 屬性
        // 設置編號為 data 屬性（不顯示在卡片上）
        if (property.number) {
            card.setAttribute('data-property-number', property.number);
        }
        // 讓整個卡片可以點擊（除了按鈕和照片）
        card.style.cursor = 'default'; // 預設不顯示手型，只有特定區域可點擊
        
        // 處理 Google Maps URL
        let mapUrl = property.google_maps || '';
        
        // 如果 google_maps 是完整的 iframe HTML，提取 src 屬性值
        if (mapUrl && mapUrl.includes('<iframe')) {
            const srcMatch = mapUrl.match(/src=["']([^"']+)["']/i);
            if (srcMatch && srcMatch[1]) {
                mapUrl = srcMatch[1];
            } else {
                mapUrl = ''; // 如果無法提取，設為空
            }
        }
        
        // 清理 URL（移除多餘的空格）
        mapUrl = mapUrl.trim();
        
        if (!mapUrl || mapUrl === '') {
            // 如果沒有自訂地圖 URL，根據地址生成 Google Maps 連結
            const address = property.address || '';
            if (address) {
                const encodedAddress = encodeURIComponent(address);
                // 使用 Google Maps 搜尋連結轉換為嵌入格式
                mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
            } else {
                // 預設地圖（桃園市）
                mapUrl = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d231263.22579999998!2d121.1637256!3d24.9936281!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x346823c8c8c8c8c8%3A0x8c8c8c8c8c8c8c8c!2z5Y-w5Lit5biC!5e0!3m2!1szh-TW!2stw!4v1234567890123!5m2!1szh-TW!2stw';
            }
        }
        
        card.innerHTML = `
            ${property.status && property.statusText ? `
                <div class="property-status-tag status-${property.status}">
                    ${property.statusText}
                </div>
            ` : ''}
            <h3 class="property-title">${property.title}</h3>
            
            <!-- 照片滾動區（壓縮畫質、WebP 由 Supabase 自動） -->
            <div class="photo-scroll-container" style="margin: 0.6rem 0; overflow-x: auto; padding: 0.5rem 0;">
                <div class="photo-scroll" style="display: flex; gap: 0.5rem; width: max-content;">
                    ${property.images.map((img, index) => {
                        const src = typeof img === 'string' ? img : (img && img.url);
                        const optSrc = src && typeof window.ImageOptimizer !== 'undefined' ? window.ImageOptimizer.getOptimizedImageUrl(src, { thumb: true }) : src;
                        return `
                        <div class="photo-item" data-photo-index="${index}" 
                             style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 4px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative; background: #f0f0f0;"
                             onclick="if(typeof openLightbox === 'function') { openLightbox(${index}, '${property.id}'); } else { console.error('openLightbox 函數未載入'); }">
                            <img src="${optSrc || src}" 
                                 alt="物件照片" 
                                 data-src="${src || optSrc}"
                                 loading="${index === 0 ? 'eager' : 'lazy'}"
                                 decoding="async"
                                 style="width: 100%; height: 100%; object-fit: cover; pointer-events: none; transition: opacity 0.3s ease;" 
                                 onerror="this.style.display='none'"
                                 onload="this.style.opacity='1';"
                                 onloadstart="this.style.opacity='0.5';">
                        </div>
                    `; }).join('')}
                </div>
            </div>

            <!-- 物件資訊 -->
            <div class="property-info" style="padding: 0.8rem; background: #f8f9fa; border-radius: 8px; margin: 0.5rem 0;">
                <div style="display: flex; gap: 0.3rem; margin-bottom: 0.6rem;">
                    <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 4px; font-weight: 600;">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem; color: white;">售價</div>
                        <div style="font-size: 1.2rem; color: #DAA520; font-weight: 700; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${property.price}</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 4px; font-weight: 600;">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">坪數</div>
                        <div style="font-size: 1.2rem;">${(() => {
                            const area = property.total_area || property.area;
                            if (!area) return '未設定';
                            return area.includes('坪') ? area : area + '坪';
                        })()}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.6rem;">
                    <strong>📍 地址：</strong>${(typeof window.formatAddressForDisplay === 'function' 
                        ? window.formatAddressForDisplay(property.address, property.hide_address_number, property.type)
                        : (() => {
                            // 備用處理邏輯
                            let displayAddress = property.address || '';
                            const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
                            const shouldShowOnlyRoad = property.type && typesToShowOnlyRoad.includes(property.type);

                            if (shouldShowOnlyRoad && displayAddress) {
                                displayAddress = displayAddress.replace(/\d+[巷弄號].*$/i, '');
                                displayAddress = displayAddress.replace(/[\s\-]+$/, '').trim();
                            } else if (property.hide_address_number && displayAddress) {
                                displayAddress = displayAddress.replace(/(\d+)(巷|弄|號)/g, '**$2');
                            }
                            return displayAddress;
                        })())}
                </div>
                
                ${property.layout && property.layout.trim() !== '' ? `
                <div style="margin-bottom: 0.6rem; display: flex; gap: 0.3rem;">
                    <div style="flex: 1; padding: 0.4rem 0.3rem; background: #e8f5e8; border-radius: 4px; text-align: center; font-size: 0.95rem; font-weight: 600; color: #2d5016;">
                        <div style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 0.2rem;">格局</div>
                        <div>${property.layout}</div>
                    </div>
                    <div style="flex: 1; padding: 0.4rem 0.3rem; background: #e8f5e8; border-radius: 4px; text-align: center; font-size: 0.95rem; font-weight: 600; color: #2d5016;">
                        <div style="font-size: 0.75rem; opacity: 0.8; margin-bottom: 0.2rem;">屋齡</div>
                        <div>${(() => {
                            if (!property.age) return '未設定';
                            // 如果已經有「年」字，直接顯示；如果沒有，加上「年」
                            return property.age.includes('年') ? property.age : property.age + '年';
                        })()}</div>
                    </div>
                </div>
                ` : ''}
                
                <!-- 街景地圖 & TikTok 預覽區 -->
                <div style="margin-bottom: 0.6rem;">
                    ${property.tiktok_video_id && property.tiktok_video_id.trim() !== '' ? `
                        <!-- 2欄佈局：地圖 + TikTok -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                            <!-- 地圖預覽 -->
                            <div class="map-preview-container" style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer;" data-action="map">
                                <iframe src="${mapUrl}" width="100%" height="120" style="border:0; pointer-events: none;" allow="accelerometer; gyroscope; geolocation" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                                <div class="map-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; pointer-events: auto; z-index: 10;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                    <div style="background: rgba(0,0,0,0.7); color: white; padding: 6px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 600;">
                                        <i class="fas fa-expand"></i> 地圖
                                    </div>
                                </div>
                            </div>
                            
                            <!-- TikTok 預覽 -->
                            <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer; background: ${property.tiktok_thumbnail ? '#000' : 'linear-gradient(135deg, #000000, #fe2c55)'}; display: flex; align-items: center; justify-content: center; height: 120px;" data-action="tiktok">
                                ${property.tiktok_thumbnail ? `
                                    <!-- 影片縮略圖 -->
                                    <img src="${property.tiktok_thumbnail}" 
                                         alt="TikTok影片預覽" 
                                         style="width: 100%; height: 100%; object-fit: cover;"
                                         onerror="this.style.display='none'; this.parentElement.style.background='linear-gradient(135deg, #000000, #fe2c55)'; this.parentElement.innerHTML='<div style=\\'text-align: center; color: white;\\'><div style=\\'font-size: 2rem; margin-bottom: 0.3rem;\\'><i class=\\'fab fa-tiktok\\'></i></div><div style=\\'font-size: 0.75rem; font-weight: 600; opacity: 0.9;\\'>TikTok 影片</div></div>';">
                                    <!-- TikTok 標識覆蓋層 -->
                                    <div style="position: absolute; top: 5px; left: 5px; background: rgba(0,0,0,0.7); border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;">
                                        <i class="fab fa-tiktok" style="color: white; font-size: 1rem;"></i>
                                    </div>
                                    <!-- 播放圖標覆蓋層 -->
                                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; transition: all 0.3s ease;">
                                        <i class="fas fa-play" style="color: white; font-size: 1.2rem; margin-left: 3px;"></i>
                                    </div>
                                ` : `
                                    <!-- 無縮略圖時的預設顯示 -->
                                    <div style="text-align: center; color: white;">
                                        <div style="font-size: 2rem; margin-bottom: 0.3rem;">
                                            <i class="fab fa-tiktok"></i>
                                        </div>
                                        <div style="font-size: 0.75rem; font-weight: 600; opacity: 0.9;">
                                            TikTok 影片
                                        </div>
                                    </div>
                                `}
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                    <div style="background: rgba(254,44,85,0.9); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                                        <i class="fas fa-play"></i> 觀看影片
                                    </div>
                                </div>
                            </div>
                        </div>
                    ` : `
                        <!-- 單獨地圖預覽（無 TikTok 時） -->
                        <div class="map-preview-container" style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer;" data-action="map">
                            <iframe src="${mapUrl}" width="100%" height="120" style="border:0; pointer-events: none;" allow="accelerometer; gyroscope; geolocation" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                            <div class="map-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; pointer-events: auto; z-index: 10;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                <div style="background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                                    <i class="fas fa-expand"></i> 查看大地圖
                                </div>
                            </div>
                        </div>
                    `}
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center; position: relative; margin-bottom: 0;">
                    <a href="property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}" 
                       target="_blank"
                       style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); flex: 1; font-size: 1rem; text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(102, 126, 234, 0.3)'">
                        <i class="fas fa-info-circle"></i> 詳細資訊
                    </a>
                    <button data-action="loan" 
                            style="background: linear-gradient(45deg, #10b981, #3b82f6); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); flex: 1; font-size: 1rem;">
                        <i class="fas fa-calculator"></i> 貸款試算
                    </button>
                </div>
            </div>
        `;
        return card;
    }

    // 🎨 新增：創建網格預覽項目（緊湊版；支援首屏優化與壓縮畫質）
    createPropertyGridItem(property, index) {
        const gridItem = document.createElement('div');
        gridItem.className = 'property-grid-item';
        gridItem.setAttribute('data-property-id', property.id);
        
        // 設置編號為 data 屬性
        if (property.number) {
            gridItem.setAttribute('data-property-number', property.number);
        }
        
        const rawImage = property.images && property.images.length > 0 ? (typeof property.images[0] === 'string' ? property.images[0] : property.images[0].url) : null;
        const mainImage = rawImage && typeof window.ImageOptimizer !== 'undefined'
            ? window.ImageOptimizer.getOptimizedImageUrl(rawImage, { width: 600, quality: 80 })
            : (rawImage || 'https://via.placeholder.com/300x200?text=No+Image');
        const isFirstScreen = typeof index === 'number' && index < 6;
        const detailUrl = `property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}`;
        
        gridItem.innerHTML = `
            <div style="position: relative; width: 100%; border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: all 0.3s ease; background: white;"
                 data-action="details">
                ${property.status && property.statusText ? `
                    <div class="property-status-tag status-${property.status}" style="position: absolute; top: 8px; right: 8px; z-index: 5; padding: 4px 10px; font-size: 0.7rem;">
                        ${property.statusText}
                    </div>
                ` : ''}
                
                <!-- 主圖（首屏前 6 張優先載入） -->
                <div class="grid-item-image-container" style="position: relative; width: 100%; padding-top: 60%; overflow: hidden; background: #f0f0f0;">
                    <img src="${mainImage}" 
                         alt="${property.title}" 
                         decoding="async"
                         loading="${isFirstScreen ? 'eager' : 'lazy'}"
                         fetchpriority="${isFirstScreen ? 'high' : 'low'}"
                         style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; transition: opacity 0.3s ease, transform 0.3s ease;"
                         onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'"
                         onload="this.style.opacity='1';"
                         onloadstart="this.style.opacity='0.7';"
                         onmouseover="this.style.transform='scale(1.05)'"
                         onmouseout="this.style.transform='scale(1)'">
                    ${property.images && property.images.length > 1 ? `
                        <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">
                            <i class="fas fa-images"></i> ${property.images.length}
                        </div>
                    ` : ''}
                </div>
                
                <!-- 資訊區 -->
                <div style="padding: 1rem;">
                    <h4 class="grid-item-title" style="font-size: clamp(1.1rem, 3.5vw, 1.2rem); font-weight: 600; color: #2c3e50; margin: 0 0 0.8rem 0; line-height: 1.5; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 2.8em;"
                        title="${property.title}">
                        ${property.title}
                    </h4>
                    
                    <!-- 價格和坪數（參考591設計：同一行，緊湊排列） -->
                    <div style="display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 0.6rem; gap: 0.5rem;">
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: clamp(1.2rem, 4vw, 1.4rem); font-weight: 700; color: #DAA520; line-height: 1.2; margin-bottom: 0.25rem; text-shadow: 0 1px 2px rgba(0,0,0,0.2);">
                                ${property.price}
                            </div>
                            ${property.total_area || property.area ? `
                            <div style="font-size: clamp(0.85rem, 2.5vw, 0.95rem); color: #666; font-weight: 500;">
                                ${(() => {
                                    const area = property.total_area || property.area;
                                    return area ? (area.includes('坪') ? area : area + '坪') : '未設定';
                                })()}
                            </div>
                            ` : ''}
                        </div>
                        ${property.layout && property.layout.trim() !== '' ? `
                        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; flex-shrink: 0;">
                            <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: clamp(0.75rem, 2vw, 0.85rem); white-space: nowrap;">
                                ${property.layout}
                            </span>
                            ${property.age ? `
                            <span style="background: #e3f2fd; color: #1976d2; padding: 4px 10px; border-radius: 12px; font-weight: 600; font-size: clamp(0.7rem, 1.8vw, 0.8rem); white-space: nowrap;">
                                ${property.age.includes('年') ? property.age : property.age + '年'}
                            </span>
                            ` : ''}
                        </div>
                        ` : ''}
                    </div>
                    
                    <!-- 地址（網格模式顯示簡化地址，保留樓層資訊） -->
                    ${property.address ? `
                    <div style="margin-bottom: 0.5rem; font-size: clamp(0.75rem, 2vw, 0.85rem); color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 0.3rem;">
                        <i class="fas fa-map-marker-alt" style="color: #667eea; font-size: 0.8rem;"></i>
                        <span title="${property.address}">${(() => {
                            // 網格模式統一使用 formatAddressForDisplay 函數
                            // 對於透天、別墅、店面類型，或勾選隱藏門牌號碼的物件，使用格式化函數（會保留樓層資訊）
                            const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
                            const shouldShowOnlyRoad = property.type && typesToShowOnlyRoad.includes(property.type);
                            
                            // 如果應該只顯示路名（隱藏門牌號碼），使用格式化函數
                            if (property.hide_address_number || shouldShowOnlyRoad) {
                                if (typeof window.formatAddressForDisplay === 'function') {
                                    return window.formatAddressForDisplay(property.address, property.hide_address_number, property.type);
                                }
                            }

                            // 如果沒有勾選隱藏門牌號碼，且不是透天/別墅/店面，顯示完整地址
                            if (!property.hide_address_number && !shouldShowOnlyRoad) {
                                return property.address;
                            }

                            // 備用邏輯
                            let addr = property.address || '';
                            if (addr) {
                                if (shouldShowOnlyRoad) {
                                    addr = addr.replace(/\d+[巷弄號].*$/i, '').replace(/[\s\-]+$/, '').trim();
                                } else if (property.hide_address_number) {
                                    addr = addr.replace(/(\d+)(巷|弄|號)/g, '**$2');
                                }
                            }
                            return addr || '地址未設定';
                        })()}</span>
                    </div>
                    ` : ''}
                    
                    <a href="property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}" 
                       target="_blank"
                       onclick="event.stopPropagation();"
                       style="width: 100%; background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: clamp(0.55rem, 2.2vw, 0.65rem); border-radius: 8px; font-weight: 600; cursor: pointer; font-size: clamp(0.9rem, 2.5vw, 1rem); transition: all 0.3s ease; margin-top: 0.5rem; white-space: nowrap; text-decoration: none; text-align: center; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(102,126,234,0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
                        <i class="fas fa-info-circle"></i> 查看詳情
                    </a>
                </div>
            </div>
        `;
        
        return gridItem;
    }

    // 🎨 新增：設置預覽模式切換
    setupViewModeToggle() {
        const gridBtn = document.getElementById('view-mode-grid');
        const cardBtn = document.getElementById('view-mode-card');
        
        if (!gridBtn || !cardBtn) return;
        
        // 根據當前模式設置按鈕狀態
        if (this.viewMode === 'grid') {
            gridBtn.classList.add('active');
            cardBtn.classList.remove('active');
            gridBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            gridBtn.style.color = 'white';
            cardBtn.style.background = '#f8f9fa';
            cardBtn.style.color = '#666';
        } else {
            cardBtn.classList.add('active');
            gridBtn.classList.remove('active');
            cardBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            cardBtn.style.color = 'white';
            gridBtn.style.background = '#f8f9fa';
            gridBtn.style.color = '#666';
        }
        
        // 綁定點擊事件
        gridBtn.addEventListener('click', () => {
            this.setViewMode('grid');
        });
        
        cardBtn.addEventListener('click', () => {
            this.setViewMode('card');
        });
    }
    
    // 🎨 新增：切換預覽模式
    setViewMode(mode) {
        if (mode === this.viewMode) return;
        
        this.viewMode = mode;
        localStorage.setItem('property-view-mode', mode);
        
        // 更新按鈕樣式
        const gridBtn = document.getElementById('view-mode-grid');
        const cardBtn = document.getElementById('view-mode-card');
        
        if (mode === 'grid') {
            gridBtn.classList.add('active');
            cardBtn.classList.remove('active');
            gridBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            gridBtn.style.color = 'white';
            cardBtn.style.background = '#f8f9fa';
            cardBtn.style.color = '#666';
        } else {
            cardBtn.classList.add('active');
            gridBtn.classList.remove('active');
            cardBtn.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            cardBtn.style.color = 'white';
            gridBtn.style.background = '#f8f9fa';
            gridBtn.style.color = '#666';
        }
        
        // 重新渲染
        this.renderProperties();
        
        // 滾動到物件區域
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const propertiesSection = document.querySelector('.properties-section');
                if (propertiesSection) {
                    propertiesSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            });
        });
    }

    renderPagination(totalPages) {
        const container = document.getElementById('pagination-container');
        if (!container || totalPages <= 1) {
            if (container) container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination" style="display: flex; justify-content: center; align-items: center; gap: 0.5rem; margin: 2rem 0;">';
        
        // 上一頁按鈕
        if (this.currentPage > 1) {
            paginationHTML += `
                <button onclick="embeddedPaginationSystem.goToPage(${this.currentPage - 1})" 
                        style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; transition: all 0.3s ease;">
                    <i class="fas fa-chevron-left"></i> 上一頁
                </button>
            `;
        }

        // 頁碼按鈕 - 顯示所有頁碼
        for (let i = 1; i <= totalPages; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button onclick="embeddedPaginationSystem.goToPage(${i})" 
                        style="background: ${isActive ? '#667eea' : '#f8f9fa'}; color: ${isActive ? 'white' : '#666'}; border: ${isActive ? '2px solid #667eea' : '1px solid #ddd'}; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; font-weight: ${isActive ? 'bold' : 'normal'}; min-width: 40px;">
                    ${i}
                </button>
            `;
        }

        // 下一頁按鈕
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button onclick="embeddedPaginationSystem.goToPage(${this.currentPage + 1})" 
                        style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; transition: all 0.3s ease;">
                    下一頁 <i class="fas fa-chevron-right"></i>
                </button>
            `;
        }

        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    updateStats() {
        const container = document.getElementById('stats-container');
        if (!container) return;

        const filtered = this.getFilteredProperties();
        const total = this.properties.length;
        const showing = filtered.length;
        
        // 🔥 新增：組合篩選條件顯示
        const filterConditions = [];
        if (this.districtFilter) {
            filterConditions.push(`📍 ${this.districtFilter}`);
        }
        if (this.buildingFilter !== 'all') {
            filterConditions.push(`🏗️ ${this.buildingFilter}`);
        }
        if (this.roomFilter !== 'all') {
            filterConditions.push(`🏠 ${this.roomFilter}`);
        }
        if (this.searchTerm) {
            filterConditions.push(`🔍 "${this.searchTerm}"`);
        }
        
        const filterText = filterConditions.length > 0 
            ? `（${filterConditions.join(' + ')}）` 
            : '';
        
        container.innerHTML = `
            <div style="text-align: center; margin: 1rem 0; padding: 1rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 10px; box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3);">
                <div style="font-size: 0.9rem; font-weight: 600;">
                    顯示 <span style="font-size: 1.2rem; font-weight: 700;">${showing}</span> 個物件，共 ${total} 個
                    ${filterText ? `<br><span style="font-size: 0.85rem; opacity: 0.95; margin-top: 0.3rem; display: inline-block;">${filterText}</span>` : ''}
                </div>
            </div>
        `;
    }

    goToPage(page) {
        const totalPages = this.getTotalPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderProperties();
            
            // 滾動到物件區域的最上方
            // 使用 requestAnimationFrame 確保 DOM 完全更新後再滾動
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const propertiesSection = document.querySelector('.properties-section');
                    
                    if (propertiesSection) {
                        // 方法 1：使用 scrollIntoView（最可靠）
                        propertiesSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    } else {
                        // 備用方案：使用 scrollTo
                        const propertiesContainer = document.getElementById('properties-container');
                        if (propertiesContainer) {
                            const containerTop = propertiesContainer.getBoundingClientRect().top + window.pageYOffset;
                            window.scrollTo({ 
                                top: containerTop, 
                                behavior: 'smooth' 
                            });
                        }
                    }
                });
            });
        }
    }

    setFilter(filter) {
        console.log(`🎯 切換篩選: ${filter}`);
        this.currentFilter = filter;
        this.currentPage = 1;
        // 篩選改變時不清空緩存，因為 getFilteredProperties 會自動處理
        this.renderProperties();
        // 篩選後滾動到物件區域的最上方
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const propertiesSection = document.querySelector('.properties-section');
                if (propertiesSection) {
                    propertiesSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            });
        });
    }

    // 🔥 新增：設定建築類型篩選
    setBuildingFilter(buildingType) {
        this.buildingFilter = buildingType;
        this.currentPage = 1;
        
        // 🚀 瞬間切換 - 直接渲染，無延遲
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        
        // 篩選後滾動到物件區域的最上方
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const propertiesSection = document.querySelector('.properties-section');
                if (propertiesSection) {
                    propertiesSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            });
        });
    }

    // 🔥 新增：設定房型篩選
    setRoomFilter(roomType) {
        this.roomFilter = roomType;
        this.currentPage = 1;
        
        // 🚀 瞬間切換 - 直接渲染，無延遲
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        
        // 篩選後滾動到物件區域的最上方
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const propertiesSection = document.querySelector('.properties-section');
                if (propertiesSection) {
                    propertiesSection.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }
            });
        });
    }

    // 🔥 新增：更新篩選數量顯示（考慮當前篩選狀態）
    updateFilterCounts() {
        // 建築類型統計 - 需考慮當前房型篩選
        const buildingCounts = {
            'all': 0,
            '電梯大樓': 0,
            '華廈': 0,
            '透天別墅': 0
        };

        // 先取得基礎篩選結果（須先套用行政區，建築類型與房型數量才對應所選行政區）
        let baseFiltered = this.properties;
        if (this.districtFilter) {
            baseFiltered = baseFiltered.filter(property => {
                const propertyDistrict = property.district || '';
                const propertyAddress = property.address || '';
                if (propertyDistrict && propertyDistrict.includes(this.districtFilter)) return true;
                if (propertyAddress.includes(this.districtFilter)) return true;
                return false;
            });
        }
        
        // 房型統計 - 依 getRoomTypeFromProperty 動態累加（含所有建築類型只要有房間數）
        const roomCounts = { 'all': 0 };

        // 統計建築類型數量（考慮房型篩選；房型一律用 getRoomTypeFromProperty，含透天別墅從 layout 解析）
        baseFiltered.forEach(property => {
            const matchRoomFilter = this.roomFilter === 'all' || this.getRoomTypeFromProperty(property) === this.roomFilter;
            if (matchRoomFilter) {
                buildingCounts['all']++;
                
                const buildingType = property.building_type || property.property_type || '電梯大樓'; // 預設為電梯大樓
                if (buildingType.includes('電梯') || buildingType === '大樓' || buildingType === '大廈') {
                    buildingCounts['電梯大樓']++;
                } else if (buildingType === '華廈') {
                    buildingCounts['華廈']++;
                } else if (buildingType.includes('透天') || buildingType.includes('別墅')) {
                    buildingCounts['透天別墅']++;
                }
            }
        });

        // 統計房型數量（考慮建築類型篩選）
        baseFiltered.forEach(property => {
            // 檢查是否符合當前建築類型篩選
            const buildingType = property.building_type || property.property_type || '電梯大樓';
            let matchBuildingFilter = this.buildingFilter === 'all';
            
            if (!matchBuildingFilter) {
                if (this.buildingFilter === '電梯大樓') {
                    matchBuildingFilter = buildingType.includes('電梯') || buildingType === '大樓' || buildingType === '大廈';
                } else if (this.buildingFilter === '華廈') {
                    matchBuildingFilter = buildingType === '華廈';
                } else if (this.buildingFilter === '透天別墅') {
                    matchBuildingFilter = buildingType.includes('透天') || buildingType.includes('別墅');
                }
            }
            
            if (matchBuildingFilter) {
                roomCounts['all']++;
                // 只要有房間數（layout 或 type 可解析），全部計入對應房型（含電梯大樓、華廈、透天、別墅、公寓等）
                const rt = this.getRoomTypeFromProperty(property);
                if (rt) roomCounts[rt] = (roomCounts[rt] || 0) + 1;
            }
        });

        // 更新建築類型按鈕數量
        document.querySelectorAll('.building-filter-button').forEach(button => {
            const building = button.getAttribute('data-building');
            const count = buildingCounts[building] || 0;
            const countSpan = button.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = `(${count})`;
                countSpan.style.opacity = '0.8';
                countSpan.style.fontSize = '0.85em';
            }
        });

        // 更新房型按鈕數量（如果按鈕存在）
        document.querySelectorAll('.room-filter-button').forEach(button => {
            const room = button.getAttribute('data-room');
            const count = roomCounts[room] || 0;
            const countSpan = button.querySelector('.count');
            if (countSpan) {
                countSpan.textContent = `(${count})`;
                countSpan.style.opacity = '0.8';
                countSpan.style.fontSize = '0.85em';
            }
        });
        
        // 返回房型統計，供動態生成按鈕使用（existingRoomTypes 為有被計數的房型）
        const existingRoomTypes = Object.keys(roomCounts).filter(k => k !== 'all');
        return { roomCounts, existingRoomTypes };
    }
    
    // 🚀 新增：動態生成房型篩選按鈕
    updateRoomFilterButtons() {
        const roomFilterContainer = document.querySelector('.room-filter');
        if (!roomFilterContainer) {
            console.warn('⚠️ 房型篩選容器不存在');
            return;
        }
        
        const buildingTypes = ['透天', '別墅', '華廈', '公寓']; // 用於排序時排除，不當作房型按鈕
        
        // 只要有房間數（layout 或 type 可解析），全部抓進房型選項（含電梯大樓、華廈、透天、別墅、公寓等）
        const existingRoomTypes = new Set();
        this.properties.forEach(property => {
            const rt = this.getRoomTypeFromProperty(property);
            if (rt) existingRoomTypes.add(rt);
        });
        
        // 定義房型顯示順序和顯示名稱
        const roomTypeOrder = ['2房', '3房', '4房', '5房', '1房', '開放式', '店住', '店面'];
        const roomTypeNames = {
            '2房': '2房', '3房': '3房', '4房': '4房', '5房': '5房',
            '套房': '1房', '1房': '1房', '開放式': '開放式', '店住': '店住', '店面': '店面'
        };
        
        // 按順序排列房型
        const sortedRoomTypes = roomTypeOrder.filter(type => existingRoomTypes.has(type));
        // 添加其他未在順序列表中的房型（但排除建築類型）
        existingRoomTypes.forEach(type => {
            if (!roomTypeOrder.includes(type) && !buildingTypes.includes(type)) {
                sortedRoomTypes.push(type);
            }
        });
        
        // 使用 DocumentFragment 一次置換，減少 F5 時閃爍
        // 重要：用 cloneNode，不要 appendChild(allButton)，否則「全部」會先被移出 DOM，
        // 在 replaceChildren 前會短暫只剩 2房、3房、4房，連續 F5 時非常明顯
        const allButton = roomFilterContainer.querySelector('[data-room="all"]');
        const frag = document.createDocumentFragment();
        
        if (allButton) {
            frag.appendChild(allButton.cloneNode(true));
        } else {
            const allBtn = document.createElement('button');
            allBtn.className = 'room-filter-button active';
            allBtn.setAttribute('data-room', 'all');
            allBtn.style.cssText = 'background: linear-gradient(45deg, #10b981, #3b82f6); color: white; border: none; padding: 0.5rem 1rem; border-radius: 18px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);';
            allBtn.innerHTML = '全部房型 <span class="count"></span>';
            frag.appendChild(allBtn);
        }
        
        sortedRoomTypes.forEach(roomType => {
            const button = document.createElement('button');
            button.className = 'room-filter-button';
            button.setAttribute('data-room', roomType);
            button.style.cssText = 'background: #f8f9fa; color: #666; border: 2px solid #e9ecef; padding: 0.5rem 1rem; border-radius: 18px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease;';
            button.innerHTML = `${roomTypeNames[roomType] || roomType} <span class="count"></span>`;
            frag.appendChild(button);
        });
        
        roomFilterContainer.replaceChildren(...Array.from(frag.childNodes));
        
        // 重新設置事件監聽器
        this.setupRoomFilterListeners();
        
        // 依目前 roomFilter 同步哪一顆按鈕為 active（避免資料重載後按鈕與篩選狀態不一致）
        var roomButtons = document.querySelectorAll('.room-filter-button');
        var roomActive = document.querySelector('.room-filter-button[data-room="' + (this.roomFilter || 'all') + '"]');
        if (roomButtons.length && roomActive) {
            this.updateRoomButtonStates(roomButtons, roomActive);
        }
    }
    
    // 🚀 新增：設置房型篩選事件監聽器
    setupRoomFilterListeners() {
        const roomButtons = document.querySelectorAll('.room-filter-button');
        roomButtons.forEach(button => {
            // 移除舊的事件監聽器（如果有的話）
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
            
            // 添加新的事件監聽器
            newButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                try {
                    // 🔥 修正：確保獲取按鈕元素，而不是子元素（如 span）
                    const clickedButton = e.target.closest('.room-filter-button');
                    if (!clickedButton) return;
                    
                    // 🚀 防抖動：避免快速連續點擊
                    if (this.isFiltering) {
                        console.log('⏳ 篩選進行中，忽略重複點擊');
                        return;
                    }
                    
                    const roomType = clickedButton.getAttribute('data-room');
                    
                    // 🚀 同步執行 - 按鈕狀態和篩選同時進行
                    this.roomFilter = roomType;
                    this.currentPage = 1;
                    
                    // 立即更新按鈕狀態（必須用目前 DOM 上的按鈕清單，單選只亮一個）
                    var currentRoomButtons = document.querySelectorAll('.room-filter-button');
                    this.updateRoomButtonStates(currentRoomButtons, clickedButton);
                    
                    // 立即執行篩選
                    this.renderProperties();
                    this.updateFilterCounts();
                    
                    // 篩選後滾動到頂部
                    setTimeout(() => {
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                    }, 30);
                } catch (error) {
                    console.error('房型篩選錯誤:', error);
                }
            });
        });
    }

    setSearch(term) {
        // 防抖：每次輸入清除前一次計時，僅在停止輸入 300ms 後才執行搜尋
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        this.searchDebounceTimer = setTimeout(() => {
            this.searchTerm = term;
            this.currentPage = 1;
            this.renderProperties();
            // 搜尋後滾動到物件區域的最上方
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const propertiesSection = document.querySelector('.properties-section');
                    if (propertiesSection) {
                        propertiesSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                });
            });
        }, this.debounceDelay);
    }

    // 更新行政區選項（只顯示有物件的行政區）
    updateDistrictOptions() {
        const districtSelect = document.getElementById('district-filter');
        if (!districtSelect) return;
        
        // 桃園市所有行政區列表
        const allDistricts = [
            '中壢區', '平鎮區', '龍潭區', '楊梅區', '新屋區', '觀音區',
            '桃園區', '龜山區', '八德區', '大溪區', '復興區', '大園區',
            '蘆竹區'
        ];
        
        // 從物件中提取所有存在的行政區
        const existingDistricts = new Set();
        
        this.properties.forEach(property => {
            // 優先使用 district 欄位
            if (property.district) {
                // 提取行政區名稱（移除「區」字，然後加上「區」確保格式一致）
                const district = property.district.replace(/區$/, '') + '區';
                if (allDistricts.includes(district)) {
                    existingDistricts.add(district);
                }
            }
            
            // 如果 district 欄位不存在，從 address 中提取
            if (property.address) {
                allDistricts.forEach(district => {
                    if (property.address.includes(district)) {
                        existingDistricts.add(district);
                    }
                });
            }
        });
        
        // 保存當前選中的值
        const currentValue = districtSelect.value;
        
        // 清空選項（保留「全部行政區」）
        districtSelect.innerHTML = '<option value="">全部行政區</option>';
        
        // 按順序添加有物件的行政區
        allDistricts.forEach(district => {
            if (existingDistricts.has(district)) {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                districtSelect.appendChild(option);
            }
        });
        
        // 恢復選中的值（如果還存在）
        if (currentValue && existingDistricts.has(currentValue)) {
            districtSelect.value = currentValue;
        }
        
        console.log('✅ 已更新行政區選項，共有', existingDistricts.size, '個行政區有物件');
    }
    
    // 設置行政區篩選
    setDistrictFilter(district) {
        this.districtFilter = district || '';
        this.currentPage = 1;
        this.filteredCache = null; // 清除緩存
        this.cacheKey = '';
        this.renderProperties();
        this.updateFilterCounts(); // 建築類型、房型數量須對應所選行政區
    }

    /**
     * 將所有篩選恢復為「全部」狀態（用於從 bfcache 返回首頁時，避免篩選與數量錯亂）
     */
    resetFiltersToAll() {
        this.buildingFilter = 'all';
        this.roomFilter = 'all';
        this.districtFilter = '';
        this.searchTerm = '';
        this.currentPage = 1;
        this.filteredCache = null;
        this.cacheKey = '';
        if (this.cardCache) this.cardCache.clear();

        // 更新建築類型按鈕狀態
        const buildingButtons = document.querySelectorAll('.building-filter-button');
        const buildingAll = document.querySelector('.building-filter-button[data-building="all"]');
        if (buildingButtons.length && buildingAll) {
            this.updateBuildingButtonStates(buildingButtons, buildingAll);
        }

        // 更新房型按鈕狀態
        const roomButtons = document.querySelectorAll('.room-filter-button');
        const roomAll = document.querySelector('.room-filter-button[data-room="all"]');
        if (roomButtons.length && roomAll) {
            this.updateRoomButtonStates(roomButtons, roomAll);
        }

        const districtSelect = document.getElementById('district-filter');
        if (districtSelect) districtSelect.value = '';

        const searchInput = document.getElementById('property-search');
        if (searchInput) searchInput.value = '';

        this.updateFilterCounts();
        this.renderProperties();
    }
    
    setupEventListeners() {
        // 確保所有必要的元素都存在
        try {
            // 搜尋功能
            const searchInput = document.getElementById('property-search');
            if (searchInput) {
                searchInput.addEventListener('input', (e) => {
                    try {
                        this.setSearch(e.target.value);
                    } catch (error) {
                        console.error('搜尋功能錯誤:', error);
                    }
                });
            } else {
                console.warn('⚠️ property-search 元素不存在');
            }
            
            // 行政區篩選功能
            const districtSelect = document.getElementById('district-filter');
            if (districtSelect) {
                districtSelect.addEventListener('change', (e) => {
                    try {
                        this.setDistrictFilter(e.target.value);
                    } catch (error) {
                        console.error('行政區篩選錯誤:', error);
                    }
                });
                
                // 初始化時更新行政區選項
                this.updateDistrictOptions();
                
                // 初始化時動態生成房型篩選按鈕
                this.updateRoomFilterButtons();
            } else {
                console.warn('⚠️ district-filter 元素不存在');
            }
        } catch (error) {
            console.error('設置搜尋事件監聽器失敗:', error);
        }

        try {
            // 🔥 建築類型篩選按鈕 - 優化版（防抖動 + 視覺回饋）
            const buildingButtons = document.querySelectorAll('.building-filter-button');
            if (buildingButtons.length === 0) {
                console.warn('⚠️ 建築類型篩選按鈕不存在');
            } else {
                buildingButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        try {
                // 🔥 修正：確保獲取按鈕元素，而不是子元素（如 span）
                const clickedButton = e.target.closest('.building-filter-button');
                if (!clickedButton) return;
                
                // 🚀 防抖動：避免快速連續點擊
                if (this.isFiltering) {
                    console.log('⏳ 篩選進行中，忽略重複點擊');
                    return;
                }
                
                const building = clickedButton.getAttribute('data-building');
                
                // 🚀 同步執行 - 按鈕狀態和篩選同時進行
                this.buildingFilter = building;
                this.currentPage = 1;
                
                // 立即更新按鈕狀態（用目前 DOM 上的按鈕清單，單選只亮一個）
                var currentBuildingButtons = document.querySelectorAll('.building-filter-button');
                this.updateBuildingButtonStates(currentBuildingButtons, clickedButton);
                
                // 立即執行篩選
                this.renderProperties();
                this.updateFilterCounts();
                
                // 篩選後滾動到頂部
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 30);
                        } catch (error) {
                            console.error('建築類型篩選錯誤:', error);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('設置建築類型篩選事件監聽器失敗:', error);
        }

        try {
            // 🔥 房型篩選按鈕 - 優化版（防抖動 + 視覺回饋）
            const roomButtons = document.querySelectorAll('.room-filter-button');
            if (roomButtons.length === 0) {
                console.warn('⚠️ 房型篩選按鈕不存在');
            } else {
                roomButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        try {
                // 🔥 修正：確保獲取按鈕元素，而不是子元素（如 span）
                const clickedButton = e.target.closest('.room-filter-button');
                if (!clickedButton) return;
                
                // 🚀 防抖動：避免快速連續點擊
                if (this.isFiltering) {
                    console.log('⏳ 篩選進行中，忽略重複點擊');
                    return;
                }
                
                const room = clickedButton.getAttribute('data-room');
                
                // 🚀 同步執行 - 按鈕狀態和篩選同時進行
                this.roomFilter = room;
                this.currentPage = 1;
                
                // 立即更新按鈕狀態（用目前 DOM 上的按鈕清單，單選只亮一個）
                var currentRoomButtons = document.querySelectorAll('.room-filter-button');
                this.updateRoomButtonStates(currentRoomButtons, clickedButton);
                
                // 立即執行篩選
                this.renderProperties();
                this.updateFilterCounts();
                
                // 篩選後滾動到頂部
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 30);
                        } catch (error) {
                            console.error('房型篩選錯誤:', error);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('設置房型篩選事件監聽器失敗:', error);
        }

        try {
            // 舊版篩選按鈕（保留相容性）
            const filterButtons = document.querySelectorAll('.filter-button');
            if (filterButtons.length > 0) {
                filterButtons.forEach(button => {
                    button.addEventListener('click', (e) => {
                        try {
                            const filter = e.target.getAttribute('data-filter');
                            this.setFilter(filter);
                
                // 更新按鈕狀態
                filterButtons.forEach(btn => {
                    btn.style.background = 'transparent';
                    btn.style.color = '#666';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                });
                
                e.target.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
                e.target.style.color = 'white';
                e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                e.target.classList.add('active');
                        } catch (error) {
                            console.error('舊版篩選錯誤:', error);
                        }
                    });
                });
            }
        } catch (error) {
            console.error('設置舊版篩選事件監聽器失敗:', error);
        }

        // 🔥 初始化時更新數量
        try {
            this.updateFilterCounts();
        } catch (error) {
            console.error('更新篩選計數失敗:', error);
        }
    }

    // 🔥 智能調整標題字體大小 - 確保文字完全適應卡片寬度
    // 🚀 優化：更快的按鈕狀態更新
    updateBuildingButtonStates(buttons, activeButton) {
        // 使用 requestAnimationFrame 確保立即更新
        requestAnimationFrame(() => {
            buttons.forEach(btn => {
                btn.style.background = '#f8f9fa';
                btn.style.color = '#666';
                btn.style.border = '2px solid #e9ecef';
                btn.style.boxShadow = 'none';
                btn.classList.remove('active');
            });
            
            activeButton.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            activeButton.style.color = 'white';
            activeButton.style.border = 'none';
            activeButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            activeButton.classList.add('active');
        });
    }
    
    // 🚀 優化：更快的房型按鈕狀態更新
    updateRoomButtonStates(buttons, activeButton) {
        // 使用 requestAnimationFrame 確保立即更新
        requestAnimationFrame(() => {
            buttons.forEach(btn => {
                btn.style.background = '#f8f9fa';
                btn.style.color = '#666';
                btn.style.border = '2px solid #e9ecef';
                btn.style.boxShadow = 'none';
                btn.classList.remove('active');
            });
            
            activeButton.style.background = 'linear-gradient(45deg, #10b981, #3b82f6)';
            activeButton.style.color = 'white';
            activeButton.style.border = 'none';
            activeButton.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
            activeButton.classList.add('active');
        });
    }
    
    // 🚀 新增：顯示篩選載入動畫
    showFilterLoading() {
        this.isFiltering = true;
        
        // 創建載入指示器
        if (!this.loadingElement) {
            this.loadingElement = document.createElement('div');
            this.loadingElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 1rem 2rem;
                border-radius: 10px;
                z-index: 9999;
                font-size: 0.9rem;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                backdrop-filter: blur(5px);
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            `;
            this.loadingElement.innerHTML = `
                <div style="width: 20px; height: 20px; border: 2px solid #f3f3f3; border-top: 2px solid #667eea; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                篩選中...
            `;
            
            // 添加旋轉動畫
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(this.loadingElement);
        }
    }
    
    // 🚀 新增：隱藏篩選載入動畫
    hideFilterLoading() {
        this.isFiltering = false;
        
        if (this.loadingElement) {
            this.loadingElement.remove();
            this.loadingElement = null;
        }
    }
    
    // 🚀 新增：預渲染常用篩選結果
    preRenderCommonFilters() {
        console.log('🚀 開始預渲染流程...');
        
        // 使用 requestIdleCallback 在瀏覽器空閒時執行預渲染
        if (window.requestIdleCallback) {
            console.log('📱 使用 requestIdleCallback 進行預渲染');
            requestIdleCallback(() => {
                console.log('⏰ requestIdleCallback 觸發，開始預渲染');
                this.preRenderFilters();
            }, { timeout: 2000 }); // 2秒後強制執行
        } else {
            // 降級方案：使用 setTimeout
            console.log('📱 使用 setTimeout 進行預渲染');
            setTimeout(() => {
                console.log('⏰ setTimeout 觸發，開始預渲染');
                this.preRenderFilters();
            }, 1000);
        }
    }
    
    // 🚀 新增：實際預渲染邏輯
    preRenderFilters() {
        // 🚀 預渲染所有可能的篩選組合
        const buildingTypes = ['all', '電梯大樓', '華廈', '透天別墅'];
        const roomTypes = ['all', '2房', '3房', '4房'];
        
        const allFilters = [];
        buildingTypes.forEach(building => {
            roomTypes.forEach(room => {
                allFilters.push({ building, room });
            });
        });
        
        // 保存當前狀態
        const originalBuilding = this.buildingFilter;
        const originalRoom = this.roomFilter;
        const originalCache = this.filteredCache;
        const originalCacheKey = this.cacheKey;
        
        let completedCount = 0;
        
        allFilters.forEach((filter, index) => {
            // 🚀 更快的預渲染 - 減少間隔時間
            setTimeout(() => {
                this.buildingFilter = filter.building;
                this.roomFilter = filter.room;
                
                // 預計算篩選結果
                const filtered = this.getFilteredProperties();
                
                // 🚀 預渲染所有卡片，確保瞬間切換
                if (filtered.length > 0) {
                    filtered.forEach(property => {
                        const cacheKey = `pre_${filter.building}_${filter.room}_${property.id}`;
                        
                        if (!this.cardCache.has(cacheKey)) {
                            const card = this.createPropertyCard(property);
                            this.cardCache.set(cacheKey, card);
                        }
                    });
                }
                
                completedCount++;
            }, index * 10); // 每個篩選間隔10ms，更快預渲染
        });
        
        // 恢復原始狀態
        setTimeout(() => {
            this.buildingFilter = originalBuilding;
            this.roomFilter = originalRoom;
            this.filteredCache = originalCache;
            this.cacheKey = originalCacheKey;
        }, allFilters.length * 20 + 100);
    }

    adjustTitleFontSize() {
        const titles = document.querySelectorAll('.property-title');
        titles.forEach(title => {
            // 獲取容器的實際可用寬度
            const container = title.parentElement;
            const containerWidth = container.offsetWidth - 40; // 減去padding和邊距
            
            // 重置字體大小
            title.style.fontSize = '';
            
            // 從較大字體開始
            let fontSize = 1.3;
            title.style.fontSize = fontSize + 'rem';
            
            // 創建一個臨時元素來測量文字寬度
            const tempElement = document.createElement('span');
            tempElement.style.cssText = `
                position: absolute;
                visibility: hidden;
                white-space: nowrap;
                font-size: ${fontSize}rem;
                font-weight: 600;
                font-family: inherit;
            `;
            tempElement.textContent = title.textContent;
            document.body.appendChild(tempElement);
            
            // 逐步縮小字體直到適合容器寬度
            while (tempElement.offsetWidth > containerWidth && fontSize > 0.5) {
                fontSize -= 0.05;
                tempElement.style.fontSize = fontSize + 'rem';
            }
            
            // 應用最終字體大小
            title.style.fontSize = fontSize + 'rem';
            
            // 清理臨時元素
            document.body.removeChild(tempElement);
        });
    }
}

// 🔥 已售物件分頁系統
class SoldPropertyPaginationSystem {
    constructor() {
        this.soldProperties = embeddedPropertiesData.properties.filter(p => p.status === 'sold');
        this.currentPage = 1;
        // 🔥 響應式分頁：手機版單欄滑動，桌面版多欄
        this.itemsPerPage = window.innerWidth <= 768 ? 1 : 4; // 手機版1個，桌面版4個
        this.searchTerm = '';
        
        // 緩存機制
        this.filteredCache = null;
        this.cacheKey = '';
        this.cardCache = new Map();
        
        this.init();
    }

    init() {
        this.renderSoldProperties();
        this.setupSoldEventListeners();
    }

    getFilteredSoldProperties() {
        const newCacheKey = `sold_${this.searchTerm}`;
        if (this.cacheKey === newCacheKey && this.filteredCache) {
            return this.filteredCache;
        }
        
        let filtered = this.soldProperties;
        
        // 搜尋功能
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(property => 
                property.title.toLowerCase().includes(term) ||
                property.address.toLowerCase().includes(term) ||
                (property.community && property.community.toLowerCase().includes(term))
            );
        }
        
        this.filteredCache = filtered;
        this.cacheKey = newCacheKey;
        
        return filtered;
    }

    getPaginatedSoldProperties() {
        const filtered = this.getFilteredSoldProperties();
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }

    getTotalSoldPages() {
        const filtered = this.getFilteredSoldProperties();
        return Math.ceil(filtered.length / this.itemsPerPage);
    }

    renderSoldProperties() {
        const container = document.getElementById('sold-properties-container');
        if (!container) return;

        const paginatedProperties = this.getPaginatedSoldProperties();
        
        if (paginatedProperties.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 2rem; color: #6c757d;">
                    <i class="fas fa-home" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                    <h3>暫無已售物件</h3>
                    <p>感謝客戶信任，更多成功案例即將展示</p>
                </div>
            `;
            this.renderSoldPagination();
            return;
        }

        // 🔥 手機版使用滑動容器
        if (window.innerWidth <= 768) {
            this.renderMobileSlideContainer(container, paginatedProperties);
        } else {
            // 桌面版使用原本的grid佈局
            const fragment = document.createDocumentFragment();
            paginatedProperties.forEach(property => {
                let card;
                if (this.cardCache.has(property.id)) {
                    card = this.cardCache.get(property.id).cloneNode(true);
                    this.rebindCardEvents(card, property);
                } else {
                    card = this.createSoldPropertyCard(property);
                    this.cardCache.set(property.id, card.cloneNode(true));
                }
                fragment.appendChild(card);
            });

            container.innerHTML = '';
            container.appendChild(fragment);
        }
        
        this.renderSoldPagination();
        
        // 調整標題字體大小
        setTimeout(() => {
            adjustTitleFontSize();
        }, 100);
    }

    createSoldPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'property-card sold-property-card';
        card.setAttribute('data-property-id', property.id);
        if (property.number) {
            card.setAttribute('data-property-number', property.number);
        }
        card.style.cssText = `
            background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 0.8rem 0.8rem 0.4rem 0.8rem;
            box-shadow: 0 3px 10px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            border: 1px solid rgba(108, 117, 125, 0.2);
            position: relative;
            overflow: hidden;
            opacity: 0.85;
        `;

        // 已售標籤
        const statusTag = document.createElement('div');
        statusTag.className = 'property-status-tag status-sold';
        statusTag.textContent = '已售出';
        statusTag.style.cssText = `
            position: absolute;
            top: 10px;
            right: 10px;
            z-index: 10;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
            color: white;
            background: linear-gradient(45deg, #6b7280, #374151);
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            box-shadow: 0 2px 8px rgba(0,0,0,0.4);
            border: 2px solid #ffffff;
        `;
        card.appendChild(statusTag);

        // 標題
        const title = document.createElement('h3');
        title.className = 'property-title';
        title.textContent = property.title;
        title.style.cssText = `
            font-size: 1rem;
            color: #6c757d;
            margin-bottom: 0.4rem;
            margin-top: 0.1rem;
            border-bottom: 2px solid transparent;
            background: linear-gradient(90deg, #6c757d, #495057) bottom/100% 2px no-repeat;
            padding-bottom: 0.3rem;
            line-height: 1.2;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        `;
        card.appendChild(title);

        // 已售物件不顯示照片，節省空間和資源

        // 物件資訊
        const infoContainer = document.createElement('div');
        infoContainer.className = 'property-info';
        infoContainer.style.cssText = `
            background: rgba(108, 117, 125, 0.05);
            border-radius: 6px;
            padding: 0.5rem;
            margin: 0.3rem 0;
        `;

        const infoGrid = document.createElement('div');
        infoGrid.className = 'info-grid';
        infoGrid.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.3rem;
            margin-bottom: 0.3rem;
        `;

        // 價格
        const priceItem = document.createElement('div');
        priceItem.className = 'info-item';
        priceItem.innerHTML = `<strong>售價：</strong>${property.price}`;
        priceItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.3rem;
            border-radius: 4px;
            font-size: 0.8rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(priceItem);

        // 格局
        if (property.layout && property.layout.trim() !== '') {
            const layoutItem = document.createElement('div');
            layoutItem.className = 'info-item';
            layoutItem.innerHTML = `<strong>格局：</strong>${property.layout}`;
            layoutItem.style.cssText = `
                background: rgba(108, 117, 125, 0.1);
                padding: 0.3rem;
                border-radius: 4px;
                font-size: 0.8rem;
                text-align: center;
                color: #6c757d;
            `;
            infoGrid.appendChild(layoutItem);
        }

        // 屋齡
        const ageItem = document.createElement('div');
        ageItem.className = 'info-item';
        ageItem.innerHTML = `<strong>屋齡：</strong>${property.age}`;
        ageItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.3rem;
            border-radius: 4px;
            font-size: 0.8rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(ageItem);

        // 坪數
        const areaItem = document.createElement('div');
        areaItem.className = 'info-item';
        const areaValue = property.total_area || property.area || '未設定';
        const formattedArea = areaValue && areaValue !== '未設定' 
            ? (areaValue.includes('坪') ? areaValue : areaValue + '坪')
            : '未設定';
        areaItem.innerHTML = `<strong>坪數：</strong>${formattedArea}`;
        areaItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.3rem;
            border-radius: 4px;
            font-size: 0.8rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(areaItem);

        infoContainer.appendChild(infoGrid);
        card.appendChild(infoContainer);

        // 已售出提示和查看詳情按鈕
        const actionContainer = document.createElement('div');
        actionContainer.style.cssText = `
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
        `;
        
        // 已售出提示
        const soldNotice = document.createElement('div');
        soldNotice.className = 'sold-notice';
        soldNotice.style.cssText = `
            flex: 1;
            text-align: center;
            padding: 0.4rem;
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.75rem;
        `;
        soldNotice.innerHTML = '✅ 已售出';
        actionContainer.appendChild(soldNotice);
        
        // 查看詳情按鈕
        const detailLink = document.createElement('a');
        detailLink.href = `property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}`;
        detailLink.target = '_blank';
        detailLink.style.cssText = `
            flex: 1;
            text-align: center;
            padding: 0.4rem;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.75rem;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
        `;
        detailLink.innerHTML = '<i class="fas fa-info-circle"></i> 查看詳情';
        detailLink.onmouseover = function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 4px 8px rgba(102,126,234,0.4)';
        };
        detailLink.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(102, 126, 234, 0.3)';
        };
        actionContainer.appendChild(detailLink);
        
        card.appendChild(actionContainer);

        return card;
    }

    // 🔥 手機版滑動容器渲染
    renderMobileSlideContainer(container, properties) {
        const allProperties = this.getFilteredSoldProperties();
        
        // 創建滑動容器
        const slideContainer = document.createElement('div');
        slideContainer.className = 'mobile-sold-slide-container';
        slideContainer.style.cssText = `
            display: flex;
            overflow-x: auto;
            gap: 1rem;
            padding: 0.5rem 0;
            scroll-behavior: smooth;
            scrollbar-width: thin;
            scrollbar-color: #6c757d #f1f1f1;
            -webkit-overflow-scrolling: touch;
        `;

        // 添加所有已售物件到滑動容器
        allProperties.forEach(property => {
            let card;
            if (this.cardCache.has(property.id)) {
                card = this.cardCache.get(property.id).cloneNode(true);
                this.rebindCardEvents(card, property);
            } else {
                card = this.createMobileSoldPropertyCard(property);
                this.cardCache.set(property.id, card.cloneNode(true));
            }
            
            // 手機版卡片樣式調整
            card.style.cssText += `
                flex-shrink: 0;
                width: 280px;
                min-width: 280px;
            `;
            
            slideContainer.appendChild(card);
        });

        container.innerHTML = '';
        container.appendChild(slideContainer);
    }

    // 🔥 手機版專用已售物件卡片（更緊湊）
    createMobileSoldPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'property-card sold-property-card mobile-sold-card';
        card.setAttribute('data-property-id', property.id);
        if (property.number) {
            card.setAttribute('data-property-number', property.number);
        }
        card.style.cssText = `
            background: linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 10px;
            padding: 0.5rem 0.5rem 0.2rem 0.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            transition: all 0.3s ease;
            border: 1px solid rgba(108, 117, 125, 0.2);
            position: relative;
            overflow: hidden;
            opacity: 0.85;
            height: auto;
            min-height: 160px;
            max-height: 160px;
        `;

        // 已售標籤
        const statusTag = document.createElement('div');
        statusTag.className = 'property-status-tag status-sold';
        statusTag.textContent = '已售出';
        statusTag.style.cssText = `
            position: absolute;
            top: 8px;
            right: 8px;
            z-index: 10;
            padding: 4px 8px;
            border-radius: 15px;
            font-size: 0.7rem;
            font-weight: 700;
            color: white;
            background: linear-gradient(45deg, #6b7280, #374151);
            text-shadow: 0 1px 3px rgba(0,0,0,0.8);
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            border: 1px solid #ffffff;
        `;
        card.appendChild(statusTag);

        // 標題
        const title = document.createElement('h3');
        title.className = 'property-title';
        title.textContent = property.title;
        title.style.cssText = `
            font-size: 0.85rem;
            color: #6c757d;
            margin-bottom: 0.2rem;
            margin-top: 0.05rem;
            border-bottom: 1px solid transparent;
            background: linear-gradient(90deg, #6c757d, #495057) bottom/100% 1px no-repeat;
            padding-bottom: 0.15rem;
            line-height: 1.1;
            font-weight: 600;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        `;
        card.appendChild(title);

        // 已售物件不顯示照片，節省空間和資源

        // 物件資訊（手機版更緊湊）
        const infoContainer = document.createElement('div');
        infoContainer.className = 'property-info';
        infoContainer.style.cssText = `
            background: rgba(108, 117, 125, 0.05);
            border-radius: 3px;
            padding: 0.3rem;
            margin: 0.1rem 0;
        `;

        const infoGrid = document.createElement('div');
        infoGrid.className = 'info-grid';
        infoGrid.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.15rem;
            margin-bottom: 0.1rem;
        `;

        // 價格
        const priceItem = document.createElement('div');
        priceItem.className = 'info-item';
        priceItem.innerHTML = `<strong>售價：</strong>${property.price}`;
        priceItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.15rem;
            border-radius: 2px;
            font-size: 0.65rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(priceItem);

        // 格局
        if (property.layout && property.layout.trim() !== '') {
            const layoutItem = document.createElement('div');
            layoutItem.className = 'info-item';
            layoutItem.innerHTML = `<strong>格局：</strong>${property.layout}`;
            layoutItem.style.cssText = `
                background: rgba(108, 117, 125, 0.1);
                padding: 0.15rem;
                border-radius: 2px;
                font-size: 0.65rem;
                text-align: center;
                color: #6c757d;
            `;
            infoGrid.appendChild(layoutItem);
        }

        // 屋齡
        const ageItem = document.createElement('div');
        ageItem.className = 'info-item';
        ageItem.innerHTML = `<strong>屋齡：</strong>${property.age}`;
        ageItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.15rem;
            border-radius: 2px;
            font-size: 0.65rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(ageItem);

        // 坪數
        const areaItem = document.createElement('div');
        areaItem.className = 'info-item';
        const areaValue2 = property.total_area || property.area || '未設定';
        const formattedArea2 = areaValue2 && areaValue2 !== '未設定' 
            ? (areaValue2.includes('坪') ? areaValue2 : areaValue2 + '坪')
            : '未設定';
        areaItem.innerHTML = `<strong>坪數：</strong>${formattedArea2}`;
        areaItem.style.cssText = `
            background: rgba(108, 117, 125, 0.1);
            padding: 0.15rem;
            border-radius: 2px;
            font-size: 0.65rem;
            text-align: center;
            color: #6c757d;
        `;
        infoGrid.appendChild(areaItem);

        infoContainer.appendChild(infoGrid);
        card.appendChild(infoContainer);

        // 已售出提示和查看詳情按鈕（手機版）
        const actionContainer = document.createElement('div');
        actionContainer.style.cssText = `
            display: flex;
            gap: 0.3rem;
            margin-top: 0.2rem;
        `;
        
        // 已售出提示
        const soldNotice = document.createElement('div');
        soldNotice.className = 'sold-notice';
        soldNotice.style.cssText = `
            flex: 1;
            text-align: center;
            padding: 0.2rem;
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border-radius: 2px;
            font-weight: 600;
            font-size: 0.6rem;
        `;
        soldNotice.innerHTML = '✅ 已售出';
        actionContainer.appendChild(soldNotice);
        
        // 查看詳情按鈕
        const detailLink = document.createElement('a');
        detailLink.href = `property-detail.html?${property.number ? 'number=' + encodeURIComponent(property.number) : 'id=' + property.id}`;
        detailLink.target = '_blank';
        detailLink.style.cssText = `
            flex: 1;
            text-align: center;
            padding: 0.2rem;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border-radius: 2px;
            font-weight: 600;
            font-size: 0.6rem;
            text-decoration: none;
            transition: all 0.3s ease;
            box-shadow: 0 1px 3px rgba(102, 126, 234, 0.3);
        `;
        detailLink.innerHTML = '<i class="fas fa-info-circle"></i> 詳情';
        detailLink.onmouseover = function() {
            this.style.transform = 'translateY(-1px)';
            this.style.boxShadow = '0 2px 6px rgba(102,126,234,0.4)';
        };
        detailLink.onmouseout = function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 1px 3px rgba(102, 126, 234, 0.3)';
        };
        actionContainer.appendChild(detailLink);
        
        card.appendChild(actionContainer);

        return card;
    }

    rebindCardEvents(card, property) {
        // 已售物件不再有照片，無需綁定照片事件
    }

    showPhotoModal(property, startIndex) {
        // 使用主要腳本中的燈箱功能
        if (typeof showLightbox === 'function') {
            showLightbox(property, startIndex);
        }
    }

    renderSoldPagination() {
        const container = document.getElementById('sold-pagination-container');
        if (!container) return;

        // 🔥 手機版不顯示分頁按鈕（使用滑動）
        if (window.innerWidth <= 768) {
            container.innerHTML = '';
            return;
        }

        const totalPages = this.getTotalSoldPages();
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHTML = '<div class="pagination" style="display: flex; justify-content: center; gap: 0.5rem; margin-top: 1.5rem; flex-wrap: wrap;">';
        
        // 上一頁按鈕
        if (this.currentPage > 1) {
            paginationHTML += `
                <button onclick="soldPaginationSystem.goToPage(${this.currentPage - 1})" 
                        style="padding: 0.5rem 1rem; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 6px; cursor: pointer; transition: all 0.3s ease;">
                    ‹ 上一頁
                </button>
            `;
        }
        
        // 頁碼按鈕
        for (let i = 1; i <= totalPages; i++) {
            const isActive = i === this.currentPage;
            paginationHTML += `
                <button onclick="soldPaginationSystem.goToPage(${i})" 
                        style="padding: 0.5rem 0.8rem; border: 1px solid #6c757d; background: ${isActive ? '#6c757d' : 'white'}; color: ${isActive ? 'white' : '#6c757d'}; border-radius: 6px; cursor: pointer; transition: all 0.3s ease; min-width: 40px;">
                    ${i}
                </button>
            `;
        }
        
        // 下一頁按鈕
        if (this.currentPage < totalPages) {
            paginationHTML += `
                <button onclick="soldPaginationSystem.goToPage(${this.currentPage + 1})" 
                        style="padding: 0.5rem 1rem; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 6px; cursor: pointer; transition: all 0.3s ease;">
                    下一頁 ›
                </button>
            `;
        }
        
        paginationHTML += '</div>';
        container.innerHTML = paginationHTML;
    }

    goToPage(page) {
        const totalPages = this.getTotalSoldPages();
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderSoldProperties();
            
            // 滾動到已售物件區域的最上方
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const soldPropertiesSection = document.querySelector('.sold-properties-section');
                    
                    if (soldPropertiesSection) {
                        // 使用 scrollIntoView（最可靠）
                        soldPropertiesSection.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'start' 
                        });
                    }
                });
            });
        }
    }

    setupSoldEventListeners() {
        // 🔥 已售物件收合功能
        const toggleButton = document.getElementById('sold-section-toggle');
        const toggleIcon = document.getElementById('sold-toggle-icon');
        const soldContent = document.getElementById('sold-content');
        
        if (toggleButton && soldContent) {
            toggleButton.addEventListener('click', () => {
                const isVisible = soldContent.style.display !== 'none';
                
                if (isVisible) {
                    // 收合
                    soldContent.style.display = 'none';
                    toggleIcon.style.transform = 'rotate(0deg)';
                    toggleButton.style.background = 'linear-gradient(135deg, #6c757d 0%, #495057 100%)';
                } else {
                    // 展開
                    soldContent.style.display = 'block';
                    toggleIcon.style.transform = 'rotate(180deg)';
                    toggleButton.style.background = 'linear-gradient(135deg, #495057 0%, #6c757d 100%)';
                    
                    // 如果已售物件還沒渲染，現在渲染
                    if (this.soldProperties.length > 0 && document.getElementById('sold-properties-container').children.length === 0) {
                        this.renderSoldProperties();
                    }
                }
            });
        }
        
        // 🔥 監聽視窗大小變化，調整分頁數量
        window.addEventListener('resize', () => {
            const newItemsPerPage = window.innerWidth <= 768 ? 1 : 4;
            if (this.itemsPerPage !== newItemsPerPage) {
                this.itemsPerPage = newItemsPerPage;
                this.currentPage = 1; // 重置到第一頁
                if (soldContent && soldContent.style.display !== 'none') {
                    this.renderSoldProperties();
                }
            }
        });
    }
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EmbeddedPropertyPaginationSystem, SoldPropertyPaginationSystem };
}
