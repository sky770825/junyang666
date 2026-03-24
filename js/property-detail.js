// 物件詳情頁邏輯（從 property-detail.html 抽出）
// 注意：supabase-config.js、modules/related-links/frontend.js 請在 property-detail.html 中依序載入，確保時序正確

const SUPABASE_URL_VALUE = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY_VALUE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

// 處理地址顯示的輔助函數（與前端一致）
function formatAddressForDisplay(address, hideAddressNumber, propertyType) {
    if (!address) return '';

    const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
    const shouldShowOnlyRoad = propertyType && typesToShowOnlyRoad.includes(propertyType);

    if (!hideAddressNumber && !shouldShowOnlyRoad) {
        return address;
    }

    if (shouldShowOnlyRoad) {
        let displayAddress = address;
        const cityDistrictMatch = displayAddress.match(/^([^路街道]+[市縣區鄉鎮])/i);
        const cityDistrict = cityDistrictMatch ? cityDistrictMatch[1] : '';
        displayAddress = displayAddress.replace(/^[^路街道]+[市縣區鄉鎮]/i, '');
        const roadPattern = /([^路街道]+(?:[一二三四五六七八九十]+段)?[路街道大道])/;
        const roadMatch = displayAddress.match(roadPattern);
        if (roadMatch) {
            return (cityDistrict + roadMatch[1]).trim();
        }
        const simpleRoadMatch = displayAddress.match(/([^路街道]*[路街道])/);
        if (simpleRoadMatch) {
            return (cityDistrict + simpleRoadMatch[1]).trim();
        }
        return address;
    }

    return address.replace(/(\d+)(巷|弄|號)/g, '**$2');
}

// 正規化物件編號（處理舊格式，例如 TT-012 → TT00012）
function normalizePropertyNumber(number) {
    if (!number || typeof number !== 'string') {
        return number;
    }
    
    const trimmedNumber = number.trim().toUpperCase();
    
    // 檢查是否已經是正確的新格式
    // 店內物件：{2字母}{5數字}，例如 TT00012
    // 店外物件：EX{2字母}{4數字}，例如 EXTT0001
    const newFormatPattern = /^([A-Z]{2}\d{5}|EX[A-Z]{2}\d{4})$/;
    if (newFormatPattern.test(trimmedNumber)) {
        return trimmedNumber; // 已經是正確格式
    }
    
    // 嘗試轉換舊格式（例如：TT-012 → TT00012）
    // 匹配模式：{字母}-{數字} 或 {字母}{數字}
    const oldFormatMatch = trimmedNumber.match(/^([A-Z]{2})[-]?(\d+)$/i);
    if (oldFormatMatch) {
        const prefix = oldFormatMatch[1].toUpperCase();
        const seq = parseInt(oldFormatMatch[2], 10);
        
        if (!isNaN(seq) && seq > 0) {
            // 店內物件：{2字母}{5數字}
            return `${prefix}${String(seq).padStart(5, '0')}`;
        }
    }
    
    // 如果無法轉換，返回清理後的原始值
    return trimmedNumber;
}

// 更新連結預覽的 meta 標籤（Open Graph, Twitter Card 等）
function updateMetaTags(property) {
    if (!property) return;
    
    const title = property.title || '未命名物件';
    const price = property.price || '';
    const address = property.address || '';
    const displayAddress = formatAddressForDisplay(
        property.address, 
        property.hide_address_number, 
        property.type
    ) || address;
    
    // 構建標題和描述
    const pageTitle = price 
        ? `${title} - ${price} | 住商不動產`
        : `${title} | 住商不動產`;
    
    const description = price && displayAddress
        ? `${title} | ${price} | ${displayAddress}`
        : price
        ? `${title} | ${price}`
        : displayAddress
        ? `${title} | ${displayAddress}`
        : title;
    
    // 更新頁面標題
    document.title = pageTitle;
    
    // 更新 Open Graph 標籤
    updateMetaTag('og:title', pageTitle);
    updateMetaTag('og:description', description);
    updateMetaTag('og:url', window.location.href);
    updateMetaTag('og:image:alt', title);
    
    // 如果有圖片，設置 og:image
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
        const firstImage = typeof property.images[0] === 'string' 
            ? property.images[0] 
            : property.images[0].url || property.images[0];
        if (firstImage) {
            updateMetaTag('og:image', firstImage);
        }
    }
    
    // 更新 Twitter Card 標籤
    updateMetaTag('twitter:url', window.location.href);
    updateMetaTag('twitter:title', pageTitle);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image:alt', title);
    if (property.images && Array.isArray(property.images) && property.images.length > 0) {
        const firstImage = typeof property.images[0] === 'string' 
            ? property.images[0] 
            : property.images[0].url || property.images[0];
        if (firstImage) {
            updateMetaTag('twitter:image', firstImage);
        }
    }
    
    // 更新標準描述
    updateMetaTag('description', description);
}

// 更新或創建 meta 標籤的輔助函數
function updateMetaTag(propertyOrName, content) {
    let selector, attribute;
    
    if (propertyOrName.startsWith('og:') || propertyOrName.startsWith('twitter:')) {
        // Open Graph 或 Twitter Card
        selector = `meta[property="${propertyOrName}"], meta[name="${propertyOrName}"]`;
        attribute = propertyOrName.startsWith('og:') ? 'property' : 'name';
    } else {
        // 標準 meta 標籤
        selector = `meta[name="${propertyOrName}"]`;
        attribute = 'name';
    }
    
    let meta = document.querySelector(selector);
    if (!meta) {
        meta = document.createElement('meta');
        if (propertyOrName.startsWith('og:')) {
            meta.setAttribute('property', propertyOrName);
        } else {
            meta.setAttribute('name', propertyOrName);
        }
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

// 從 URL 參數獲取物件編號或 ID（優先使用編號）
function getPropertyIdentifier() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        number: urlParams.get('number'),
        id: urlParams.get('id')
    };
}

// React Query 風格：單筆物件快取時間
var PROPERTY_DETAIL_STALE_MS = 5 * 60 * 1000;
var PROPERTY_DETAIL_GC_MS = 10 * 60 * 1000;

// 客戶端快取：將單筆物件寫入快取（ClientCache + DataQuery，供 loadProperty 之後使用）
function setPropertyCache(data) {
    if (!data || !data.id) return;
    if (typeof window.ClientCache !== 'undefined') {
        window.ClientCache.set('property:id:' + data.id, data);
        if (data.number) {
            window.ClientCache.set('property:number:' + String(data.number).trim().toUpperCase(), data);
        }
    }
    if (typeof window.DataQuery !== 'undefined') {
        window.DataQuery.setQueryData('property:id:' + data.id, data, { staleTime: PROPERTY_DETAIL_STALE_MS, gcTime: PROPERTY_DETAIL_GC_MS });
        if (data.number) {
            window.DataQuery.setQueryData('property:number:' + String(data.number).trim().toUpperCase(), data, { staleTime: PROPERTY_DETAIL_STALE_MS, gcTime: PROPERTY_DETAIL_GC_MS });
        }
    }
}

// 載入物件資料
async function loadProperty() {
    console.log('🚀 開始載入物件資料...');
    console.log('🔍 環境檢查:', {
        supabase: typeof supabase !== 'undefined',
        SUPABASE_CONFIG: typeof SUPABASE_CONFIG !== 'undefined',
        createSupabaseClient: typeof createSupabaseClient !== 'undefined',
        windowSupabaseClient: typeof window.supabaseClient !== 'undefined'
    });
    
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const pageEl = document.getElementById('property-page');
    
    if (!loadingEl || !errorEl || !pageEl) {
        console.error('❌ 找不到必要的 DOM 元素');
        return;
    }
    
    try {
        const { number, id } = getPropertyIdentifier();
        console.log('📋 URL 參數:', { number, id, fullUrl: window.location.href });
        
        if (!number && !id) {
            throw new Error('請提供物件編號或 ID');
        }

        // 客戶端快取：優先從 DataQuery / ClientCache 讀取（React Query 風格：staleTime / gcTime）
        var cached = null;
        if (number) {
            var norm = normalizePropertyNumber(number);
            var orig = number.trim().toUpperCase();
            if (typeof window.DataQuery !== 'undefined') {
                cached = window.DataQuery.getQueryData('property:number:' + norm) || window.DataQuery.getQueryData('property:number:' + orig);
            }
            if (!cached && typeof window.ClientCache !== 'undefined') {
                cached = window.ClientCache.get('property:number:' + norm) || window.ClientCache.get('property:number:' + orig);
            }
        }
        if (!cached && id && (typeof window.DataQuery !== 'undefined' || typeof window.ClientCache !== 'undefined')) {
            if (typeof window.DataQuery !== 'undefined') cached = window.DataQuery.getQueryData('property:id:' + id);
            if (!cached && typeof window.ClientCache !== 'undefined') cached = window.ClientCache.get('property:id:' + id);
        }
        if (cached && cached.id) {
            loadingEl.style.display = 'none';
            pageEl.style.display = 'block';
            renderProperty(cached);
            updateMetaTags(cached);
            return;
        }
        
        // 檢查 Supabase SDK 是否已載入
        if (typeof supabase === 'undefined') {
            throw new Error('Supabase SDK 尚未載入，請重新整理頁面');
        }
        
        // 使用 Supabase 設定值（單例模式，避免多個實例）
        let supabaseClient = null;
        if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
            console.log('🔄 使用現有的 Supabase 客戶端（避免多個實例）');
            supabaseClient = window.supabaseClient;
        } else {
            // 優先使用統一配置函數
            if (typeof createSupabaseClient === 'function') {
                console.log('📦 使用 createSupabaseClient 函數');
                supabaseClient = createSupabaseClient();
            } else if (typeof SUPABASE_CONFIG !== 'undefined') {
                console.log('📦 使用 SUPABASE_CONFIG');
                supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            } else {
                console.log('📦 使用內建配置值');
                supabaseClient = supabase.createClient(SUPABASE_URL_VALUE, SUPABASE_ANON_KEY_VALUE);
            }
            
            if (!supabaseClient) {
                throw new Error('無法創建 Supabase 客戶端');
            }
            
            // 儲存到全域，供其他模組使用
            window.supabaseClient = supabaseClient;
            console.log('✅ 創建新的 Supabase 客戶端（單例模式）');
        }
        
        let query = supabaseClient
            .from('properties')
            .select('*');
        
        // 優先使用編號查詢，如果沒有編號則使用 ID
        if (number) {
            // 正規化編號（處理舊格式）
            const normalizedNumber = normalizePropertyNumber(number);
            const originalNumber = number.trim().toUpperCase();
            console.log('🔍 查詢物件編號:', {
                original: number,
                cleaned: originalNumber,
                normalized: normalizedNumber
            });
            
            let propertyData = null;
            let lastError = null;
            
            // 嘗試多種編號格式查詢
            const numberVariants = [
                normalizedNumber,
                originalNumber
            ];
            
            // 如果正規化後的編號與原始不同，也嘗試原始編號
            if (normalizedNumber !== originalNumber) {
                numberVariants.push(originalNumber);
            }
            
            // 移除重複的編號
            const uniqueVariants = [...new Set(numberVariants)];
            console.log('🔄 嘗試查詢的編號變體:', uniqueVariants);
            
            for (const numVariant of uniqueVariants) {
                try {
                    console.log(`  🔎 嘗試編號: "${numVariant}"`);
                    const { data, error } = await supabaseClient
                        .from('properties')
                        .select('*')
                        .eq('number', numVariant)
                        .maybeSingle();
                    
                    if (error && error.code !== 'PGRST116') {
                        console.error(`  ❌ 查詢錯誤:`, error);
                        lastError = error;
                        continue;
                    }
                    
                    if (data) {
                        console.log(`  ✅ 找到物件:`, {
                            number: data.number,
                            title: data.title,
                            is_published: data.is_published
                        });
                        
                        // 檢查物件是否已發布（獨立頁面允許顯示未發布的物件，但可以記錄）
                        if (data.is_published === false) {
                            console.log('ℹ️ 物件未發布，但獨立頁面仍可顯示');
                        }
                        
                        setPropertyCache(data);
                        propertyData = data;
                        break;
                    } else {
                        console.log(`  ⚠️ 編號 "${numVariant}" 未找到`);
                    }
                } catch (err) {
                    console.error(`  ❌ 查詢異常:`, err);
                    lastError = err;
                }
            }
            
            if (!propertyData) {
                // 如果都找不到，嘗試查詢所有編號（用於調試）
                console.log('🔍 查詢所有物件編號（用於調試）...');
                const { data: allProperties, error: listError } = await supabaseClient
                    .from('properties')
                    .select('number, title, is_published')
                    .limit(10);
                
                if (!listError && allProperties) {
                    console.log('📋 資料庫中的前 10 個物件編號:', allProperties.map(p => ({
                        number: p.number,
                        title: p.title,
                        is_published: p.is_published
                    })));
                }
                
                throw new Error(`找不到編號為 "${number}" 的物件。已嘗試: ${uniqueVariants.join(', ')}`);
            }
            
            // 隱藏載入提示，顯示頁面
            loadingEl.style.display = 'none';
            pageEl.style.display = 'block';
            
            // 渲染物件詳細資訊
            renderProperty(propertyData);
            
            // 更新頁面標題和連結預覽 meta 標籤
            updateMetaTags(propertyData);
            return;
        } else if (id) {
            console.log('🔍 查詢物件 ID:', id);
            query = query.eq('id', id);
        } else {
            throw new Error('請提供物件編號或 ID');
        }
        
        const { data, error } = await query.single();
        
        if (error) {
            console.error('❌ 查詢物件失敗:', error);
            // 如果是 "PGRST116" 錯誤（找不到單一結果），嘗試使用 maybeSingle
            if (error.code === 'PGRST116') {
                const { data: dataArray, error: arrayError } = await query.maybeSingle();
                if (arrayError) throw arrayError;
                if (!dataArray) {
                    throw new Error(`找不到 ID 為 "${id}" 的物件`);
                }
                setPropertyCache(dataArray);
                const propertyData = dataArray;
                loadingEl.style.display = 'none';
                pageEl.style.display = 'block';
                renderProperty(propertyData);
                updateMetaTags(propertyData);
                return;
            }
            throw error;
        }
        if (!data) {
            throw new Error(`找不到 ID 為 "${id}" 的物件`);
        }
        setPropertyCache(data);
        loadingEl.style.display = 'none';
        pageEl.style.display = 'block';
        renderProperty(data);
        updateMetaTags(data);
        
    } catch (error) {
        console.error('❌ 載入物件失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
            url: window.location.href,
            pathname: window.location.pathname
        });
        
        // 確保顯示錯誤訊息，隱藏載入和頁面內容
        if (loadingEl) loadingEl.style.display = 'none';
        if (pageEl) pageEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'block';
            // 提供更詳細的錯誤訊息
            let errorMessage = error.message || '載入失敗';
            if (error.code === 'PGRST116') {
                errorMessage = '找不到指定的物件，請確認物件編號或 ID 是否正確';
            } else if (error.message && error.message.includes('找不到')) {
                errorMessage = error.message;
            } else {
                errorMessage = `載入失敗：${errorMessage}`;
            }
            const errorMsgEl = document.getElementById('error-message');
            if (errorMsgEl) {
                errorMsgEl.textContent = errorMessage;
            }
        }
    }
}

// 渲染物件詳細資訊
function renderProperty(property) {
    const pageEl = document.getElementById('property-page');

    // 🔒 地址隱私：從 Supabase 取得的是原始 address，在此替換為顯示用（遮罩）版，避免完整地址流入 DOM、iframe、連結
    property.address = formatAddressForDisplay(property.address || '', property.hide_address_number, property.type);
    const displayAddress = property.address;
    
    // 處理圖片
    let images = [];
    if (property.images) {
        if (typeof property.images === 'string') {
            try {
                images = JSON.parse(property.images);
            } catch (e) {
                images = [];
            }
        } else if (Array.isArray(property.images)) {
            images = property.images;
        }
    }
    // 優化圖片 URL（壓縮畫質、Supabase 自動 WebP）並預載入首屏主圖
    var getImgSrc = function(img) { return typeof img === 'string' ? img : (img && img.url); };
    var opt = typeof window.ImageOptimizer !== 'undefined' ? window.ImageOptimizer.getOptimizedImageUrl.bind(window.ImageOptimizer) : function(u) { return u; };
    var mainImageSrc = images.length > 0 ? getImgSrc(images[0]) : '';
    var mainImageOpt = mainImageSrc ? opt(mainImageSrc, { width: 1200, quality: 85 }) : '';
    if (mainImageOpt && typeof window.ImageOptimizer !== 'undefined') {
        window.ImageOptimizer.preloadFirstScreenImages([mainImageOpt], 1);
    }
    var optimizedForMain = images.map(function(img) {
        var u = getImgSrc(img);
        return u && typeof window.ImageOptimizer !== 'undefined' ? opt(u, { width: 1200, quality: 85 }) : u;
    });
    
    // 處理屋齡顯示
    const displayAge = property.age 
        ? (property.age.includes('年') ? property.age : property.age + '年')
        : '未設定';
    
    // 處理 transportation
    let transportation = {};
    if (property.transportation) {
        if (typeof property.transportation === 'string') {
            try {
                transportation = JSON.parse(property.transportation);
            } catch (e) {
                transportation = {};
            }
        } else {
            transportation = property.transportation;
        }
    }
    
    // 處理 features
    let features = [];
    if (property.features) {
        if (typeof property.features === 'string') {
            try {
                features = JSON.parse(property.features);
            } catch (e) {
                features = [];
            }
        } else if (Array.isArray(property.features)) {
            features = property.features;
        }
    }
    
    // 處理 Google Maps URL
    let mapUrl = property.google_maps || '';
    if (mapUrl && mapUrl.includes('<iframe')) {
        const srcMatch = mapUrl.match(/src=["']([^"']+)["']/i);
        if (srcMatch && srcMatch[1]) {
            mapUrl = srcMatch[1];
        } else {
            mapUrl = '';
        }
    }
    if (!mapUrl && property.address) {
        const encodedAddress = encodeURIComponent(property.address);
        mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
    }
    
    pageEl.innerHTML = `
        <div class="property-header">
            <div>
                <h1 class="property-title">${property.title || '未命名物件'}</h1>
                ${displayAddress ? `<p class="property-address">📍 ${displayAddress}</p>` : property.address ? `<p class="property-address">📍 ${property.address}</p>` : ''}
            </div>
            <div class="property-meta">
                <div class="meta-item">
                    <i class="fas fa-tag"></i>
                    <span>編號：${property.number || 'N/A'}</span>
                </div>
                <div class="meta-item">
                    <i class="fas fa-home"></i>
                    <span>${property.type || 'N/A'}</span>
                </div>
                ${property.status_text ? `
                <div class="meta-item">
                    <i class="fas fa-info-circle"></i>
                    <span>${property.status_text}</span>
                </div>
                ` : ''}
            </div>
        </div>
        
        <div class="property-content">
            <!-- 圖片展示（移到最上方） -->
            ${images.length > 0 ? `
            <div class="section" id="image-section">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2 class="section-title" style="margin: 0;">📸 物件照片</h2>
                    <button onclick="toggleImageGallery()" 
                            id="image-toggle-btn"
                            style="background: #667eea; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-chevron-up" id="image-toggle-icon"></i>
                        <span id="image-toggle-text">收起</span>
                    </button>
                </div>
                <div class="image-main-container" id="image-main-container">
                    <div class="image-main" id="image-main-display">
                        <img id="main-image" src="${mainImageOpt || mainImageSrc || (images[0] && getImgSrc(images[0]))}" alt="物件照片 1" decoding="async" fetchpriority="high" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect fill=\'%23ddd\' width=\'800\' height=\'600\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\'%3E圖片載入失敗%3C/text%3E%3C/svg%3E';">
                        ${images.length > 1 ? `
                        <button class="image-nav-btn prev" onclick="changeImage(-1)">
                            <i class="fas fa-chevron-left"></i>
                        </button>
                        <button class="image-nav-btn next" onclick="changeImage(1)">
                            <i class="fas fa-chevron-right"></i>
                        </button>
                        ` : ''}
                    </div>
                    <div class="image-thumbnails" id="image-thumbnails">
                        ${images.map(function(img, index) {
                            var raw = typeof img === 'string' ? img : (img && img.url);
                            var thumbSrc = raw && typeof window.ImageOptimizer !== 'undefined' ? window.ImageOptimizer.getOptimizedImageUrl(raw, { thumb: true }) : raw;
                            return `
                            <div class="image-thumbnail ${index === 0 ? 'active' : ''}" 
                                 onclick="selectImage(${index})"
                                 data-index="${index}">
                                <img src="${thumbSrc || raw}" alt="縮圖 ${index + 1}" loading="lazy" decoding="async" onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'sans-serif\' font-size=\'14\'%3E圖片載入失敗%3C/text%3E%3C/svg%3E';">
                            </div>
                        `; }).join('')}
                    </div>
                </div>
            </div>
            ` : ''}
            
            <!-- 主要資訊 -->
            <div class="section">
                <h2 class="section-title">💰 基本資訊</h2>
                <div class="info-grid">
                    <div class="info-item price-item">
                        <div class="info-label">售價</div>
                        <div class="info-value">${property.price || '未設定'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">總坪數</div>
                        <div class="info-value">${property.total_area ? (property.total_area.includes('坪') ? property.total_area : property.total_area + '坪') : '未設定'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">格局</div>
                        <div class="info-value">${property.layout || '未設定'}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">屋齡</div>
                        <div class="info-value">${displayAge}</div>
                    </div>
                    ${property.main_area ? `
                    <div class="info-item">
                        <div class="info-label">主建物</div>
                        <div class="info-value">${property.main_area.includes('坪') ? property.main_area : property.main_area + '坪'}</div>
                    </div>
                    ` : ''}
                    ${property.land_area ? `
                    <div class="info-item">
                        <div class="info-label">地坪</div>
                        <div class="info-value">${property.land_area.includes('坪') ? property.land_area : property.land_area + '坪'}</div>
                    </div>
                    ` : ''}
                    ${property.floor ? `
                    <div class="info-item">
                        <div class="info-label">樓層</div>
                        <div class="info-value">${(() => {
                            let floorDisplay = property.floor;
                            // 如果有增建資訊，特別標示
                            if (floorDisplay.includes('（增建') || floorDisplay.includes('(增建')) {
                                // 使用不同顏色標示增建部分
                                floorDisplay = floorDisplay.replace(
                                    /[（(]增建(.+?)[）)]/g, 
                                    '<span style="color: #e74c3c; font-weight: 600;">（增建$1）</span>'
                                );
                            }
                            return floorDisplay;
                        })()}</div>
                    </div>
                    ` : ''}
                    ${property.parking_type ? `
                    <div class="info-item">
                        <div class="info-label">車位類型</div>
                        <div class="info-value">${property.parking_type}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            
            <!-- 詳細描述 -->
            ${property.description ? `
            <div class="section">
                <h2 class="section-title">📝 物件描述</h2>
                <div class="description">${property.description}</div>
            </div>
            ` : ''}
            
            <!-- 交通與設施 -->
            ${(transportation.transport && transportation.transport.length > 0) || 
              (transportation.schools && transportation.schools.length > 0) || 
              (transportation.facilities && transportation.facilities.length > 0) ||
              transportation.market || transportation.park ? `
            <div class="section">
                <h2 class="section-title">🚗 交通與生活機能</h2>
                <div class="other-info-grid">
                    ${transportation.transport && transportation.transport.length > 0 ? `
                    <div class="other-info-item">
                        <div class="other-info-label">交通</div>
                        <div class="other-info-value">${transportation.transport.join('、')}</div>
                    </div>
                    ` : ''}
                    ${transportation.schools && transportation.schools.length > 0 ? `
                    <div class="other-info-item">
                        <div class="other-info-label">學校</div>
                        <div class="other-info-value">${transportation.schools.join('、')}</div>
                    </div>
                    ` : ''}
                    ${transportation.market ? `
                    <div class="other-info-item">
                        <div class="other-info-label">市場</div>
                        <div class="other-info-value">${transportation.market}</div>
                    </div>
                    ` : ''}
                    ${transportation.park ? `
                    <div class="other-info-item">
                        <div class="other-info-label">公園</div>
                        <div class="other-info-value">${transportation.park}</div>
                    </div>
                    ` : ''}
                    ${transportation.facilities && transportation.facilities.length > 0 ? `
                    <div class="other-info-item">
                        <div class="other-info-label">鄰近設施</div>
                        <div class="other-info-value">${transportation.facilities.join('、')}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- 物件特色 -->
            ${features.length > 0 ? `
            <div class="section">
                <h2 class="section-title">✨ 物件特色</h2>
                <ul style="list-style: none; padding: 0;">
                    ${features.map(feature => `
                        <li style="padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0;">
                            <i class="fas fa-check-circle" style="color: #28a745; margin-right: 0.5rem;"></i>
                            ${feature}
                        </li>
                    `).join('')}
                </ul>
            </div>
            ` : ''}
            
            <!-- TikTok 影片（有連結時顯示，放在位置地圖上方） -->
            ${(property.tiktok_video_id && String(property.tiktok_video_id).trim()) ? `
            <div class="section">
                <h2 class="section-title">📱 TikTok 影片</h2>
                <div style="max-width: 605px; margin: 0 auto;">
                    <iframe 
                        src="https://www.tiktok.com/embed/v2/${String(property.tiktok_video_id).trim()}" 
                        width="100%" 
                        height="575" 
                        style="border: none; border-radius: 8px; max-width: 605px;"
                        allowfullscreen 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
                    </iframe>
                    ${(property.tiktok_username && String(property.tiktok_username).trim()) ? `
                    <p style="margin-top: 0.75rem; text-align: center;">
                        <a href="https://www.tiktok.com/@${String(property.tiktok_username).trim().replace(/^@/, '')}" target="_blank" rel="noopener" style="color: #667eea; text-decoration: none;">@${String(property.tiktok_username).trim().replace(/^@/, '')}</a>
                    </p>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
            <!-- 地圖 -->
            ${mapUrl ? `
            <div class="section">
                <h2 class="section-title">🗺️ 位置地圖</h2>
                <div style="width: 100%; height: 400px; border-radius: 8px; overflow: hidden; margin-top: 1rem;">
                    <iframe 
                        src="${mapUrl}" 
                        width="100%" 
                        height="100%" 
                        style="border:0;" 
                        allowfullscreen="" 
                        allow="accelerometer; gyroscope; geolocation"
                        loading="lazy" 
                        referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
                <div style="margin-top: 1rem; display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                    ${!property.hide_address_number ? `
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}" 
                       target="_blank" 
                       style="background: #4285f4; color: white; padding: 0.75rem 1rem; border-radius: 8px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(66, 133, 244, 0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(66, 133, 244, 0.3)'">
                        <i class="fas fa-external-link-alt"></i> <span>在 Google Maps 中開啟</span>
                    </a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(property.address)}" 
                       target="_blank" 
                       style="background: #ff6b6b; color: white; padding: 0.75rem 1rem; border-radius: 8px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(255, 107, 107, 0.3);"
                       onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(255, 107, 107, 0.4)'"
                       onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(255, 107, 107, 0.3)'">
                        <i class="fas fa-route"></i> <span>規劃路線</span>
                    </a>
                    ` : `
                    <p style="grid-column: 1/-1; text-align: center; color: #666; font-size: 0.9rem;">地址已隱藏，如需確切位置請聯絡我們</p>
                    `}
                </div>
            </div>
            ` : ''}
        </div>
        
        <!-- 相關連結區塊（從 Supabase 動態載入） -->
        <div class="section" style="background: #f8f9fa; padding: 2rem; border-radius: 12px; margin-top: 2rem;">
            <h2 class="section-title" style="text-align: center; margin-bottom: 1.5rem;">📎 相關資料連結</h2>
            <div id="related-links-container-detail" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem;">
                <p style="text-align: center; color: #666; padding: 1rem; width: 100%;">載入中...</p>
            </div>
        </div>
        
        <!-- 聯絡方式區塊 -->
        <div class="section" style="background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); padding: 2rem; border-radius: 12px; margin-top: 2rem;">
            <h2 class="section-title" style="text-align: center; margin-bottom: 1.5rem;">
                <span style="background: linear-gradient(45deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">📞 聯絡方式</span>
            </h2>
            <div class="contact-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.8rem; max-width: 1200px; margin: 0 auto;">
                <!-- 聯絡方式卡片 -->
                <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); padding: 1.8rem; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid rgba(102, 126, 234, 0.1); position: relative; overflow: hidden; display: flex; flex-direction: column; height: 100%;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                    <h3 style="color: #2c3e50; margin-bottom: 1.2rem; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                        <span style="background: linear-gradient(45deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">👥 聯絡方式</span>
                    </h3>
                    <div style="flex: 1;">
                        <p style="margin-bottom: 0.8rem; font-size: 1rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem; background: rgba(102, 126, 234, 0.05); border-radius: 8px; border-left: 3px solid #667eea;">
                            <i class="bi bi-person-fill" style="color: #667eea; font-size: 1.1rem;"></i>
                            <span style="font-weight: 600;">劉子菲</span>
                            <a href="tel:0925666597" style="color: #e74c3c; text-decoration: none; font-weight: bold; margin-left: auto; display: flex; align-items: center; gap: 0.25rem;">
                                <i class="bi bi-phone-fill"></i> 0925-666-597
                            </a>
                        </p>
                        <p style="margin-bottom: 0.8rem; font-size: 1rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem; background: rgba(102, 126, 234, 0.05); border-radius: 8px; border-left: 3px solid #667eea;">
                            <i class="bi bi-person-fill" style="color: #667eea; font-size: 1.1rem;"></i>
                            <span style="font-weight: 600;">蔡濬瑒</span>
                            <a href="tel:0928776755" style="color: #e74c3c; text-decoration: none; font-weight: bold; margin-left: auto; display: flex; align-items: center; gap: 0.25rem;">
                                <i class="bi bi-phone-fill"></i> 0928-776-755
                            </a>
                        </p>
                        <p style="margin-bottom: 1.2rem; font-size: 1rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.6rem; background: rgba(0, 200, 81, 0.05); border-radius: 8px; border-left: 3px solid #00c851;">
                            <i class="bi bi-chat-dots-fill" style="color: #00c851; font-size: 1.1rem;"></i>
                            <span style="font-weight: 600;">LINE：@931aeinu</span>
                            <button onclick="copyLineId()" style="background: linear-gradient(45deg, #00c851, #00a085); color: white; border: none; padding: 0.3rem 0.7rem; border-radius: 12px; cursor: pointer; font-size: 0.8rem; margin-left: auto; transition: all 0.3s ease;" title="複製 LINE ID">
                                <i class="bi bi-copy"></i> 複製
                            </button>
                        </p>
                    </div>
                    <div style="display: flex; gap: 0.8rem; flex-wrap: wrap; margin-top: auto; padding-top: 1rem;">
                        <a href="tel:0928776755" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3); flex: 1; justify-content: center; font-size: 0.85rem;"
                           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(102, 126, 234, 0.4)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(102, 126, 234, 0.3)'">
                            <i class="bi bi-telephone-outbound-fill"></i> 立即來電
                        </a>
                        <a href="https://lin.ee/Lax7jMka" target="_blank" style="background: linear-gradient(45deg, #00c851, #00a085); color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 20px; text-decoration: none; font-weight: 600; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(0, 200, 81, 0.3); flex: 1; justify-content: center; font-size: 0.85rem;"
                           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 5px 15px rgba(0, 200, 81, 0.4)'"
                           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 3px 12px rgba(0, 200, 81, 0.3)'">
                            <i class="fa-brands fa-line"></i> LINE聯絡
                        </a>
                    </div>
                </div>
                <!-- 經紀業資訊卡片 -->
                <div style="background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%); padding: 1.8rem; border-radius: 15px; box-shadow: 0 8px 25px rgba(0,0,0,0.1); border: 1px solid rgba(102, 126, 234, 0.1); position: relative; overflow: hidden; display: flex; flex-direction: column; height: 100%;">
                    <div style="position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2);"></div>
                    <h3 style="color: #2c3e50; margin-bottom: 1.2rem; font-size: 1.2rem; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                        <span style="background: linear-gradient(45deg, #667eea, #764ba2); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">🏢 經紀業資訊</span>
                    </h3>
                    <div style="flex: 1;">
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-buildings" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">公司：常鴻悦豐企業社</span>
                        </p>
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-person-badge-fill" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">營業員：蔡濬瑒（112）桃市字第432900號</span>
                        </p>
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-person-badge-fill" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">營業員：劉子菲（113）桃市字第467056號</span>
                        </p>
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-person-vcard-fill" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">經紀人：葉靜蓉（104）新北經證字第003119號</span>
                        </p>
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-geo-alt-fill" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">服務據點：住商不動產楊梅大順店</span>
                        </p>
                        <p style="margin-bottom: 0.6rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem; background: rgba(102, 126, 234, 0.05); border-radius: 6px;">
                            <i class="bi bi-clock-fill" style="color: #667eea; font-size: 1rem;"></i>
                            <span style="font-weight: 600;">營業時間：09:00–21:00</span>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 儲存圖片陣列供燈箱使用（原始 URL）；主圖切換使用優化 URL
    window.propertyImages = images;
    window.propertyImagesOptimized = typeof optimizedForMain !== 'undefined' ? optimizedForMain : [];
    
    // 設置圖片互動功能
    setupImageInteractions();
    
    // 載入相關連結（從後端 API，使用與備份檔案一致的樣式）
    function loadRelatedLinksOnPage() {
        const maxRetries = 30; // 最多重試 15 秒
        let retries = 0;
        
        function tryLoad() {
            // 檢查新模組是否已載入
            const hasModule = typeof window.RelatedLinksFrontend !== 'undefined' && 
                             typeof window.RelatedLinksFrontend.renderRelatedLinks === 'function';
            
            if (hasModule) {
                console.log('✅ 開始載入相關連結（從後端 API，使用 contact-button 樣式）');
                window.RelatedLinksFrontend.renderRelatedLinks('related-links-container-detail').catch(error => {
                    console.error('❌ 載入相關連結失敗:', error);
                    const container = document.getElementById('related-links-container-detail');
                    if (container) {
                        container.innerHTML = '<p style="text-align: center; color: #dc3545; padding: 1rem;">載入連結失敗</p>';
                    }
                });
            } else if (retries < maxRetries) {
                retries++;
                if (retries % 5 === 0) {
                    console.warn(`⚠️ RelatedLinksFrontend 尚未載入 (${retries}/${maxRetries})`, {
                        RelatedLinksFrontend: typeof window.RelatedLinksFrontend,
                        renderRelatedLinks: typeof window.RelatedLinksFrontend?.renderRelatedLinks,
                        windowKeys: Object.keys(window).filter(k => k.includes('Related') || k.includes('Link'))
                    });
                }
                setTimeout(tryLoad, 500);
            } else {
                console.error('❌ 載入相關連結超時');
                const container = document.getElementById('related-links-container-detail');
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
        
        // 監聽腳本載入事件
        window.addEventListener('relatedLinksScriptLoaded', function() {
            console.log('📦 收到相關連結腳本載入事件');
            setTimeout(tryLoad, 200); // 給模組一點時間初始化
        }, { once: true });
        
        // 也監聽模組準備就緒事件
        window.addEventListener('relatedLinksFrontendReady', function() {
            console.log('📦 收到相關連結前端準備就緒事件');
            tryLoad();
        }, { once: true });
        
        // 立即開始嘗試載入（如果模組已經載入）
        setTimeout(tryLoad, 500);
        
        // 監聽自定義事件（優先使用）
        window.addEventListener('relatedLinksFrontendReady', function handler() {
            console.log('📢 收到 relatedLinksFrontendReady 事件');
            window.removeEventListener('relatedLinksFrontendReady', handler);
            setTimeout(tryLoad, 100);
        }, { once: true });
        
        // 立即檢查一次（腳本可能已經載入）
        setTimeout(tryLoad, 100);
        
        // 頁面載入完成後也嘗試載入
        if (document.readyState === 'complete') {
            setTimeout(tryLoad, 500);
        } else {
            window.addEventListener('load', () => {
                setTimeout(tryLoad, 500);
            });
        }
    }
    
    loadRelatedLinksOnPage();
}

// 切換房產資訊選單
function togglePropertyInfoMenu() {
    const menu = document.getElementById('propertyInfoMenu');
    if (menu) {
        menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
    }
}

// 點擊外部關閉選單
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('propertyInfoDropdown');
    const menu = document.getElementById('propertyInfoMenu');
    if (dropdown && menu && !dropdown.contains(event.target) && !menu.contains(event.target)) {
        menu.style.display = 'none';
    }
});

// 複製 LINE ID
function copyLineId() {
    const lineId = '@931aeinu';
    navigator.clipboard.writeText(lineId).then(() => {
        alert('LINE ID 已複製：' + lineId);
    }).catch(() => {
        // 備用方案
        const textarea = document.createElement('textarea');
        textarea.value = lineId;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('LINE ID 已複製：' + lineId);
    });
}

// 當前顯示的圖片索引
let currentImageIndex = 0;

// 選擇圖片（主圖使用優化 URL 以維持壓縮畫質）
function selectImage(index) {
    if (!window.propertyImages || index < 0 || index >= window.propertyImages.length) return;
    
    currentImageIndex = index;
    var raw = window.propertyImages[index];
    var url = typeof raw === 'string' ? raw : (raw && raw.url);
    var displayUrl = (window.propertyImagesOptimized && window.propertyImagesOptimized[index]) || url;
    const mainImage = document.getElementById('main-image');
    if (mainImage) {
        mainImage.src = displayUrl || url;
        // 🔥 添加錯誤處理，避免 404 錯誤
        mainImage.onerror = function() {
            this.onerror = null;
            this.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'800\' height=\'600\'%3E%3Crect fill=\'%23ddd\' width=\'800\' height=\'600\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'sans-serif\' font-size=\'18\'%3E圖片載入失敗%3C/text%3E%3C/svg%3E';
        };
    }
    
    // 更新縮圖活動狀態
    const thumbnails = document.querySelectorAll('.image-thumbnail');
    thumbnails.forEach((thumb, i) => {
        if (i === index) {
            thumb.classList.add('active');
        } else {
            thumb.classList.remove('active');
        }
    });
}

// 切換圖片（左右切換）
function changeImage(direction) {
    if (!window.propertyImages || window.propertyImages.length === 0) return;
    
    const newIndex = currentImageIndex + direction;
    if (newIndex < 0) {
        selectImage(window.propertyImages.length - 1);
    } else if (newIndex >= window.propertyImages.length) {
        selectImage(0);
    } else {
        selectImage(newIndex);
    }
}

// 切換圖片展示區域（展開/收起）
function toggleImageGallery() {
    const mainContainer = document.getElementById('image-main-container');
    const toggleIcon = document.getElementById('image-toggle-icon');
    const toggleText = document.getElementById('image-toggle-text');
    
    if (mainContainer) {
        if (mainContainer.style.display === 'none') {
            mainContainer.style.display = 'block';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-up';
            if (toggleText) toggleText.textContent = '收起';
        } else {
            mainContainer.style.display = 'none';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-down';
            if (toggleText) toggleText.textContent = '展開';
        }
    }
}

// 圖片燈箱功能（點擊主圖時開啟全屏）
function openImageLightbox(index) {
    if (!window.propertyImages || window.propertyImages.length === 0) return;
    
    const lightbox = document.createElement('div');
    lightbox.id = 'image-lightbox';
    lightbox.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
    `;
    
    const img = document.createElement('img');
    img.src = window.propertyImages[index];
    // 🔥 添加錯誤處理，避免 404 錯誤
    img.onerror = function() {
        this.onerror = null;
        this.src = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'300\'%3E%3Crect fill=\'%23ddd\' width=\'400\' height=\'300\'/%3E%3Ctext x=\'50%25\' y=\'50%25\' text-anchor=\'middle\' dy=\'.3em\' fill=\'%23999\' font-family=\'sans-serif\' font-size=\'14\'%3E圖片載入失敗%3C/text%3E%3C/svg%3E';
    };
    img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
    `;
    
    lightbox.appendChild(img);
    document.body.appendChild(lightbox);
    
    lightbox.onclick = () => lightbox.remove();
    
    // 鍵盤導航
    const handleKey = (e) => {
        if (e.key === 'Escape') {
            lightbox.remove();
            document.removeEventListener('keydown', handleKey);
        } else if (e.key === 'ArrowLeft' && index > 0) {
            lightbox.remove();
            document.removeEventListener('keydown', handleKey);
            openImageLightbox(index - 1);
        } else if (e.key === 'ArrowRight' && index < window.propertyImages.length - 1) {
            lightbox.remove();
            document.removeEventListener('keydown', handleKey);
            openImageLightbox(index + 1);
        }
    };
    document.addEventListener('keydown', handleKey);
}

// 點擊主圖時開啟燈箱
// 注意：這個函數會在 renderProperty 完成後被調用
function setupImageInteractions() {
    setTimeout(() => {
        const mainImage = document.getElementById('main-image');
        if (mainImage) {
            mainImage.style.cursor = 'pointer';
            mainImage.addEventListener('click', () => {
                openImageLightbox(currentImageIndex);
            });
        }
    }, 100);
}

// 修正返回按鈕：若從首頁進入則用 history.back() 保留首頁已載入的物件，避免重新載入後物件變少
function fixBackButtonPath() {
    const backButton = document.getElementById('back-button-link');
    if (!backButton) return;
    const isInAdminDashboard = window.location.pathname.includes('/admin-dashboard/');
    backButton.href = isInAdminDashboard ? '../index.html' : 'index.html';
    backButton.addEventListener('click', function(e) {
        var ref = document.referrer || '';
        var fromIndex = ref.indexOf('index.html') !== -1;
        if (fromIndex && window.history.length > 1) {
            e.preventDefault();
            window.history.back();
        }
    });
}

// 頁面載入時執行
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOMContentLoaded 事件觸發');
    console.log('📍 當前 URL:', window.location.href);
    console.log('📍 當前路徑:', window.location.pathname);
    
    // 修正返回按鈕路徑
    fixBackButtonPath();
    
    // 確保頁面顯示載入狀態（防止顯示首頁內容）
    const loadingEl = document.getElementById('loading');
    const errorEl = document.getElementById('error');
    const pageEl = document.getElementById('property-page');
    
    if (loadingEl) loadingEl.style.display = 'block';
    if (errorEl) errorEl.style.display = 'none';
    if (pageEl) pageEl.style.display = 'none';
    
    // 檢查 Supabase SDK 是否已載入
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 尚未載入，等待載入...');
        let retries = 0;
        const maxRetries = 10;
        const checkSupabase = setInterval(() => {
            retries++;
            if (typeof supabase !== 'undefined') {
                console.log('✅ Supabase SDK 已載入');
                clearInterval(checkSupabase);
                loadProperty();
            } else if (retries >= maxRetries) {
                console.error('❌ Supabase SDK 載入超時');
                clearInterval(checkSupabase);
                if (loadingEl) loadingEl.style.display = 'none';
                if (errorEl) {
                    errorEl.style.display = 'block';
                    document.getElementById('error-message').textContent = '無法載入必要的資源，請重新整理頁面';
                }
            }
        }, 500);
    } else {
        console.log('✅ Supabase SDK 已就緒，開始載入物件資料');
        loadProperty();
    }
});

// 如果 DOMContentLoaded 已經觸發，立即執行
if (document.readyState === 'loading') {
    console.log('⏳ 等待 DOMContentLoaded...');
} else {
    console.log('✅ DOM 已就緒，立即執行 loadProperty');
    fixBackButtonPath();
    if (typeof supabase !== 'undefined') {
        loadProperty();
    } else {
        console.warn('⚠️ Supabase SDK 尚未載入，等待載入...');
        setTimeout(() => {
            if (typeof supabase !== 'undefined') {
                loadProperty();
            } else {
                console.error('❌ Supabase SDK 載入失敗');
                const loadingEl = document.getElementById('loading');
                const errorEl = document.getElementById('error');
                if (loadingEl) loadingEl.style.display = 'none';
                if (errorEl) {
                    errorEl.style.display = 'block';
                    document.getElementById('error-message').textContent = '無法載入必要的資源，請重新整理頁面';
                }
            }
        }, 1000);
    }
}
