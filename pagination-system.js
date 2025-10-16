// 分頁系統模組 - 從標準版本提取
// 包含完整的物件分頁、搜尋、篩選功能

// 修改分頁系統以使用內嵌資料
class EmbeddedPropertyPaginationSystem {
    constructor() {
        this.properties = embeddedPropertiesData.properties;
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
        
        this.init();
    }

    init() {
        this.renderProperties();
        this.setupEventListeners();
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

        // 🔥 優化：檢查卡片緩存，避免重複創建
        paginatedProperties.forEach(property => {
            let card;
            if (this.cardCache.has(property.id)) {
                console.log(`📦 使用緩存的卡片: ${property.id}`);
                card = this.cardCache.get(property.id).cloneNode(true);
                
                // 重新綁定事件監聽器
                this.rebindCardEvents(card, property);
            } else {
                console.log(`🔨 創建新卡片: ${property.id}`);
                card = this.createPropertyCard(property);
                // 儲存原始卡片到緩存
                this.cardCache.set(property.id, card.cloneNode(true));
            }
            fragment.appendChild(card);
        });

        // 🔥 優化：一次性更新 DOM
        container.innerHTML = '';
        container.appendChild(fragment);

        // 渲染分頁按鈕
        this.renderPagination(this.getTotalPages());

        // 更新統計資訊
        this.updateStats();
        
        // 自動調整標題字體大小
        setTimeout(() => {
            this.adjustTitleFontSize();
        }, 100);
    }

    // 🔥 新增：重新綁定事件監聽器
    rebindCardEvents(card, property) {
        // 重新綁定照片點擊事件
        const photoItems = card.querySelectorAll('.photo-item');
        photoItems.forEach((item, index) => {
            item.onclick = () => openLightbox(index, property.id);
        });
        
        // 重新綁定詳細資訊按鈕
        const detailBtn = card.querySelector('button[onclick*="showPropertyDetails"]');
        if (detailBtn) {
            detailBtn.onclick = () => showPropertyDetails(property.id);
        }
        
        // 重新綁定貸款試算按鈕
        const loanBtn = card.querySelector('button[onclick*="showLoanCalculator"]');
        if (loanBtn) {
            loanBtn.onclick = () => showLoanCalculator(property.id);
        }
        
        // 重新綁定地圖點擊
        const mapIframe = card.querySelector('div[onclick*="showMapModal"]');
        if (mapIframe) {
            mapIframe.onclick = () => showMapModal(property.id);
        }
        
        // 重新綁定 TikTok 點擊
        const tiktokPreview = card.querySelector('div[onclick*="showTikTokModal"]');
        if (tiktokPreview) {
            tiktokPreview.onclick = () => showTikTokModal(property.id);
        }
    }

    createPropertyCard(property) {
        const card = document.createElement('div');
        card.className = 'property-card';
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
                        <div class="photo-item" onclick="openLightbox(${index}, '${property.id}')" 
                             style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 4px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <img src="${img}" alt="物件照片" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.style.display='none'">
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
                            <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer;" onclick="showMapModal('${property.id}')">
                                <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" width="100%" height="120" style="border:0;" allow="" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                                <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                    <div style="background: rgba(0,0,0,0.7); color: white; padding: 6px 12px; border-radius: 15px; font-size: 0.75rem; font-weight: 600;">
                                        <i class="fas fa-expand"></i> 地圖
                                    </div>
                                </div>
                            </div>
                            
                            <!-- TikTok 預覽 -->
                            <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer; background: ${property.tiktok_thumbnail ? '#000' : 'linear-gradient(135deg, #000000, #fe2c55)'}; display: flex; align-items: center; justify-content: center; height: 120px;" onclick="showTikTokModal('${property.id}')">
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
                        <div style="border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: relative; cursor: pointer;" onclick="showMapModal('${property.id}')">
                            <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" width="100%" height="120" style="border:0;" allow="" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                            <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s ease;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0'">
                                <div style="background: rgba(0,0,0,0.7); color: white; padding: 8px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">
                                    <i class="fas fa-expand"></i> 查看大地圖
                                </div>
                            </div>
                        </div>
                    `}
                </div>
                
                <div style="display: flex; gap: 10px; justify-content: center; align-items: center; position: relative; margin-bottom: 0;">
                    <button onclick="showPropertyDetails('${property.id}')" 
                            style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3); flex: 1; font-size: 1rem;">
                        <i class="fas fa-info-circle"></i> 詳細資訊
                    </button>
                    <button onclick="showLoanCalculator('${property.id}')" 
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
        console.log(`🏗️ 建築類型篩選: ${buildingType}`);
        this.buildingFilter = buildingType;
        this.currentPage = 1;
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        // 篩選後滾動到頂部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
    }

    // 🔥 新增：設定房型篩選
    setRoomFilter(roomType) {
        console.log(`🏠 房型篩選: ${roomType}`);
        this.roomFilter = roomType;
        this.currentPage = 1;
        this.renderProperties();
        this.updateFilterCounts(); // 更新數量顯示
        // 篩選後滾動到頂部
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
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

        // 🔥 建築類型篩選按鈕
        const buildingButtons = document.querySelectorAll('.building-filter-button');
        buildingButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 🔥 修正：確保獲取按鈕元素，而不是子元素（如 span）
                const clickedButton = e.target.closest('.building-filter-button');
                if (!clickedButton) return;
                
                const building = clickedButton.getAttribute('data-building');
                this.setBuildingFilter(building);
                
                // 更新按鈕狀態
                buildingButtons.forEach(btn => {
                    btn.style.background = '#f8f9fa';
                    btn.style.color = '#666';
                    btn.style.border = '2px solid #e9ecef';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                });
                
                clickedButton.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
                clickedButton.style.color = 'white';
                clickedButton.style.border = 'none';
                clickedButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
                clickedButton.classList.add('active');
            });
        });

        // 🔥 房型篩選按鈕
        const roomButtons = document.querySelectorAll('.room-filter-button');
        roomButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                // 🔥 修正：確保獲取按鈕元素，而不是子元素（如 span）
                const clickedButton = e.target.closest('.room-filter-button');
                if (!clickedButton) return;
                
                const room = clickedButton.getAttribute('data-room');
                this.setRoomFilter(room);
                
                // 更新按鈕狀態
                roomButtons.forEach(btn => {
                    btn.style.background = '#f8f9fa';
                    btn.style.color = '#666';
                    btn.style.border = '2px solid #e9ecef';
                    btn.style.boxShadow = 'none';
                    btn.classList.remove('active');
                });
                
                clickedButton.style.background = 'linear-gradient(45deg, #10b981, #3b82f6)';
                clickedButton.style.color = 'white';
                clickedButton.style.border = 'none';
                clickedButton.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.3)';
                clickedButton.classList.add('active');
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

    // 調整標題字體大小
    adjustTitleFontSize() {
        const titles = document.querySelectorAll('.property-title');
        titles.forEach(title => {
            const text = title.textContent;
            if (text.length > 25) {
                title.style.fontSize = '0.9rem';
            } else if (text.length > 20) {
                title.style.fontSize = '1rem';
            }
        });
    }
}

// 匯出供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EmbeddedPropertyPaginationSystem;
}
