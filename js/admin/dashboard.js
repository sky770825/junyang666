// 後台儀表板主邏輯（從 admin-dashboard.html 抽出）
// HTML 轉義函數（防止 XSS）
function escapeHtml(text) {
    if (text == null) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

// 使用統一的 Supabase 配置（從 supabase-config.js 載入）
// 如果配置檔案未載入，使用備用配置
const SUPABASE_URL = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.url) 
    ? SUPABASE_CONFIG.url 
    : 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.anonKey) 
    ? SUPABASE_CONFIG.anonKey 
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

let supabaseClient = null;

// 初始化 Supabase 客戶端（統一函數，使用統一配置，單例模式）
function initSupabaseClient() {
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 尚未載入');
        return null;
    }
    
    // 使用全域單例，避免多個實例
    if (typeof window.supabaseClient !== 'undefined' && window.supabaseClient) {
        console.log('🔄 使用現有的 Supabase 客戶端（避免多個實例）');
        supabaseClient = window.supabaseClient;
        return supabaseClient;
    }
    
    if (!supabaseClient) {
        console.log('🔄 初始化 Supabase 客戶端...');
        try {
            // 優先使用統一配置函數
            if (typeof createSupabaseClient === 'function') {
                supabaseClient = createSupabaseClient({
                    global: { headers: { 'x-client-info': 'admin-dashboard' } }
                });
            } else {
                // 備用：直接創建
                supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                    db: { schema: 'public' },
                    auth: { persistSession: false },
                    global: { headers: { 'x-client-info': 'admin-dashboard' } }
                });
            }
            // 儲存到全域，供其他模組使用
            window.supabaseClient = supabaseClient;
            console.log('✅ Supabase 客戶端初始化成功（單例模式）');
        } catch (error) {
            console.error('❌ Supabase 客戶端初始化失敗:', error);
            return null;
        }
    }
    return supabaseClient;
}

// 診斷 Supabase 連接
async function diagnoseSupabaseConnection() {
    console.log('🔍 開始診斷 Supabase 連接...');
    
    // 檢查 Supabase SDK
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 未載入');
        return { success: false, error: 'Supabase SDK 未載入' };
    }
    console.log('✅ Supabase SDK 已載入');
    
    // 初始化客戶端
    const client = initSupabaseClient();
    if (!client) {
        console.error('❌ 無法初始化 Supabase 客戶端');
        return { success: false, error: '無法初始化 Supabase 客戶端' };
    }
    
    // 測試查詢
    try {
        console.log('🔄 測試查詢 related_links 表...');
        const { data, error } = await client
            .from('related_links')
            .select('*')
            .limit(1);
        
        if (error) {
            console.error('❌ Supabase 查詢失敗:', error);
            return { success: false, error: error.message || '查詢失敗' };
        }
        
        console.log('✅ Supabase 查詢成功，找到', data?.length || 0, '筆資料');
        return { success: true, data };
    } catch (error) {
        console.error('❌ Supabase 查詢異常:', error);
        return { success: false, error: error.message || '查詢異常' };
    }
}

// 在頁面載入時執行診斷
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(diagnoseSupabaseConnection, 1000);
    });
} else {
    setTimeout(diagnoseSupabaseConnection, 1000);
}
let allProperties = [];
let currentFilter = 'all';
let viewMode = 'table'; // 'table' 或 'grid'（物件列表頁面）
let dashboardViewMode = 'grid'; // 'table' 或 'grid'（儀表板最近物件，預設為網格模式）

// 生成物件獨立網頁的 URL
function getPropertyDetailUrl(property) {
    if (!property) return '#';
    
    // 獲取當前頁面的基礎路徑
    let basePath = window.location.pathname;
    
    // 移除檔案名稱，只保留目錄路徑
    if (basePath.includes('/')) {
        const lastSlash = basePath.lastIndexOf('/');
        basePath = basePath.substring(0, lastSlash + 1);
    } else {
        // 如果沒有斜線，說明在根目錄
        basePath = '/';
    }
    
    // 確保 basePath 以 / 結尾
    if (!basePath.endsWith('/')) {
        basePath = basePath + '/';
    }
    
    // 構建完整 URL
    const baseUrl = window.location.origin + basePath;
    
    // 優先使用物件編號
    if (property.number && property.number !== 'N/A' && property.number !== '' && property.number !== null) {
        const url = `${baseUrl}property-detail.html?number=${encodeURIComponent(property.number)}`;
        console.log('🔗 生成獨立頁 URL:', url, '基礎路徑:', basePath);
        return url;
    } 
    // 如果沒有編號，使用 ID
    else if (property.id) {
        const url = `${baseUrl}property-detail.html?id=${encodeURIComponent(property.id)}`;
        console.log('🔗 生成獨立頁 URL:', url, '基礎路徑:', basePath);
        return url;
    }
    
    // 如果都沒有，返回空連結
    console.warn('⚠️ 無法生成物件連結：缺少編號和 ID', property);
    return '#';
}

// 🎨 顯示可愛的彈窗
function showCuteModal(type, title, message, url = null) {
    // 移除現有的彈窗
    const existingModal = document.querySelector('.cute-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 創建彈窗
    const overlay = document.createElement('div');
    overlay.className = 'cute-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = `cute-modal ${type}`;
    
    // 根據類型選擇圖標和顏色
    let icon = '✨';
    if (type === 'success') {
        icon = '🎉';
    } else if (type === 'error') {
        icon = '😢';
    } else if (type === 'warning') {
        icon = '⚠️';
    }
    
    modal.innerHTML = `
        <button class="cute-modal-close" onclick="this.closest('.cute-modal-overlay').remove()">×</button>
        <div class="cute-modal-content">
            <div class="cute-modal-icon">${icon}</div>
            <div class="cute-modal-title">${title}</div>
            <div class="cute-modal-message">${message}</div>
            ${url ? `<div class="cute-modal-url">${url}</div>` : ''}
            <div class="cute-modal-buttons">
                ${url ? `
                    <button class="cute-modal-btn cute-modal-btn-primary" data-url="${url.replace(/"/g, '&quot;')}">
                        📋 再次複製
                    </button>
                ` : ''}
                <button class="cute-modal-btn cute-modal-btn-secondary">
                    關閉
                </button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // 綁定按鈕事件
    const primaryBtn = modal.querySelector('.cute-modal-btn-primary');
    const secondaryBtn = modal.querySelector('.cute-modal-btn-secondary');
    
    if (primaryBtn && url) {
        primaryBtn.addEventListener('click', function() {
            navigator.clipboard.writeText(url).then(() => {
                this.textContent = '✅ 已複製！';
                this.style.background = '#4caf50';
                this.style.color = 'white';
                setTimeout(() => {
                    overlay.remove();
                }, 1000);
            }).catch(err => {
                console.error('複製失敗:', err);
                this.textContent = '❌ 複製失敗';
                this.style.background = '#f5576c';
            });
        });
    }
    
    if (secondaryBtn) {
        secondaryBtn.addEventListener('click', function() {
            overlay.remove();
        });
    }
    
    // 點擊背景關閉
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
            overlay.remove();
        }
    });
    
    // ESC 鍵關閉
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    
    // 3秒後自動關閉（成功時）
    if (type === 'success') {
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.style.animation = 'fadeInOverlay 0.3s ease-out reverse';
                setTimeout(() => overlay.remove(), 300);
            }
        }, 3000);
    }
}

// 複製物件獨立網頁連結
function copyPropertyLink(property) {
    const url = getPropertyDetailUrl(property);
    if (url === '#') {
        showCuteModal('error', '無法生成連結', '缺少物件編號或 ID，請檢查物件資料');
        return;
    }
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
            showCuteModal('success', '連結已複製！', '連結已成功複製到剪貼簿，可以直接貼上使用囉～', url);
        }).catch(err => {
            console.error('複製失敗:', err);
            fallbackCopy(url);
        });
    } else {
        fallbackCopy(url);
    }
}

// 備用複製方法
function fallbackCopy(url) {
    const textarea = document.createElement('textarea');
    textarea.value = url;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showCuteModal('success', '連結已複製！', '連結已成功複製到剪貼簿，可以直接貼上使用囉～', url);
    } catch (err) {
        console.error('複製失敗:', err);
        showCuteModal('error', '複製失敗', '無法自動複製，請手動複製以下連結：', url);
    }
    document.body.removeChild(textarea);
}

// 打開物件獨立網頁
function openPropertyDetail(property) {
    const url = getPropertyDetailUrl(property);
    if (url === '#') {
        showCuteModal('error', '無法開啟連結', '缺少物件編號或 ID，請檢查物件資料');
        return;
    }
    window.open(url, '_blank');
}

// 顯示 QR Code 彈窗
function downloadQRCode(property) {
    const url = getPropertyDetailUrl(property);
    if (url === '#') {
        showCuteModal('error', '無法生成 QR Code', '缺少物件編號或 ID，請檢查物件資料');
        return;
    }
    
    // 移除現有的 QR Code 彈窗
    const existingModal = document.querySelector('.qrcode-modal-overlay');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 創建彈窗
    const overlay = document.createElement('div');
    overlay.className = 'cute-modal-overlay qrcode-modal-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'qrcode-modal';
    
    const fileName = property.number && property.number !== 'N/A' && property.number !== '' 
        ? `QRCode-${property.number}.png` 
        : `QRCode-${property.id || 'property'}.png`;
    
    modal.innerHTML = `
        <button class="cute-modal-close" onclick="this.closest('.qrcode-modal-overlay').remove()">×</button>
        <div class="qrcode-modal-content">
            <div class="qrcode-modal-title">📱 QR Code</div>
            <div class="qrcode-container">
                <div class="qrcode-loading">⏳ 正在生成 QR Code...</div>
            </div>
            <div class="qrcode-modal-buttons">
                <button class="qrcode-modal-btn qrcode-modal-btn-primary" id="download-qrcode-btn" disabled style="white-space: nowrap;">
                    💾 下載 QR Code
                </button>
                <button class="qrcode-modal-btn qrcode-modal-btn-secondary" onclick="this.closest('.qrcode-modal-overlay').remove()" style="white-space: nowrap;">
                    關閉
                </button>
            </div>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    const container = modal.querySelector('.qrcode-container');
    const downloadBtn = modal.querySelector('#download-qrcode-btn');
    let qrcodeImage = null;
    
    // 使用本地函式庫生成 QR Code
    function generateQRCode() {
        // 檢查 QRCode 函式庫是否已載入（等待一下讓函式庫有時間載入）
        function checkAndGenerate() {
            const QRCodeLib = window.QRCode || (typeof QRCode !== 'undefined' ? QRCode : null);
            
            if (!QRCodeLib || typeof QRCodeLib !== 'function') {
                // 如果還沒載入，等待一下再檢查
                if (container.querySelector('.qrcode-loading') && !container.querySelector('.qrcode-loading').textContent.includes('❌')) {
                    setTimeout(checkAndGenerate, 500);
                    return;
                }
                
                // 如果已經等待過，顯示錯誤並嘗試重新載入
                container.innerHTML = '<div class="qrcode-loading" style="color: #f5576c;">❌ 無法載入 QR Code 函式庫<br><small>正在嘗試重新載入...</small></div>';
                console.error('QRCode 函式庫未載入');
                console.log('檢查 window.QRCode:', typeof window.QRCode);
                console.log('檢查 QRCode:', typeof QRCode);
                
                // 嘗試重新載入函式庫
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js';
                script.onload = () => {
                    console.log('✅ QRCode 函式庫重新載入成功');
                    setTimeout(checkAndGenerate, 100); // 重新檢查
                };
                script.onerror = () => {
                    console.error('❌ QRCode 函式庫重新載入失敗');
                    container.innerHTML = '<div class="qrcode-loading" style="color: #f5576c;">❌ 無法載入 QR Code 函式庫<br><small>請檢查網路連線或重新整理頁面</small></div>';
                };
                document.head.appendChild(script);
                return;
            }
            
            // 函式庫已載入，開始生成
            generateWithLibrary(QRCodeLib);
        }
        
        // 實際生成 QR Code 的函數
        function generateWithLibrary(QRCodeLib) {
        
            try {
                // 檢測是否為手機版，決定 QR Code 大小
                const isMobile = window.innerWidth <= 768;
                const qrSize = isMobile ? 200 : 300;
                
                // 創建一個臨時的隱藏 div 來生成 QR Code
                const tempDiv = document.createElement('div');
                tempDiv.style.width = qrSize + 'px';
                tempDiv.style.height = qrSize + 'px';
                tempDiv.style.position = 'absolute';
                tempDiv.style.left = '-9999px';
                tempDiv.style.top = '-9999px';
                document.body.appendChild(tempDiv);
                
                // 使用 qrcodejs 生成 QR Code
                const qrcode = new QRCodeLib(tempDiv, {
                    text: url,
                    width: qrSize,
                    height: qrSize,
                    colorDark: '#000000',
                    colorLight: '#FFFFFF',
                    correctLevel: QRCodeLib.CorrectLevel ? QRCodeLib.CorrectLevel.H : 2
                });
            
                // 等待 QR Code 生成完成
                setTimeout(() => {
                    try {
                        const canvas = tempDiv.querySelector('canvas');
                        const img = tempDiv.querySelector('img');
                        
                        if (!canvas && !img) {
                            throw new Error('無法找到 QR Code 元素');
                        }
                        
                        container.innerHTML = '';
                        
                        if (canvas) {
                            // 對於 canvas，創建一個新的 canvas 並複製內容
                            const newCanvas = document.createElement('canvas');
                            newCanvas.width = qrSize;
                            newCanvas.height = qrSize;
                            newCanvas.style.width = qrSize + 'px';
                            newCanvas.style.height = qrSize + 'px';
                            newCanvas.style.display = 'block';
                            newCanvas.style.maxWidth = '100%';
                            newCanvas.style.maxHeight = '100%';
                            newCanvas.style.margin = '0 auto';
                            const ctx = newCanvas.getContext('2d');
                            ctx.drawImage(canvas, 0, 0, qrSize, qrSize);
                            container.appendChild(newCanvas);
                            qrcodeImage = newCanvas;
                            console.log('✅ QR Code canvas 已添加到容器');
                        } else if (img) {
                            // 對於 img，直接移動或複製
                            const newImg = img.cloneNode(true);
                            newImg.style.width = qrSize + 'px';
                            newImg.style.height = qrSize + 'px';
                            newImg.style.display = 'block';
                            newImg.style.maxWidth = '100%';
                            newImg.style.maxHeight = '100%';
                            newImg.style.margin = '0 auto';
                            container.appendChild(newImg);
                            qrcodeImage = newImg;
                            console.log('✅ QR Code img 已添加到容器');
                        }
                        
                        // 確保容器可見
                        container.style.display = 'flex';
                        container.style.justifyContent = 'center';
                        container.style.alignItems = 'center';
                        
                        downloadBtn.disabled = false;
                        
                        // 綁定下載事件
                        downloadBtn.onclick = function() {
                            let targetElement = qrcodeImage;
                            
                            // 如果是 img，需要轉換為 canvas
                            if (qrcodeImage.tagName === 'IMG') {
                                const newCanvas = document.createElement('canvas');
                                newCanvas.width = 300;
                                newCanvas.height = 300;
                                const ctx = newCanvas.getContext('2d');
                                ctx.drawImage(qrcodeImage, 0, 0);
                                targetElement = newCanvas;
                            }
                            
                            // 確保是 canvas 才能使用 toBlob
                            if (targetElement.tagName === 'CANVAS') {
                                targetElement.toBlob((blob) => {
                                    if (!blob) {
                                        showCuteModal('error', '轉換失敗', '無法將 QR Code 轉換為圖片');
                                        return;
                                    }
                                    
                                    const downloadUrl = URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = downloadUrl;
                                    link.download = fileName;
                                    
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    
                                    setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
                                    showCuteModal('success', 'QR Code 已下載！', `QR Code 已成功下載為 ${fileName}`);
                                }, 'image/png');
                            } else {
                                showCuteModal('error', '下載失敗', '無法轉換 QR Code 為圖片');
                            }
                        };
                        
                        document.body.removeChild(tempDiv);
                    } catch (error) {
                        console.error('生成 QR Code 失敗:', error);
                        container.innerHTML = '<div class="qrcode-loading" style="color: #f5576c;">❌ 生成失敗：' + (error.message || '未知錯誤') + '</div>';
                        if (tempDiv.parentNode) {
                            document.body.removeChild(tempDiv);
                        }
                    }
                }, 200);
            } catch (error) {
                console.error('生成 QR Code 失敗:', error);
                container.innerHTML = '<div class="qrcode-loading" style="color: #f5576c;">❌ 生成失敗：' + (error.message || '未知錯誤') + '</div>';
            }
        }
        
        // 開始檢查並生成
        checkAndGenerate();
    }
    
    // 開始生成 QR Code
    generateQRCode();
}

// 背景刷新間隔（30分鐘）
const REFRESH_INTERVAL = 30 * 60 * 1000; // 30分鐘 = 1800000 毫秒
let refreshTimer = null;

// 背景自動刷新函數
function startBackgroundRefresh() {
    // 清除現有的定時器
    if (refreshTimer) {
        clearInterval(refreshTimer);
    }
    
    // 設置新的定時器：每30分鐘刷新一次
    refreshTimer = setInterval(() => {
        // 只在頁面可見時才刷新（使用 Page Visibility API）
        if (!document.hidden) {
            refreshCurrentTab();
        }
    }, REFRESH_INTERVAL);
    
    console.log('✅ 背景自動刷新已啟動（每30分鐘）');
}

// 刷新當前活動的標籤頁
function refreshCurrentTab() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    const tabId = activeTab.id;
    console.log('🔄 背景刷新：', tabId);
    
    if (tabId === 'dashboard-tab') {
        // 刷新儀表板
        loadDashboard();
    } else if (tabId === 'properties-tab') {
        // 刷新物件管理（如果列表子標籤是活動的）
        if (document.getElementById('property-list-subtab')?.classList.contains('active')) {
            loadProperties();
        }
    }
    // 其他標籤頁不需要自動刷新
}

// 初始化
function init() {
    initSupabaseClient();
    loadDashboard();
    
    // 啟動背景自動刷新
    startBackgroundRefresh();
    
    // 監聽頁面可見性變化（延遲刷新，避免一回來就卡頓）
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) return;
        clearTimeout(window._visibilityRefreshTimer);
        window._visibilityRefreshTimer = setTimeout(refreshCurrentTab, 400);
    });
    
    // 事件委派：處理動態生成的按鈕點擊
    document.addEventListener('click', function(e) {
        const button = e.target.closest('[data-action]');
        if (!button) return;
        
        const action = button.dataset.action;
        const propertyId = button.dataset.propertyId;
        
        if (!propertyId) return;
        
        switch (action) {
            case 'toggle':
                const newStatus = button.dataset.status === 'true';
                togglePublish(propertyId, newStatus);
                break;
            case 'edit':
                editProperty(propertyId);
                break;
            case 'delete':
                deleteProperty(propertyId);
                break;
        }
    });
    
    // 監聽 iframe（新增/編輯表單）儲存成功後的通知，切換到物件列表並刷新
    window.addEventListener('message', function(e) {
        if (e.data && e.data.type === 'propertySaved' && e.data.action === 'switchToList') {
            const listSubTab = document.getElementById('property-list-tab');
            if (listSubTab) {
                switchPropertySubTab('list', listSubTab);
                loadProperties();
                updateStats();
            }
        }
    });
}

// 切換標籤
function switchTab(tabName, element) {
    // 更新導航
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    element.classList.add('active');
    
    // 更新內容
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // 載入對應資料
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'properties') {
        // 如果切換到物件管理標籤，載入列表（如果列表子標籤是活動的）
        if (document.getElementById('property-list-subtab').classList.contains('active')) {
            loadProperties();
        } else {
            loadPropertyAddForm();
        }
    } else if (tabName === 'duplicates') {
        // 重複物件檢測頁面已載入，等待用戶點擊檢測
    } else if (tabName === 'links') {
        // 載入連結列表（使用模組化函數）
        console.log('🔄 切換到連結管理標籤，開始載入連結...');
        console.log('📋 RelatedLinksBackend 狀態:', typeof RelatedLinksBackend);
        if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.loadRelatedLinks) {
            console.log('✅ 使用模組化版本載入連結');
            RelatedLinksBackend.loadRelatedLinks();
        } else {
            console.warn('⚠️ 模組未載入，使用舊版本函數');
            if (typeof loadRelatedLinks === 'function') {
                loadRelatedLinks(); // 備用：使用舊函數
            } else {
                console.error('❌ 找不到 loadRelatedLinks 函數');
            }
        }
    }
}

// 切換物件管理的子標籤
function switchPropertySubTab(subTabName, element) {
    // 更新子標籤按鈕狀態
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    element.classList.add('active');
    
    // 更新子標籤內容
    document.querySelectorAll('.property-subtab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    if (subTabName === 'list') {
        document.getElementById('property-list-subtab').classList.add('active');
        loadProperties();
    } else if (subTabName === 'add') {
        document.getElementById('property-add-subtab').classList.add('active');
        loadPropertyAddForm();
    }
}

// 載入新增物件表單
function loadPropertyAddForm() {
    const container = document.getElementById('property-add-form-container');
    if (!container) return;
    
    // 如果已經載入過，直接返回
    if (container.dataset.loaded === 'true') {
        return;
    }
    
    // 使用 iframe 載入 property-admin-db.html 的新增表單頁面
    // 這樣可以保持所有功能完整，包括圖片上傳等
    container.innerHTML = `
        <iframe 
            id="property-add-iframe" 
            src="property-admin-db.html?tab=add" 
            style="width: 100%; min-height: 800px; border: none; border-radius: 8px;"
            onload="adjustIframeHeight()">
        </iframe>
    `;
    
    container.dataset.loaded = 'true';
}

// 調整 iframe 高度
function adjustIframeHeight() {
    const iframe = document.getElementById('property-add-iframe');
    if (iframe && iframe.contentWindow) {
        try {
            const height = iframe.contentWindow.document.body.scrollHeight;
            iframe.style.height = Math.max(height, 800) + 'px';
        } catch (e) {
            // 跨域限制，使用固定高度
            iframe.style.height = '1200px';
        }
    }
}

// 載入儀表板（儀表板資料與統計並行請求，減少等待時間）
async function loadDashboard() {
    try {
        const [recentRes, statsRes] = await Promise.all([
            supabaseClient.from('properties').select('*').order('updated_at', { ascending: false }).limit(10),
            supabaseClient.from('properties').select('is_published, status, is_external')
        ]);
        const { data, error } = recentRes;
        if (error) throw error;
        
        // 用並行取回的統計資料更新數字，不再多等一次請求
        if (statsRes.data) updateStatsFromData(statsRes.data);
        
        // 更新檢視模式按鈕狀態
        const tableBtn = document.getElementById('dashboard-view-table-btn');
        const gridBtn = document.getElementById('dashboard-view-grid-btn');
        if (tableBtn && gridBtn) {
            tableBtn.classList.remove('active');
            gridBtn.classList.remove('active');
            if (dashboardViewMode === 'grid') {
                gridBtn.classList.add('active');
            } else {
                tableBtn.classList.add('active');
            }
        }
        
        // 顯示最近物件
        const recentDiv = document.getElementById('recent-properties');
        if (data && data.length > 0) {
            if (dashboardViewMode === 'grid') {
                // 網格模式
                recentDiv.innerHTML = `
                    <div class="property-grid">
                        ${data.map(prop => {
                            const images = Array.isArray(prop.images) ? prop.images : [];
                            const imgUrl = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url) : '';
                            const publishedBadge = prop.is_published 
                                ? '<span class="badge badge-success">✅ 已上架</span>' 
                                : '<span class="badge badge-danger">❌ 已下架</span>';
                            
                            const isExternal = prop.is_external === true || prop.is_external === 'true';
                            const sourceBadge = isExternal 
                                ? '<span class="badge" style="background: #ff9800; color: white; margin-bottom: 0.5rem; display: inline-block;">🏢 非本店</span>' 
                                : '<span class="badge" style="background: #28a745; color: white; margin-bottom: 0.5rem; display: inline-block;">🏠 本店</span>';
                            
                            const isPublished = prop.is_published;
                            
                            // 轉義 HTML 以防止 XSS
                            const safeTitle = escapeHtml(prop.title || '未命名物件');
                            const safeNumber = escapeHtml(prop.number || 'N/A');
                            const safeType = escapeHtml(prop.type || 'N/A');
                            const safePrice = escapeHtml(prop.price || 'N/A');
                            const safeAddress = prop.address ? escapeHtml(prop.address.substring(0, 30)) + (prop.address.length > 30 ? '...' : '') : '';
                            const safeId = escapeHtml(prop.id);
                            const safeImgUrl = imgUrl ? escapeHtml(imgUrl) : '';
                            const safeUpdatedAt = new Date(prop.updated_at).toLocaleString('zh-TW');
                            
                            return `
                                <div class="property-card">
                                    ${safeImgUrl 
                                        ? `<img src="${safeImgUrl}" alt="${safeTitle}" class="property-card-image" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                                        : ''
                                    }
                                    <div class="property-card-placeholder" ${imgUrl ? 'style="display:none;"' : ''}>
                                        🏠
                                    </div>
                                    <div class="property-card-content">
                                        <h3 class="property-card-title">
                                            <a href="${getPropertyDetailUrl(prop)}" 
                                               target="_blank" 
                                               style="color: #2c3e50; text-decoration: none; cursor: pointer;"
                                               onmouseover="this.style.color='#667eea'; this.style.textDecoration='underline'"
                                               onmouseout="this.style.color='#2c3e50'; this.style.textDecoration='none'">
                                                ${safeTitle}
                                            </a>
                                        </h3>
                                        <div class="property-card-meta">
                                            <div><strong>編號：</strong>${safeNumber}</div>
                                            <div><strong>房型：</strong>${safeType}</div>
                                            <div><strong>價格：</strong>${safePrice}</div>
                                            ${safeAddress ? `<div><strong>地址：</strong>${safeAddress}</div>` : ''}
                                            <div><strong>更新時間：</strong>${safeUpdatedAt}</div>
                                        </div>
                                        <div class="property-card-status" style="margin-bottom: 0.75rem;">
                                            ${sourceBadge} ${publishedBadge}
                                        </div>
                                        <div class="property-card-actions">
                                            <button class="btn btn-primary" 
                                                    onclick="openPropertyDetail({id: '${safeId}', number: '${safeNumber || ''}'})"
                                                    style="font-size: 0.85rem;">
                                                👁️ 查看
                                            </button>
                                            <button class="btn btn-info" 
                                                    onclick="copyPropertyLink({id: '${safeId}', number: '${safeNumber || ''}'})"
                                                    style="font-size: 0.85rem;">
                                                📋 複製連結
                                            </button>
                                            <button class="btn btn-info" 
                                                    onclick="downloadQRCode({id: '${safeId}', number: '${safeNumber || ''}'})"
                                                    style="font-size: 0.85rem;"
                                                    title="下載 QR Code">
                                                📱 QR Code
                                            </button>
                                            <button class="btn ${isPublished ? 'btn-danger' : 'btn-success'}" 
                                                    data-property-id="${safeId}" 
                                                    data-action="toggle" 
                                                    data-status="${!isPublished}"
                                                    style="font-size: 0.85rem;">
                                                ${isPublished ? '⬇️ 下架' : '⬆️ 上架'}
                                            </button>
                                            <button class="btn btn-secondary" 
                                                    data-property-id="${safeId}" 
                                                    data-action="edit"
                                                    style="font-size: 0.85rem;">
                                                ✏️ 編輯
                                            </button>
                                            <button class="btn btn-danger" 
                                                    data-property-id="${safeId}" 
                                                    data-action="delete"
                                                    style="font-size: 0.85rem;"
                                                    title="刪除">
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            } else {
                // 表格模式
                recentDiv.innerHTML = `
                    <table class="table">
                        <thead>
                            <tr>
                                <th>物件</th>
                                <th>房型</th>
                                <th>價格</th>
                                <th>狀態</th>
                                <th>更新時間</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(prop => {
                                const images = Array.isArray(prop.images) ? prop.images : [];
                                const imgUrl = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url) : '';
                                const publishedBadge = prop.is_published 
                                    ? '<span class="badge badge-success">已上架</span>' 
                                    : '<span class="badge badge-danger">已下架</span>';
                                
                                return `
                                    <tr>
                                        <td>
                                            <div class="property-preview">
                                                ${imgUrl ? `<img src="${imgUrl}" alt="${prop.title}">` : '<div style="width:80px;height:60px;background:#f0f0f0;border-radius:6px;"></div>'}
                                                <div class="property-preview-info">
                                                    <h4>
                                                        <a href="${getPropertyDetailUrl(prop)}" 
                                                           target="_blank" 
                                                           style="color: #667eea; text-decoration: none; cursor: pointer;"
                                                           onmouseover="this.style.textDecoration='underline'"
                                                           onmouseout="this.style.textDecoration='none'">
                                                            ${prop.title || '未命名'}
                                                        </a>
                                                    </h4>
                                                    <p>${prop.number || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td>${prop.type || 'N/A'}</td>
                                        <td>${prop.price || 'N/A'}</td>
                                        <td>${publishedBadge}</td>
                                        <td>${new Date(prop.updated_at).toLocaleString('zh-TW')}</td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                `;
            }
        } else {
            recentDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">目前沒有物件</p>';
        }
    } catch (error) {
        console.error('載入儀表板失敗:', error);
        document.getElementById('recent-properties').innerHTML = 
            `<div class="alert alert-error">載入失敗：${error.message}</div>`;
    }
}

// 用現成資料更新統計數字（避免重複請求）
function updateStatsFromData(data) {
    if (!data || !Array.isArray(data)) return;
    const total = data.length;
    const published = data.filter(p => p.is_published).length;
    const unpublished = data.filter(p => !p.is_published).length;
    const sold = data.filter(p => p.status === 'sold').length;
    const elTotal = document.getElementById('stat-total');
    const elPublished = document.getElementById('stat-published');
    const elUnpublished = document.getElementById('stat-unpublished');
    const elSold = document.getElementById('stat-sold');
    if (elTotal) elTotal.textContent = total;
    if (elPublished) elPublished.textContent = published;
    if (elUnpublished) elUnpublished.textContent = unpublished;
    if (elSold) elSold.textContent = sold;
}

// 更新統計（從 API 取回後更新）
async function updateStats() {
    try {
        const { data, error } = await supabaseClient
            .from('properties')
            .select('is_published, status, is_external');
        if (error) throw error;
        updateStatsFromData(data);
    } catch (error) {
        console.error('更新統計失敗:', error);
    }
}

// 列表所需欄位（不拉 description、features、transportation 等大欄位，減少延遲）
const PROPERTIES_LIST_COLUMNS = 'id, title, number, type, price, address, is_published, is_external, status, images, updated_at, created_at';

// 載入物件列表
async function loadProperties() {
    const listEl = document.getElementById('properties-list');
    if (listEl) listEl.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">載入中...</p>';
    try {
        const { data, error } = await supabaseClient
            .from('properties')
            .select(PROPERTIES_LIST_COLUMNS)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        allProperties = data || [];
        const select = document.getElementById('status-filter-select');
        if (select) select.value = currentFilter || 'all';
        // 用 rAF 讓瀏覽器先畫出「載入中」再渲染列表，體感更順
        requestAnimationFrame(() => renderProperties());
    } catch (error) {
        console.error('載入物件失敗:', error);
        const el = document.getElementById('properties-list');
        if (el) el.innerHTML = `<div class="alert alert-error">載入失敗：${error.message}</div>`;
    }
}

// 渲染物件列表
function renderProperties() {
    let filtered = allProperties;
    
    // 應用篩選
    if (currentFilter === 'published') {
        filtered = filtered.filter(p => p.is_published);
    } else if (currentFilter === 'unpublished') {
        filtered = filtered.filter(p => !p.is_published);
    } else if (currentFilter === 'sold') {
        filtered = filtered.filter(p => p.status === 'sold');
    } else if (currentFilter === 'internal') {
        // 篩選本店物件
        filtered = filtered.filter(p => !p.is_external || p.is_external === false);
    } else if (currentFilter === 'external') {
        // 篩選非本店物件
        filtered = filtered.filter(p => p.is_external === true || p.is_external === 'true');
    }
    
    // 應用搜尋
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    const typeFilter = document.getElementById('type-filter').value;
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            (p.title && p.title.toLowerCase().includes(searchTerm)) ||
            (p.number && p.number.toLowerCase().includes(searchTerm)) ||
            (p.address && p.address.toLowerCase().includes(searchTerm))
        );
    }
    
    if (typeFilter) {
        filtered = filtered.filter(p => p.type === typeFilter);
    }
    
    // 排序：優先顯示已上架的物件，然後是已下架的物件
    // 在相同狀態內，按更新時間排序（最新的在前）
    filtered.sort((a, b) => {
        // 先按上架狀態排序：已上架（true）在前，已下架（false）在後
        if (a.is_published !== b.is_published) {
            // 如果 a 已上架且 b 已下架，a 排前面（返回負數）
            // 如果 a 已下架且 b 已上架，a 排後面（返回正數）
            return (b.is_published ? 1 : 0) - (a.is_published ? 1 : 0);
        }
        
        // 相同狀態內，按更新時間排序（最新的在前）
        const dateA = a.updated_at ? new Date(a.updated_at) : new Date(a.created_at || 0);
        const dateB = b.updated_at ? new Date(b.updated_at) : new Date(b.created_at || 0);
        return dateB - dateA;
    });
    
    const listDiv = document.getElementById('properties-list');
    
    if (filtered.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">沒有找到物件</p>';
        return;
    }

    // 耗時 DOM 建構改為下一幀執行，避免阻塞 UI
    function doRender() {
    if (viewMode === 'grid') {
        // 網格模式
        listDiv.innerHTML = `
            <div class="property-grid">
                ${filtered.map(prop => {
                    const images = Array.isArray(prop.images) ? prop.images : [];
                    const imgUrl = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url) : '';
                    const publishedBadge = prop.is_published 
                        ? '<span class="badge badge-success">✅ 已上架</span>' 
                        : '<span class="badge badge-danger">❌ 已下架</span>';
                    
                    const isExternal = prop.is_external === true || prop.is_external === 'true';
                    const sourceBadge = isExternal 
                        ? '<span class="badge" style="background: #ff9800; color: white; margin-bottom: 0.5rem; display: inline-block;">🏢 非本店</span>' 
                        : '<span class="badge" style="background: #28a745; color: white; margin-bottom: 0.5rem; display: inline-block;">🏠 本店</span>';
                    
                    const isPublished = prop.is_published;
                    
                    // 轉義 HTML 以防止 XSS
                    const safeTitle = escapeHtml(prop.title || '未命名物件');
                    const safeNumber = escapeHtml(prop.number || 'N/A');
                    const safeType = escapeHtml(prop.type || 'N/A');
                    const safePrice = escapeHtml(prop.price || 'N/A');
                    const safeAddress = prop.address ? escapeHtml(prop.address.substring(0, 30)) + (prop.address.length > 30 ? '...' : '') : '';
                    const safeId = escapeHtml(prop.id);
                    const safeImgUrl = imgUrl ? escapeHtml(imgUrl) : '';
                    
                    return `
                        <div class="property-card">
                            ${safeImgUrl 
                                ? `<img src="${safeImgUrl}" alt="${safeTitle}" class="property-card-image" loading="lazy" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
                                : ''
                            }
                            <div class="property-card-placeholder" ${imgUrl ? 'style="display:none;"' : ''}>
                                🏠
                            </div>
                            <div class="property-card-content">
                                <h3 class="property-card-title">
                                    <a href="${getPropertyDetailUrl(prop)}" 
                                       target="_blank" 
                                       style="color: #2c3e50; text-decoration: none; cursor: pointer;"
                                       onmouseover="this.style.color='#667eea'; this.style.textDecoration='underline'"
                                       onmouseout="this.style.color='#2c3e50'; this.style.textDecoration='none'">
                                        ${safeTitle}
                                    </a>
                                </h3>
                                <div class="property-card-meta">
                                    <div><strong>編號：</strong>${safeNumber}</div>
                                    <div><strong>房型：</strong>${safeType}</div>
                                    <div><strong>價格：</strong>${safePrice}</div>
                                    ${safeAddress ? `<div><strong>地址：</strong>${safeAddress}</div>` : ''}
                                </div>
                                <div class="property-card-status" style="margin-bottom: 0.75rem;">
                                    ${sourceBadge} ${publishedBadge}
                                </div>
                                <div class="property-card-actions">
                                    <button class="btn btn-primary" 
                                            onclick="openPropertyDetail({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            style="font-size: 0.85rem;">
                                        👁️ 查看
                                    </button>
                                    <button class="btn btn-info" 
                                            onclick="copyPropertyLink({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            style="font-size: 0.85rem;">
                                        📋 複製連結
                                    </button>
                                    <button class="btn btn-info" 
                                            onclick="downloadQRCode({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            style="font-size: 0.85rem;"
                                            title="下載 QR Code">
                                        📱 QR Code
                                    </button>
                                    <button class="btn ${isPublished ? 'btn-danger' : 'btn-success'}" 
                                            data-property-id="${safeId}" 
                                            data-action="toggle" 
                                            data-status="${!isPublished}"
                                            style="font-size: 0.85rem;">
                                        ${isPublished ? '⬇️ 下架' : '⬆️ 上架'}
                                    </button>
                                    <button class="btn btn-secondary" 
                                            data-property-id="${safeId}" 
                                            data-action="edit"
                                            style="font-size: 0.85rem;">
                                        ✏️ 編輯
                                    </button>
                                    <button class="btn btn-danger" 
                                            data-property-id="${safeId}" 
                                            data-action="delete"
                                            style="font-size: 0.85rem;"
                                            title="刪除">
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } else {
        // 表格模式（手機上自動改為卡片式）
        if (isMobileDevice()) {
            // 手機版：使用卡片式顯示
            listDiv.innerHTML = `
                <div class="properties-grid-view">
                    ${filtered.map(prop => {
                        const images = Array.isArray(prop.images) ? prop.images : [];
                        const imgUrl = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url) : '';
                        const publishedBadge = prop.is_published 
                            ? '<span class="badge badge-success">✅ 已上架</span>' 
                            : '<span class="badge badge-danger">❌ 已下架</span>';
                        
                        const isExternal = prop.is_external === true || prop.is_external === 'true';
                        const sourceBadge = isExternal 
                            ? '<span class="badge" style="background: #ff9800; color: white;">🏢 非本店</span>' 
                            : '<span class="badge" style="background: #28a745; color: white;">🏠 本店</span>';
                        
                        const safeTitle = escapeHtml(prop.title || '未命名物件');
                        const safeNumber = escapeHtml(prop.number || 'N/A');
                        const safeType = escapeHtml(prop.type || 'N/A');
                        const safePrice = escapeHtml(prop.price || 'N/A');
                        const safeAddress = escapeHtml(prop.address || 'N/A');
                        const safeId = escapeHtml(prop.id);
                        const safeImgUrl = imgUrl ? escapeHtml(imgUrl) : '';
                        const isPublished = prop.is_published;
                        
                        return `
                            <div class="property-card-mobile">
                                <div class="property-card-mobile-header">
                                    ${safeImgUrl 
                                        ? `<img src="${safeImgUrl}" alt="${safeTitle}" class="property-card-mobile-image" loading="lazy" onerror="this.style.display='none';">`
                                        : '<div class="property-card-mobile-image" style="background: #f0f0f0; display: flex; align-items: center; justify-content: center; font-size: 2rem;">🏠</div>'
                                    }
                                    <div class="property-card-mobile-info">
                                        <div class="property-card-mobile-title">${safeTitle}</div>
                                        <div class="property-card-mobile-number">${safeNumber}</div>
                                    </div>
                                    <div class="property-card-mobile-details-compact">
                                        <div class="property-card-mobile-detail-compact-item">
                                            <span class="property-card-mobile-detail-compact-label">來源</span>
                                            <span class="property-card-mobile-detail-compact-value">${sourceBadge}</span>
                                        </div>
                                        <div class="property-card-mobile-detail-compact-item">
                                            <span class="property-card-mobile-detail-compact-label">房型</span>
                                            <span class="property-card-mobile-detail-compact-value">${safeType}</span>
                                        </div>
                                        <div class="property-card-mobile-detail-compact-item">
                                            <span class="property-card-mobile-detail-compact-label">價格</span>
                                            <span class="property-card-mobile-detail-compact-value">${safePrice}</span>
                                        </div>
                                        <div class="property-card-mobile-detail-compact-item">
                                            <span class="property-card-mobile-detail-compact-label">狀態</span>
                                            <span class="property-card-mobile-detail-compact-value">${publishedBadge}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="property-card-mobile-actions">
                                    <button class="btn btn-primary btn-small" onclick="openPropertyDetail({id: '${safeId}', number: '${safeNumber || ''}'})">👁️ 查看</button>
                                    <button class="btn btn-info btn-small" onclick="copyPropertyLink({id: '${safeId}', number: '${safeNumber || ''}'})">📋 連結</button>
                                    <button class="btn btn-info btn-small" onclick="downloadQRCode({id: '${safeId}', number: '${safeNumber || ''}'})">📱 QR</button>
                                    <button class="btn ${isPublished ? 'btn-danger' : 'btn-success'} btn-small" data-property-id="${safeId}" data-action="toggle" data-status="${!isPublished}">${isPublished ? '⬇️ 下架' : '⬆️ 上架'}</button>
                                    <button class="btn btn-secondary btn-small" data-property-id="${safeId}" data-action="edit">✏️ 編輯</button>
                                    <button class="btn btn-danger btn-small" data-property-id="${safeId}" data-action="delete" title="刪除">🗑️</button>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            // 桌面版：使用表格顯示（可橫向滾動）
            listDiv.innerHTML = `
                <div class="table-container">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>物件</th>
                                <th>來源</th>
                                <th>房型</th>
                                <th>價格</th>
                                <th>上架狀態</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                    ${filtered.map(prop => {
                        const images = Array.isArray(prop.images) ? prop.images : [];
                        const imgUrl = images.length > 0 ? (typeof images[0] === 'string' ? images[0] : images[0].url) : '';
                        const publishedBadge = prop.is_published 
                            ? '<span class="badge badge-success">已上架</span>' 
                            : '<span class="badge badge-danger">已下架</span>';
                        
                        // 物件來源標籤
                        const isExternal = prop.is_external === true || prop.is_external === 'true';
                        const sourceBadge = isExternal 
                            ? '<span class="badge" style="background: #ff9800; color: white;">🏢 非本店</span>' 
                            : '<span class="badge" style="background: #28a745; color: white;">🏠 本店</span>';
                        
                        // 轉義 HTML 以防止 XSS
                        const safeTitle = escapeHtml(prop.title || '未命名');
                        const safeNumber = escapeHtml(prop.number || 'N/A');
                        const safeAddress = escapeHtml(prop.address || 'N/A');
                        const safeType = escapeHtml(prop.type || 'N/A');
                        const safePrice = escapeHtml(prop.price || 'N/A');
                        const safeId = escapeHtml(prop.id);
                        const safeImgUrl = imgUrl ? escapeHtml(imgUrl) : '';
                        const isPublished = prop.is_published;
                        
                        return `
                            <tr>
                                <td>
                                    <div class="property-preview">
                                        ${safeImgUrl ? `<img src="${safeImgUrl}" alt="${safeTitle}" loading="lazy">` : '<div style="width:80px;height:60px;background:#f0f0f0;border-radius:6px;"></div>'}
                                        <div class="property-preview-info">
                                            <h4>
                                                <a href="${getPropertyDetailUrl(prop)}" 
                                                   target="_blank" 
                                                   style="color: #667eea; text-decoration: none; cursor: pointer;"
                                                   onmouseover="this.style.textDecoration='underline'"
                                                   onmouseout="this.style.textDecoration='none'">
                                                    ${safeTitle}
                                                </a>
                                            </h4>
                                            <p>${safeNumber} | ${safeAddress}</p>
                                        </div>
                                    </div>
                                </td>
                                <td>${sourceBadge}</td>
                                <td>${safeType}</td>
                                <td>${safePrice}</td>
                                <td>${publishedBadge}</td>
                                <td>
                                    <button class="btn btn-primary btn-small" 
                                            onclick="openPropertyDetail({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            title="在新分頁開啟物件獨立網頁">
                                        👁️ 查看
                                    </button>
                                    <button class="btn btn-info btn-small" 
                                            onclick="copyPropertyLink({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            title="複製物件獨立網頁連結">
                                        📋 複製連結
                                    </button>
                                    <button class="btn btn-info btn-small" 
                                            onclick="downloadQRCode({id: '${safeId}', number: '${safeNumber || ''}'})"
                                            title="下載 QR Code">
                                        📱 QR Code
                                    </button>
                                    <button class="btn btn-small ${isPublished ? 'btn-danger' : 'btn-success'}" 
                                            data-property-id="${safeId}" 
                                            data-action="toggle" 
                                            data-status="${!isPublished}">
                                        ${isPublished ? '⬇️ 下架' : '⬆️ 上架'}
                                    </button>
                                    <button class="btn btn-secondary btn-small" 
                                            data-property-id="${safeId}" 
                                            data-action="edit">
                                        ✏️ 編輯
                                    </button>
                                    <button class="btn btn-danger btn-small" 
                                            data-property-id="${safeId}" 
                                            data-action="delete"
                                            title="刪除">
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    }
    }
    if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(doRender);
    } else {
        doRender();
    }
}

// 設定篩選（保留舊函數以兼容其他地方可能的調用）
function setFilter(filter, element) {
    currentFilter = filter;
    // 更新下拉選單
    const select = document.getElementById('status-filter-select');
    if (select) {
        select.value = filter;
    }
    // 更新按鈕狀態（如果存在）
    if (element) {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        element.classList.add('active');
    }
    renderProperties();
}

// 從下拉選單設定篩選
function setFilterFromSelect(filter) {
    currentFilter = filter;
    renderProperties();
}

// 切換手機選單（僅手機版：抽屜與 body 鎖定；桌面版點擊 nav 不應鎖住整頁滾動）
function toggleMobileMenu() {
    if (!isMobileDevice()) return;
    const nav = document.getElementById('main-nav');
    const overlay = document.querySelector('.nav-overlay');
    
    if (nav && overlay) {
        nav.classList.toggle('active');
        overlay.classList.toggle('active');
        
        // 防止背景滾動
        if (nav.classList.contains('active')) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
    }
}

// 檢測是否為手機裝置
function isMobileDevice() {
    return window.innerWidth <= 768;
}

// 設定視圖模式
function setViewMode(mode, element) {
    viewMode = mode;
    
    // 更新按鈕狀態
    const tableBtn = document.getElementById('view-table-btn');
    const gridBtn = document.getElementById('view-grid-btn');
    if (tableBtn) tableBtn.classList.remove('active');
    if (gridBtn) gridBtn.classList.remove('active');
    if (element) element.classList.add('active');
    
    // 重新渲染
    renderProperties();
}

// 設定儀表板檢視模式
function setDashboardViewMode(mode, element) {
    dashboardViewMode = mode;
    
    // 更新按鈕狀態
    const tableBtn = document.getElementById('dashboard-view-table-btn');
    const gridBtn = document.getElementById('dashboard-view-grid-btn');
    if (tableBtn) tableBtn.classList.remove('active');
    if (gridBtn) gridBtn.classList.remove('active');
    if (element) element.classList.add('active');
    
    // 重新載入儀表板
    loadDashboard();
}

// 搜尋防抖（減少輸入時頻繁重繪，與首頁搜尋一致 300ms）
let filterPropertiesDebounceTimer = null;
function filterPropertiesDebounced() {
    clearTimeout(filterPropertiesDebounceTimer);
    filterPropertiesDebounceTimer = setTimeout(filterProperties, 300);
}

// 搜尋和篩選
function filterProperties() {
    renderProperties();
}

// 切換上架狀態（優化版：減少延遲）
async function togglePublish(id, newStatus) {
    try {
        // 先更新本地資料（立即反饋）
        const prop = allProperties.find(p => p.id === id);
        if (prop) {
            prop.is_published = newStatus;
        }
        
        // 立即更新 UI（樂觀更新）
        renderProperties();
        updateStats();
        
        // 異步更新資料庫
        const { error } = await supabaseClient
            .from('properties')
            .update({ is_published: newStatus })
            .eq('id', id);
        
        if (error) {
            // 如果失敗，恢復原狀態
            if (prop) {
                prop.is_published = !newStatus;
            }
            renderProperties();
            updateStats();
            throw error;
        }
        
        // 顯示成功訊息
        showAlert('success', newStatus ? '物件已上架！' : '物件已下架！');
    } catch (error) {
        console.error('切換狀態失敗:', error);
        showAlert('error', `操作失敗：${error.message}`);
    }
}


// 顯示提示訊息
function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    alert.style.position = 'fixed';
    alert.style.top = '20px';
    alert.style.right = '20px';
    alert.style.zIndex = '9999';
    alert.style.minWidth = '300px';
    document.body.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 3000);
}

// 編輯物件（縮短延遲以減少體感延遲）
function editProperty(id) {
    const propertiesTab = document.querySelector('.nav-item[onclick*="properties"]');
    if (!propertiesTab) return;
    switchTab('properties', propertiesTab);
    const safeId = encodeURIComponent(id);
    // 用 requestAnimationFrame 等 DOM 更新後再切子標籤與 iframe，避免累積過長 setTimeout
    requestAnimationFrame(() => {
        const addSubTab = document.getElementById('property-add-tab');
        if (!addSubTab) return;
        switchPropertySubTab('add', addSubTab);
        requestAnimationFrame(() => {
            const iframe = document.getElementById('property-add-iframe');
            if (iframe) {
                iframe.src = `property-admin-db.html?tab=add&id=${safeId}`;
            } else {
                loadPropertyAddForm();
                setTimeout(() => {
                    const newIframe = document.getElementById('property-add-iframe');
                    if (newIframe) newIframe.src = `property-admin-db.html?tab=add&id=${safeId}`;
                }, 150);
            }
        });
    });
}

// 顯示確認彈跳視窗
function showConfirmModal(options) {
    return new Promise((resolve) => {
        const {
            title = '確認操作',
            message = '確定要執行此操作嗎？',
            icon = 'warning',
            confirmText = '確定',
            cancelText = '取消',
            confirmClass = 'modal-btn-danger'
        } = options;
        
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const iconEmoji = icon === 'danger' ? '⚠️' : '❓';
        const iconClass = icon === 'danger' ? 'danger' : 'warning';
        
        overlay.innerHTML = `
            <div class="modal-dialog">
                <div class="modal-header">
                    <div class="modal-icon ${iconClass}">${iconEmoji}</div>
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    ${message}
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove(); arguments[0].stopPropagation();">${cancelText}</button>
                    <button class="modal-btn ${confirmClass}" onclick="this.closest('.modal-overlay').remove(); arguments[0].stopPropagation();">${confirmText}</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        // 處理確認按鈕
        const confirmBtn = overlay.querySelector(`.${confirmClass}`);
        confirmBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(true);
        });
        
        // 處理取消按鈕
        const cancelBtn = overlay.querySelector('.modal-btn-cancel');
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            resolve(false);
        });
        
        // 處理 ESC 鍵
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // 點擊背景關閉
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        });
    });
}

// 刪除物件
async function deleteProperty(id) {
    // 先取得物件資訊以顯示在確認視窗中
    let propertyInfo = '';
    try {
        const { data: prop } = await supabaseClient
            .from('properties')
            .select('title, number')
            .eq('id', id)
            .single();
        
        if (prop) {
            propertyInfo = `<strong>${prop.title || prop.number || '此物件'}</strong>`;
        }
    } catch (e) {
        // 忽略錯誤，繼續顯示確認視窗
    }
    
    const confirmed = await showConfirmModal({
        title: '刪除物件',
        message: `確定要刪除 ${propertyInfo || '此物件'} 嗎？<br><br>此操作無法復原，請謹慎操作。`,
        icon: 'danger',
        confirmText: '🗑️ 刪除',
        cancelText: '取消'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        const { error } = await supabaseClient
            .from('properties')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        showAlert('success', '物件已刪除！');
        
        // 重新載入列表
        loadProperties();
        loadDashboard();
        updateStats();
    } catch (error) {
        console.error('刪除失敗:', error);
        showAlert('error', `刪除失敗：${error.message}`);
    }
}

// 檢查重複物件
let duplicateGroups = [];

async function checkDuplicates() {
    try {
        showAlert('info', '正在檢測重複物件...');
        
        const { data, error } = await supabaseClient
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        // 根據 number 欄位分組
        const numberGroups = {};
        data.forEach(prop => {
            const number = prop.number;
            if (!number) return;
            
            if (!numberGroups[number]) {
                numberGroups[number] = [];
            }
            numberGroups[number].push(prop);
        });
        
        // 找出重複的物件
        duplicateGroups = Object.values(numberGroups).filter(group => group.length > 1);
        
        const resultDiv = document.getElementById('duplicates-result');
        const cleanBtn = document.getElementById('clean-btn');
        
        if (duplicateGroups.length === 0) {
            resultDiv.innerHTML = `
                <div class="alert alert-success">
                    ✅ 沒有發現重複物件！所有物件編號都是唯一的。
                </div>
            `;
            cleanBtn.style.display = 'none';
        } else {
            let totalDuplicates = 0;
            duplicateGroups.forEach(group => {
                totalDuplicates += group.length - 1; // 減去保留的一個
            });
            
            resultDiv.innerHTML = `
                <div class="alert alert-warning">
                    ⚠️ 發現 ${duplicateGroups.length} 組重複物件，共 ${totalDuplicates} 個重複項目需要清理。
                </div>
                <table class="table" style="margin-top: 1rem;">
                    <thead>
                        <tr>
                            <th>物件編號</th>
                            <th>重複數量</th>
                            <th>物件列表</th>
                            <th>將保留</th>
                            <th>將刪除</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${duplicateGroups.map(group => {
                            // 按建立時間排序，最新的在前
                            group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                            const keep = group[0]; // 保留最新的
                            const toDelete = group.slice(1); // 刪除其他的
                            
                            return `
                                <tr>
                                    <td><strong>${keep.number}</strong></td>
                                    <td><span class="badge badge-warning">${group.length} 個</span></td>
                                    <td>
                                        ${group.map(p => `
                                            <div style="margin-bottom: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                                                <strong>${p.title || '未命名'}</strong><br>
                                                <small>ID: ${p.id.substring(0, 8)}... | 建立: ${new Date(p.created_at).toLocaleString('zh-TW')}</small>
                                            </div>
                                        `).join('')}
                                    </td>
                                    <td>
                                        <span class="badge badge-success">✅ ${keep.title || '未命名'}</span><br>
                                        <small>${new Date(keep.created_at).toLocaleString('zh-TW')}</small>
                                    </td>
                                    <td>
                                        ${toDelete.map(p => `
                                            <div style="margin-bottom: 0.25rem;">
                                                <span class="badge badge-danger">🗑️ ${p.title || '未命名'}</span><br>
                                                <small>${new Date(p.created_at).toLocaleString('zh-TW')}</small>
                                            </div>
                                        `).join('')}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
            cleanBtn.style.display = 'inline-block';
        }
        
        showAlert('success', '檢測完成！');
    } catch (error) {
        console.error('檢測失敗:', error);
        showAlert('error', `檢測失敗：${error.message}`);
        document.getElementById('duplicates-result').innerHTML = 
            `<div class="alert alert-error">檢測失敗：${error.message}</div>`;
    }
}

// 清理重複物件
async function cleanDuplicates() {
    if (duplicateGroups.length === 0) {
        showAlert('warning', '沒有重複物件需要清理');
        return;
    }
    
    if (!confirm(`確定要清理 ${duplicateGroups.length} 組重複物件嗎？此操作無法復原。`)) {
        return;
    }
    
    try {
        showAlert('info', '正在清理重複物件...');
        
        let deletedCount = 0;
        const idsToDelete = [];
        
        // 收集所有要刪除的物件 ID
        duplicateGroups.forEach(group => {
            // 按建立時間排序，最新的在前
            group.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            const toDelete = group.slice(1); // 刪除除了最新之外的所有
            toDelete.forEach(prop => {
                idsToDelete.push(prop.id);
            });
        });
        
        // 批次刪除
        if (idsToDelete.length > 0) {
            for (const id of idsToDelete) {
                const { error } = await supabaseClient
                    .from('properties')
                    .delete()
                    .eq('id', id);
                
                if (error) {
                    console.error(`刪除物件 ${id} 失敗:`, error);
                } else {
                    deletedCount++;
                }
            }
        }
        
        showAlert('success', `成功清理 ${deletedCount} 個重複物件！`);
        
        // 重新檢測
        duplicateGroups = [];
        document.getElementById('clean-btn').style.display = 'none';
        await checkDuplicates();
        
        // 更新其他頁面
        loadProperties();
        loadDashboard();
        updateStats();
    } catch (error) {
        console.error('清理失敗:', error);
        showAlert('error', `清理失敗：${error.message}`);
    }
}

// 監聽來自 iframe 的訊息（物件儲存成功後切換到列表）
window.addEventListener('message', function(event) {
    // 檢查訊息類型
    if (event.data && event.data.type === 'propertySaved' && event.data.action === 'switchToList') {
        console.log('📥 收到物件儲存成功訊息，切換到物件列表');
        
        // 切換到物件管理標籤
        const propertiesTab = document.querySelector('.nav-item[onclick*="properties"]');
        if (propertiesTab) {
            switchTab('properties', propertiesTab);
            
            // 切換到物件列表子標籤
            setTimeout(() => {
                const listSubTab = document.getElementById('property-list-tab');
                if (listSubTab) {
                    switchPropertySubTab('list', listSubTab);
                }
            }, 100);
        }
    }
});

// ==================== 相關連結管理功能 ====================
let editingLinkId = null;
let linkItems = []; // 儲存下拉選單項目

// 載入相關連結列表
async function loadRelatedLinks() {
    const listContainer = document.getElementById('links-list');
    if (!listContainer) return;
    
    try {
        listContainer.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">載入中...</p>';
        
        // 確保 Supabase 客戶端已初始化
        const client = initSupabaseClient();
        if (!client) {
            throw new Error('無法初始化 Supabase 客戶端');
        }
        supabaseClient = client;
        
        // 載入連結（優先使用 Supabase 客戶端，失敗時使用 REST API，再失敗時使用預設資料）
        console.log('🔄 開始從 Supabase 載入連結列表...');
        let { data: links, error: linksError } = await supabaseClient
            .from('related_links')
            .select('*')
            .order('display_order', { ascending: true });
        
        // 如果遇到任何錯誤，嘗試使用 REST API 直接查詢
        if (linksError) {
            console.warn('⚠️ Supabase 客戶端查詢失敗，嘗試直接查詢...', linksError);
            
            // 嘗試使用 fetch API 直接查詢
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/related_links?select=*&order=display_order.asc`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
                
                if (response.ok) {
                    links = await response.json();
                    linksError = null;
                    console.log('✅ 使用 REST API 直接查詢成功，載入到', links.length, '個連結');
                } else {
                    console.warn('⚠️ REST API 查詢失敗:', response.status);
                }
            } catch (fetchError) {
                console.warn('⚠️ 直接查詢失敗:', fetchError);
            }
        }
        
        // 如果還是沒有資料，使用預設資料（確保至少能看到連結列表）
        if (!links || links.length === 0) {
            console.warn('⚠️ 無法從 Supabase 載入連結，使用預設資料');
            links = [
                { id: '09f06dfd-1fba-4911-953c-f9be80363df8', title: '更多物件資料', url: 'https://realtor.houseprice.tw/agent/buy/0925666597/', icon: '🏠', color_gradient: 'linear-gradient(45deg, #2ecc71, #27ae60)', display_order: 1, is_active: true, link_type: 'button' },
                { id: '79abfd24-22c0-470c-9737-6d9bf6b0f110', title: 'TikTok短影音', url: 'https://www.tiktok.com/@aihouse168', icon: '🎵', color_gradient: 'linear-gradient(45deg, #000000, #333333)', display_order: 2, is_active: true, link_type: 'button' },
                { id: '0b7ba83a-66be-4afb-8d73-38fcf86e1b62', title: '房產比價試算', url: 'https://housepice.pages.dev/%E4%B8%89%E5%90%88%E4%B8%80%E6%88%BF%E5%83%B9%E6%99%AE%E7%89%B9%E7%B5%B2', icon: '🧮', color_gradient: 'linear-gradient(45deg, #ff6b6b, #ee5a24)', display_order: 3, is_active: true, link_type: 'button' },
                { id: 'ec5964bf-a1f0-48d2-95bf-99e527b96ea0', title: '預售團購區', url: 'https://salersteam.pages.dev/junyang', icon: '🏢', color_gradient: 'linear-gradient(45deg, #9b59b6, #8e44ad)', display_order: 4, is_active: true, link_type: 'button' },
                { id: '7b7a3dfa-f335-4571-a365-e5b232134257', title: '楊梅生活集', url: 'https://liff.line.me/2008363788-4Ly1Bv0r', icon: '📰', color_gradient: 'linear-gradient(45deg, #f9a825, #ff9800)', display_order: 5, is_active: true, link_type: 'button' },
                { id: '7654d782-c10a-4abc-af35-32ec3fa0975c', title: '房產資訊參考', url: '#', icon: '📊', color_gradient: 'linear-gradient(45deg, #667eea, #764ba2)', display_order: 6, is_active: true, link_type: 'dropdown' }
            ];
            linksError = null;
            console.log('✅ 使用預設資料，共', links.length, '個連結');
        }
        
        console.log('📋 成功載入', links.length, '個連結');
        
        if (linksError && (!links || links.length === 0)) {
            console.error('載入連結錯誤詳情:', linksError);
            // 即使有錯誤，如果有備用資料就繼續
            if (!links || links.length === 0) {
                throw linksError;
            }
        }
        
        if (!links || links.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #666;">
                    <p style="margin-bottom: 1rem;">目前沒有相關連結</p>
                    <button class="btn btn-primary" onclick="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.showAddLinkModal) { RelatedLinksBackend.showAddLinkModal(); } else if(typeof showAddLinkModal === 'function') { showAddLinkModal(); } else { alert('功能尚未載入，請重新整理頁面'); }">
                        ➕ 新增第一個連結
                    </button>
                </div>
            `;
            return;
        }
        
        console.log('✅ 成功載入', links.length, '個連結，開始渲染列表');
        
        // 載入下拉選單項目
        console.log('🔄 開始載入下拉選單項目...');
        let { data: items, error: itemsError } = await supabaseClient
            .from('related_link_items')
            .select('*')
            .order('display_order', { ascending: true });
        
        // 如果遇到錯誤，嘗試使用 REST API 直接查詢
        if (itemsError) {
            console.warn('⚠️ 載入下拉選單項目失敗，嘗試直接查詢...', itemsError);
            try {
                const response = await fetch(`${SUPABASE_URL}/rest/v1/related_link_items?select=*&order=display_order.asc`, {
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    }
                });
                
                if (response.ok) {
                    items = await response.json();
                    itemsError = null;
                    console.log('✅ 使用 REST API 直接查詢下拉選單項目成功，載入到', items.length, '個項目');
                } else {
                    console.warn('⚠️ REST API 查詢下拉選單項目失敗:', response.status);
                }
            } catch (fetchError) {
                console.warn('⚠️ 直接查詢下拉選單項目也失敗:', fetchError);
            }
        }
        
        // 如果還是沒有資料，使用預設資料
        if (!items || items.length === 0) {
            console.warn('⚠️ 無法從 Supabase 載入下拉選單項目，使用預設資料');
            // 找到「房產資訊參考」連結的 ID
            const propertyInfoLink = links.find(l => l.title === '房產資訊參考');
            if (propertyInfoLink) {
                items = [
                    { id: '0af0e9d3-bef8-42ce-be4c-5a0ec7fe9063', parent_link_id: propertyInfoLink.id, title: '2026年楊梅趨勢引擊', url: 'https://drive.google.com/file/d/1NddGgXcysK-QRoozRA4XXww6c-NUv-OJ/view?usp=sharing', display_order: 1, is_active: true },
                    { id: 'ddaa0085-53c5-4314-a6a5-407419615009', parent_link_id: propertyInfoLink.id, title: '新青安寬鬆政策', url: 'https://drive.google.com/file/d/1PeGDx2IruOjWkeIHgVVqpk0tceB0l7Vg/view?usp=drive_link', display_order: 2, is_active: true },
                    { id: 'a817158f-81cd-4ebb-9270-9eb890074a96', parent_link_id: propertyInfoLink.id, title: '2025年房產分析', url: 'https://drive.google.com/file/d/1vVluYlY81Ew76Dc4ZyWI_Y9CZ3cWbj0t/view?usp=drive_link', display_order: 3, is_active: true }
                ];
                itemsError = null;
                console.log('✅ 使用預設下拉選單項目，共', items.length, '個項目');
            }
        }
        
        if (itemsError) {
            console.warn('載入下拉選單項目失敗:', itemsError);
        } else {
            console.log('✅ 成功載入', items?.length || 0, '個下拉選單項目');
        }
        
        // 將項目分組到對應的連結
        const itemsByParent = {};
        if (items) {
            items.forEach(item => {
                if (!itemsByParent[item.parent_link_id]) {
                    itemsByParent[item.parent_link_id] = [];
                }
                itemsByParent[item.parent_link_id].push(item);
            });
        }
        
        // 渲染連結列表
        console.log('🎨 開始渲染連結列表，共', links.length, '個連結');
        
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
                                    <button class="btn btn-primary btn-small" onclick="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.editLink) { RelatedLinksBackend.editLink('${safeId}'); } else { editLink('${safeId}'); }" style="flex: 1;">
                                        ✏️ 編輯
                                    </button>
                                    <button class="btn btn-danger btn-small" onclick="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.deleteLink) { RelatedLinksBackend.deleteLink('${safeId}'); } else { deleteLink('${safeId}'); }" style="flex: 1;">
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
                                    <span class="badge ${link.is_active ? 'badge-success' : 'badge-danger'}">
                                        ${link.is_active ? '啟用' : '停用'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.5rem;">
                                        <button class="btn btn-primary btn-small" onclick="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.editLink) { RelatedLinksBackend.editLink('${link.id}'); } else { editLink('${link.id}'); }">
                                            ✏️ 編輯
                                        </button>
                                        <button class="btn btn-danger btn-small" onclick="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.deleteLink) { RelatedLinksBackend.deleteLink('${link.id}'); } else { deleteLink('${link.id}'); }"
                                                title="刪除">
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('載入連結失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
            status: error.status
        });
        
        // 如果是 404 錯誤，顯示特別的提示
        const is404Error = error.status === 404 || error.message?.includes('404') || error.message?.includes('Could not find');
        
        listContainer.innerHTML = `
            <div class="alert alert-error" style="max-width: 800px; margin: 0 auto;">
                <strong>載入失敗：</strong>${escapeHtml(error.message || '請檢查 Supabase 設定')}
                ${error.details ? `<br><small>${escapeHtml(error.details)}</small>` : ''}
                ${error.hint ? `<br><small>提示：${escapeHtml(error.hint)}</small>` : ''}
                ${is404Error ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                        <strong>⚠️ 資料表尚未建立或尚未同步</strong>
                        <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                            <strong>解決方法：</strong>
                            <br>1. 前往 <a href="https://supabase.com/dashboard/project/cnzqtuuegdqwkgvletaa/sql/new" target="_blank" style="color: #667eea; font-weight: bold;">Supabase SQL Editor</a>
                            <br>2. 執行 <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px; font-size: 0.85em;">create-related-links-table.sql</code> 檔案中的 SQL 語句
                            <br>3. 等待 1-2 分鐘讓 REST API 同步
                            <br>4. 點擊下方按鈕重新載入
                        </p>
                        <div style="margin-top: 0.8rem; display: flex; gap: 0.5rem;">
                            <button class="btn btn-primary" onclick="loadRelatedLinks()">
                                🔄 重新載入
                            </button>
                            <a href="https://supabase.com/dashboard/project/cnzqtuuegdqwkgvletaa/sql/new" target="_blank" class="btn" style="background: #667eea; color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; display: inline-block;">
                                📝 前往 SQL Editor
                            </a>
                        </div>
                    </div>
                ` : ''}
                <div style="margin-top: 1rem;">
                    <button class="btn btn-primary" onclick="loadRelatedLinks()">
                        🔄 重新載入
                    </button>
                </div>
            </div>
        `;
    }
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

// 編輯連結
async function editLink(linkId) {
    try {
        console.log('🔄 開始編輯連結，ID:', linkId);
        
        // 確保 Supabase 客戶端已初始化
        const client = initSupabaseClient();
        if (!client) {
            throw new Error('無法初始化 Supabase 客戶端');
        }
        supabaseClient = client;
        
        // 載入連結資料
        console.log('🔄 正在從 Supabase 載入連結資料，ID:', linkId);
        let { data: link, error: linkError } = await supabaseClient
            .from('related_links')
            .select('*')
            .eq('id', linkId)
            .single();
        
        console.log('📋 Supabase 客戶端查詢結果:', { data: link, error: linkError });
        
        // 如果遇到錯誤，嘗試使用 REST API 直接查詢
        if (linkError) {
            console.warn('⚠️ Supabase 客戶端查詢失敗，嘗試直接查詢...', linkError);
            try {
                // 使用正確的 PostgREST 查詢語法（select 應該在前面，或者使用正確的格式）
                // PostgREST 語法：?select=*&id=eq.value 或 ?id=eq.value
                const encodedId = encodeURIComponent(linkId);
                // 嘗試兩種格式
                let url = `${SUPABASE_URL}/rest/v1/related_links?select=*&id=eq.${encodedId}`;
                console.log('🔄 REST API URL (格式1):', url);
                
                let response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'apikey': SUPABASE_ANON_KEY,
                        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                        'Accept': 'application/vnd.pgjson.object+json'
                    }
                });
                
                console.log('📡 REST API 回應狀態 (格式1):', response.status, response.statusText);
                
                // 如果 406 錯誤，嘗試不同的 Accept 標頭
                if (response.status === 406) {
                    console.log('🔄 406 錯誤，嘗試使用不同的 Accept 標頭...');
                    url = `${SUPABASE_URL}/rest/v1/related_links?id=eq.${encodedId}`;
                    response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    });
                    console.log('📡 REST API 回應狀態 (格式2):', response.status, response.statusText);
                }
                
                if (response.ok) {
                    const links = await response.json();
                    console.log('📋 REST API 回應資料:', links);
                    if (links && Array.isArray(links) && links.length > 0) {
                        link = links[0];
                        linkError = null;
                        console.log('✅ 使用 REST API 直接查詢成功');
                    } else if (links && !Array.isArray(links)) {
                        // 如果返回的是單一對象而不是陣列
                        link = links;
                        linkError = null;
                        console.log('✅ 使用 REST API 直接查詢成功（單一對象）');
                    } else {
                        console.warn('⚠️ REST API 返回空陣列或無效資料');
                        // 嘗試直接使用 Supabase 客戶端查詢所有連結，然後過濾
                        console.log('🔄 嘗試查詢所有連結並過濾...');
                        const { data: allLinks, error: allLinksError } = await supabaseClient
                            .from('related_links')
                            .select('*');
                        
                        if (!allLinksError && allLinks) {
                            const foundLink = allLinks.find(l => l.id === linkId);
                            if (foundLink) {
                                link = foundLink;
                                linkError = null;
                                console.log('✅ 從所有連結中找到目標連結');
                            } else {
                                throw new Error('找不到指定的連結（ID: ' + linkId + '）');
                            }
                        } else {
                            throw new Error('找不到指定的連結');
                        }
                    }
                } else {
                    const errorText = await response.text();
                    console.error('❌ REST API 錯誤:', response.status, errorText);
                    // 嘗試直接使用 Supabase 客戶端查詢所有連結
                    console.log('🔄 嘗試查詢所有連結並過濾...');
                    const { data: allLinks, error: allLinksError } = await supabaseClient
                        .from('related_links')
                        .select('*');
                    
                    if (!allLinksError && allLinks) {
                        const foundLink = allLinks.find(l => l.id === linkId);
                        if (foundLink) {
                            link = foundLink;
                            linkError = null;
                            console.log('✅ 從所有連結中找到目標連結');
                        } else {
                            throw new Error(`REST API 錯誤 (${response.status}): ${errorText || response.statusText}`);
                        }
                    } else {
                        throw new Error(`REST API 錯誤 (${response.status}): ${errorText || response.statusText}`);
                    }
                }
            } catch (fetchError) {
                console.error('❌ 直接查詢也失敗:', fetchError);
                // 最後嘗試：查詢所有連結並過濾
                try {
                    console.log('🔄 最後嘗試：查詢所有連結並過濾...');
                    const { data: allLinks, error: allLinksError } = await supabaseClient
                        .from('related_links')
                        .select('*');
                    
                    if (!allLinksError && allLinks) {
                        const foundLink = allLinks.find(l => l.id === linkId);
                        if (foundLink) {
                            link = foundLink;
                            linkError = null;
                            console.log('✅ 從所有連結中找到目標連結');
                        } else {
                            throw linkError || fetchError || new Error('找不到指定的連結');
                        }
                    } else {
                        throw linkError || fetchError || allLinksError;
                    }
                } catch (finalError) {
                    throw linkError || fetchError || finalError;
                }
            }
        }
        
        if (linkError) throw linkError;
        
        if (!link) {
            throw new Error('無法載入連結資料');
        }
        
        console.log('✅ 成功載入連結資料:', link);
        
        editingLinkId = linkId;
        
        // 確保所有表單元素都存在
        const modalTitle = document.getElementById('link-modal-title');
        const titleInputEl = document.getElementById('link-title');
        const urlInputEl = document.getElementById('link-url');
        const iconInputEl = document.getElementById('link-icon');
        const colorInputEl = document.getElementById('link-color');
        const orderInputEl = document.getElementById('link-order');
        const activeCheckboxEl = document.getElementById('link-active');
        const typeSelectEl = document.getElementById('link-type');
        
        if (!titleInputEl || !urlInputEl || !iconInputEl || !colorInputEl || !orderInputEl || !activeCheckboxEl || !typeSelectEl || !modalTitle) {
            throw new Error('找不到必要的表單元素，請重新整理頁面');
        }
        
        modalTitle.textContent = '編輯連結';
        titleInputEl.value = link.title || '';
        urlInputEl.value = link.url || '';
        iconInputEl.value = link.icon || '';
        colorInputEl.value = link.color_gradient || 'linear-gradient(45deg, #667eea, #764ba2)';
        orderInputEl.value = link.display_order || 0;
        activeCheckboxEl.checked = link.is_active !== false;
        typeSelectEl.value = link.link_type || 'button';
        
        // 如果是下拉選單，載入子項目
        if (link.link_type === 'dropdown') {
            console.log('🔄 正在載入下拉選單子項目...');
            let { data: items, error: itemsError } = await supabaseClient
                .from('related_link_items')
                .select('*')
                .eq('parent_link_id', linkId)
                .order('display_order', { ascending: true });
            
            // 如果遇到錯誤，嘗試使用 REST API 直接查詢
            if (itemsError) {
                console.warn('⚠️ 載入子項目失敗，嘗試直接查詢...', itemsError);
                try {
                    const encodedLinkId = encodeURIComponent(linkId);
                    const url = `${SUPABASE_URL}/rest/v1/related_link_items?parent_link_id=eq.${encodedLinkId}&select=*&order=display_order.asc`;
                    console.log('🔄 REST API URL (子項目):', url);
                    
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        }
                    });
                    
                    if (response.ok) {
                        items = await response.json();
                        itemsError = null;
                        console.log('✅ 使用 REST API 直接查詢子項目成功，載入到', items.length, '個項目');
                    } else {
                        const errorText = await response.text();
                        console.warn('⚠️ REST API 查詢子項目失敗:', response.status, errorText);
                    }
                } catch (fetchError) {
                    console.warn('⚠️ 直接查詢子項目也失敗:', fetchError);
                }
            }
            
            if (itemsError) {
                console.warn('載入子項目失敗:', itemsError);
                linkItems = [];
            } else {
                linkItems = items || [];
                console.log('✅ 成功載入', linkItems.length, '個子項目');
            }
            
            document.getElementById('link-items-container').style.display = 'block';
            renderLinkItems();
        } else {
            linkItems = [];
            document.getElementById('link-items-container').style.display = 'none';
        }
        
        // 顯示彈窗（表單元素已經在上面檢查過了）
        document.getElementById('link-modal').style.display = 'flex';
        console.log('✅ 編輯彈窗已顯示');
    } catch (error) {
        console.error('❌ 載入連結失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
        showLinkAlert('error', `載入連結失敗：${error.message || '未知錯誤'}`);
    }
}

// 關閉連結彈窗
function closeLinkModal() {
    document.getElementById('link-modal').style.display = 'none';
    editingLinkId = null;
    linkItems = [];
}

// 監聽連結類型變化
document.addEventListener('DOMContentLoaded', function() {
    const linkTypeSelect = document.getElementById('link-type');
    if (linkTypeSelect) {
        linkTypeSelect.addEventListener('change', function() {
            if (this.value === 'dropdown') {
                document.getElementById('link-items-container').style.display = 'block';
            } else {
                document.getElementById('link-items-container').style.display = 'none';
            }
        });
    }
});

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
                <button type="button" class="btn btn-danger btn-small" onclick="removeLinkItem(${index})"
                        title="刪除">
                    🗑️
                </button>
            </div>
            <div class="form-group" style="margin-bottom: 0.5rem;">
                <label>標題</label>
                <input type="text" class="link-item-title" data-index="${index}" 
                       value="${escapeHtml(item.title)}" 
                       placeholder="例如：2026年楊梅趨勢引擊"
                       onchange="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.updateLinkItem) { RelatedLinksBackend.updateLinkItem(${index}, 'title', this.value); } else { updateLinkItem(${index}, 'title', this.value); }">
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label>網址</label>
                <input type="url" class="link-item-url" data-index="${index}" 
                       value="${escapeHtml(item.url)}" 
                       placeholder="https://example.com"
                       onchange="if(typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.updateLinkItem) { RelatedLinksBackend.updateLinkItem(${index}, 'url', this.value); } else { updateLinkItem(${index}, 'url', this.value); }">
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

// 儲存連結
async function saveLink() {
    console.log('🔄 開始儲存連結...');
    
    // 確保 Supabase 客戶端已初始化
    const client = initSupabaseClient();
    if (!client) {
        showLinkAlert('error', '無法初始化 Supabase 客戶端，請重新整理頁面');
        return;
    }
    supabaseClient = client;
    
    // 獲取表單資料
    const titleInput = document.getElementById('link-title');
    const urlInput = document.getElementById('link-url');
    const iconInput = document.getElementById('link-icon');
    const colorInput = document.getElementById('link-color');
    const orderInput = document.getElementById('link-order');
    const activeCheckbox = document.getElementById('link-active');
    const typeSelect = document.getElementById('link-type');
    
    if (!titleInput || !urlInput || !iconInput || !colorInput || !orderInput || !activeCheckbox || !typeSelect) {
        showLinkAlert('error', '找不到表單元素，請重新整理頁面');
        console.error('❌ 找不到表單元素');
        return;
    }
    
    const title = titleInput.value.trim();
    const url = urlInput.value.trim();
    const icon = iconInput.value.trim();
    const color = colorInput.value.trim();
    const order = parseInt(orderInput.value) || 0;
    const isActive = activeCheckbox.checked;
    const linkType = typeSelect.value;
    
    console.log('📋 表單資料:', { title, url, icon, color, order, isActive, linkType, editingLinkId });
    
    if (!title || !url) {
        showLinkAlert('error', '請填寫標題和網址');
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
            // 更新連結
            console.log('🔄 正在更新連結，ID:', editingLinkId);
            let { data, error } = await supabaseClient
                .from('related_links')
                .update(linkData)
                .eq('id', editingLinkId)
                .select()
                .single();
            
            // 如果遇到錯誤，嘗試使用 REST API
            if (error) {
                console.warn('⚠️ Supabase 客戶端更新失敗，嘗試使用 REST API...', error);
                try {
                    const encodedId = encodeURIComponent(editingLinkId);
                    const url = `${SUPABASE_URL}/rest/v1/related_links?id=eq.${encodedId}`;
                    console.log('🔄 REST API URL (更新):', url);
                    
                    const response = await fetch(url, {
                        method: 'PATCH',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(linkData)
                    });
                    
                    console.log('📡 REST API 回應狀態:', response.status, response.statusText);
                    
                    if (response.ok) {
                        const updatedLinks = await response.json();
                        console.log('📋 REST API 回應資料:', updatedLinks);
                        if (updatedLinks && updatedLinks.length > 0) {
                            data = updatedLinks[0];
                            error = null;
                            console.log('✅ 使用 REST API 更新成功');
                        } else {
                            throw new Error('更新後未返回資料');
                        }
                    } else {
                        const errorText = await response.text();
                        console.error('❌ REST API 錯誤:', response.status, errorText);
                        throw new Error(`REST API 錯誤 (${response.status}): ${errorText || response.statusText}`);
                    }
                } catch (fetchError) {
                    console.error('❌ REST API 更新也失敗:', fetchError);
                    throw error || fetchError;
                }
            }
            
            if (error) throw error;
            linkId = data.id;
            console.log('✅ 連結更新成功，ID:', linkId);
            
            // 刪除舊的子項目
            console.log('🔄 正在刪除舊的子項目...');
            const { error: deleteError } = await supabaseClient
                .from('related_link_items')
                .delete()
                .eq('parent_link_id', linkId);
            
            if (deleteError) {
                console.warn('⚠️ 刪除舊子項目失敗（可能沒有舊項目）:', deleteError);
                // 嘗試使用 REST API 刪除
                try {
                    await fetch(`${SUPABASE_URL}/rest/v1/related_link_items?parent_link_id=eq.${linkId}`, {
                        method: 'DELETE',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    });
                } catch (fetchError) {
                    console.warn('⚠️ REST API 刪除子項目也失敗:', fetchError);
                }
            }
        } else {
            // 新增連結
            console.log('🔄 正在新增連結...');
            let { data, error } = await supabaseClient
                .from('related_links')
                .insert([linkData])
                .select()
                .single();
            
            // 如果遇到錯誤，嘗試使用 REST API
            if (error) {
                console.warn('⚠️ Supabase 客戶端新增失敗，嘗試使用 REST API...', error);
                try {
                    const url = `${SUPABASE_URL}/rest/v1/related_links`;
                    console.log('🔄 REST API URL (新增):', url);
                    
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: {
                            'apikey': SUPABASE_ANON_KEY,
                            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'Prefer': 'return=representation'
                        },
                        body: JSON.stringify(linkData)
                    });
                    
                    console.log('📡 REST API 回應狀態:', response.status, response.statusText);
                    
                    if (response.ok) {
                        const newLinks = await response.json();
                        console.log('📋 REST API 回應資料:', newLinks);
                        if (newLinks && newLinks.length > 0) {
                            data = newLinks[0];
                            error = null;
                            console.log('✅ 使用 REST API 新增成功');
                        } else {
                            throw new Error('新增後未返回資料');
                        }
                    } else {
                        const errorText = await response.text();
                        console.error('❌ REST API 錯誤:', response.status, errorText);
                        throw new Error(`REST API 錯誤 (${response.status}): ${errorText || response.statusText}`);
                    }
                } catch (fetchError) {
                    console.error('❌ REST API 新增也失敗:', fetchError);
                    throw error || fetchError;
                }
            }
            
            if (error) throw error;
            linkId = data.id;
            console.log('✅ 連結新增成功，ID:', linkId);
        }
        
        // 如果是下拉選單，儲存子項目
        if (linkType === 'dropdown' && linkItems.length > 0) {
            console.log('🔄 正在儲存下拉選單子項目...');
            const itemsToInsert = linkItems
                .filter(item => item.title && item.url)
                .map((item, index) => ({
                    parent_link_id: linkId,
                    title: item.title,
                    url: item.url,
                    display_order: index,
                    is_active: true
                }));
            
            console.log('📋 準備插入', itemsToInsert.length, '個子項目');
            
            if (itemsToInsert.length > 0) {
                let { error: itemsError } = await supabaseClient
                    .from('related_link_items')
                    .insert(itemsToInsert);
                
                // 如果遇到錯誤，嘗試使用 REST API
                if (itemsError) {
                    console.warn('⚠️ Supabase 客戶端插入子項目失敗，嘗試使用 REST API...', itemsError);
                    try {
                        const url = `${SUPABASE_URL}/rest/v1/related_link_items`;
                        console.log('🔄 REST API URL (插入子項目):', url);
                        
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: {
                                'apikey': SUPABASE_ANON_KEY,
                                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json',
                                'Prefer': 'return=representation'
                            },
                            body: JSON.stringify(itemsToInsert)
                        });
                        
                        console.log('📡 REST API 回應狀態:', response.status, response.statusText);
                        
                        if (response.ok) {
                            itemsError = null;
                            console.log('✅ 使用 REST API 插入子項目成功');
                        } else {
                            const errorText = await response.text();
                            console.error('❌ REST API 錯誤:', response.status, errorText);
                            throw new Error(`REST API 錯誤 (${response.status}): ${errorText || response.statusText}`);
                        }
                    } catch (fetchError) {
                        console.error('❌ REST API 插入子項目也失敗:', fetchError);
                        throw itemsError || fetchError;
                    }
                }
                
                if (itemsError) throw itemsError;
                console.log('✅ 子項目儲存成功');
            }
        }
        
        showLinkAlert('success', editingLinkId ? '連結已更新！' : '連結已新增！');
        closeLinkModal();
        
        // 重新載入連結列表
        console.log('🔄 重新載入連結列表...');
        await loadRelatedLinks();
        console.log('✅ 儲存流程完成');
    } catch (error) {
        console.error('❌ 儲存連結失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            details: error.details,
            hint: error.hint,
            code: error.code
        });
        showLinkAlert('error', `儲存失敗：${error.message || '未知錯誤'}`);
    }
}

// 刪除連結
async function deleteLink(linkId) {
    if (!confirm('確定要刪除這個連結嗎？此操作無法復原。')) {
        return;
    }
    
    try {
    // 確保 Supabase 客戶端已初始化
    const client = initSupabaseClient();
    if (!client) {
        showLinkAlert('error', '無法初始化 Supabase 客戶端，請重新整理頁面');
        return;
    }
    supabaseClient = client;
        
        // 先刪除子項目（如果有）
        await supabaseClient
            .from('related_link_items')
            .delete()
            .eq('parent_link_id', linkId);
        
        // 刪除連結
        const { error } = await supabaseClient
            .from('related_links')
            .delete()
            .eq('id', linkId);
        
        if (error) throw error;
        
        showLinkAlert('success', '連結已刪除！');
        loadRelatedLinks();
    } catch (error) {
        console.error('刪除連結失敗:', error);
        showLinkAlert('error', `刪除失敗：${error.message}`);
    }
}

// 顯示提示訊息（用於連結管理）
function showLinkAlert(type, message) {
    const container = document.getElementById('links-alert-container');
    if (!container) {
        // 如果找不到容器，使用全域的 showAlert
        if (typeof showAlert === 'function') {
            showAlert(type, message);
        } else {
            // 如果都沒有，使用 alert
            alert(message);
        }
        return;
    }
    
    const alertClass = type === 'success' ? 'alert-success' : 
                      type === 'error' ? 'alert-error' : 'alert-info';
    
    container.innerHTML = `<div class="alert ${alertClass}">${escapeHtml(message)}</div>`;
    
    // 3秒後自動清除
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

// 確保函數暴露到全域（用於 onclick 事件）
// 優先使用模組化版本，如果模組未載入則使用舊版本
window.editLink = function(linkId) {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.editLink) {
        return RelatedLinksBackend.editLink(linkId);
    } else {
        return editLink(linkId);
    }
};
window.saveLink = function() {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.saveLink) {
        return RelatedLinksBackend.saveLink();
    } else {
        return saveLink();
    }
};
window.showAddLinkModal = function() {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.showAddLinkModal) {
        return RelatedLinksBackend.showAddLinkModal();
    } else {
        return showAddLinkModal();
    }
};
window.closeLinkModal = function() {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.closeLinkModal) {
        return RelatedLinksBackend.closeLinkModal();
    } else {
        return closeLinkModal();
    }
};
window.addLinkItem = function() {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.addLinkItem) {
        return RelatedLinksBackend.addLinkItem();
    } else {
        return addLinkItem();
    }
};
window.removeLinkItem = function(index) {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.removeLinkItem) {
        return RelatedLinksBackend.removeLinkItem(index);
    } else {
        return removeLinkItem(index);
    }
};
window.updateLinkItem = function(index, field, value) {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.updateLinkItem) {
        return RelatedLinksBackend.updateLinkItem(index, field, value);
    } else {
        return updateLinkItem(index, field, value);
    }
};
window.deleteLink = function(linkId) {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.deleteLink) {
        return RelatedLinksBackend.deleteLink(linkId);
    } else {
        return deleteLink(linkId);
    }
};
window.loadRelatedLinks = function() {
    if (typeof RelatedLinksBackend !== 'undefined' && RelatedLinksBackend.loadRelatedLinks) {
        return RelatedLinksBackend.loadRelatedLinks();
    } else {
        return loadRelatedLinks();
    }
};

console.log('✅ 連結管理函數已暴露到全域（優先使用模組化版本）');

// 頁面載入時初始化
window.addEventListener('load', init);
