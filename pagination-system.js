// 分頁系統模組 - 從標準版本提取
// 包含完整的物件分頁、搜尋、篩選功能

// 修改分頁系統以使用內嵌資料
class EmbeddedPropertyPaginationSystem {
    constructor() {
        // 🔥 分離已售和未售物件
        this.allProperties = embeddedPropertiesData.properties;
        this.properties = this.allProperties.filter(p => p.status !== 'sold'); // 只顯示未售物件
        this.soldProperties = this.allProperties.filter(p => p.status === 'sold'); // 已售物件
        
        this.currentPage = 1;
        this.itemsPerPage = embeddedPropertiesData.settings.itemsPerPage || 4;
        this.currentFilter = 'all'; // 保留舊版相容性
        this.searchTerm = '';
        
        // 🔥 新增：雙重篩選
        this.buildingFilter = 'all'; // 建築類型篩選
        this.roomFilter = 'all'; // 房型篩選
        
        // 🔥 新增：緩存機制
        this.filteredCache = null;
        this.cacheKey = '';
        this.cardCache = new Map(); // 緩存已創建的卡片 DOM
        
        // 🔥 新增：防抖動計時器
        this.searchDebounceTimer = null;
        this.debounceDelay = 300; // 300ms 延遲
        
        // 🚀 新增：篩選狀態管理
        this.isFiltering = false;
        this.loadingElement = null;
        
        this.init();
    }

    init() {
        this.renderProperties();
        this.setupEventListeners();
        this.setupEventDelegation(); // 🚀 新增：設置事件委託
        
        // 🚀 立即開始預渲染（不等待空閒時間）
        setTimeout(() => {
            this.preRenderFilters();
        }, 100); // 100ms 後立即開始預渲染
    }

    getFilteredProperties() {
        // 🔥 新增：檢查緩存（包含雙重篩選）
        const newCacheKey = `${this.buildingFilter}_${this.roomFilter}_${this.searchTerm}`;
        if (this.cacheKey === newCacheKey && this.filteredCache) {
            console.log('📦 使用緩存的篩選結果');
            return this.filteredCache;
        }
        
        console.log('🔄 重新計算篩選結果');
        let filtered = this.properties;
        
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
        
        // 🔥 房型篩選
        if (this.roomFilter !== 'all') {
            filtered = filtered.filter(property => property.type === this.roomFilter);
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
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return filtered.slice(startIndex, endIndex);
    }

    getTotalPages() {
        const filtered = this.getFilteredProperties();
        return Math.ceil(filtered.length / this.itemsPerPage);
    }

    renderProperties() {
        const container = document.getElementById('properties-container');
        if (!container) return;

        const paginatedProperties = this.getPaginatedProperties();
        
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
            return;
        }

        // 🚀 優化：批量創建卡片，優先使用預渲染快取
        const cards = [];
        paginatedProperties.forEach(property => {
            let card;
            
            // 🚀 優先檢查預渲染快取
            const preRenderKey = `pre_${this.buildingFilter}_${this.roomFilter}_${property.id}`;
            if (this.cardCache.has(preRenderKey)) {
                card = this.cardCache.get(preRenderKey).cloneNode(true);
                // 🚀 事件委託已處理，無需重新綁定事件
            } else if (this.cardCache.has(property.id)) {
                card = this.cardCache.get(property.id).cloneNode(true);
                // 🚀 事件委託已處理，無需重新綁定事件
            } else {
                card = this.createPropertyCard(property);
                // 儲存原始卡片到緩存
                this.cardCache.set(property.id, card.cloneNode(true));
            }
            cards.push(card);
        });

        // 🚀 真正的瞬間切換 - 無任何延遲
        container.innerHTML = '';
        cards.forEach(card => fragment.appendChild(card));
        container.appendChild(fragment);
        
        // 立即執行其他操作
        this.renderPagination(this.getTotalPages());
        this.updateStats();
        
        // 🚀 延遲調整標題字體大小，避免阻塞主線程
        requestAnimationFrame(() => {
            this.adjustTitleFontSize();
        });
    }

    // 🚀 新增：設置事件委託
    setupEventDelegation() {
        const container = document.getElementById('properties-container');
        if (!container) return;
        
        // 使用事件委託處理所有卡片內的點擊事件
        container.addEventListener('click', (e) => {
            const target = e.target;
            const card = target.closest('.property-card');
            if (!card) return;
            
            const propertyId = card.getAttribute('data-property-id');
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
            
            // 處理按鈕點擊
            const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
            if (action) {
                e.preventDefault();
                e.stopPropagation();
                switch (action) {
                    case 'details':
                        if (typeof showPropertyDetails === 'function') {
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

    // 🔥 新增：重新綁定事件監聽器
    rebindCardEvents(card, property) {
        // 🚀 優化：使用 data 屬性而不是重新綁定事件
        // 設置 data 屬性，讓事件委託處理
        card.setAttribute('data-property-id', property.id);
        
        // 為照片項目設置索引
        const photoItems = card.querySelectorAll('.photo-item');
        photoItems.forEach((item, index) => {
            item.setAttribute('data-photo-index', index);
        });
        
        // 為按鈕設置 data 屬性
        const detailBtn = card.querySelector('button[onclick*="showPropertyDetails"]');
        if (detailBtn) {
            detailBtn.setAttribute('data-action', 'details');
        }
        
        const loanBtn = card.querySelector('button[onclick*="showLoanCalculator"]');
        if (loanBtn) {
            loanBtn.setAttribute('data-action', 'loan');
        }
        
        const mapIframe = card.querySelector('div[onclick*="showMapModal"]');
        if (mapIframe) {
            mapIframe.setAttribute('data-action', 'map');
        }
        
        const tiktokPreview = card.querySelector('div[onclick*="showTikTokModal"]');
        if (tiktokPreview) {
            tiktokPreview.setAttribute('data-action', 'tiktok');
        }
    }

    createPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'property-card';
        card.setAttribute('data-property-id', property.id); // 🚀 設置 data 屬性
        card.innerHTML = `
            ${property.status && property.statusText ? `
                <div class="property-status-tag status-${property.status}">
                    ${property.statusText}
                </div>
            ` : ''}
            <h3 class="property-title">${property.title}</h3>
            
            <!-- 照片滾動區 -->
            <div class="photo-scroll-container" style="margin: 0.6rem 0; overflow-x: auto; padding: 0.5rem 0;">
                <div class="photo-scroll" style="display: flex; gap: 0.5rem; width: max-content;">
                    ${property.images.map((img, index) => `
                        <div class="photo-item" data-photo-index="${index}" 
                             style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 4px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1); position: relative;"
                             onclick="if(typeof openLightbox === 'function') { openLightbox(${index}, '${property.id}'); } else { console.error('openLightbox 函數未載入'); }">
                            <img src="${img}" alt="物件照片" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;" loading="lazy" onerror="this.style.display='none'">
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- 物件資訊 -->
            <div class="property-info" style="padding: 0.8rem; background: #f8f9fa; border-radius: 8px; margin: 0.5rem 0;">
                <div style="display: flex; gap: 0.3rem; margin-bottom: 0.6rem;">
                    <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 4px; font-weight: 600;">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">售價</div>
                        <div style="font-size: 1.2rem;">${property.price}</div>
                    </div>
                    <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 4px; font-weight: 600;">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">坪數</div>
                        <div style="font-size: 1.2rem;">${property.total_area || property.area || '未設定'}</div>
                    </div>
                </div>
                
                <div style="margin-bottom: 0.6rem;">
                    <strong>📍 地址：</strong>${property.address}
                </div>
                
                ${property.layout ? `
                <div style="margin-bottom: 0.6rem; display: flex; gap: 0.3rem;">
                    <div style="flex: 1; padding: 0.3rem 0.2rem; background: #e8f5e8; border-radius: 4px; text-align: center; font-size: 1.3rem;">
                        <strong>格局：</strong>${property.layout}
                    </div>
                    <div style="flex: 1; padding: 0.3rem 0.2rem; background: #e8f5e8; border-radius: 4px; text-align: center; font-size: 1.3rem;">
                        <strong>屋齡：</strong>${property.age || '未設定'}
                    </div>
                </div>
                ` : ''}
                
                <!-- 街景地圖 & TikTok 預覽區 -->
                <div style="margin-bottom: 0.6rem;">
                    ${property.tiktok_video_id ? `
                        <!-- 2欄佈局：地圖 + TikTok -->
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                            <!-- 地圖預覽 -->
                            <div class="map-preview-container" style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer;" data-action="map">
                                <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" width="100%" height="120" style="border:0; pointer-events: none;" allow="" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
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
                            <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" width="100%" height="120" style="border:0; pointer-events: none;" allow="" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                            <div class="map-overlay" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease; pointer-events: auto; z-index: 10;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                <div style="background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                                    <i class="fas fa-expand"></i> 查看大地圖
                                </div>
                            </div>
                        </div>
                    `}
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center; position: relative; margin-bottom: 0;">
                    <button data-action="details" 
                            style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); flex: 1; font-size: 1rem;">
                        <i class="fas fa-info-circle"></i> 詳細資訊
                    </button>
                    <button data-action="loan" 
                            style="background: linear-gradient(45deg, #10b981, #3b82f6); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3); flex: 1; font-size: 1rem;">
                        <i class="fas fa-calculator"></i> 貸款試算
                    </button>
                    ${property.number ? `
                    <div style="position: absolute; bottom: -8px; right: -8px; background: rgba(102, 126, 234, 0.9); color: white; padding: 2px 6px; border-radius: 10px; font-size: 0.7rem; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
                        ${property.number}
                    </div>
                    ` : ''}
                </div>
            </div>
        `;
        return card;
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
            // 確保在DOM更新後再滾動
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                // 備用滾動方法
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }, 100);
        }
    }

    setFilter(filter) {
        console.log(`🎯 切換篩選: ${filter}`);
        this.currentFilter = filter;
        this.currentPage = 1;
        // 篩選改變時不清空緩存，因為 getFilteredProperties 會自動處理
        this.renderProperties();
        // 篩選後滾動到頂部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }, 100);
    }

    // 🔥 新增：設定建築類型篩選
    setBuildingFilter(buildingType) {
        this.buildingFilter = buildingType;
        this.currentPage = 1;
        
        // 🚀 瞬間切換 - 直接渲染，無延遲
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        
        // 篩選後滾動到頂部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 30);
    }

    // 🔥 新增：設定房型篩選
    setRoomFilter(roomType) {
        this.roomFilter = roomType;
        this.currentPage = 1;
        
        // 🚀 瞬間切換 - 直接渲染，無延遲
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        
        // 篩選後滾動到頂部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 30);
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

        // 房型統計 - 需考慮當前建築類型篩選
        const roomCounts = {
            'all': 0,
            '2房': 0,
            '3房': 0,
            '4房': 0
        };

        // 先取得基礎篩選結果
        let baseFiltered = this.properties;

        // 統計建築類型數量（考慮房型篩選）
        baseFiltered.forEach(property => {
            // 檢查是否符合當前房型篩選
            const matchRoomFilter = this.roomFilter === 'all' || property.type === this.roomFilter;
            
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
                if (property.type) {
                    roomCounts[property.type] = (roomCounts[property.type] || 0) + 1;
                }
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

        // 更新房型按鈕數量
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
    }

    setSearch(term) {
        // 🔥 新增：防抖動搜尋
        console.log(`🔍 搜尋輸入: ${term}`);
        
        // 清除之前的計時器
        if (this.searchDebounceTimer) {
            clearTimeout(this.searchDebounceTimer);
        }
        
        // 設定新的計時器
        this.searchDebounceTimer = setTimeout(() => {
            console.log(`✅ 執行搜尋: ${term}`);
            this.searchTerm = term;
            this.currentPage = 1;
            this.renderProperties();
            // 搜尋後滾動到頂部
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                document.documentElement.scrollTop = 0;
                document.body.scrollTop = 0;
            }, 100);
        }, this.debounceDelay);
    }

    setupEventListeners() {
        // 搜尋功能
        const searchInput = document.getElementById('property-search');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.setSearch(e.target.value);
            });
        }

        // 🔥 建築類型篩選按鈕 - 優化版（防抖動 + 視覺回饋）
        const buildingButtons = document.querySelectorAll('.building-filter-button');
        buildingButtons.forEach(button => {
            button.addEventListener('click', (e) => {
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
                
                // 立即更新按鈕狀態
                this.updateBuildingButtonStates(buildingButtons, clickedButton);
                
                // 立即執行篩選
                this.renderProperties();
                this.updateFilterCounts();
                
                // 篩選後滾動到頂部
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 30);
            });
        });

        // 🔥 房型篩選按鈕 - 優化版（防抖動 + 視覺回饋）
        const roomButtons = document.querySelectorAll('.room-filter-button');
        roomButtons.forEach(button => {
            button.addEventListener('click', (e) => {
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
                
                // 立即更新按鈕狀態
                this.updateRoomButtonStates(roomButtons, clickedButton);
                
                // 立即執行篩選
                this.renderProperties();
                this.updateFilterCounts();
                
                // 篩選後滾動到頂部
                setTimeout(() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 30);
            });
        });

        // 舊版篩選按鈕（保留相容性）
        const filterButtons = document.querySelectorAll('.filter-button');
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
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
            });
        });

        // 🔥 初始化時更新數量
        this.updateFilterCounts();
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
        areaItem.innerHTML = `<strong>坪數：</strong>${property.total_area}`;
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

        // 已售出提示
        const soldNotice = document.createElement('div');
        soldNotice.className = 'sold-notice';
        soldNotice.style.cssText = `
            text-align: center;
            padding: 0.4rem;
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border-radius: 4px;
            font-weight: 600;
            margin-top: 0.3rem;
            font-size: 0.75rem;
        `;
        soldNotice.innerHTML = '✅ 已售出';
        card.appendChild(soldNotice);

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
        areaItem.innerHTML = `<strong>坪數：</strong>${property.total_area}`;
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

        // 已售出提示（手機版更小）
        const soldNotice = document.createElement('div');
        soldNotice.className = 'sold-notice';
        soldNotice.style.cssText = `
            text-align: center;
            padding: 0.2rem;
            background: linear-gradient(135deg, #6c757d, #495057);
            color: white;
            border-radius: 2px;
            font-weight: 600;
            margin-top: 0.1rem;
            font-size: 0.6rem;
        `;
        soldNotice.innerHTML = '✅ 已售出';
        card.appendChild(soldNotice);

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
