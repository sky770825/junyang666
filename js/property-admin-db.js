// 物件管理後台表單邏輯（從 property-admin-db.html 抽出）
// 表單區塊摺疊功能（僅手機版）
function toggleSection(section, event) {
    // 只在手機版啟用摺疊功能
    if (window.innerWidth <= 768) {
        // 如果點擊的是標題，才執行摺疊
        if (event && event.target.tagName === 'H3') {
            event.stopPropagation(); // 防止事件冒泡
            section.classList.toggle('collapsed');
        } else if (!event) {
            // 如果沒有事件參數，直接切換（用於程式呼叫）
            section.classList.toggle('collapsed');
        }
    }
}

// 優化：點擊標題時才摺疊，點擊表單內容不摺疊（僅手機版）
document.addEventListener('DOMContentLoaded', function() {
    // 只在手機版啟用摺疊功能
    if (window.innerWidth <= 768) {
        // 為所有表單區塊的標題添加點擊事件
        const sections = document.querySelectorAll('.form-section');
        sections.forEach(section => {
            const h3 = section.querySelector('h3');
            if (h3) {
                h3.addEventListener('click', function(e) {
                    e.stopPropagation();
                    section.classList.toggle('collapsed');
                });
            }
        });
    }
    
    initFormProgress();
    initAutoSave();
    // 表單驗證在所有版本都啟用
    initFormValidation();
});

function clearFrontendPropertyCaches() {
    try {
        if (typeof window.ClientCache !== 'undefined' && window.ClientCache.invalidate) {
            window.ClientCache.invalidate('properties');
        }
        if (typeof window.DataQuery !== 'undefined' && window.DataQuery.invalidateQueries) {
            window.DataQuery.invalidateQueries('properties');
        }
        if (window.localStorage) {
            [
                'embeddedPropertiesCache_v1',
                'junyang666_cache_properties:api:list',
                'junyang666_query_properties:api:list'
            ].forEach((key) => window.localStorage.removeItem(key));
            window.localStorage.setItem('junyang666_property_data_invalidated_at', new Date().toISOString());
        }
    } catch (error) {
        console.warn('⚠️ 清除前台快取失敗，將略過：', error);
    }
}

async function invalidateBackendPropertyCache() {
    if (!window.location || window.location.protocol === 'file:') return false;
    try {
        const response = await fetch('/api/cache/properties/invalidate', {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
        if (!response.ok) {
            console.warn('⚠️ 後端物件快取清除未完成：HTTP', response.status);
            return false;
        }
        return true;
    } catch (error) {
        console.warn('⚠️ 後端物件快取清除失敗，前台仍會直接重新抓 Supabase：', error.message);
        return false;
    }
}

async function syncFrontendAfterPropertySave(savedProperty) {
    clearFrontendPropertyCaches();
    const backendInvalidated = await invalidateBackendPropertyCache();
    console.log('🔄 前後端同步狀態:', {
        propertyId: savedProperty && savedProperty.id,
        number: savedProperty && savedProperty.number,
        frontendCacheCleared: true,
        backendCacheInvalidated
    });
}

// 表單填寫進度追蹤
function initFormProgress() {
    const progressDiv = document.getElementById('form-progress');
    if (progressDiv) {
        progressDiv.hidden = false;
    }
    
    // 監聽表單欄位變化
    const form = document.getElementById('property-form');
    if (form) {
        const requiredFields = form.querySelectorAll('[required]');
        const allFields = form.querySelectorAll('input, select, textarea');
        
        // 計算進度
        function updateProgress() {
            let filledCount = 0;
            let totalRequired = requiredFields.length;
            
            requiredFields.forEach(field => {
                const value = field.value.trim();
                if (value !== '' && value !== null && value !== undefined) {
                    filledCount++;
                }
            });
            
            const percentage = totalRequired > 0 ? Math.round((filledCount / totalRequired) * 100) : 0;
            
            const progressBar = document.getElementById('progress-bar');
            const progressPercentage = document.getElementById('progress-percentage');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = percentage + '%';
            if (progressPercentage) progressPercentage.textContent = percentage + '%';
            
            if (progressText) {
                if (percentage === 100) {
                    progressText.textContent = '所有必填欄位已完成，可以預覽或儲存。';
                    progressText.style.color = '#28a745';
                } else {
                    const remaining = totalRequired - filledCount;
                    progressText.textContent = `還有 ${remaining} 個必填欄位需要完成。`;
                    progressText.style.color = '#666';
                }
            }
        }
        
        // 監聽所有欄位變化
        allFields.forEach(field => {
            field.addEventListener('input', updateProgress);
            field.addEventListener('change', updateProgress);
        });
        
        // 初始計算
        updateProgress();
    }
}

// 自動儲存草稿功能（僅手機版）
let autoSaveTimer = null;
function initAutoSave() {
    // 只在手機版啟用自動儲存
    if (window.innerWidth > 768) {
        return; // 桌面版不啟用
    }
    
    if (window.innerWidth <= 768) {
        const form = document.getElementById('property-form');
        if (form) {
            // 每 30 秒自動儲存一次
            autoSaveTimer = setInterval(() => {
                saveDraft();
            }, 30000); // 30 秒
            
            // 監聽表單變化
            const fields = form.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                field.addEventListener('input', () => {
                    // 延遲 2 秒後儲存（避免頻繁儲存）
                    clearTimeout(autoSaveTimer);
                    autoSaveTimer = setTimeout(() => {
                        saveDraft();
                    }, 2000);
                });
            });
        }
    }
    
    // 頁面載入時恢復草稿
    loadDraft();
}

// 儲存草稿到 localStorage
function saveDraft() {
    try {
        const form = document.getElementById('property-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const draft = {};
        
        // 收集所有表單資料
        for (let [key, value] of formData.entries()) {
            draft[key] = value;
        }
        
        // 儲存圖片預覽資訊（僅 URL，不儲存檔案）
        if (uploadedImages && uploadedImages.length > 0) {
            draft.uploadedImages = uploadedImages.map(img => ({
                previewURL: img.previewURL || img.url,
                isCover: img.isCover || false
            }));
        }
        
        localStorage.setItem('property-form-draft', JSON.stringify(draft));
        console.log('💾 草稿已自動儲存');
    } catch (error) {
        console.warn('⚠️ 自動儲存草稿失敗:', error);
    }
}

// 載入草稿
function loadDraft() {
    try {
        const draftStr = localStorage.getItem('property-form-draft');
        if (!draftStr) return;
        
        const draft = JSON.parse(draftStr);
        if (!draft || Object.keys(draft).length === 0) return;
        
        // 詢問用戶是否要恢復草稿
        if (confirm('發現未完成的表單草稿，是否要恢復？')) {
            // 恢復表單欄位
            Object.keys(draft).forEach(key => {
                if (key === 'uploadedImages') return; // 圖片稍後處理
                
                const field = document.getElementById(key);
                if (field && draft[key] !== null && draft[key] !== undefined) {
                    field.value = draft[key];
                    // 觸發 change 事件，確保相關邏輯執行
                    field.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            
            // 恢復圖片預覽（僅顯示，不重新上傳）
            if (draft.uploadedImages && draft.uploadedImages.length > 0) {
                console.log('📸 發現草稿中的圖片，請重新上傳');
                // 不自動恢復圖片，因為需要重新上傳
            }
            
            showAlert('info', '草稿已恢復，請檢查表單內容');
        } else {
            // 清除草稿
            localStorage.removeItem('property-form-draft');
        }
    } catch (error) {
        console.warn('⚠️ 載入草稿失敗:', error);
    }
}

// 表單驗證優化 - 即時驗證提示
function initFormValidation() {
    const form = document.getElementById('property-form');
    if (!form) return;
    
    const requiredFields = form.querySelectorAll('[required]');
    
    requiredFields.forEach(field => {
        // 失去焦點時驗證
        field.addEventListener('blur', function() {
            validateField(this);
        });
        
        // 輸入時清除錯誤狀態
        field.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

// 驗證單個欄位
function validateField(field) {
    const value = field.value.trim();
    const isValid = field.checkValidity();
    
    if (!isValid || (field.hasAttribute('required') && value === '')) {
        showFieldError(field, '此欄位為必填');
        return false;
    } else {
        clearFieldError(field);
        return true;
    }
}

// 顯示欄位錯誤
function showFieldError(field, message) {
    clearFieldError(field); // 先清除舊的錯誤
    
    field.style.borderColor = '#dc3545';
    field.style.boxShadow = '0 0 0 3px rgba(220, 53, 69, 0.1)';
    
    // 添加錯誤提示
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error-message';
    errorDiv.style.cssText = 'color: #dc3545; font-size: 0.85rem; margin-top: 0.25rem; display: block;';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
}

// 清除欄位錯誤
function clearFieldError(field) {
    field.style.borderColor = '';
    field.style.boxShadow = '';
    
    const errorDiv = field.parentNode.querySelector('.field-error-message');
    if (errorDiv) {
        errorDiv.remove();
    }
}

// 包裝 resetForm 函數，確保清除草稿
const originalResetForm = window.resetForm;
if (typeof originalResetForm === 'function') {
    window.resetForm = function() {
        // 清除草稿
        localStorage.removeItem('property-form-draft');
        // 清除自動儲存計時器
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
            autoSaveTimer = null;
        }
        // 執行原始重置函數
        originalResetForm();
        // 重新初始化自動儲存
        setTimeout(() => {
            initAutoSave();
            if (window.innerWidth <= 768) {
                initFormProgress();
            }
        }, 100);
    };
}

// 包裝 saveProperty 函數，在成功儲存後清除草稿
const originalSaveProperty = window.saveProperty;
if (typeof originalSaveProperty === 'function') {
    window.saveProperty = async function() {
        try {
            await originalSaveProperty();
            // 儲存成功後清除草稿
            localStorage.removeItem('property-form-draft');
            console.log('✅ 儲存成功，已清除草稿');
        } catch (error) {
            // 儲存失敗時保留草稿
            throw error;
        }
    };
}

// 全域變數
let uploadedImages = []; // 已上傳的圖片 URL 和 key 陣列 [{url, key}]
let editingPropertyId = null;
let supabaseClient = null; // Supabase 客戶端實例
let propertyListCache = [];
let customerInquiryCache = [];

// 初始化 Supabase
function initSupabase() {
    const supabaseUrl = localStorage.getItem('supabase-url') || 'https://cnzqtuuegdqwkgvletaa.supabase.co';
    const supabaseAnonKey = localStorage.getItem('supabase-anon-key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';
    
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ Supabase 設定未完成');
        return null;
    }
    
    try {
        // 初始化 Supabase 客戶端
        supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);
        
        console.log('✅ Supabase 初始化成功', {
            url: supabaseUrl,
            hasClient: !!supabaseClient
        });
        return supabaseClient;
    } catch (error) {
        console.error('❌ Supabase 初始化失敗:', error);
        return null;
    }
}

// 載入設定
function loadSupabaseConfig() {
    const urlInput = document.getElementById('supabase-url');
    const anonKeyInput = document.getElementById('supabase-anon-key');
    
    if (urlInput) {
        urlInput.value = localStorage.getItem('supabase-url') || 'https://cnzqtuuegdqwkgvletaa.supabase.co';
    }
    if (anonKeyInput) {
        anonKeyInput.value = localStorage.getItem('supabase-anon-key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';
    }
    
    // 初始化 Supabase
    initSupabase();
}

// 檢查 URL 參數，如果是從 admin-dashboard.html 載入，自動切換到新增標籤
window.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    const id = urlParams.get('id');
    
    if (tab === 'add') {
        // 隱藏標籤切換按鈕（因為在 iframe 中）
        const tabs = document.querySelector('.tabs');
        if (tabs) {
            tabs.style.display = 'none';
        }
        // 隱藏 header（因為在 iframe 中）
        const header = document.querySelector('.header');
        if (header) {
            header.style.display = 'none';
        }
        
        // 自動切換到新增標籤
        const addTab = document.querySelector('.tab[onclick*="add"]');
        if (addTab) {
            switchTab('add', addTab);
            
                if (id) {
                setTimeout(() => editProperty(id), 150);
            }
        }
    }
});

// 儲存設定
function saveSupabaseConfig() {
    const urlInput = document.getElementById('supabase-url');
    const anonKeyInput = document.getElementById('supabase-anon-key');
    
    if (!urlInput || !anonKeyInput) {
        showAlert('error', '找不到設定欄位');
        return;
    }
    
    const supabaseUrl = urlInput.value.trim();
    const supabaseAnonKey = anonKeyInput.value.trim();
    
    if (!supabaseUrl || !supabaseAnonKey) {
        showAlert('error', '請填寫完整的 Supabase 設定（需要 URL 和 Anon Key）');
        return;
    }
    
    // 儲存到 localStorage
    localStorage.setItem('supabase-url', supabaseUrl);
    localStorage.setItem('supabase-anon-key', supabaseAnonKey);
    
    console.log('💾 設定已儲存:', { url: supabaseUrl, anonKey: supabaseAnonKey.substring(0, 10) + '...' });
    
    // 重新初始化 Supabase
    const result = initSupabase();
    
    if (result) {
        showAlert('success', '設定已儲存並初始化成功！');
        // 隱藏設定標籤
        hideConfigTab();
        // 自動切換到新增物件標籤
        setTimeout(() => {
            const addTab = document.getElementById('add-tab-button') || document.querySelector('.tab[onclick*="add"]');
            if (addTab) {
                switchTab('add', addTab);
            }
        }, 500);
        // 測試連接
        setTimeout(() => {
            testSupabaseConnection();
        }, 800);
    } else {
        showAlert('error', '設定已儲存，但初始化失敗，請檢查設定是否正確');
    }
}

// 隱藏設定標籤
function hideConfigTab() {
    const configTabButton = document.getElementById('config-tab-button');
    if (configTabButton) {
        configTabButton.style.display = 'none';
        localStorage.setItem('hide-config-tab', 'true');
    }
}

// 顯示設定標籤
function showConfigTab() {
    const configTabButton = document.getElementById('config-tab-button');
    if (configTabButton) {
        configTabButton.style.display = 'flex';
        localStorage.setItem('hide-config-tab', 'false');
    }
}

// 檢查是否需要隱藏設定標籤
function checkConfigTabVisibility() {
    const urlParams = new URLSearchParams(window.location.search);
    const forceShow = urlParams.get('settings') === '1' || urlParams.get('config') === '1';
    const anonKey = localStorage.getItem('supabase-anon-key');

    if (forceShow) {
        showConfigTab();
        return;
    }

    if (supabaseClient || anonKey) {
        hideConfigTab();
        return;
    }

    showConfigTab();
}

// 切換標籤（優化版本）
function switchTab(tabName, tabElement) {
    // 防止事件冒泡
    if (tabElement && tabElement.stopPropagation) {
        tabElement.stopPropagation();
    }
    
    // 使用 requestAnimationFrame 優化 DOM 操作
    requestAnimationFrame(() => {
        // 批量 DOM 操作
        const contents = document.querySelectorAll('.tab-content');
        const tabs = document.querySelectorAll('.tab');
        
        // 先移除所有 active 類別
        contents.forEach(content => {
        content.classList.remove('active');
    });
        tabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
        // 再添加 active 類別
        const targetContent = document.getElementById(tabName + '-tab');
    const targetTab = tabElement || document.querySelector(`.tab[onclick*="'${tabName}'"]`);
        
        if (targetContent) {
            targetContent.classList.add('active');
            // 滾動到頂部，使用平滑滾動
            requestAnimationFrame(() => {
                targetContent.scrollTop = 0;
            });
        }
        
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
        // 如果需要載入列表，在下一幀執行
    if (tabName === 'list') {
            requestAnimationFrame(() => {
        loadProperties();
            });
    }

    if (tabName === 'inquiries') {
        requestAnimationFrame(() => {
            loadCustomerInquiries();
        });
    }
    
    // 確保圖片拖曳功能已初始化（當切換到新增/編輯標籤時）
    if (tabName === 'add') {
        requestAnimationFrame(() => {
            initImageSortable();
        });
    }
    });
}

// 圖片上傳處理（在 DOMContentLoaded 中初始化）
let isUploading = false; // 防止重複上傳的標誌
let isFileDialogOpen = false; // 防止重複開啟檔案選擇視窗

document.addEventListener('DOMContentLoaded', function() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    
    if (!uploadArea || !fileInput) return;
    
    // 拖曳上傳（若為圖片排序拖曳則略過）
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('application/x-image-sort')) return;
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.types.includes('application/x-image-sort')) return;
        
        if (isUploading) {
            console.log('⏳ 正在上傳中，請稍候...');
            return;
        }
        
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        if (files.length > 0) {
            handleFiles(files);
        }
    });
    
    // 點擊上傳區域
    uploadArea.addEventListener('click', function(e) {
        // 如果點擊的是檔案選擇器、按鈕或圖片預覽區域，不處理
        if (e.target === fileInput || 
            e.target.tagName === 'BUTTON' || 
            e.target.closest('button') ||
            e.target.closest('.image-preview-item') ||
            e.target.closest('.image-remove')) {
            return;
        }
        
        // 防止重複觸發
        if (isUploading || isFileDialogOpen) {
            console.log('⏳ 正在處理中，請稍候...');
            return;
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // 標記檔案對話框為開啟狀態
        isFileDialogOpen = true;
        
        // 直接觸發檔案選擇，不使用 setTimeout
        fileInput.click();
    }, true); // 使用捕獲階段，確保優先處理
    
    // 監聽檔案選擇器焦點變化（當檔案對話框關閉時）
    fileInput.addEventListener('focus', function() {
        // 檔案對話框打開
        isFileDialogOpen = true;
    });
    
    // 檔案選擇器的 change 事件
    fileInput.addEventListener('change', function(e) {
        e.stopPropagation();
        e.preventDefault();
        
        // 檔案對話框已關閉
        isFileDialogOpen = false;
        
        // 獲取所有選擇的檔案
        const files = Array.from(e.target.files || []);
        
        // 如果沒有選擇檔案（用戶點擊取消），直接返回
        if (files.length === 0) {
            console.log('📋 未選擇檔案');
            fileInput.value = '';
            return;
        }
        
        console.log(`📁 選擇了 ${files.length} 個檔案:`, files.map(f => `${f.name} (${(f.size / 1024).toFixed(2)} KB)`));
        
        // 保存檔案列表後立即清空檔案選擇器，防止重複觸發
        const selectedFiles = Array.from(files);
        fileInput.value = '';
        
        // 處理檔案（不上傳，只預覽）
        handleFiles(selectedFiles);
    });

    // 當視窗失去焦點時（檔案對話框關閉），重置標誌
    window.addEventListener('focus', function() {
        setTimeout(() => {
            isFileDialogOpen = false;
        }, 100);
    });
    
    // 圖片拖曳排序（絲滑預覽）
    initImageSortable();
});

// 處理檔案（只預覽，不上傳）
function handleFiles(files) {
    if (!files || files.length === 0) {
        console.warn('⚠️ 沒有選擇檔案');
        return;
    }
    
    console.log(`📁 收到 ${files.length} 個檔案`);
    
    // 過濾出圖片檔案（檢查 MIME type 和副檔名）
    const imageFiles = files.filter(file => {
        // 檢查檔案類型
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        const isValidType = validTypes.includes(file.type.toLowerCase());
        
        // 檢查檔案名稱副檔名（有些瀏覽器可能沒有正確的 MIME type）
        const fileName = file.name.toLowerCase();
        const hasValidExtension = fileName.endsWith('.jpg') || 
                                 fileName.endsWith('.jpeg') || 
                                 fileName.endsWith('.png') || 
                                 fileName.endsWith('.gif') || 
                                 fileName.endsWith('.webp');
        
        const isValid = isValidType || hasValidExtension;
        
        if (!isValid) {
            console.warn(`⚠️ 跳過非圖片檔案: ${file.name} (type: ${file.type})`);
        }
        
        return isValid;
    });
    
    if (imageFiles.length === 0) {
        showAlert('error', '請選擇圖片檔案（JPG、PNG、GIF、WEBP）');
        console.warn('⚠️ 沒有有效的圖片檔案');
        return;
    }
    
    console.log(`🖼️ 過濾後有 ${imageFiles.length} 個圖片檔案`);
    
    // 檢查總數是否超過10張
    const currentCount = uploadedImages.length;
    const maxImages = 10;
    
    if (currentCount + imageFiles.length > maxImages) {
        const remaining = maxImages - currentCount;
        if (remaining <= 0) {
            showAlert('error', `最多只能上傳 ${maxImages} 張圖片，目前已達上限`);
            console.warn(`⚠️ 已達上限 ${maxImages} 張`);
            return;
        } else {
            showAlert('warning', `只能再上傳 ${remaining} 張圖片（最多 ${maxImages} 張），將只添加前 ${remaining} 張`);
            console.warn(`⚠️ 只保留前 ${remaining} 張圖片`);
            imageFiles.splice(remaining); // 只取前面幾張
        }
    }
    
    console.log(`📤 準備預覽 ${imageFiles.length} 個圖片檔案（目前已有 ${currentCount} 張）`);
    
    // 只添加預覽，不上傳
    let successCount = 0;
    let failCount = 0;
    
    for (const file of imageFiles) {
        try {
            addImagePreview(file);
            successCount++;
        } catch (error) {
            console.error(`❌ 添加預覽失敗: ${file.name}`, error);
            failCount++;
        }
    }
    
    const newTotal = uploadedImages.length;
    console.log(`✅ 成功添加 ${successCount} 張圖片到預覽區（共 ${newTotal}/${maxImages} 張）`);
    
    if (failCount > 0) {
        console.warn(`⚠️ ${failCount} 張圖片添加失敗`);
    }
    
    if (successCount > 0) {
        showAlert('success', `已添加 ${successCount} 張圖片到預覽區（共 ${newTotal}/${maxImages} 張）`);
    }
}

// 添加圖片預覽（不上傳，只預覽）
function addImagePreview(file) {
    // 驗證檔案類型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showAlert('error', `不支援的檔案格式: ${file.type}，請使用 JPG、PNG、GIF 或 WEBP`);
        return;
    }
    
    // 檢查檔案大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showAlert('error', `檔案太大: ${(file.size / 1024 / 1024).toFixed(2)}MB，請上傳小於 10MB 的圖片`);
        return;
    }
    
    // 獲取圖片預覽容器
    const imagePreviewGrid = document.getElementById('image-preview-grid');
    if (!imagePreviewGrid) {
        console.error('❌ 找不到圖片預覽容器 #image-preview-grid');
        return false;
    }
    
    const imageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    // 創建本地預覽 URL
    let previewURL;
    try {
        previewURL = URL.createObjectURL(file);
    } catch (error) {
        console.error(`❌ 無法創建預覽 URL: ${file.name}`, error);
        showAlert('error', `無法預覽圖片: ${file.name}`);
        return false;
    }
    
    // 儲存檔案資訊（不上傳）
    uploadedImages.push({
        file: file, // 保存原始檔案物件
        previewURL: previewURL, // 本地預覽 URL
        originalName: file.name,
        fileSize: file.size,
        fileType: file.type,
        imageId: imageId,
        uploadedAt: Date.now()
    });
    
    // 如果是第一張圖片，自動設為封面
    const isFirstImage = uploadedImages.length === 0;
    if (isFirstImage) {
        // 這張圖片將成為第一張，標記為封面
        // 注意：這裡先 push，所以實際上是 uploadedImages.length === 1
    }
    
    // 創建預覽項目
    try {
        const previewItem = createImagePreviewItemForLocal(imageId, previewURL, file.name, isFirstImage);
        if (previewItem) {
            imagePreviewGrid.appendChild(previewItem);
            console.log(`✅ 已添加圖片預覽: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
            
            // 如果是第一張圖片，標記為封面
            if (isFirstImage) {
                const imageData = uploadedImages[uploadedImages.length - 1];
                if (imageData) {
                    imageData.isCover = true;
                }
            }
            
            // 確保拖曳功能已初始化（在添加圖片後）
            initImageSortable();
            
            return true;
        } else {
            console.error(`❌ 無法創建預覽項目: ${file.name}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 創建預覽項目失敗: ${file.name}`, error);
        // 從 uploadedImages 中移除
        uploadedImages.pop();
        URL.revokeObjectURL(previewURL);
        return false;
    }
}

// 上傳單張圖片（先上傳到臨時位置，提交時再整理）
async function uploadImage(file) {
    // 檢查 Supabase 是否已初始化
    if (!supabaseClient) {
        isUploading = false; // 重置標誌
        showAlert('error', '請先設定 Supabase 配置，正在跳轉到設定頁面...');
        // 自動跳轉到設定頁面
        setTimeout(() => {
            const configTab = document.querySelector('.tab[onclick*="config"]');
            if (configTab) {
                switchTab('config', configTab);
            }
        }, 1000);
        return;
    }
    
    // 驗證檔案類型
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        showAlert('error', `不支援的檔案格式: ${file.type}，請使用 JPG、PNG、GIF 或 WEBP`);
        console.warn('⚠️ 不支援的檔案類型:', file.type);
        return;
    }
    
    // 檢查檔案大小（限制 10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
        showAlert('error', `檔案太大: ${(file.size / 1024 / 1024).toFixed(2)}MB，請上傳小於 10MB 的圖片`);
        console.warn('⚠️ 檔案過大:', file.size);
        return;
    }
    
    // 獲取圖片預覽容器
    const imagePreviewGrid = document.getElementById('image-preview-grid');
    if (!imagePreviewGrid) {
        console.error('找不到圖片預覽容器');
        return;
    }
    
    const imageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const previewItem = createImagePreviewItem(imageId, file);
    // 立即添加到預覽區域（先顯示本地預覽）
    imagePreviewGrid.appendChild(previewItem);
    
    try {
        // 生成檔案名稱和路徑（先上傳到臨時資料夾）
        const fileExt = file.name.split('.').pop().toLowerCase();
        const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        // 使用臨時資料夾，等提交時再根據物件編號整理到新結構
        const tempFolder = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const tempPath = `temp/${tempFolder}/${fileName}`;
        
        console.log('📤 開始上傳圖片到臨時位置:', {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            tempPath: tempPath,
            storage: !!storage,
            db: !!db
        });
        
        // 再次檢查 Supabase 是否正確初始化
        if (!supabaseClient) {
            throw new Error('Supabase 未初始化，請檢查 Supabase 設定');
        }
        
        // 上傳到 Supabase Storage 臨時資料夾
        const { data: uploadData, error: uploadError } = await supabaseClient
            .storage
            .from('junyang666')
            .upload(tempPath, file, {
                cacheControl: '3600',
                upsert: false
            });
        
        if (uploadError) {
            console.error('❌ 上傳錯誤:', uploadError);
            console.error('錯誤詳情:', {
                message: uploadError.message,
                statusCode: uploadError.statusCode
            });
            
            previewItem.remove();
            let errorMsg = `圖片上傳失敗: ${file.name}`;
            
            // 提供更詳細的錯誤訊息
            if (uploadError.message && uploadError.message.includes('unauthorized')) {
                errorMsg += ' - 權限被拒絕，請檢查 Storage 規則';
            } else if (uploadError.message && uploadError.message.includes('canceled')) {
                errorMsg += ' - 上傳已取消';
            } else {
                errorMsg += ` - ${uploadError.message || '未知錯誤'}`;
            }
            
            showAlert('error', errorMsg);
            isUploading = false;
            isFileDialogOpen = false;
            return;
        }
        
        // 上傳完成，取得公開 URL
        const { data: urlData } = supabaseClient
            .storage
            .from('junyang666')
            .getPublicUrl(tempPath);
        
        const downloadURL = urlData.publicUrl;
        
        console.log('✅ 圖片上傳成功:', {
            fileName: file.name,
            downloadURL: downloadURL,
            tempPath: tempPath
        });
        
        // 儲存 URL 和臨時路徑（提交時會根據物件編號重新整理）
        uploadedImages.push({
            url: downloadURL,
            tempKey: tempPath, // 臨時路徑
            tempFolder: tempFolder, // 臨時資料夾
            originalName: file.name,
            fileSize: file.size,
            uploadedAt: Date.now(),
            file: file // 保留檔案物件，方便後續處理
        });
        
        // 更新預覽
        requestAnimationFrame(() => {
            const img = previewItem.querySelector('img');
            if (img) {
                img.src = downloadURL;
            }
            const progress = previewItem.querySelector('.upload-progress');
            if (progress) {
                progress.style.display = 'none';
            }
        });
        
        showAlert('success', `圖片上傳成功: ${file.name}`);
        
        // 重置上傳狀態
        isUploading = false;
        isFileDialogOpen = false;
    } catch (error) {
        console.error('❌ 上傳錯誤:', error);
        console.error('錯誤詳情:', error);
        previewItem.remove();
        let errorMsg = `圖片上傳失敗: ${file.name}`;
        if (error.message) {
            errorMsg += ` - ${error.message}`;
        }
        showAlert('error', errorMsg);
    }
}

// 建立圖片預覽項目（本地預覽版本，不上傳）
function createImagePreviewItemForLocal(imageId, previewURL, fileName, isCover = false) {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    if (isCover) {
        item.classList.add('cover-image');
    }
    item.dataset.imageId = imageId;
    item.draggable = true;
    item.style.position = 'relative';
    
    const img = document.createElement('img');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    img.src = previewURL;
    img.alt = fileName;
    img.style.backgroundColor = '#f8f9fa';
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'cover';
    img.onload = function() {
        this.style.backgroundColor = 'transparent';
    };
    img.onerror = function() {
        console.error('圖片載入失敗:', previewURL);
        this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y4ZjlmYSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj7lm77niYfliqDovb3lpLHotKU8L3RleHQ+PC9zdmc+';
    };
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'image-remove';
    removeBtn.innerHTML = '×';
    removeBtn.style.cssText = 'position: absolute; top: 5px; right: 5px; background: rgba(220, 53, 69, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; font-size: 18px; line-height: 1; display: flex; align-items: center; justify-content: center; z-index: 10;';
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeImage(item, imageId);
    };
    
    // 顯示待上傳標籤
    const statusBadge = document.createElement('div');
    statusBadge.className = 'image-status-badge';
    statusBadge.textContent = '待上傳';
    statusBadge.style.cssText = 'position: absolute; top: 2px; left: 2px; background: #ffc107; color: #000; padding: 1px 4px; border-radius: 2px; font-size: 9px; font-weight: bold; z-index: 10; line-height: 1.2;';
    
    // 封面標籤（如果是指定的封面）
    let coverBadge = null;
    if (isCover) {
        coverBadge = document.createElement('div');
        coverBadge.className = 'image-cover-badge';
        coverBadge.innerHTML = '⭐ 封面';
        coverBadge.style.cssText = 'position: absolute; top: 2px; left: 2px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; z-index: 11; display: flex; align-items: center; gap: 2px;';
        // 如果是指定封面，隱藏待上傳標籤
        statusBadge.style.display = 'none';
    }
    
    // 設為封面按鈕
    const coverBtn = document.createElement('button');
    coverBtn.className = 'image-cover-btn';
    if (isCover) {
        coverBtn.classList.add('is-cover');
        coverBtn.innerHTML = '✓ 封面';
    } else {
        coverBtn.innerHTML = '⭐ 設為封面';
    }
    coverBtn.onclick = (e) => {
        e.stopPropagation();
        setAsCoverImage(imageId);
    };
    
    item.appendChild(img);
    item.appendChild(removeBtn);
    item.appendChild(statusBadge);
    if (coverBadge) {
        item.appendChild(coverBadge);
    }
    item.appendChild(coverBtn);
    
    return item;
}

// 建立圖片預覽項目（上傳版本，帶進度條）
function createImagePreviewItem(imageId, file) {
    const item = document.createElement('div');
    item.className = 'image-preview-item';
    item.dataset.imageId = imageId;
    item.draggable = true;
    
    const img = document.createElement('img');
    // 使用異步載入圖片
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    // 先建立占位符，避免佈局跳動
    img.style.backgroundColor = '#f8f9fa';
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    // 圖片載入完成後優化
    img.onload = function() {
        this.style.backgroundColor = 'transparent';
    };
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'image-remove';
    removeBtn.innerHTML = '×';
    removeBtn.onclick = () => {
        URL.revokeObjectURL(objectUrl); // 清理記憶體
        removeImage(item, imageId);
    };
    
    const progress = document.createElement('div');
    progress.className = 'upload-progress';
    const progressBar = document.createElement('div');
    progressBar.className = 'upload-progress-bar';
    progressBar.style.width = '0%';
    progress.appendChild(progressBar);
    
    item.appendChild(img);
    item.appendChild(removeBtn);
    item.appendChild(progress);
    
    return item;
}

// 設為封面圖片
function setAsCoverImage(imageId) {
    // 清除所有圖片的封面標記
    uploadedImages.forEach(img => {
        img.isCover = false;
    });
    
    // 設置指定圖片為封面
    const imageIndex = uploadedImages.findIndex(img => img.imageId === imageId);
    if (imageIndex !== -1) {
        uploadedImages[imageIndex].isCover = true;
        console.log(`⭐ 已設置封面圖片: ${uploadedImages[imageIndex].originalName || '未知'}`);
        
        // 更新所有圖片預覽的視覺效果
        updateImagePreviewDisplay();
        
        showAlert('success', '已設置為封面圖片！');
    } else {
        console.warn('⚠️ 找不到指定的圖片:', imageId);
    }
}

// 更新圖片預覽顯示（更新封面標記）
function updateImagePreviewDisplay() {
    const imagePreviewGrid = document.getElementById('image-preview-grid');
    if (!imagePreviewGrid) return;
    
    // 獲取所有圖片項目
    const items = imagePreviewGrid.querySelectorAll('.image-preview-item');
    items.forEach(item => {
        const imageId = item.dataset.imageId;
        const imageData = uploadedImages.find(img => img.imageId === imageId);
        
        if (imageData && imageData.isCover) {
            // 添加封面樣式
            item.classList.add('cover-image');
            
            // 更新按鈕狀態
            const coverBtn = item.querySelector('.image-cover-btn');
            if (coverBtn) {
                coverBtn.classList.add('is-cover');
                coverBtn.innerHTML = '✓ 封面';
            }
            
            // 顯示封面標籤
            let coverBadge = item.querySelector('.image-cover-badge');
            if (!coverBadge) {
                coverBadge = document.createElement('div');
                coverBadge.className = 'image-cover-badge';
                coverBadge.innerHTML = '⭐ 封面';
                coverBadge.style.cssText = 'position: absolute; top: 2px; left: 2px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 2px 6px; border-radius: 3px; font-size: 9px; font-weight: bold; z-index: 11; display: flex; align-items: center; gap: 2px;';
                item.appendChild(coverBadge);
            }
            
            // 隱藏待上傳標籤（如果存在）
            const statusBadge = item.querySelector('.image-status-badge');
            if (statusBadge) {
                statusBadge.style.display = 'none';
            }
        } else {
            // 移除封面樣式
            item.classList.remove('cover-image');
            
            // 更新按鈕狀態
            const coverBtn = item.querySelector('.image-cover-btn');
            if (coverBtn) {
                coverBtn.classList.remove('is-cover');
                coverBtn.innerHTML = '⭐ 設為封面';
            }
            
            // 移除封面標籤
            const coverBadge = item.querySelector('.image-cover-badge');
            if (coverBadge) {
                coverBadge.remove();
            }
            
            // 顯示待上傳標籤（如果存在）
            const statusBadge = item.querySelector('.image-status-badge');
            if (statusBadge) {
                statusBadge.style.display = 'block';
            }
        }
    });
}

// 移除圖片
async function removeImage(item, imageId) {
    // 從 uploadedImages 中移除（根據 imageId）
    const index = uploadedImages.findIndex(img => img.imageId === imageId);
    if (index !== -1) {
        const imgData = uploadedImages[index];
        const wasCover = imgData.isCover;
        
        // 如果圖片已經上傳到 Storage，嘗試刪除臨時檔案
        if (imgData.tempKey && storage) {
            try {
                const tempRef = storage.ref(imgData.tempKey);
                await tempRef.delete();
                console.log('🗑️ 已刪除臨時圖片:', imgData.tempKey);
            } catch (error) {
                console.warn('⚠️ 刪除臨時圖片失敗:', error);
            }
        }
        
        // 清理本地預覽 URL
        if (imgData.previewURL) {
            URL.revokeObjectURL(imgData.previewURL);
        }
        
        uploadedImages.splice(index, 1);
        console.log(`🗑️ 已移除圖片: ${imgData.originalName || '未知'}`);
        
        // 如果刪除的是封面圖片，將第一張圖片設為封面
        if (wasCover && uploadedImages.length > 0) {
            uploadedImages[0].isCover = true;
            updateImagePreviewDisplay();
        }
    }
    item.remove();
}

// 圖片拖曳排序：絲滑拖曳 + 即時預覽放置位置
let sortDragPlaceholder = null;
let sortDraggedId = null;
let sortDraggedEl = null;
let sortDropIndex = -1;

// 使用混合模式：document 級別 + grid 級別事件
let imageSortableInitialized = false;
let gridEventHandlers = null;

function initImageSortable() {
    // 先綁定 document 級別的 dragstart（用於捕獲所有拖曳開始）
    if (!imageSortableInitialized) {
        document.addEventListener('dragstart', function(e) {
            const item = e.target.closest('.image-preview-item');
            if (item && item.dataset.imageId && (item.draggable === true || item.getAttribute('draggable') === 'true')) {
                console.log('🖱️ 檢測到拖曳開始:', item.dataset.imageId);
                onImageDragStart(e);
            }
        }, false);
        
        document.addEventListener('dragend', function(e) {
            if (sortDraggedEl) {
                onImageDragEnd(e);
            }
        }, false);
        
        imageSortableInitialized = true;
    }
    
    // 為 grid 綁定 dragover 和 drop（必須在 grid 上才能正確觸發）
    const grid = document.getElementById('image-preview-grid');
    if (!grid) {
        console.warn('⚠️ image-preview-grid 尚未存在');
        return;
    }
    
    // 移除舊的事件監聽器（如果存在）
    if (gridEventHandlers) {
        grid.removeEventListener('dragover', gridEventHandlers.dragover);
        grid.removeEventListener('drop', gridEventHandlers.drop);
    }
    
    // 創建新的事件處理器
    gridEventHandlers = {
        dragover: function(e) {
            if (!sortDraggedEl) return;
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
            // 添加調試信息（每 10 次輸出一次，避免過多日誌）
            if (!gridEventHandlers.dragoverCount) gridEventHandlers.dragoverCount = 0;
            gridEventHandlers.dragoverCount++;
            if (gridEventHandlers.dragoverCount % 10 === 0) {
                console.log('🔄 dragover 觸發中...', gridEventHandlers.dragoverCount);
            }
            onImageDragOver(e);
        },
        drop: function(e) {
            if (!sortDraggedEl) return;
            e.preventDefault();
            e.stopPropagation();
            console.log('📦 檢測到 drop 事件在 grid 上');
            gridEventHandlers.dragoverCount = 0; // 重置計數
            onImageDrop(e);
        }
    };
    gridEventHandlers.dragoverCount = 0;
    
    // 綁定到 grid
    grid.addEventListener('dragover', gridEventHandlers.dragover, false);
    grid.addEventListener('drop', gridEventHandlers.drop, false);
    
    console.log('✅ 圖片拖曳排序功能已初始化（grid 綁定模式）');
    
    // 驗證現有圖片項目是否可拖曳
    setTimeout(() => {
        const items = grid.querySelectorAll('.image-preview-item');
        console.log(`📊 檢查圖片項目: 共 ${items.length} 個`);
        items.forEach((item, idx) => {
            const hasDraggable = item.draggable === true || item.getAttribute('draggable') === 'true';
            const hasImageId = !!item.dataset.imageId;
            if (!hasDraggable) {
                console.warn(`⚠️ 項目 ${idx + 1} 缺少 draggable 屬性，正在修復...`);
                item.draggable = true;
            }
            if (!hasImageId) {
                console.warn(`⚠️ 項目 ${idx + 1} 缺少 imageId`);
            }
        });
    }, 500);
}

function onImageDragStart(e) {
    // 確保事件在正確的元素上觸發
    let item = e.target;
    if (!item.classList.contains('image-preview-item')) {
        item = e.target.closest('.image-preview-item');
    }
    
    if (!item || !item.dataset.imageId) {
        console.log('⚠️ 拖曳開始：找不到有效的圖片項目', e.target);
        return;
    }
    
    // 如果點擊的是按鈕，不觸發拖曳
    if (e.target.closest('button')) {
        console.log('⚠️ 拖曳開始：點擊的是按鈕，取消拖曳');
        return;
    }
    
    const grid = document.getElementById('image-preview-grid');
    if (!grid) {
        console.warn('⚠️ 找不到 image-preview-grid');
        return;
    }
    
    const id = item.dataset.imageId;
    const items = [].slice.call(grid.querySelectorAll('.image-preview-item'));
    const idx = items.indexOf(item);
    if (idx === -1) {
        console.warn('⚠️ 找不到圖片項目的索引');
        return;
    }
    
    console.log('🖱️ 開始拖曳圖片:', id, '索引:', idx);
    
    e.dataTransfer.setData('application/x-image-sort', id);
    e.dataTransfer.effectAllowed = 'move';
    
    // 創建自訂拖曳圖片
    try {
        e.dataTransfer.setDragImage(item, item.offsetWidth / 2, item.offsetHeight / 2);
    } catch (err) {
        console.warn('⚠️ 無法設置自訂拖曳圖片:', err);
    }
    
    sortDraggedId = id;
    sortDraggedEl = item;
    sortDropIndex = idx;
    item.classList.add('dragging');
    
    // 創建放置預覽位置
    sortDragPlaceholder = document.createElement('div');
    sortDragPlaceholder.className = 'image-drag-placeholder';
    const itemsOrdered = [].slice.call(grid.querySelectorAll('.image-preview-item'));
    const insertBefore = itemsOrdered[idx + 1] || null;
    if (insertBefore) {
        grid.insertBefore(sortDragPlaceholder, insertBefore);
    } else {
        grid.appendChild(sortDragPlaceholder);
    }
    
    console.log('✅ 拖曳初始化完成');
}

function onImageDragOver(e) {
    const grid = document.getElementById('image-preview-grid');
    if (!sortDraggedEl || !sortDragPlaceholder || !grid) {
        return; // 靜默返回，避免過多日誌
    }
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // 使用 document.elementFromPoint 來獲取當前滑鼠位置下的元素
    let targetElement = document.elementFromPoint(e.clientX, e.clientY);
    if (!targetElement) {
        // 如果 elementFromPoint 失敗，使用 e.target
        targetElement = e.target;
    }
    
    const item = targetElement.closest('.image-preview-item');
    const overPlaceholder = targetElement.closest('.image-drag-placeholder');
    const itemsOrdered = [].slice.call(grid.querySelectorAll('.image-preview-item'));
    
    // 清除所有 drag-over 狀態
    itemsOrdered.forEach(el => el.classList.remove('drag-over'));
    
    // 如果滑鼠在其他項目上，添加 drag-over 效果
    if (item && item !== sortDraggedEl && !overPlaceholder) {
        item.classList.add('drag-over');
    }
    
    let newIndex;
    if (overPlaceholder) {
        // 滑鼠在 placeholder 上
        let count = 0;
        for (let i = 0; i < grid.children.length; i++) {
            const ch = grid.children[i];
            if (ch === sortDragPlaceholder) {
                newIndex = count;
                break;
            }
            if (ch.classList.contains('image-preview-item')) count++;
        }
        if (newIndex === undefined) newIndex = itemsOrdered.length;
    } else if (item && item !== sortDraggedEl) {
        // 滑鼠在其他圖片項目上，根據位置決定插入點
        const rect = item.getBoundingClientRect();
        const mid = rect.left + rect.width / 2;
        const i = itemsOrdered.indexOf(item);
        newIndex = e.clientX < mid ? i : i + 1;
    } else {
        // 滑鼠在 grid 空白區域，計算最接近的位置
        const gridRect = grid.getBoundingClientRect();
        const items = grid.querySelectorAll('.image-preview-item:not(.dragging)');
        
        if (items.length === 0) {
            newIndex = 0;
        } else {
            // 找到最接近的項目
            let closestItem = null;
            let minDistance = Infinity;
            
            items.forEach((it) => {
                const itRect = it.getBoundingClientRect();
                const centerX = itRect.left + itRect.width / 2;
                const centerY = itRect.top + itRect.height / 2;
                const distance = Math.sqrt(
                    Math.pow(e.clientX - centerX, 2) + 
                    Math.pow(e.clientY - centerY, 2)
                );
                if (distance < minDistance) {
                    minDistance = distance;
                    closestItem = it;
                }
            });
            
            if (closestItem) {
                const i = itemsOrdered.indexOf(closestItem);
                const rect = closestItem.getBoundingClientRect();
                newIndex = e.clientX < rect.left + rect.width / 2 ? i : i + 1;
            } else {
                newIndex = itemsOrdered.length;
            }
        }
    }
    
    newIndex = Math.max(0, Math.min(newIndex, itemsOrdered.length));
    
    // 只在索引改變時更新 placeholder 位置（避免頻繁 DOM 操作）
    if (newIndex !== sortDropIndex) {
        sortDropIndex = newIndex;
        
        const insertBefore = itemsOrdered[newIndex] || null;
        if (insertBefore && insertBefore !== sortDragPlaceholder) {
            grid.insertBefore(sortDragPlaceholder, insertBefore);
        } else if (!insertBefore && sortDragPlaceholder.parentNode !== grid) {
            grid.appendChild(sortDragPlaceholder);
        } else if (insertBefore && sortDragPlaceholder.nextSibling !== insertBefore) {
            grid.insertBefore(sortDragPlaceholder, insertBefore);
        }
    }
}

function onImageDrop(e) {
    const grid = document.getElementById('image-preview-grid');
    if (!sortDraggedId || !sortDraggedEl || !sortDragPlaceholder || !grid) {
        console.warn('⚠️ drop 條件不滿足:', {
            hasDraggedId: !!sortDraggedId,
            hasDraggedEl: !!sortDraggedEl,
            hasPlaceholder: !!sortDragPlaceholder,
            hasGrid: !!grid
        });
        return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📦 執行 drop，從索引', sortDropIndex, '移動到', sortDropIndex);
    
    const fromIdx = uploadedImages.findIndex(img => img.imageId === sortDraggedId);
    if (fromIdx === -1) {
        console.error('❌ 找不到要移動的圖片:', sortDraggedId);
        return;
    }
    
    const entry = uploadedImages.splice(fromIdx, 1)[0];
    let toIdx = sortDropIndex;
    if (toIdx > fromIdx) toIdx--;
    uploadedImages.splice(toIdx, 0, entry);
    
    console.log('✅ 已重新排序 uploadedImages，從', fromIdx, '到', toIdx);
    
    // 移除 placeholder
    if (sortDragPlaceholder && sortDragPlaceholder.parentNode) {
        sortDragPlaceholder.remove();
    }
    sortDragPlaceholder = null;
    
    // 移除 dragging 狀態
    sortDraggedEl.classList.remove('dragging');
    
    // 清除所有 drag-over 狀態
    grid.querySelectorAll('.image-preview-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    
    // 重新排列 DOM 以匹配新的順序
    const itemsOrdered = [].slice.call(grid.querySelectorAll('.image-preview-item'));
    const moved = itemsOrdered.find(el => el.dataset.imageId === sortDraggedId);
    
    if (moved) {
        // 找到新位置應該插入在哪個元素之前
        const afterId = uploadedImages[toIdx + 1] && uploadedImages[toIdx + 1].imageId;
        const before = afterId
            ? itemsOrdered.find(el => el.dataset.imageId === afterId && el !== moved)
            : null;
        
        if (before && moved.nextSibling !== before) {
            grid.insertBefore(moved, before);
            console.log('✅ 已移動 DOM 元素到新位置（before）');
        } else if (!before && moved.nextSibling !== null) {
            grid.appendChild(moved);
            console.log('✅ 已移動 DOM 元素到新位置（append）');
        } else {
            console.log('ℹ️ DOM 元素已在正確位置');
        }
    }
    
    // 更新封面（第一張為封面）
    uploadedImages.forEach((img, i) => { 
        img.isCover = i === 0; 
    });
    updateImagePreviewDisplay();
    
    console.log('✅ 拖曳排序完成！新順序:', uploadedImages.map((img, i) => `${i}: ${img.imageId}`).join(', '));
    
    // 清理狀態
    sortDraggedId = null;
    sortDraggedEl = null;
    sortDropIndex = -1;
}

function onImageDragEnd(e) {
    if (sortDragPlaceholder && sortDragPlaceholder.parentNode) {
        sortDragPlaceholder.remove();
    }
    sortDragPlaceholder = null;
    if (sortDraggedEl) {
        sortDraggedEl.classList.remove('dragging');
    }
    const grid = document.getElementById('image-preview-grid');
    if (grid) {
        grid.querySelectorAll('.image-preview-item.drag-over').forEach(el => el.classList.remove('drag-over'));
    }
    sortDraggedId = null;
    sortDraggedEl = null;
    sortDropIndex = -1;
}

// 上傳並整理圖片：將本地預覽的圖片上傳到正確的物件資料夾
async function uploadAndOrganizeImages(propertyNumber, progressCallback = null) {
    console.log('📁 開始上傳並整理圖片，物件編號:', propertyNumber);
    console.log('📊 目前 uploadedImages:', uploadedImages);
    
    if (!uploadedImages || uploadedImages.length === 0) {
        console.log('⚠️ 沒有圖片需要上傳');
        return [];
    }
    
    if (!supabaseClient) {
        console.error('❌ Supabase 未初始化');
        throw new Error('Supabase 未初始化，請檢查 Supabase 設定');
    }
    
    // 判斷是否為店外物件（編號以 EX 開頭）
    const isExternal = propertyNumber.startsWith('EX');
    
    // 從編號提取類型代碼（店內：SU00001 -> SU，店外：EXSU0001 -> SU）
    let typeCode = '';
    if (isExternal) {
        // 店外：EXSU0001 -> SU
        typeCode = propertyNumber.substring(2, 4); // EX 後面的 2 個字母
    } else {
        // 店內：SU00001 -> SU
        typeCode = propertyNumber.substring(0, 2); // 前 2 個字母
    }
    
    // 生成圖片儲存路徑（新結構：按來源和房型分類）
    let basePath;
    if (isExternal) {
        // 店外物件：properties/external/{房型代碼}/{物件編號}/image_1.jpg
        basePath = `properties/external/${typeCode}/${propertyNumber}`;
    } else {
        // 店內物件：properties/internal/{房型代碼}/{物件編號}/image_1.jpg
        basePath = `properties/internal/${typeCode}/${propertyNumber}`;
    }
    
    const organizedImages = [];
    const uploadedUrls = [];
    
    console.log(`📁 開始處理 ${uploadedImages.length} 張圖片到資料夾: ${basePath}/`);
    
    for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        console.log(`\n🖼️ 處理圖片 ${i + 1}/${uploadedImages.length}:`, {
            hasFile: !!img.file,
            hasUrl: !!img.url,
            hasTempKey: !!img.tempKey,
            fileName: img.file?.name || img.originalName || '未知'
        });
        
        try {
            // 如果圖片已經上傳過（有 URL 且沒有 file），直接使用
            if (img.url && !img.file && !img.tempKey) {
                console.log(`✅ 圖片已存在，直接使用: ${img.url}`);
                uploadedUrls.push(img.url);
                organizedImages.push({
                    url: img.url,
                    key: img.key || img.url
                });
                continue;
            }
            
            // 如果有檔案物件，需要上傳（最常見的情況）
            if (img.file) {
                const file = img.file;
                
                // 確保檔案有效
                if (!file || !file.name) {
                    console.warn(`⚠️ 圖片 ${i + 1} 檔案無效，跳過`);
                    continue;
                }
                
                const fileExt = file.name.split('.').pop().toLowerCase();
                // 使用簡單的序號命名：image_1.jpg, image_2.jpg, ...
                const fileName = `image_${i + 1}.${fileExt}`;
                const newPath = `${basePath}/${fileName}`;
                
                console.log(`📤 [${i + 1}/${uploadedImages.length}] 上傳圖片: ${file.name} (${(file.size / 1024).toFixed(2)}KB) → ${newPath}`);
                
                // 上傳到 Supabase Storage
                const { data: uploadData, error: uploadError } = await supabaseClient
                    .storage
                    .from('junyang666')
                    .upload(newPath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });
                
                if (uploadError) {
                    throw uploadError;
                }
                
                // 取得公開 URL
                const { data: urlData } = supabaseClient
                    .storage
                    .from('junyang666')
                    .getPublicUrl(newPath);
                
                const downloadURL = urlData.publicUrl;
                
                console.log(`✅ [${i + 1}/${uploadedImages.length}] 圖片上傳完成: ${fileName}`);
                
                uploadedUrls.push(downloadURL);
                organizedImages.push({
                    url: downloadURL,
                    key: newPath
                });
                
                // 清理本地預覽 URL
                if (img.previewURL) {
                    URL.revokeObjectURL(img.previewURL);
                }
            } else if (img.tempKey) {
                // 如果是從臨時位置移動（使用 Supabase Storage）
                try {
                    const fileExt = img.tempKey.split('.').pop() || 'jpg';
                    // 使用簡單的序號命名：image_1.jpg, image_2.jpg, ...
                    const fileName = `image_${i + 1}.${fileExt}`;
                    const newPath = `${basePath}/${fileName}`;
                    
                    // 從臨時位置下載檔案
                    const { data: downloadData, error: downloadError } = await supabaseClient
                        .storage
                        .from('junyang666')
                        .download(img.tempKey);
                    
                    if (downloadError) throw downloadError;
                    
                    // 上傳到新位置
                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from('junyang666')
                        .upload(newPath, downloadData, {
                            cacheControl: '3600',
                            upsert: false
                        });
                    
                    if (uploadError) throw uploadError;
                    
                    // 取得新位置的公開 URL
                    const { data: urlData } = supabaseClient
                        .storage
                        .from('junyang666')
                        .getPublicUrl(newPath);
                    
                    const newDownloadURL = urlData.publicUrl;
                    
                    // 刪除臨時檔案
                    try {
                        await supabaseClient
                            .storage
                            .from('junyang666')
                            .remove([img.tempKey]);
                    } catch (deleteError) {
                        console.warn('⚠️ 刪除臨時檔案失敗（可忽略）:', deleteError);
                    }
                    
                    uploadedUrls.push(newDownloadURL);
                    organizedImages.push({
                        url: newDownloadURL,
                        key: newPath
                    });
                    
                    console.log(`✅ 圖片已移動: ${img.tempKey} → ${newPath}`);
                } catch (moveError) {
                    console.error(`❌ 移動圖片失敗 (${img.tempKey}):`, moveError);
                    // 如果移動失敗，嘗試使用原始 URL（如果有的話）
                    if (img.url) {
                        console.log(`📝 使用原始 URL: ${img.url}`);
                        uploadedUrls.push(img.url);
                        organizedImages.push({
                            url: img.url,
                            key: img.key || img.tempKey
                        });
                    } else {
                        // 如果沒有原始 URL，記錄錯誤但繼續處理其他圖片
                        console.warn(`⚠️ 跳過圖片: ${img.tempKey}（無法移動且無原始 URL）`);
                    }
                }
            } else {
                // 如果都沒有（file、url、tempKey），記錄警告
                console.warn(`⚠️ 圖片 ${i + 1} 無有效資料（無 file、url 或 tempKey），跳過`);
            }
        } catch (error) {
            console.error(`❌ 處理圖片 ${i + 1} 失敗:`, error);
            console.error('  錯誤詳情:', {
                message: error.message,
                code: error.code,
                fileName: img.file?.name || img.originalName || '未知'
            });
            
            // 如果處理失敗，嘗試使用原始 URL（如果有的話）
            if (img.url) {
                console.log(`  📝 嘗試使用原始 URL: ${img.url}`);
                uploadedUrls.push(img.url);
                organizedImages.push({
                    url: img.url,
                    key: img.tempKey || img.key || img.url
                });
            } else {
                console.warn(`  ⚠️ 圖片 ${i + 1} 處理失敗且無備用 URL，將跳過此圖片`);
            }
        }
    }
    
    console.log(`\n📊 圖片處理完成:`);
    console.log(`  ✅ 成功: ${uploadedUrls.length}/${uploadedImages.length}`);
    console.log(`  📋 最終 URL 列表:`, uploadedUrls);
    
    if (uploadedUrls.length === 0 && uploadedImages.length > 0) {
        console.warn('⚠️ 警告：所有圖片處理失敗，但仍會繼續儲存物件資料');
    }
    
    return uploadedUrls;
}

// 整理圖片：將臨時位置的圖片移動到正確的物件資料夾（保留作為備用）
async function organizeImages(propertyNumber) {
    if (!uploadedImages || uploadedImages.length === 0) {
        return [];
    }
    
    const organizedImages = [];
    
    // 生成新路徑（按來源和房型分類）
    const isExternal = propertyNumber.startsWith('EX');
    let typeCode = '';
    if (isExternal) {
        typeCode = propertyNumber.substring(2, 4);
    } else {
        typeCode = propertyNumber.substring(0, 2);
    }
    const source = isExternal ? 'external' : 'internal';
    const basePath = `properties/${source}/${typeCode}/${propertyNumber}`;
    
    console.log('📁 開始整理圖片到資料夾:', `${basePath}/`);
    
    for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        
        // 更新進度
        if (progressCallback) {
            progressCallback(i + 1, uploadedImages.length);
        }
        
        try {
            if (img.tempKey) {
                // 圖片在臨時位置，需要移動到正確位置（使用 Supabase Storage）
                try {
                    const fileName = img.tempKey.split('/').pop();
                    const newPath = `${basePath}/${fileName}`;
                    
                    // 從臨時位置下載檔案
                    const { data: downloadData, error: downloadError } = await supabaseClient
                        .storage
                        .from('junyang666')
                        .download(img.tempKey);
                    
                    if (downloadError) throw downloadError;
                    
                    // 上傳到新位置
                    const { data: uploadData, error: uploadError } = await supabaseClient
                        .storage
                        .from('junyang666')
                        .upload(newPath, downloadData, {
                            cacheControl: '3600',
                            upsert: false
                        });
                    
                    if (uploadError) throw uploadError;
                    
                    // 取得新位置的公開 URL
                    const { data: urlData } = supabaseClient
                        .storage
                        .from('junyang666')
                        .getPublicUrl(newPath);
                    
                    const newDownloadURL = urlData.publicUrl;
                    
                    // 刪除臨時檔案
                    try {
                        await supabaseClient
                            .storage
                            .from('junyang666')
                            .remove([img.tempKey]);
                    } catch (deleteError) {
                        console.warn('⚠️ 刪除臨時檔案失敗（可忽略）:', deleteError);
                    }
                    
                    console.log(`✅ 圖片已移動: ${img.tempKey} → ${newPath}`);
                    
                    organizedImages.push({
                        url: newDownloadURL,
                        key: newPath
                    });
                } catch (moveError) {
                    console.error(`❌ 移動圖片失敗 (${img.tempKey}):`, moveError);
                    // 如果移動失敗，嘗試使用原始 URL（如果有的話）
                    if (img.url) {
                        organizedImages.push({
                            url: img.url,
                            key: img.key || img.tempKey
                        });
                    }
                }
            } else if (img.url) {
                // 如果已經是正確位置的圖片，直接使用
                organizedImages.push({
                    url: img.url,
                    key: img.key || img.url
                });
            }
        } catch (error) {
            console.error(`❌ 整理圖片失敗 (${img.originalName || '未知'}):`, error);
            // 如果移動失敗，嘗試使用原始 URL
            if (img.url) {
                organizedImages.push({
                    url: img.url,
                    key: img.tempKey || img.key || img.url
                });
            }
        }
    }
    
    // 清理所有臨時資料夾
    try {
        const tempFolders = [...new Set(uploadedImages.map(img => img.tempFolder).filter(f => f))];
        for (const folder of tempFolders) {
            try {
                // 列出臨時資料夾中的所有檔案
                const { data: files, error: listError } = await supabaseClient
                    .storage
                    .from('junyang666')
                    .list(`temp/${folder}`);
                
                if (listError) throw listError;
                
                // 刪除所有檔案
                if (files && files.length > 0) {
                    const filePaths = files.map(file => `temp/${folder}/${file.name}`);
                    const { error: removeError } = await supabaseClient
                        .storage
                        .from('junyang666')
                        .remove(filePaths);
                    
                    if (removeError) throw removeError;
                    console.log(`🗑️ 已清理臨時資料夾: temp/${folder}`);
                }
            } catch (error) {
                console.warn(`⚠️ 清理臨時資料夾失敗: temp/${folder}`, error);
            }
        }
    } catch (error) {
        console.warn('⚠️ 清理臨時資料夾時發生錯誤:', error);
    }
    
    // 將封面圖片移到第一位
    const imageUrls = organizedImages.map(img => img.url);
    const coverImageIndex = uploadedImages.findIndex(img => img.isCover);
    
    if (coverImageIndex !== -1 && coverImageIndex !== 0) {
        // 找到封面圖片在最終 URL 陣列中的位置
        // 因為 uploadedImages 和 organizedImages 的順序應該一致
        const coverUrl = imageUrls[coverImageIndex];
        // 移除原位置的封面圖片
        imageUrls.splice(coverImageIndex, 1);
        // 將封面圖片插入到第一位
        imageUrls.unshift(coverUrl);
        console.log('⭐ 已將封面圖片移到第一位');
    } else if (coverImageIndex === -1 && imageUrls.length > 0) {
        // 如果沒有指定封面，第一張圖片自動作為封面
        console.log('ℹ️ 未指定封面圖片，使用第一張圖片作為封面');
    }
    
    return imageUrls;
}

// 儲存物件
async function saveProperty() {
    // 檢查 Supabase 是否已初始化
    if (!supabaseClient) {
        showAlert('error', '請先設定 Supabase 配置，正在跳轉到設定頁面...');
        // 自動跳轉到設定頁面
        setTimeout(() => {
            const configTab = document.querySelector('.tab[onclick*="config"]');
            if (configTab) {
                switchTab('config', configTab);
            }
        }, 1000);
        return;
    }
    
    const saveBtn = document.getElementById('save-btn');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ 準備中...';
    
    try {
        // 檢查是否為編輯模式（從 URL 參數或 editingPropertyId 變數）
        const urlParams = new URLSearchParams(window.location.search);
        const urlId = urlParams.get('id');
        const isEditMode = editingPropertyId || urlId;
        
        // 如果 URL 中有 ID 但 editingPropertyId 未設置，設置它
        if (urlId && !editingPropertyId) {
            editingPropertyId = urlId;
            console.log('🔧 從 URL 參數設置編輯模式，ID:', urlId);
        }
        
        // 自動生成物件編號（僅在新增模式時生成）
        let propertyNumber = document.getElementById('number').value.trim();
        if (!isEditMode && !propertyNumber) {
            // 只有在新增模式且沒有編號時，才生成新編號
            const type = document.getElementById('type').value.trim();
            if (!type) {
                throw new Error('請先選擇房型以自動生成物件編號');
            }
            await generatePropertyNumber();
            propertyNumber = document.getElementById('number').value.trim();
            if (!propertyNumber) {
                throw new Error('無法生成物件編號，請稍後再試');
            }
        } else if (isEditMode && !propertyNumber) {
            // 編輯模式必須有編號
            throw new Error('編輯模式必須有物件編號，請檢查表單資料');
        }
        
        // 驗證並轉換編號格式（確保符合「兩個英文字母+五個數字」的格式）
        if (propertyNumber) {
            propertyNumber = normalizePropertyNumber(propertyNumber, document.getElementById('type').value.trim(), document.getElementById('is_external')?.value === 'true');
            // 更新輸入框中的編號
            document.getElementById('number').value = propertyNumber;
        }
        
        // 優化：只檢查特定編號是否已存在（而不是獲取所有編號）
        saveBtn.textContent = '⏳ 檢查編號中...';
        const currentEditId = editingPropertyId || urlId;
        
        // 只在新增模式或編號改變時檢查
        let needCheckNumber = true;
        if (currentEditId) {
            // 編輯模式：檢查編號是否改變
            try {
                const { data: currentData, error } = await supabaseClient
                    .from('properties')
                    .select('number')
                    .eq('id', currentEditId)
                    .single();
                
                if (!error && currentData && currentData.number === propertyNumber) {
                    // 編號沒有改變，不需要檢查
                    needCheckNumber = false;
                }
            } catch (error) {
                console.warn('⚠️ 無法獲取當前物件編號，將進行編號檢查:', error);
            }
        }
        
        if (needCheckNumber) {
            // 只查詢特定編號是否存在
            const { data: existingProperty, error: checkError } = await supabaseClient
                .from('properties')
                .select('id, number')
                .eq('number', propertyNumber)
                .limit(1);
            
            if (checkError) {
                console.warn('⚠️ 檢查編號時發生錯誤:', checkError);
                // 不阻止儲存，繼續執行
            } else if (existingProperty && existingProperty.length > 0) {
                // 如果是編輯模式，檢查是否為當前物件
                if (currentEditId && existingProperty[0].id === currentEditId) {
                    // 是當前物件，允許使用相同編號
                } else {
                    throw new Error(`物件編號 "${propertyNumber}" 已存在，請使用其他編號`);
                }
            }
        }
        
        // 獲取縣市和區域
        const city = document.getElementById('city').value.trim();
        const district = document.getElementById('district').value.trim();
        const address = document.getElementById('address').value.trim();
        const hideAddressNumber = document.getElementById('hide_address_number').checked;
        
        // 組合完整地址（儲存完整地址，不處理隱藏門牌號碼）
        // 前端會根據 hide_address_number 來決定是否顯示門牌號碼
        let fullAddress = '';
        if (city && district) {
            fullAddress = city + district;
            if (address) {
                fullAddress += address;
            }
        } else if (address) {
            fullAddress = address;
        }
        
        // 收集表單資料
        const propertyData = {
            number: propertyNumber,
            title: document.getElementById('title').value.trim(),
            type: document.getElementById('type').value.trim(),
            city: city,
            district: district,
            address: fullAddress, // 儲存完整地址（包含門牌號碼）
            address_detail: address, // 儲存詳細地址（不含縣市區域，包含門牌號碼）
            hide_address_number: hideAddressNumber,
            price: document.getElementById('price').value.trim(),
            layout: (() => {
                let layoutValue = document.getElementById('layout').value.trim();
                // 如果輸入的是 3/2/2 格式，轉換為 3房2廳2衛
                const layoutPattern = /^(\d+)\/(\d+)\/(\d+)$/;
                const match = layoutValue.match(layoutPattern);
                if (match) {
                    const room = parseInt(match[1], 10);
                    const living = parseInt(match[2], 10);
                    const bath = parseInt(match[3], 10);
                    
                    // 處理特殊格局
                    if (room === 0 && living > 0) {
                        layoutValue = `0房${living}廳${bath}衛（開放式）`;
                    } else if (room === 0 && living === 0 && bath > 0) {
                        layoutValue = `0房0廳${bath}衛（開放式）`;
                    } else if (room === 1 && living === 0 && bath === 1) {
                        layoutValue = `1房0廳1衛（套房）`;
                    } else {
                        layoutValue = `${room}房${living}廳${bath}衛`;
                    }
                }
                return layoutValue;
            })(),
            total_area: (() => {
                let areaValue = document.getElementById('total_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            is_published: document.getElementById('is_published').value === 'true',
            is_external: document.getElementById('is_external').value === 'true',
            status: document.getElementById('status').value.trim() || null,
            status_text: (() => {
                const statusTextSelect = document.getElementById('statusText');
                const statusTextInput = document.getElementById('statusTextInput');
                if (!statusTextSelect) return null;
                
                const selectedValue = statusTextSelect.value;
                if (selectedValue === 'custom' && statusTextInput) {
                    // 如果選擇「自訂」，使用輸入框的值
                    return statusTextInput.value.trim() || null;
                } else if (selectedValue && selectedValue !== 'custom') {
                    // 如果選擇了其他選項，使用選項的值
                    return selectedValue.trim() || null;
                }
                return null;
            })(),
            community: document.getElementById('community').value.trim(),
            main_area: (() => {
                let areaValue = document.getElementById('main_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            auxiliary_area: (() => {
                let areaValue = document.getElementById('auxiliary_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            common_area: (() => {
                let areaValue = document.getElementById('common_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            land_area: (() => {
                let areaValue = document.getElementById('land_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            parking_area: (() => {
                let areaValue = document.getElementById('parking_area').value.trim();
                if (!areaValue) return '';
                // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                if (areaValue.includes('坪')) {
                    areaValue = areaValue.replace(/坪+/g, '');
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                // 如果沒有「坪」字，且是純數字，加上「坪」
                else if (/^[\d.]+$/.test(areaValue)) {
                    areaValue = areaValue + '坪';
                }
                // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                else if (/^[\d.]+/.test(areaValue)) {
                    const numberMatch = areaValue.match(/^[\d.]+/);
                    if (numberMatch) {
                        areaValue = numberMatch[0] + '坪';
                    }
                }
                return areaValue;
            })(),
            age: (() => {
                let ageValue = document.getElementById('age').value.trim();
                // 如果輸入的是純數字，自動加上「年」（但不要重複加上）
                if (ageValue && /^\d+$/.test(ageValue)) {
                    ageValue = ageValue + '年';
                }
                // 如果已經有「年」字，確保只有一個（移除多餘的「年」）
                else if (ageValue && ageValue.includes('年')) {
                    // 移除所有「年」字，然後只加一個
                    ageValue = ageValue.replace(/年+/g, '');
                    const numberMatch = ageValue.match(/^\d+/);
                    if (numberMatch) {
                        ageValue = numberMatch[0] + '年';
                    }
                }
                return ageValue;
            })(),
            floor: (() => {
                const floor = document.getElementById('floor').value.trim();
                const extensionFloor = document.getElementById('extension_floor').value.trim();
                if (extensionFloor) {
                    // 如果有增建樓層，組合顯示：原始樓層（增建樓層）
                    return `${floor}（增建${extensionFloor}）`;
                }
                return floor;
            })(),
            building_type: (() => {
                let buildingType = document.getElementById('building_type').value.trim();
                // 對應舊值到新值（確保一致性）
                const buildingTypeMap = {
                    '華廈公寓': '華廈',
                    '透天別墅': '透天',
                    '透天厝': '透天',
                    '大樓': '電梯大樓',
                    '住宅大樓': '電梯大樓',
                    '商業大樓': '電梯大樓',
                    '住商大樓': '電梯大樓',
                    '大廈': '電梯大樓'
                };
                return buildingTypeMap[buildingType] || buildingType;
            })(),
            orientation: document.getElementById('orientation').value.trim(),
            management_fee: document.getElementById('management_fee').value.trim(),
            parking_type: document.getElementById('parking_type').value.trim(),
            parking_space: document.getElementById('parking_space').value.trim(),
            current_status: document.getElementById('current_status').value.trim(),
            description: document.getElementById('description').value.trim(),
            google_maps: (() => {
                let googleMapsValue = document.getElementById('google_maps').value.trim();
                // 如果輸入的是完整的 iframe HTML，提取 src 屬性值
                if (googleMapsValue && googleMapsValue.includes('<iframe')) {
                    const srcMatch = googleMapsValue.match(/src=["']([^"']+)["']/i);
                    if (srcMatch && srcMatch[1]) {
                        googleMapsValue = srcMatch[1];
                    } else {
                        googleMapsValue = ''; // 如果無法提取，設為空
                    }
                }
                return googleMapsValue;
            })(),
            tiktok_video_id: document.getElementById('tiktok_video_id').value.trim(),
            tiktok_username: document.getElementById('tiktok_username').value.trim(),
            reference_link: document.getElementById('reference_link').value.trim()
        };
        
        // 處理標籤選擇欄位
        if (selectedTags.facilities.length > 0) {
            propertyData.facilities = [...selectedTags.facilities];
        }
        
        if (selectedTags.transport.length > 0) {
            propertyData.transport = [...selectedTags.transport];
        }
        
        if (selectedTags.schools.length > 0) {
            propertyData.schools = [...selectedTags.schools];
        }
        
        const market = document.getElementById('market').value.trim();
        if (market) propertyData.market = market;
        
        const park = document.getElementById('park').value.trim();
        if (park) propertyData.park = park;
        
        // 處理 transportation 物件
        if (propertyData.facilities || propertyData.transport || propertyData.schools || propertyData.market || propertyData.park) {
            propertyData.transportation = {
                facilities: propertyData.facilities || [],
                transport: propertyData.transport || [],
                schools: propertyData.schools || [],
                market: propertyData.market || '',
                park: propertyData.park || ''
            };
            delete propertyData.facilities;
            delete propertyData.transport;
            delete propertyData.schools;
            delete propertyData.market;
            delete propertyData.park;
        }
        
        // 處理 features：即使為空也要設置為空陣列，確保可以清空
        const featuresText = document.getElementById('features').value.trim();
        if (featuresText) {
            propertyData.features = featuresText.split('\n').map(line => line.trim()).filter(line => line);
        } else {
            // 明確設置為空陣列，確保可以清空現有的 features
            propertyData.features = [];
        }
        
        // 整理圖片：將本地預覽的圖片上傳到正確的物件資料夾
        let organizedImageUrls = [];
        if (uploadedImages && uploadedImages.length > 0) {
            // 檢查是否有新上傳的圖片（有 file 屬性的）
            const hasNewImages = uploadedImages.some(img => img.file);
            const hasOnlyExistingImages = uploadedImages.every(img => img.url && !img.file && !img.tempKey);
            
            if (hasOnlyExistingImages) {
                // 只有已上傳的圖片，直接使用重新排序後的順序
                console.log('📋 使用已上傳圖片（已重新排序）:', uploadedImages.length, '張');
                saveBtn.textContent = `⏳ 儲存圖片順序中...`;
                organizedImageUrls = uploadedImages.map(img => img.url || img);
                console.log('✅ 圖片順序已更新');
            } else {
                // 有新圖片需要上傳，或混合情況
                saveBtn.textContent = `⏳ 上傳圖片中 (0/${uploadedImages.length})...`;
                console.log('📤 開始上傳圖片，物件編號:', propertyNumber);
                console.log('📊 待上傳圖片數量:', uploadedImages.length);
                
                try {
                    // 顯示上傳進度
                    const progressCallback = (current, total) => {
                        saveBtn.textContent = `⏳ 上傳圖片中 (${current}/${total})...`;
                    };
                    
                    organizedImageUrls = await uploadAndOrganizeImages(propertyNumber, progressCallback);
                    console.log('✅ 圖片上傳完成，成功上傳:', organizedImageUrls.length, '張');
                } catch (imageError) {
                    console.error('❌ 圖片上傳過程中發生錯誤:', imageError);
                    // 即使圖片上傳失敗，也繼續儲存其他資料（但記錄警告）
                    organizedImageUrls = [];
                    showAlert('warning', `圖片上傳失敗，但將繼續儲存物件資料。錯誤: ${imageError.message}`);
                }
            }
            
            propertyData.images = organizedImageUrls;
        } else {
            // 沒有圖片
            propertyData.images = [];
        }
        
        // 添加時間戳
        propertyData.updated_at = new Date().toISOString();
        
        // 清理空字串欄位（但保留 features 和 description，即使為空也要更新）
        Object.keys(propertyData).forEach(key => {
            // features 和 description 即使為空也要保留，確保可以清空現有值
            if (key === 'features' || key === 'description') {
                return; // 跳過清理
            }
            if (propertyData[key] === '' || propertyData[key] === null) {
                delete propertyData[key];
            }
        });
        
        // 確保 description 即使為空字串也要設置（用於清空現有值）
        if (!('description' in propertyData)) {
            const descriptionValue = document.getElementById('description').value.trim();
            propertyData.description = descriptionValue || null;
        }
        
        console.log('💾 準備儲存物件資料:', {
            number: propertyData.number,
            title: propertyData.title,
            type: propertyData.type,
            is_published: propertyData.is_published,
            imagesCount: propertyData.images?.length || 0,
            images: propertyData.images
        });
        
        // 確保 images 是陣列格式（Supabase JSONB 需要）
        if (propertyData.images && !Array.isArray(propertyData.images)) {
            console.warn('⚠️ images 不是陣列格式，轉換為陣列');
            propertyData.images = Array.isArray(propertyData.images) ? propertyData.images : [propertyData.images];
        }
        
        let result;
        
        saveBtn.textContent = '⏳ 儲存資料中...';
        
        // 確定最終的編輯 ID（優先使用 editingPropertyId，其次使用 URL 參數）
        const finalEditId = editingPropertyId || urlId;
        
        // 如果有編輯 ID，執行更新
        if (finalEditId) {
            console.log('🔄 更新物件，ID:', finalEditId);
            console.log('📋 編輯模式檢查:', {
                editingPropertyId,
                urlId,
                finalEditId,
                propertyNumber
            });
            
            const { data, error } = await supabaseClient
                .from('properties')
                .update(propertyData)
                .eq('id', finalEditId)
                .select()
                .single();
            
            if (error) throw error;
            
            result = data;
            console.log('✅ 物件更新成功:', result.id);
            showAlert('success', '物件已更新！');
            
            // 確保 editingPropertyId 保持設置（不要清除，因為可能還需要繼續編輯）
            editingPropertyId = finalEditId;
            
            // 通知父頁面切換到物件列表（縮短延遲，提升響應速度）
            setTimeout(() => {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'propertySaved',
                        action: 'switchToList',
                        propertyId: result.id
                    }, '*');
                    console.log('📤 已通知父頁面切換到物件列表');
                }
            }, 800);
        } else {
            // 新增物件
            console.log('➕ 新增物件到資料庫...');
            propertyData.created_at = new Date().toISOString();
            
            const { data: insertData, error } = await supabaseClient
                .from('properties')
                .insert([propertyData])
                .select();
            
            if (error) throw error;
            
            // 取得新增的資料（不使用 .single()，因為可能會有問題）
            result = insertData && insertData.length > 0 ? insertData[0] : null;
            if (!result) {
                throw new Error('新增成功但無法取得資料');
            }
            console.log('✅ 物件新增成功:', {
                id: result.id,
                number: propertyNumber
            });
            showAlert('success', `物件已新增！編號: ${propertyNumber}，ID: ${result.id}`);
            
            // 通知父頁面切換到物件列表（縮短延遲，提升響應速度）
            setTimeout(() => {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({
                        type: 'propertySaved',
                        action: 'switchToList',
                        propertyId: result.id
                    }, '*');
                    console.log('📤 已通知父頁面切換到物件列表');
                }
            }, 800);
        }
        
        await syncFrontendAfterPropertySave(result);
        
        // 更新 uploadedImages 為整理後的路徑
        uploadedImages = organizedImageUrls.map(url => ({ url, key: url }));
        
        // 重設表單（僅在新增模式時）
        if (!finalEditId) {
            resetForm();
        }
        // 編輯模式不重置 editingPropertyId，保持編輯狀態
        
        // 更新列表
        if (document.getElementById('list-tab').classList.contains('active')) {
            loadProperties();
        }
    } catch (error) {
        console.error('❌ 儲存物件失敗:', error);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            stack: error.stack,
            name: error.name
        });
        
        let errorMessage = '儲存失敗：';
        if (error.message) {
            errorMessage += error.message;
        } else if (error.code) {
            errorMessage += `錯誤代碼: ${error.code}`;
        } else {
            errorMessage += '未知錯誤，請查看控制台';
        }
        
        // 如果是網路錯誤或 CORS 錯誤，提供更詳細的說明
        if (error.message && error.message.includes('CORS')) {
            errorMessage += '。這可能是 Supabase Storage 規則設定問題，請檢查 Storage Policies。';
        }
        
        showAlert('error', errorMessage);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '💾 儲存到資料庫';
        console.log('🔄 儲存流程完成，按鈕已恢復');
    }
}

// 測試功能：測試新增物件流程（用於調試）
async function testSaveProperty() {
    console.log('🧪 開始測試新增物件流程...');
    
    // 檢查必要欄位
    const requiredFields = {
        title: document.getElementById('title'),
        type: document.getElementById('type'),
        address: document.getElementById('address'),
        price: document.getElementById('price'),
        layout: document.getElementById('layout'),
        total_area: document.getElementById('total_area')
    };
    
    const missingFields = [];
    for (const [key, element] of Object.entries(requiredFields)) {
        if (!element || !element.value.trim()) {
            missingFields.push(key);
        }
    }
    
    if (missingFields.length > 0) {
        console.error('❌ 缺少必要欄位:', missingFields);
        showAlert('error', `請填寫必要欄位: ${missingFields.join(', ')}`);
        return;
    }
    
    // 檢查 Supabase
    if (!supabaseClient) {
        console.error('❌ Supabase 未初始化');
        showAlert('error', 'Supabase 未初始化');
        return;
    }
    
    // 檢查圖片
    console.log('📊 檢查圖片:', {
        uploadedImagesCount: uploadedImages.length,
        hasImages: uploadedImages.length > 0
    });
    
    // 生成測試編號
    const testNumber = `TEST-${Date.now()}`;
    document.getElementById('number').value = testNumber;
    
    console.log('✅ 所有檢查通過，開始儲存...');
    
    // 執行儲存
    await saveProperty();
}

// 將測試函數暴露到全域
window.testSaveProperty = testSaveProperty;

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizePropertyImages(imagesValue) {
    if (!imagesValue) return [];
    if (Array.isArray(imagesValue)) return imagesValue;
    if (typeof imagesValue === 'string') {
        try {
            const parsed = JSON.parse(imagesValue);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }
    return [];
}

function getPropertySearchText(prop) {
    return [
        prop.title,
        prop.number,
        prop.type,
        prop.price,
        prop.address,
        prop.community,
        prop.statusText
    ].filter(Boolean).join(' ').toLowerCase();
}

function getFilteredProperties() {
    const searchInput = document.getElementById('property-search');
    const filterSelect = document.getElementById('property-status-filter');
    const searchTerm = (searchInput?.value || '').trim().toLowerCase();
    const filterValue = filterSelect?.value || 'all';

    return propertyListCache.filter((prop) => {
        const images = normalizePropertyImages(prop.images);
        const isExternal = prop.is_external === true || prop.is_external === 'true';
        const matchesSearch = !searchTerm || getPropertySearchText(prop).includes(searchTerm);

        let matchesFilter = true;
        if (filterValue === 'published') matchesFilter = !!prop.is_published;
        if (filterValue === 'unpublished') matchesFilter = !prop.is_published;
        if (filterValue === 'internal') matchesFilter = !isExternal;
        if (filterValue === 'external') matchesFilter = isExternal;
        if (filterValue === 'sold') matchesFilter = prop.status === 'sold';
        if (filterValue === 'missing-images') matchesFilter = images.length === 0;

        return matchesSearch && matchesFilter;
    });
}

function updatePropertyListSummary(filteredProperties) {
    const summary = document.getElementById('property-list-summary');
    if (!summary) return;

    const total = propertyListCache.length;
    const shown = filteredProperties.length;
    const published = propertyListCache.filter(prop => !!prop.is_published).length;
    const unpublished = total - published;
    const external = propertyListCache.filter(prop => prop.is_external === true || prop.is_external === 'true').length;

    summary.innerHTML = `
        <span class="summary-pill">顯示 ${shown} / ${total}</span>
        <span class="summary-pill">已上架 ${published}</span>
        <span class="summary-pill">已下架 ${unpublished}</span>
        <span class="summary-pill">非本店 ${external}</span>
    `;
}

function renderPropertyList() {
    const listContainer = document.getElementById('property-list');
    if (!listContainer) return;

    const filteredProperties = getFilteredProperties();
    updatePropertyListSummary(filteredProperties);

    if (!propertyListCache.length) {
        listContainer.innerHTML = '<p class="empty-list-state">尚未載入物件資料，請按「重新載入」。</p>';
        return;
    }

    if (!filteredProperties.length) {
        listContainer.innerHTML = '<p class="empty-list-state">找不到符合條件的物件，請調整搜尋或篩選。</p>';
        return;
    }

    listContainer.innerHTML = filteredProperties.map((prop) => {
        const images = normalizePropertyImages(prop.images);
        const isExternal = prop.is_external === true || prop.is_external === 'true';
        const publishedClass = prop.is_published ? 'status-published' : 'status-unpublished';
        const publishedText = prop.is_published ? '已上架' : '已下架';
        const sourceClass = isExternal ? 'source-external' : 'source-internal';
        const sourceText = isExternal ? '非本店' : '本店';
        const soldBadge = prop.status === 'sold'
            ? '<span class="property-badge status-sold">已售出</span>'
            : '';
        const safeTitle = escapeHtml(prop.title || '未命名物件');
        const safeNumber = escapeHtml(prop.number || 'N/A');
        const safeType = escapeHtml(prop.type || 'N/A');
        const safePrice = escapeHtml(prop.price || 'N/A');
        const safeAddress = escapeHtml(prop.address || '未填地址');
        const safeId = escapeHtml(prop.id);

        return `
            <div class="property-item" data-property-id="${safeId}">
                <div class="property-info">
                    <h4>${safeTitle}</h4>
                    <div class="property-meta">
                        <span class="property-badge ${sourceClass}">${sourceText}</span>
                        <span class="property-badge ${publishedClass}">${publishedText}</span>
                        ${soldBadge}
                    </div>
                    <p>編號: ${safeNumber} | 房型: ${safeType} | 價格: ${safePrice}</p>
                    <p>地址: ${safeAddress}</p>
                    ${images.length > 0 ? `
                        <div class="property-thumb-row">
                            ${images.slice(0, 3).map(img => {
                                const imgUrl = typeof img === 'string' ? img : (img.url || img);
                                return `<img src="${escapeHtml(imgUrl)}" alt="${safeTitle}">`;
                            }).join('')}
                            ${images.length > 3 ? `<span style="color: #666; font-size: 0.85rem;">+${images.length - 3} 張</span>` : ''}
                        </div>
                    ` : '<p style="color: #b7791f; margin-top: 0.45rem;">尚未上傳圖片</p>'}
                </div>
                <div class="property-actions">
                    <button class="btn-small btn-primary" onclick="editProperty('${safeId}')">✏️ 編輯</button>
                    <button class="btn-small ${prop.is_published ? 'btn-warning' : 'btn-success'}" onclick="togglePublishStatus('${safeId}', ${!prop.is_published})">
                        ${prop.is_published ? '⬇️ 下架' : '⬆️ 上架'}
                    </button>
                    <button class="btn-small btn-ghost-danger" onclick="deleteProperty('${safeId}')">刪除</button>
                </div>
            </div>
        `;
    }).join('');
}

const CUSTOMER_INQUIRY_STATUS_META = {
    new: { label: '新詢問', className: 'status-new' },
    contacted: { label: '已聯絡', className: 'status-contacted' },
    scheduled: { label: '已約看', className: 'status-scheduled' },
    closed: { label: '已結案', className: 'status-closed' }
};

function escapeJsString(value) {
    return String(value ?? '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r?\n/g, '\\n');
}

function getSafeHref(value) {
    const href = String(value || '').trim();
    if (!href) return '';
    if (/^https?:\/\//i.test(href) || href.startsWith('/')) return href;
    return '';
}

function formatInquiryDateTime(value) {
    if (!value) return '未記錄時間';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('zh-TW', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}

function getInquirySearchText(inquiry) {
    return [
        inquiry.name,
        inquiry.phone,
        inquiry.preferred_time,
        inquiry.message,
        inquiry.property_number,
        inquiry.property_title,
        inquiry.property_price,
        inquiry.source_url
    ].filter(Boolean).join(' ').toLowerCase();
}

function getFilteredCustomerInquiries() {
    const searchTerm = (document.getElementById('customer-inquiry-search')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('customer-inquiry-status-filter')?.value || 'all';

    return customerInquiryCache.filter((inquiry) => {
        const matchesSearch = !searchTerm || getInquirySearchText(inquiry).includes(searchTerm);
        const matchesStatus = statusFilter === 'all' || (inquiry.status || 'new') === statusFilter;
        return matchesSearch && matchesStatus;
    });
}

function updateCustomerInquirySummary(filteredInquiries) {
    const summary = document.getElementById('customer-inquiry-summary');
    if (!summary) return;

    const total = customerInquiryCache.length;
    const newCount = customerInquiryCache.filter(item => (item.status || 'new') === 'new').length;
    const scheduledCount = customerInquiryCache.filter(item => item.status === 'scheduled').length;
    const closedCount = customerInquiryCache.filter(item => item.status === 'closed').length;

    summary.innerHTML = `
        <span class="summary-pill">顯示 ${filteredInquiries.length} / ${total}</span>
        <span class="summary-pill">新詢問 ${newCount}</span>
        <span class="summary-pill">已約看 ${scheduledCount}</span>
        <span class="summary-pill">已結案 ${closedCount}</span>
    `;
}

function buildInquiryLineUrl(inquiry) {
    const greeting = inquiry.name
        ? `${inquiry.name}您好，我是住商不動產楊梅大順店，收到您在網站上的詢問。`
        : '您好，我是住商不動產楊梅大順店，收到您在網站上的詢問。';
    const lines = [
        greeting,
        inquiry.property_number ? `物件編號：${inquiry.property_number}` : '',
        inquiry.property_title ? `物件名稱：${inquiry.property_title}` : '',
        '想跟您確認方便聯絡或看屋的時間，謝謝。'
    ].filter(Boolean);

    return 'https://line.me/R/oaMessage/@931aeinu/?' + encodeURIComponent(lines.join('\n'));
}

function renderCustomerInquiryList() {
    const listContainer = document.getElementById('customer-inquiry-list');
    if (!listContainer) return;

    const filteredInquiries = getFilteredCustomerInquiries();
    updateCustomerInquirySummary(filteredInquiries);

    if (!customerInquiryCache.length) {
        listContainer.innerHTML = '<p class="empty-list-state">目前沒有客戶詢問，或尚未完成資料表/API 設定。</p>';
        return;
    }

    if (!filteredInquiries.length) {
        listContainer.innerHTML = '<p class="empty-list-state">找不到符合條件的詢問，請調整搜尋或狀態篩選。</p>';
        return;
    }

    listContainer.innerHTML = filteredInquiries.map((inquiry) => {
        const status = inquiry.status || 'new';
        const statusMeta = CUSTOMER_INQUIRY_STATUS_META[status] || CUSTOMER_INQUIRY_STATUS_META.new;
        const safeId = escapeHtml(inquiry.id || '');
        const jsId = escapeJsString(inquiry.id || '');
        const safeName = escapeHtml(inquiry.name || '未留姓名');
        const safePhone = escapeHtml(inquiry.phone || '未留電話');
        const telHref = String(inquiry.phone || '').replace(/[^\d+]/g, '');
        const safeTime = escapeHtml(inquiry.preferred_time || '未指定');
        const safeMessage = escapeHtml(inquiry.message || '無補充需求');
        const safeNumber = escapeHtml(inquiry.property_number || '未指定');
        const safeTitle = escapeHtml(inquiry.property_title || '未指定物件');
        const safePrice = escapeHtml(inquiry.property_price || '');
        const safeSource = escapeHtml(getSafeHref(inquiry.source_url || inquiry.source_page || ''));
        const lineUrl = buildInquiryLineUrl(inquiry);

        return `
            <article class="customer-inquiry-item" data-inquiry-id="${safeId}">
                <div class="customer-inquiry-main">
                    <div class="customer-inquiry-title-row">
                        <h4>${safeName}</h4>
                        <span class="inquiry-status ${statusMeta.className}">${statusMeta.label}</span>
                    </div>
                    <div class="customer-inquiry-meta">
                        <span>送出時間：${escapeHtml(formatInquiryDateTime(inquiry.created_at))}</span>
                        <span>方便時間：${safeTime}</span>
                    </div>
                    <p class="customer-inquiry-phone">電話：<a href="tel:${escapeHtml(telHref)}">${safePhone}</a></p>
                    <div class="customer-inquiry-property">
                        <strong>${safeNumber}</strong>
                        <span>${safeTitle}${safePrice ? ` / ${safePrice}` : ''}</span>
                    </div>
                    <p class="customer-inquiry-message">${safeMessage}</p>
                    ${safeSource ? `<a class="customer-inquiry-source" href="${safeSource}" target="_blank" rel="noopener">查看來源物件</a>` : ''}
                </div>
                <div class="customer-inquiry-actions">
                    <label>
                        <span>處理狀態</span>
                        <select onchange="updateCustomerInquiryStatus('${jsId}', this.value)">
                            ${Object.entries(CUSTOMER_INQUIRY_STATUS_META).map(([value, meta]) => `
                                <option value="${value}" ${value === status ? 'selected' : ''}>${meta.label}</option>
                            `).join('')}
                        </select>
                    </label>
                    <a class="btn-small btn-primary" href="tel:${escapeHtml(telHref)}">撥電話</a>
                    <a class="btn-small btn-success" href="${escapeHtml(lineUrl)}" target="_blank" rel="noopener">LINE回覆</a>
                </div>
            </article>
        `;
    }).join('');
}

async function loadCustomerInquiries() {
    const listContainer = document.getElementById('customer-inquiry-list');
    if (!listContainer) return;

    listContainer.innerHTML = '<p class="empty-list-state">正在載入客戶詢問...</p>';

    try {
        const response = await fetch('/api/customer-inquiries?limit=160', {
            headers: { Accept: 'application/json' }
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            if (response.status === 503) {
                customerInquiryCache = [];
                updateCustomerInquirySummary([]);
                listContainer.innerHTML = `
                    <div class="empty-list-state">
                        <strong>客戶詢問後台尚未啟用</strong><br>
                        需先執行 <code>scripts/sql/create-customer-inquiries-table.sql</code>，
                        並在本機或 Cloudflare Pages 設定 <code>SUPABASE_SERVICE_ROLE_KEY</code>。
                    </div>
                `;
                return;
            }

            throw new Error(payload.message || payload.error || '載入客戶詢問失敗');
        }

        customerInquiryCache = Array.isArray(payload.inquiries) ? payload.inquiries : [];
        renderCustomerInquiryList();
    } catch (error) {
        console.error('載入客戶詢問失敗:', error);
        listContainer.innerHTML = `<p class="empty-list-state">載入失敗：${escapeHtml(error.message || '請檢查 API 設定')}</p>`;
    }
}

async function updateCustomerInquiryStatus(id, status) {
    try {
        const response = await fetch('/api/customer-inquiries/' + encodeURIComponent(id), {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ status })
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(payload.message || payload.error || '更新狀態失敗');
        }

        customerInquiryCache = customerInquiryCache.map((item) => (
            item.id === id ? { ...item, ...(payload.inquiry || {}), status } : item
        ));
        renderCustomerInquiryList();
        showAlert('success', '客戶詢問狀態已更新');
    } catch (error) {
        console.error('更新客戶詢問狀態失敗:', error);
        showAlert('error', `更新失敗：${error.message || '請稍後再試'}`);
        loadCustomerInquiries();
    }
}

// 載入物件列表
async function loadProperties() {
    // 檢查 Supabase 是否已初始化
    if (!supabaseClient) {
        const listContainer = document.getElementById('property-list');
        listContainer.innerHTML = 
            '<p style="text-align: center; color: #dc3545; padding: 2rem;">請先設定 Supabase 配置<br><button class="btn btn-primary" id="go-to-config-btn" style="margin-top: 1rem;">前往設定</button></p>';
        // 為按鈕添加事件監聽器
        const configBtn = document.getElementById('go-to-config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', function() {
                const configTab = document.querySelector('.tab[onclick*="config"]');
                if (configTab) {
                    switchTab('config', configTab);
                }
            });
        }
        return;
    }
    
    try {
        const { data: properties, error } = await supabaseClient
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (!properties || properties.length === 0) {
            propertyListCache = [];
            renderPropertyList();
            return;
        }

        propertyListCache = properties;
        renderPropertyList();
    } catch (error) {
        console.error('載入錯誤:', error);
        document.getElementById('property-list').innerHTML = 
            `<p style="text-align: center; color: #dc3545; padding: 2rem;">載入失敗：${error.message || '請確認 Supabase 設定是否正確'}</p>`;
    }
}

// 切換上架/下架狀態（優化版：減少延遲）
async function togglePublishStatus(id, newStatus) {
    if (!supabaseClient) {
        showAlert('error', '請先設定 Supabase 配置');
        return;
    }

    const targetProperty = propertyListCache.find(prop => prop.id === id);
    const propertyName = escapeHtml(targetProperty?.title || targetProperty?.number || '此物件');
    const confirmed = await showConfirmModal({
        title: newStatus ? '確認上架' : '確認下架',
        message: newStatus
            ? `確定要將 <strong>${propertyName}</strong> 上架到前台嗎？<br><br>上架後客人就會看得到這筆物件。`
            : `確定要將 <strong>${propertyName}</strong> 下架嗎？<br><br>下架後前台不會顯示，但後台仍可編輯。`,
        icon: newStatus ? 'warning' : 'danger',
        confirmText: newStatus ? '確認上架' : '確認下架',
        cancelText: '先不要'
    });

    if (!confirmed) return;
    
    try {
        const { error } = await supabaseClient
            .from('properties')
            .update({ is_published: newStatus })
            .eq('id', id);
        
        if (error) {
            loadProperties();
            throw error;
        }

        propertyListCache = propertyListCache.map(prop => (
            prop.id === id ? { ...prop, is_published: newStatus } : prop
        ));
        renderPropertyList();
        showAlert('success', newStatus ? '物件已上架' : '物件已下架');
    } catch (error) {
        console.error('切換狀態錯誤:', error);
        showAlert('error', `操作失敗：${error.message}`);
        // 發生錯誤時重新載入以確保資料一致
        loadProperties();
    }
}

// 編輯物件
async function editProperty(id) {
    // 檢查 Supabase 是否已初始化
    if (!supabaseClient) {
        showAlert('error', '請先設定 Supabase 配置，正在跳轉到設定頁面...');
        setTimeout(() => {
            const configTab = document.querySelector('.tab[onclick*="config"]');
            if (configTab) {
                switchTab('config', configTab);
            }
        }, 1000);
        return;
    }
    
    try {
        const { data: prop, error } = await supabaseClient
            .from('properties')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (!prop) {
            throw new Error('物件不存在');
        }
        editingPropertyId = id;
        
        // 填入表單
        Object.keys(prop).forEach(key => {
            // 跳過不需要填入表單的欄位
            if (['id', 'created_at', 'updated_at'].includes(key)) {
                return;
            }
            
            const element = document.getElementById(key);
            if (element) {
                if (key === 'is_published') {
                    // 處理上架狀態
                    element.value = prop.is_published ? 'true' : 'false';
                } else if (key === 'is_external') {
                    // 處理物件來源
                    element.value = prop.is_external ? 'true' : 'false';
                } else if (key === 'status_text' || key === 'statusText') {
                    // 處理 status_text 欄位（下拉選單）
                    const statusTextSelect = document.getElementById('statusText');
                    const statusTextInput = document.getElementById('statusTextInput');
                    const statusText = prop.status_text || prop.statusText || '';
                    
                    if (statusTextSelect) {
                        // 檢查下拉選單中是否有對應的選項
                        const optionExists = Array.from(statusTextSelect.options).some(option => option.value === statusText);
                        
                        if (optionExists) {
                            // 如果有對應選項，選擇它
                            statusTextSelect.value = statusText;
                            if (statusTextInput) {
                                statusTextInput.style.display = 'none';
                                statusTextInput.value = '';
                            }
                        } else if (statusText) {
                            // 如果沒有對應選項，使用自訂輸入
                            statusTextSelect.value = 'custom';
                            if (statusTextInput) {
                                statusTextInput.style.display = 'block';
                                statusTextInput.value = statusText;
                            }
                        } else {
                            // 如果沒有狀態文字，重置為預設
                            statusTextSelect.value = '';
                            if (statusTextInput) {
                                statusTextInput.style.display = 'none';
                                statusTextInput.value = '';
                            }
                        }
                    }
                } else if (key === 'city') {
                    // 處理縣市
                    element.value = prop.city || '';
                    if (prop.city) {
                        updateDistricts();
                        // 等待區域選項更新後再設定區域
                        setTimeout(() => {
                            const districtElement = document.getElementById('district');
                            if (districtElement && prop.district) {
                                districtElement.value = prop.district;
                            }
                        }, 100);
                    }
                } else if (key === 'district') {
                    // 區域會在 city 設定後自動處理
                    // 這裡不需要單獨處理
                } else if (key === 'address') {
                    // 處理地址：如果有 city 和 district，只顯示詳細地址部分
                    if (prop.city && prop.district && prop.address) {
                        // 移除縣市和區域部分
                        let detailAddress = prop.address;
                        detailAddress = detailAddress.replace(prop.city, '');
                        detailAddress = detailAddress.replace(prop.district, '');
                        element.value = detailAddress.trim();
                    } else {
                        element.value = prop.address || '';
                    }
                } else if (key === 'address_detail') {
                    // 如果有詳細地址，使用它
                    if (prop.address_detail) {
                        const addressElement = document.getElementById('address');
                        if (addressElement) {
                            addressElement.value = prop.address_detail;
                        }
                    }
                } else if (key === 'features') {
                    // 特殊處理 features：確保是陣列格式
                    if (Array.isArray(prop[key])) {
                        element.value = prop[key].join('\n');
                    } else {
                        element.value = '';
                    }
                } else if (key === 'description') {
                    // 特殊處理 description：確保正確顯示
                    element.value = prop[key] || '';
                } else if (Array.isArray(prop[key])) {
                    element.value = prop[key].join('\n');
                } else if (typeof prop[key] === 'object' && prop[key] !== null) {
                    // 處理 JSONB 欄位
                    if (key === 'transportation') {
                        const trans = prop[key];
                        if (trans.facilities) {
                            loadTagsToSelector('facilities', Array.isArray(trans.facilities) ? trans.facilities : []);
                        }
                        if (trans.transport) {
                            loadTagsToSelector('transport', Array.isArray(trans.transport) ? trans.transport : []);
                        }
                        if (trans.schools) {
                            loadTagsToSelector('schools', Array.isArray(trans.schools) ? trans.schools : []);
                        }
                        if (trans.market) {
                            document.getElementById('market').value = trans.market;
                        }
                        if (trans.park) {
                            document.getElementById('park').value = trans.park;
                        }
                    }
                } else {
                    let value = prop[key] || '';
                    // 特殊處理 google_maps：如果是完整的 iframe HTML，提取 src 屬性值
                    if (key === 'google_maps' && value && value.includes('<iframe')) {
                        const srcMatch = value.match(/src=["']([^"']+)["']/i);
                        if (srcMatch && srcMatch[1]) {
                            value = srcMatch[1];
                        } else {
                            value = '';
                        }
                    }
                    // 特殊處理 age：確保有「年」字，但避免重複
                    if (key === 'age' && value) {
                        // 如果已經有「年」字，先移除所有「年」字，然後只加一個
                        if (value.includes('年')) {
                            value = value.replace(/年+/g, '');
                            const numberMatch = value.match(/^\d+/);
                            if (numberMatch) {
                                value = numberMatch[0] + '年';
                            }
                        }
                        // 如果只有數字，加上「年」
                        else if (/^\d+$/.test(value)) {
                            value = value + '年';
                        }
                        // 如果有數字但沒有「年」字，提取數字並加上「年」
                        else if (/^\d+/.test(value)) {
                            const numberMatch = value.match(/^\d+/);
                            if (numberMatch) {
                                value = numberMatch[0] + '年';
                            }
                        }
                    }
                    // 特殊處理坪數欄位：確保有「坪」字，但避免重複
                    const areaFields = ['total_area', 'main_area', 'auxiliary_area', 'common_area', 'land_area', 'parking_area'];
                    if (areaFields.includes(key) && value) {
                        // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
                        if (value.includes('坪')) {
                            value = value.replace(/坪+/g, '');
                            const numberMatch = value.match(/^[\d.]+/);
                            if (numberMatch) {
                                value = numberMatch[0] + '坪';
                            }
                        }
                        // 如果只有數字（可能包含小數點），加上「坪」
                        else if (/^[\d.]+$/.test(value)) {
                            value = value + '坪';
                        }
                        // 如果有數字但沒有「坪」字，提取數字並加上「坪」
                        else if (/^[\d.]+/.test(value)) {
                            const numberMatch = value.match(/^[\d.]+/);
                            if (numberMatch) {
                                value = numberMatch[0] + '坪';
                            }
                        }
                    }
                    // 特殊處理建築類型：對應舊值到新值
                    if (key === 'building_type' && value) {
                        const buildingTypeMap = {
                            '華廈公寓': '華廈',
                            '透天別墅': '透天',
                            '透天厝': '透天',
                            '大樓': '電梯大樓',
                            '住宅大樓': '電梯大樓',
                            '商業大樓': '電梯大樓',
                            '住商大樓': '電梯大樓',
                            '大廈': '電梯大樓'
                        };
                        if (buildingTypeMap[value]) {
                            value = buildingTypeMap[value];
                        }
                    }
                    element.value = value;
                }
            }
        });
        
        // 處理增建樓層：如果 floor 欄位包含「（增建」，分離出來
        const floorValue = prop.floor || '';
        if (floorValue.includes('（增建') || floorValue.includes('(增建')) {
            const match = floorValue.match(/^(.+?)[（(]增建(.+?)[）)]/);
            if (match) {
                const originalFloor = match[1].trim();
                const extensionFloor = match[2].trim();
                const floorInput = document.getElementById('floor');
                const extensionInput = document.getElementById('extension_floor');
                if (floorInput) floorInput.value = originalFloor;
                if (extensionInput) extensionInput.value = extensionFloor;
            }
        }
        
        // 根據物件類型顯示/隱藏增建樓層欄位
        const propertyType = prop.type || '';
        checkAndShowExtensionFloor();
        
        // 載入隱藏門牌號碼選項
        const hideAddressCheckbox = document.getElementById('hide_address_number');
        if (hideAddressCheckbox) {
            hideAddressCheckbox.checked = prop.hide_address_number || false;
        }
        
        
        // 載入圖片
        uploadedImages = [];
        let images = [];
        if (prop.images) {
            if (typeof prop.images === 'string') {
                try {
                    images = JSON.parse(prop.images);
                } catch (e) {
                    images = [];
                }
            } else if (Array.isArray(prop.images)) {
                images = prop.images;
            }
        }
        
        if (images && images.length > 0) {
            uploadedImages = images.map((img, index) => {
                const imgUrl = typeof img === 'string' ? img : (img.url || img);
                const imageId = 'edit_' + Date.now() + '_' + index;
                return { url: imgUrl, key: typeof img === 'object' ? img.key : null, imageId };
            });
            
            const imagePreviewGrid = document.getElementById('image-preview-grid');
            if (imagePreviewGrid) {
                imagePreviewGrid.innerHTML = '';
                uploadedImages.forEach((imgData, index) => {
                    const item = document.createElement('div');
                    item.className = 'image-preview-item';
                    item.dataset.imageId = imgData.imageId;
                    item.draggable = true;
                    item.style.position = 'relative';
                    const img = document.createElement('img');
                    img.src = imgData.url || imgData;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';
                    img.style.pointerEvents = 'none';
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'image-remove';
                    removeBtn.innerHTML = '×';
                    removeBtn.onclick = () => removeImage(item, imgData.imageId);
                    item.appendChild(img);
                    item.appendChild(removeBtn);
                    imagePreviewGrid.appendChild(item);
                    console.log('✅ 已載入圖片項目（可拖曳）:', imgData.imageId);
                });
                
                // 確保拖曳功能已初始化
                initImageSortable();
            }
        }
        
        // 切換到新增標籤
        const addTab = document.getElementById('add-tab-button') || document.querySelector('.tab[onclick*="add"]');
        if (addTab) {
            switchTab('add', addTab);
        }
        
        // 滾動到頂部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
        console.error('編輯錯誤:', error);
        showAlert('error', `載入物件資料失敗：${error.message}`);
    }
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
            document.removeEventListener('keydown', handleEsc);
            resolve(true);
        });
        
        // 處理取消按鈕
        const cancelBtn = overlay.querySelector('.modal-btn-cancel');
        cancelBtn.addEventListener('click', () => {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
            resolve(false);
        });

        const closeBtn = overlay.querySelector('.modal-close');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
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

function getFieldDisplayValue(id, fallback = '未填') {
    const field = document.getElementById(id);
    if (!field) return fallback;
    if (field.type === 'checkbox') return field.checked ? '是' : '否';
    const value = String(field.value || '').trim();
    return value || fallback;
}

function showInfoModal(title, message) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-header">
                <div class="modal-icon warning">👁️</div>
                <h3 class="modal-title">${escapeHtml(title)}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                ${message}
            </div>
            <div class="modal-footer">
                <button class="modal-btn modal-btn-cancel" onclick="this.closest('.modal-overlay').remove()">關閉</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
    const closeBtn = overlay.querySelector('.modal-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        });
    }
    const modalCloseBtn = overlay.querySelector('.modal-btn-cancel');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        });
    }
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.remove();
            document.removeEventListener('keydown', handleEsc);
        }
    });
}

function previewPropertyBeforeSave() {
    const form = document.getElementById('property-form');
    const requiredFields = form ? Array.from(form.querySelectorAll('[required]')) : [];
    const missingFields = requiredFields
        .filter(field => !String(field.value || '').trim())
        .map(field => {
            const label = field.closest('.form-group')?.querySelector('label')?.textContent || field.id;
            return label.replace('*', '').trim();
        });

    const publishedText = getFieldDisplayValue('is_published') === 'true' ? '上架到前台' : '先下架保存';
    const sourceText = getFieldDisplayValue('is_external') === 'true' ? '非本店物件' : '本店物件';
    const imageCount = uploadedImages.length;

    const previewRows = [
        ['物件來源', sourceText],
        ['標題', getFieldDisplayValue('title')],
        ['房型', getFieldDisplayValue('type')],
        ['地址', `${getFieldDisplayValue('city', '')}${getFieldDisplayValue('district', '')}${getFieldDisplayValue('address')}`],
        ['隱藏門牌', getFieldDisplayValue('hide_address_number')],
        ['售價', getFieldDisplayValue('price')],
        ['格局', getFieldDisplayValue('layout')],
        ['總坪數', getFieldDisplayValue('total_area')],
        ['圖片', imageCount ? `${imageCount} 張` : '尚未上傳'],
        ['上架狀態', publishedText],
    ];

    showInfoModal('儲存前預覽', `
        ${missingFields.length ? `
            <div class="preview-warning">
                還有必填欄位未完成：${missingFields.map(escapeHtml).join('、')}
            </div>
        ` : '<div class="preview-ready">必填欄位已完成，可以儲存。</div>'}
        <div class="preview-grid">
            ${previewRows.map(([label, value]) => `
                <div class="preview-row">
                    <strong>${escapeHtml(label)}</strong>
                    <span>${escapeHtml(value)}</span>
                </div>
            `).join('')}
        </div>
    `);
}

// 刪除物件
async function deleteProperty(id) {
    // 檢查 Supabase 是否已初始化
    if (!supabaseClient) {
        showAlert('error', '請先設定 Supabase 配置，正在跳轉到設定頁面...');
        setTimeout(() => {
            const configTab = document.querySelector('.tab[onclick*="config"]');
            if (configTab) {
                switchTab('config', configTab);
            }
        }, 1000);
        return;
    }
    
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
        message: `確定要刪除 ${propertyInfo || '此物件'} 嗎？<br><br>這會刪除資料庫中的物件記錄，操作無法復原。`,
        icon: 'danger',
        confirmText: '確認刪除',
        cancelText: '先不要'
    });
    
    if (!confirmed) {
        return;
    }
    
    try {
        // 先取得物件資料（用於刪除相關圖片）
        const { data: prop } = await supabaseClient
            .from('properties')
            .select('number')
            .eq('id', id)
            .single();
        
        // 刪除資料庫記錄
        const { error } = await supabaseClient
            .from('properties')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        
        // 可選：刪除相關圖片（如果需要）
        // 注意：這裡只是示範，實際使用時可以根據需要決定是否刪除圖片
        
        showAlert('success', '物件已刪除！');
        loadProperties();
    } catch (error) {
        console.error('刪除錯誤:', error);
        showAlert('error', `刪除失敗：${error.message}`);
    }
}

// 重設表單
// 標籤選擇系統
const selectedTags = {
    facilities: [],
    transport: [],
    schools: []
};

// 切換標籤選擇狀態
function toggleTag(type, tagName) {
    // 如果點擊的是編輯或刪除按鈕，不執行切換
    if (event && (event.target.classList.contains('tag-option-edit') || event.target.classList.contains('tag-option-delete'))) {
        return;
    }
    
    const index = selectedTags[type].indexOf(tagName);
    const optionElement = event.target.closest('.tag-option') || event.target;
    
    if (index > -1) {
        // 取消選擇
        selectedTags[type].splice(index, 1);
        optionElement.classList.remove('selected');
    } else {
        // 選擇
        selectedTags[type].push(tagName);
        optionElement.classList.add('selected');
    }
    
    updateSelectedTagsDisplay(type);
}

// 添加自訂標籤
function addCustomTag(type) {
    const input = document.getElementById(`${type}-input`);
    const tagName = input.value.trim();
    
    if (!tagName) {
        showAlert('warning', '請輸入標籤名稱');
        return;
    }
    
    if (selectedTags[type].includes(tagName)) {
        showAlert('warning', '此標籤已經被選中了');
        return;
    }
    
    // 添加到選中列表
    selectedTags[type].push(tagName);
    input.value = '';
    updateSelectedTagsDisplay(type);
    
    // 如果標籤不在選項列表中，添加到選項列表（方便以後使用）
    const optionsContainer = document.getElementById(`${type}-options`);
    if (optionsContainer) {
        const existingOption = Array.from(optionsContainer.children).find(
            el => {
                const text = el.querySelector('.tag-option-text') || el;
                return text.textContent.trim() === tagName;
            }
        );
        
        if (!existingOption) {
            // 創建新的選項元素
            const newOption = document.createElement('span');
            newOption.className = 'tag-option selected';
            newOption.setAttribute('onclick', `toggleTag('${type}', '${tagName}')`);
            newOption.innerHTML = `
                <span class="tag-option-text">${tagName}</span>
                <button class="tag-option-edit" onclick="editTagOption('${type}', '${tagName}', event)" title="編輯">✏️</button>
                <button class="tag-option-delete" onclick="deleteTagOption('${type}', '${tagName}', event)" title="刪除">×</button>
            `;
            optionsContainer.appendChild(newOption);
        } else {
            // 如果已存在，標記為選中
            existingOption.classList.add('selected');
        }
    }
}

// 更新已選擇標籤的顯示
function updateSelectedTagsDisplay(type) {
    const container = document.getElementById(`${type}-selected`);
    if (!container) return;
    
    container.innerHTML = '';
    
    selectedTags[type].forEach(tagName => {
        const tag = document.createElement('span');
        tag.className = 'selected-tag';
        tag.dataset.tagName = tagName;
        tag.innerHTML = `
            <span class="tag-text">${tagName}</span>
            <button type="button" class="tag-edit" onclick="editSelectedTag('${type}', '${tagName}', event)" aria-label="編輯標籤" title="雙擊或點擊編輯">✏️</button>
            <button type="button" class="tag-remove" onclick="removeTag('${type}', '${tagName}')" aria-label="移除標籤" title="刪除標籤">×</button>
        `;
        
        // 添加雙擊編輯功能
        tag.addEventListener('dblclick', () => {
            editSelectedTag(type, tagName);
        });
        
        container.appendChild(tag);
        
        // 同步更新選項中的選中狀態
        const optionsContainer = document.getElementById(`${type}-options`);
        if (optionsContainer) {
            const option = Array.from(optionsContainer.children).find(
                el => {
                    const text = el.querySelector('.tag-option-text') || el;
                    return text.textContent.trim() === tagName;
                }
            );
            if (option) {
                option.classList.add('selected');
            }
        }
    });
}

// 編輯已選擇的標籤
function editSelectedTag(type, oldTagName, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const container = document.getElementById(`${type}-selected`);
    if (!container) return;
    
    const tagElement = container.querySelector(`[data-tag-name="${oldTagName}"]`);
    if (!tagElement) return;
    
    // 如果正在編輯，先保存
    if (tagElement.classList.contains('editing')) {
        return;
    }
    
    tagElement.classList.add('editing');
    const tagText = tagElement.querySelector('.tag-text');
    const currentText = tagText.textContent;
    
    // 創建編輯輸入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-edit-input';
    input.value = currentText;
    input.style.width = Math.max(currentText.length * 10, 80) + 'px';
    
    // 替換文字為輸入框
    tagText.style.display = 'none';
    tagElement.insertBefore(input, tagText);
    
    // 聚焦並選中文字
    input.focus();
    input.select();
    
    // 保存編輯
    const saveEdit = () => {
        const newTagName = input.value.trim();
        if (newTagName && newTagName !== oldTagName) {
            // 更新標籤名稱
            const index = selectedTags[type].indexOf(oldTagName);
            if (index > -1) {
                selectedTags[type][index] = newTagName;
                
                // 更新選項列表中的標籤（如果存在）
                updateTagOption(type, oldTagName, newTagName);
                
                // 重新顯示標籤
                updateSelectedTagsDisplay(type);
            }
        } else if (newTagName === '') {
            // 如果為空，刪除標籤
            removeTag(type, oldTagName);
        } else {
            // 取消編輯
            tagElement.classList.remove('editing');
            input.remove();
            tagText.style.display = '';
        }
    };
    
    // 按 Enter 保存
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            tagElement.classList.remove('editing');
            input.remove();
            tagText.style.display = '';
        }
    });
    
    // 失去焦點時保存
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (tagElement.classList.contains('editing')) {
                saveEdit();
            }
        }, 200);
    });
}

// 更新選項列表中的標籤名稱
function updateTagOption(type, oldName, newName) {
    const optionsContainer = document.getElementById(`${type}-options`);
    if (!optionsContainer) return;
    
    const option = Array.from(optionsContainer.children).find(
        el => {
            const text = el.querySelector('.tag-option-text') || el;
            return text.textContent.trim() === oldName;
        }
    );
    
    if (option) {
        const textElement = option.querySelector('.tag-option-text') || option;
        textElement.textContent = newName;
        
        // 更新 onclick 事件
        option.setAttribute('onclick', `toggleTag('${type}', '${newName}')`);
        
        // 如果標籤被選中，更新選中狀態
        if (option.classList.contains('selected')) {
            const index = selectedTags[type].indexOf(newName);
            if (index === -1) {
                option.classList.remove('selected');
            }
        }
    }
}

// 移除標籤
function removeTag(type, tagName) {
    const index = selectedTags[type].indexOf(tagName);
    if (index > -1) {
        selectedTags[type].splice(index, 1);
        updateSelectedTagsDisplay(type);
        
        // 取消選項中的選中狀態
        const optionsContainer = document.getElementById(`${type}-options`);
        if (optionsContainer) {
            const option = Array.from(optionsContainer.children).find(
                el => {
                    const text = el.querySelector('.tag-option-text') || el;
                    return text.textContent.trim() === tagName;
                }
            );
            if (option) {
                option.classList.remove('selected');
            }
        }
    }
}

// 編輯標籤選項（在選項列表中）
function editTagOption(type, oldName, event) {
    if (event) {
        event.stopPropagation();
    }
    
    const optionsContainer = document.getElementById(`${type}-options`);
    if (!optionsContainer) return;
    
    const option = Array.from(optionsContainer.children).find(
        el => {
            const text = el.querySelector('.tag-option-text') || el;
            return text.textContent.trim() === oldName;
        }
    );
    
    if (!option) return;
    
    // 如果正在編輯，先保存
    if (option.classList.contains('editing')) {
        return;
    }
    
    option.classList.add('editing');
    const textElement = option.querySelector('.tag-option-text') || option;
    const currentText = textElement.textContent.trim();
    
    // 創建編輯輸入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-edit-input';
    input.value = currentText;
    input.style.width = Math.max(currentText.length * 10, 80) + 'px';
    
    // 替換文字為輸入框
    const originalDisplay = textElement.style.display;
    textElement.style.display = 'none';
    option.insertBefore(input, textElement);
    
    // 聚焦並選中文字
    input.focus();
    input.select();
    
    // 保存編輯
    const saveEdit = () => {
        const newName = input.value.trim();
        if (newName && newName !== oldName) {
            // 更新選項文字
            textElement.textContent = newName;
            textElement.style.display = originalDisplay;
            
            // 更新 onclick 事件
            option.setAttribute('onclick', `toggleTag('${type}', '${newName}')`);
            
            // 如果標籤被選中，更新選中的標籤名稱
            if (selectedTags[type].includes(oldName)) {
                const index = selectedTags[type].indexOf(oldName);
                selectedTags[type][index] = newName;
                updateSelectedTagsDisplay(type);
            }
        } else if (newName === '') {
            // 如果為空，刪除選項
            deleteTagOption(type, oldName);
            return;
        } else {
            // 取消編輯
            textElement.style.display = originalDisplay;
        }
        
        option.classList.remove('editing');
        input.remove();
    };
    
    // 按 Enter 保存
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            option.classList.remove('editing');
            textElement.style.display = originalDisplay;
            input.remove();
        }
    });
    
    // 失去焦點時保存
    input.addEventListener('blur', () => {
        setTimeout(() => {
            if (option.classList.contains('editing')) {
                saveEdit();
            }
        }, 200);
    });
}

// 刪除標籤選項（從選項列表中）
function deleteTagOption(type, tagName, event) {
    if (event) {
        event.stopPropagation();
    }
    
    // 確認刪除
    if (!confirm(`確定要刪除標籤選項「${tagName}」嗎？\n\n如果此標籤已被選中，也會一併移除。`)) {
        return;
    }
    
    const optionsContainer = document.getElementById(`${type}-options`);
    if (!optionsContainer) return;
    
    const option = Array.from(optionsContainer.children).find(
        el => {
            const text = el.querySelector('.tag-option-text') || el;
            return text.textContent.trim() === tagName;
        }
    );
    
    if (option) {
        // 如果標籤被選中，先移除
        if (selectedTags[type].includes(tagName)) {
            removeTag(type, tagName);
        }
        
        // 刪除選項元素
        option.remove();
    }
}

// 載入標籤到選擇器
function loadTagsToSelector(type, tags) {
    if (!Array.isArray(tags)) return;
    
    selectedTags[type] = [...tags];
    updateSelectedTagsDisplay(type);
}

// 清除所有標籤
function clearAllTags(type) {
    selectedTags[type] = [];
    updateSelectedTagsDisplay(type);
    
    // 清除選項中的選中狀態
    const optionsContainer = document.getElementById(`${type}-options`);
    if (optionsContainer) {
        optionsContainer.querySelectorAll('.tag-option.selected').forEach(opt => {
            opt.classList.remove('selected');
        });
    }
}

// 獲取所有現有的物件編號（用於檢查重複）
async function getAllPropertyNumbers() {
    if (!supabaseClient) {
        return [];
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('properties')
            .select('id, number');
        
        if (error) throw error;
        
        return (data || [])
            .filter(item => item.number)
            .map(item => item.number);
    } catch (error) {
        console.error('❌ 獲取物件編號失敗:', error);
        return [];
    }
}

// 根據類別獲取編號前綴（新格式：2字母）
function getTypePrefix(type) {
    const typeMap = {
        '套房': 'SU',
        '2房': 'TW',
        '3房': 'TH',
        '4房': 'FO',
        '華廈': 'HS',
        '公寓': 'AP',
        '透天': 'TT',
        '店面': 'ST',
        '別墅': 'VH'
    };
    return typeMap[type] || 'XX';
}

// 桃園市區域列表
const taoyuanDistricts = [
    '桃園區', '中壢區', '大溪區', '楊梅區', '蘆竹區', '大園區', 
    '龜山區', '八德區', '龍潭區', '平鎮區', '新屋區', '觀音區',
    '復興區'
];

// 各縣市區域對應表
const cityDistricts = {
    '桃園市': taoyuanDistricts,
    '台北市': ['中正區', '大同區', '中山區', '松山區', '大安區', '萬華區', '信義區', '士林區', '北投區', '內湖區', '南港區', '文山區'],
    '新北市': ['板橋區', '三重區', '中和區', '永和區', '新莊區', '新店區', '樹林區', '鶯歌區', '三峽區', '淡水區', '汐止區', '瑞芳區', '土城區', '蘆洲區', '五股區', '泰山區', '林口區', '深坑區', '石碇區', '坪林區', '三芝區', '石門區', '八里區', '平溪區', '雙溪區', '貢寮區', '金山區', '萬里區', '烏來區'],
    '台中市': ['中區', '東區', '南區', '西區', '北區', '西屯區', '南屯區', '北屯區', '豐原區', '東勢區', '大甲區', '清水區', '沙鹿區', '梧棲區', '后里區', '神岡區', '潭子區', '大雅區', '新社區', '石岡區', '外埔區', '大安區', '烏日區', '大肚區', '龍井區', '霧峰區', '太平區', '大里區', '和平區'],
    '台南市': ['中西區', '東區', '南區', '北區', '安平區', '安南區', '永康區', '歸仁區', '新化區', '左鎮區', '玉井區', '楠西區', '南化區', '仁德區', '關廟區', '龍崎區', '官田區', '麻豆區', '佳里區', '西港區', '七股區', '將軍區', '學甲區', '北門區', '新營區', '後壁區', '白河區', '東山區', '六甲區', '下營區', '柳營區', '鹽水區', '善化區', '大內區', '山上區', '新市區', '安定區'],
    '高雄市': ['新興區', '前金區', '苓雅區', '鹽埕區', '鼓山區', '旗津區', '前鎮區', '三民區', '左營區', '楠梓區', '小港區', '鳳山區', '林園區', '大寮區', '大樹區', '大社區', '仁武區', '鳥松區', '岡山區', '橋頭區', '燕巢區', '田寮區', '阿蓮區', '路竹區', '湖內區', '茄萣區', '永安區', '彌陀區', '梓官區', '旗山區', '美濃區', '六龜區', '甲仙區', '杉林區', '內門區', '茂林區', '桃源區', '那瑪夏區']
};

// 更新區域選項
function updateDistricts() {
    const citySelect = document.getElementById('city');
    const districtSelect = document.getElementById('district');
    const selectedCity = citySelect.value;
    
    // 清空區域選項
    districtSelect.innerHTML = '<option value="">請選擇區域</option>';
    
    if (selectedCity && cityDistricts[selectedCity]) {
        cityDistricts[selectedCity].forEach(district => {
            const option = document.createElement('option');
            option.value = district;
            option.textContent = district;
            districtSelect.appendChild(option);
        });
    }
}

// 生成下一個序號（店內物件：7位數格式 SU00001）
function getNextInternalSequenceNumber(existingNumbers, prefix) {
    // 找出所有屬於該類別的店內物件編號（格式：SU00001, TW00001）
    // 同時過濾掉舊格式的編號（如：2-1, 3-6等）和其他不符合標準格式的編號
    const typeNumbers = existingNumbers
        .filter(num => {
            // 只處理符合新格式的編號：{2字母前綴}{5位數字}
            // 排除以 EX 開頭的（店外物件）
            // 排除包含連字號的舊格式（如：2-1, 3-6）
            // 排除其他不符合標準格式的編號
            if (!num || typeof num !== 'string') return false;
            if (num.startsWith('EX')) return false;
            if (num.includes('-')) return false; // 排除舊格式
            // 檢查是否符合標準格式：2字母 + 5位數字
            const standardFormat = new RegExp(`^${prefix}\\d{5}$`);
            return standardFormat.test(num);
        })
        .map(num => {
            // 提取序號部分（例如：SU00001 -> 1）
            const match = num.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => b - a); // 降序排列
    
    // 如果沒有該類別的編號，從 1 開始
    if (typeNumbers.length === 0) {
        return 1;
    }
    
    // 返回最大序號 + 1
    return typeNumbers[0] + 1;
}

// 生成下一個序號（店外物件：8位數格式 EXSU0001）
function getNextExternalSequenceNumber(existingNumbers, prefix) {
    // 找出所有屬於該類別的店外物件編號（格式：EXSU0001, EXTW0001）
    const externalPrefix = `EX${prefix}`;
    const typeNumbers = existingNumbers
        .filter(num => {
            // 只處理符合標準格式的編號：EX{2字母前綴}{4位數字}
            // 排除包含連字號的舊格式
            if (!num || typeof num !== 'string') return false;
            if (!num.startsWith(externalPrefix)) return false;
            if (num.includes('-')) return false; // 排除舊格式
            // 檢查是否符合標準格式：EX + 2字母 + 4位數字
            const standardFormat = new RegExp(`^EX${prefix}\\d{4}$`);
            return standardFormat.test(num);
        })
        .map(num => {
            // 提取序號部分（例如：EXSU0001 -> 1）
            const match = num.match(new RegExp(`^EX${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => b - a); // 降序排列
    
    // 如果沒有該類別的編號，從 1 開始
    if (typeNumbers.length === 0) {
        return 1;
    }
    
    // 返回最大序號 + 1
    return typeNumbers[0] + 1;
}

// 格式化序號（店內：5位數，店外：4位數）
function formatSequenceNumber(seq, digits) {
    return String(seq).padStart(digits, '0');
}

// 標準化物件編號格式（將舊格式轉換為新格式）
function normalizePropertyNumber(number, type, isExternal) {
    if (!number || typeof number !== 'string') {
        return number;
    }
    
    const trimmedNumber = number.trim();
    
    // 檢查是否已經是正確的新格式
    // 店內物件：{2字母}{5數字}，例如 TT00012
    // 店外物件：EX{2字母}{4數字}，例如 EXTT0001
    if (isExternal) {
        const newFormatPattern = /^EX[A-Z]{2}\d{4}$/;
        if (newFormatPattern.test(trimmedNumber)) {
            return trimmedNumber; // 已經是正確格式
        }
    } else {
        const newFormatPattern = /^[A-Z]{2}\d{5}$/;
        if (newFormatPattern.test(trimmedNumber)) {
            return trimmedNumber; // 已經是正確格式
        }
    }
    
    // 嘗試轉換舊格式（例如：TT-012 → TT00012）
    // 匹配模式：{字母}-{數字} 或 {字母}{數字}
    const oldFormatMatch = trimmedNumber.match(/^([A-Z]{2})[-]?(\d+)$/i);
    if (oldFormatMatch) {
        const prefix = oldFormatMatch[1].toUpperCase();
        const seq = parseInt(oldFormatMatch[2], 10);
        
        if (!isNaN(seq) && seq > 0) {
            if (isExternal) {
                // 店外物件：EX{2字母}{4數字}
                return `EX${prefix}${formatSequenceNumber(seq, 4)}`;
            } else {
                // 店內物件：{2字母}{5數字}
                return `${prefix}${formatSequenceNumber(seq, 5)}`;
            }
        }
    }
    
    // 如果無法轉換，返回原值（讓後續驗證處理）
    return trimmedNumber;
}

// 生成物件編號（支援店內/店外物件）
async function generatePropertyNumber() {
    const typeSelect = document.getElementById('type');
    const numberInput = document.getElementById('number');
    const isExternalSelect = document.getElementById('is_external');
    
    if (!typeSelect || !numberInput) {
        showAlert('error', '找不到房型或編號欄位');
        return;
    }
    
    const type = typeSelect.value.trim();
    if (!type) {
        showAlert('warning', '請先選擇房型');
        return;
    }
    
    const isExternal = isExternalSelect ? isExternalSelect.value === 'true' : false;
    
    try {
        // 獲取所有現有編號
        const existingNumbers = await getAllPropertyNumbers();
        
        // 如果正在編輯，排除當前物件的編號
        if (editingPropertyId) {
            try {
                const { data: currentData, error } = await supabaseClient
                    .from('properties')
                    .select('number')
                    .eq('id', editingPropertyId)
                    .single();
                
                if (!error && currentData && currentData.number) {
                    const index = existingNumbers.indexOf(currentData.number);
                    if (index > -1) {
                        existingNumbers.splice(index, 1);
                    }
                }
            } catch (error) {
                console.warn('⚠️ 無法獲取當前物件編號:', error);
            }
        }
        
        // 生成新編號
        const prefix = getTypePrefix(type);
        let newNumber;
        
        if (isExternal) {
            // 店外物件：EXSU0001（8位數）
            const nextSeq = getNextExternalSequenceNumber(existingNumbers, prefix);
            const formattedSeq = formatSequenceNumber(nextSeq, 4);
            newNumber = `EX${prefix}${formattedSeq}`;
        } else {
            // 店內物件：SU00001（7位數）
            const nextSeq = getNextInternalSequenceNumber(existingNumbers, prefix);
            const formattedSeq = formatSequenceNumber(nextSeq, 5);
            newNumber = `${prefix}${formattedSeq}`;
        }
        
        // 檢查是否仍然重複（以防萬一）
        if (existingNumbers.includes(newNumber)) {
            // 如果重複，嘗試下一個序號
            let seq = isExternal 
                ? getNextExternalSequenceNumber(existingNumbers, prefix) + 1
                : getNextInternalSequenceNumber(existingNumbers, prefix) + 1;
            let candidate;
            const maxSeq = isExternal ? 9999 : 99999;
            
            while (seq < maxSeq) {
                if (isExternal) {
                    candidate = `EX${prefix}${formatSequenceNumber(seq, 4)}`;
                } else {
                    candidate = `${prefix}${formatSequenceNumber(seq, 5)}`;
                }
                
                if (!existingNumbers.includes(candidate)) {
                    newNumber = candidate;
                    break;
                }
                seq++;
            }
        }
        
        numberInput.value = newNumber;
        showAlert('success', `已生成物件編號: ${newNumber}`);
    } catch (error) {
        console.error('❌ 生成編號失敗:', error);
        showAlert('error', '生成編號失敗，請稍後再試');
    }
}

// 當物件來源改變時的處理
function onExternalSourceChange() {
    const isExternalSelect = document.getElementById('is_external');
    const typeSelect = document.getElementById('type');
    const numberInput = document.getElementById('number');
    
    if (!isExternalSelect || !typeSelect || !numberInput) {
        return;
    }
    
    const isExternal = isExternalSelect.value === 'true';
    const type = typeSelect.value.trim();
    
    // 如果已選擇房型且不在編輯模式，重新生成編號
    if (type && !editingPropertyId) {
        numberInput.value = '';
        generatePropertyNumber();
    } else if (type && editingPropertyId) {
        // 編輯模式：檢查現有編號是否符合當前來源類型
        const currentNumber = numberInput.value.trim();
        if (currentNumber) {
            const isCurrentExternal = currentNumber.startsWith('EX');
            if (isCurrentExternal !== isExternal) {
                // 來源類型改變，重新生成編號
                numberInput.value = '';
                generatePropertyNumber();
            }
        }
    }
}

// 當房型改變時的處理
// 狀態改變時的處理
function onStatusChange() {
    const statusSelect = document.getElementById('status');
    const statusTextSelect = document.getElementById('statusText');
    
    if (!statusSelect || !statusTextSelect) return;
    
    const statusValue = statusSelect.value;
    
    // 狀態值和對應的預設文字
    const statusTextMap = {
        'new': '新上架',
        'urgent': '急售',
        'selling': '熱銷中',
        'below-appraisal': '低於鑑價',
        'sold': '已售出'
    };
    
    // 如果狀態文字下拉選單是空的，或選擇了預設選項，則自動填充
    const currentText = statusTextSelect.value;
    const suggestedText = statusTextMap[statusValue];
    
    if (suggestedText) {
        // 如果狀態文字下拉選單為空，或選擇了預設選項，則自動選擇對應選項
        if (!currentText || currentText === '') {
            statusTextSelect.value = suggestedText;
            // 隱藏自訂輸入框
            const statusTextInput = document.getElementById('statusTextInput');
            if (statusTextInput) {
                statusTextInput.style.display = 'none';
            }
        }
    } else {
        // 如果選擇「一般物件」，重置為預設選項
        if (!statusValue) {
            statusTextSelect.value = '';
            const statusTextInput = document.getElementById('statusTextInput');
            if (statusTextInput) {
                statusTextInput.style.display = 'none';
                statusTextInput.value = '';
            }
        }
    }
}

// 狀態文字下拉選單改變時的處理
function onStatusTextChange() {
    const statusTextSelect = document.getElementById('statusText');
    const statusTextInput = document.getElementById('statusTextInput');
    
    if (!statusTextSelect || !statusTextInput) return;
    
    const selectedValue = statusTextSelect.value;
    
    if (selectedValue === 'custom') {
        // 如果選擇「自訂」，顯示輸入框
        statusTextInput.style.display = 'block';
        statusTextInput.focus();
    } else {
        // 其他選項，隱藏輸入框
        statusTextInput.style.display = 'none';
        statusTextInput.value = '';
    }
}

// 從標籤按鈕設置狀態文字
function setStatusTextFromTag(text) {
    const statusTextSelect = document.getElementById('statusText');
    const statusTextInput = document.getElementById('statusTextInput');
    
    if (statusTextSelect) {
        // 檢查下拉選單中是否有對應的選項
        const optionExists = Array.from(statusTextSelect.options).some(option => option.value === text);
        
        if (optionExists) {
            // 如果有對應選項，選擇它
            statusTextSelect.value = text;
            if (statusTextInput) {
                statusTextInput.style.display = 'none';
                statusTextInput.value = '';
            }
        } else {
            // 如果沒有對應選項，使用自訂輸入
            statusTextSelect.value = 'custom';
            if (statusTextInput) {
                statusTextInput.style.display = 'block';
                statusTextInput.value = text;
                statusTextInput.focus();
            }
        }
    }
}

function onTypeChange() {
    const typeSelect = document.getElementById('type');
    const numberInput = document.getElementById('number');
    const isExternalSelect = document.getElementById('is_external');
    
    if (!typeSelect || !numberInput) {
        return;
    }
    
    const type = typeSelect.value.trim();
    const isExternal = isExternalSelect ? isExternalSelect.value === 'true' : false;
    
    // 如果不在編輯模式，且已選擇房型，自動生成編號
    if (type && !editingPropertyId) {
        // 清除現有編號，強制重新生成
        numberInput.value = '';
        generatePropertyNumber();
    } else if (type && editingPropertyId) {
        // 編輯模式：檢查現有編號是否符合當前房型和來源類型
        const currentNumber = numberInput.value.trim();
        if (currentNumber) {
            const prefix = getTypePrefix(type);
            const isCurrentExternal = currentNumber.startsWith('EX');
            const currentPrefix = isCurrentExternal 
                ? currentNumber.substring(2, 4)  // EXSU0001 -> SU
                : currentNumber.substring(0, 2);  // SU00001 -> SU
            
            // 如果房型改變或來源類型改變，重新生成編號
            if (currentPrefix !== prefix || isCurrentExternal !== isExternal) {
                numberInput.value = '';
                generatePropertyNumber();
            }
        }
    }
}

// Google 街景相關函數
// 打開 Google 街景（方法一：最簡單的方式）
function openGoogleStreetView() {
    const addressInput = document.getElementById('address');
    if (!addressInput) {
        showAlert('error', '找不到地址輸入框');
        return;
    }
    
    const address = addressInput.value.trim();
    if (!address) {
        showAlert('warning', '請先輸入地址');
        addressInput.focus();
        return;
    }
    
    // 編碼地址
    const encodedAddress = encodeURIComponent(address);
    // 打開 Google 街景頁面（使用街景模式）
    // 先搜尋地址，然後在 Google Maps 中可以直接切換到街景模式
    const streetViewUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    window.open(streetViewUrl, '_blank');
    
    // 顯示詳細的操作說明
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alert = document.createElement('div');
        alert.className = 'alert alert-info show';
        alert.innerHTML = `
            <strong>✅ 已在新視窗打開 Google Maps</strong><br>
            請按照以下步驟操作：<br>
            1. 在開啟的地圖頁面中，拖動右下角的「小黃人」到地圖上的位置<br>
            2. 進入街景後，點擊左上角的「選單」→「分享或嵌入地圖」→「嵌入地圖」<br>
            3. 複製嵌入網址並貼到「Google 街景網址」欄位
        `;
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 5000);
        }, 8000);
    }
}

// 格式化屋齡輸入（自動加上「年」字，但避免重複）
function formatAgeInput(input) {
    if (!input) return;
    let value = input.value.trim();
    if (!value) return;
    
    // 如果已經有「年」字，先移除所有「年」字，然後只加一個
    if (value.includes('年')) {
        value = value.replace(/年+/g, '');
        const numberMatch = value.match(/^\d+/);
        if (numberMatch) {
            input.value = numberMatch[0] + '年';
        }
    }
    // 如果輸入的是純數字，自動加上「年」
    else if (/^\d+$/.test(value)) {
        input.value = value + '年';
    }
    // 如果有數字但沒有「年」字，提取數字並加上「年」
    else if (/^\d+/.test(value)) {
        const numberMatch = value.match(/^\d+/);
        if (numberMatch) {
            input.value = numberMatch[0] + '年';
        }
    }
}

// 格式化格局輸入（例如：3/2/2 → 3房2廳2衛，0/4/3 → 0房4廳3衛）
function formatLayoutInput(input) {
    if (!input) return;
    let value = input.value.trim();
    if (!value) return;
    
    // 如果已經包含「房」、「廳」、「衛」，不需要轉換
    if (value.includes('房') || value.includes('廳') || value.includes('衛')) {
        return;
    }
    
    // 檢查是否符合 數字/數字/數字 格式（例如：3/2/2 或 0/4/3）
    const layoutPattern = /^(\d+)\/(\d+)\/(\d+)$/;
    const match = value.match(layoutPattern);
    
    if (match) {
        const room = parseInt(match[1], 10);
        const living = parseInt(match[2], 10);
        const bath = parseInt(match[3], 10);
        
        // 處理特殊格局
        if (room === 0 && living > 0) {
            // 0房但有廳，可能是開放式格局
            input.value = `0房${living}廳${bath}衛（開放式）`;
        } else if (room === 0 && living === 0 && bath > 0) {
            // 只有衛浴，可能是特殊格局
            input.value = `0房0廳${bath}衛（開放式）`;
        } else if (room === 1 && living === 0 && bath === 1) {
            // 1房1衛，可能是套房
            input.value = `1房0廳1衛（套房）`;
        } else {
            // 一般格局
            input.value = `${room}房${living}廳${bath}衛`;
        }
    }
}

// 格式化坪數輸入（自動加上「坪」字）
function formatAreaInput(input) {
    if (!input) return;
    let value = input.value.trim();
    if (!value) return;
    
    // 如果已經有「坪」字，先移除所有「坪」字，然後只加一個
    if (value.includes('坪')) {
        value = value.replace(/坪+/g, '');
        // 提取數字（可能包含小數點）
        const numberMatch = value.match(/^[\d.]+/);
        if (numberMatch) {
            input.value = numberMatch[0] + '坪';
        }
    }
    // 如果輸入的是純數字（可能包含小數點），自動加上「坪」
    else if (/^[\d.]+$/.test(value)) {
        input.value = value + '坪';
    }
    // 如果有數字但沒有「坪」字，提取數字並加上「坪」
    else if (/^[\d.]+/.test(value)) {
        const numberMatch = value.match(/^[\d.]+/);
        if (numberMatch) {
            input.value = numberMatch[0] + '坪';
        }
    }
}

// 當物件類型改變時，顯示/隱藏增建樓層欄位
function onTypeChange() {
    const typeSelect = document.getElementById('type');
    const extensionGroup = document.getElementById('extension-floor-group');
    
    if (!typeSelect || !extensionGroup) return;
    
    const selectedType = typeSelect.value.trim();
    // 只有透天類型才顯示增建樓層欄位
    if (selectedType === '透天') {
        extensionGroup.style.display = 'block';
    } else {
        extensionGroup.style.display = 'none';
        // 清空增建樓層欄位
        const extensionInput = document.getElementById('extension_floor');
        if (extensionInput) {
            extensionInput.value = '';
        }
    }
}

// 當樓層改變時，檢查是否需要顯示增建欄位提示
function onFloorChange() {
    const typeSelect = document.getElementById('type');
    const extensionGroup = document.getElementById('extension-floor-group');
    
    if (!typeSelect || !extensionGroup) return;
    
    const selectedType = typeSelect.value.trim();
    // 如果是透天，確保增建欄位顯示
    if (selectedType === '透天') {
        extensionGroup.style.display = 'block';
    }
}

// 檢查並顯示增建樓層欄位（用於編輯模式載入時）
function checkAndShowExtensionFloor() {
    const typeSelect = document.getElementById('type');
    const extensionGroup = document.getElementById('extension-floor-group');
    
    if (!typeSelect || !extensionGroup) return;
    
    const selectedType = typeSelect.value.trim();
    if (selectedType === '透天') {
        extensionGroup.style.display = 'block';
    }
}

function resetForm() {
    document.getElementById('property-form').reset();
    uploadedImages = [];
    const imagePreviewGrid = document.getElementById('image-preview-grid');
    if (imagePreviewGrid) {
        imagePreviewGrid.innerHTML = '';
    }
    editingPropertyId = null;
    
    // 清除物件編號
    const numberInput = document.getElementById('number');
    if (numberInput) {
        numberInput.value = '';
    }
    
    // 清除所有標籤
    clearAllTags('facilities');
    clearAllTags('transport');
    clearAllTags('schools');
    
    // 清除隱藏門牌號碼的勾選
    const hideAddressCheckbox = document.getElementById('hide_address_number');
    if (hideAddressCheckbox) {
        hideAddressCheckbox.checked = false;
    }
    
}

// 顯示提示訊息
function showAlert(type, message) {
    // 方法1：在 alert-container 中顯示（如果有）
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} show`;
        alert.textContent = message;
        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);
        
        // 不自動滾動到 alert 位置，保持頁面在當前位置
        // 移除 scrollIntoView 調用，避免上傳圖片時頁面跳轉
        
        setTimeout(() => {
            alert.classList.remove('show');
            setTimeout(() => alert.remove(), 300);
        }, 5000); // 增加到 5 秒
    }
    
    // 方法2：同時顯示固定位置的 toast 通知（更明顯）
    const toast = document.createElement('div');
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.className = `toast-alert alert-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    // 移除現有的 toast（避免重疊）
    const existingToast = document.querySelector('.toast-alert');
    if (existingToast) {
        existingToast.remove();
    }
    
    document.body.appendChild(toast);
    
    // 自動移除（5 秒後）
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }, 5000);
    
    // 控制台日誌（方便除錯）
    console.log(`[Alert ${type.toUpperCase()}]`, message);
}

// 頁面載入時
document.addEventListener('DOMContentLoaded', function() {
    // 先從 localStorage 自動載入設定並初始化 Supabase（不需要打開設定頁面）
    const savedAnonKey = localStorage.getItem('supabase-anon-key');
    if (savedAnonKey) {
        console.log('📥 自動載入已保存的 Supabase 設定');
        // 直接初始化 Supabase（不需要填寫表單）
        initSupabase();
        
        // 如果有設定標籤，也要填入值（即使隱藏了）
        loadSupabaseConfig();
        
        // 檢查是否需要隱藏設定標籤
        setTimeout(() => {
            checkConfigTabVisibility();
        }, 100);
        
        // 檢查 URL 參數，如果有 id 則載入該物件
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');
        if (propertyId) {
            // 短延遲等 DOM 與 Supabase 就緒後再載入
            setTimeout(() => {
                if (supabaseClient) {
                    editProperty(propertyId);
                }
            }, 150);
        }
    } else {
        // 如果沒有保存的設定，載入表單預設值
        loadSupabaseConfig();
        
        // 即使 Supabase 未初始化，也先保存 ID，等初始化完成後再載入
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');
        if (propertyId) {
            const checkInterval = setInterval(() => {
                if (supabaseClient) {
                    clearInterval(checkInterval);
                    editProperty(propertyId);
                }
            }, 200);
            setTimeout(() => clearInterval(checkInterval), 10000);
        }
    }
    
    // 初始化縣市區域選擇（預設為桃園市）
    const citySelect = document.getElementById('city');
    if (citySelect) {
        citySelect.value = '桃園市';
        updateDistricts();
    }
    
    // 檢查是否已設定 Supabase
    setTimeout(() => {
        if (!supabaseClient && !savedAnonKey) {
            // 檢查當前是否在新增物件頁面
            const addTab = document.getElementById('add-tab');
            if (addTab && addTab.classList.contains('active')) {
                // 只顯示提示，不強制跳轉（讓用戶可以選擇）
                console.warn('⚠️ Supabase 未設定，請前往「⚙️ API 設定」標籤進行設定');
            }
            // 如果 Supabase 未設定，顯示設定標籤
            showConfigTab();
        } else if (supabaseClient) {
            // 如果 Supabase 已成功初始化，隱藏設定標籤
            checkConfigTabVisibility();
        }
            testSupabaseConnection();
    }, 500);
    
    // 支援 Enter 鍵新增標籤
    ['facilities', 'transport', 'schools'].forEach(type => {
        const input = document.getElementById(`${type}-input`);
        if (input) {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomTag(type);
                }
            });
        }
    });
    
});

// 將函數暴露到全域，方便在控制台調用
window.showConfigTab = showConfigTab;
window.hideConfigTab = hideConfigTab;

// 測試 Supabase 連接（帶 UI 顯示）
async function testSupabaseConnection() {
    const statusDiv = document.getElementById('supabase-status');
    const statusContent = document.getElementById('supabase-status-content');
    
    if (!statusDiv || !statusContent) {
        // 如果沒有狀態顯示區域，直接測試
        await testSupabaseConnectionInternal();
        return;
    }
    
    statusDiv.style.display = 'block';
    statusContent.innerHTML = '<p>🔄 正在測試連接...</p>';
    
    const results = await testSupabaseConnectionInternal();
    
    // 顯示結果
    let html = '<div style="display: grid; gap: 0.5rem;">';
    
    if (results.sdkLoaded) {
        html += '<p style="color: green;">✅ Supabase SDK 已載入</p>';
    } else {
        html += '<p style="color: red;">❌ Supabase SDK 未載入</p>';
    }
    
    if (results.supabaseInitialized) {
        html += '<p style="color: green;">✅ Supabase 已初始化</p>';
    } else {
        html += '<p style="color: red;">❌ Supabase 初始化失敗</p>';
        if (results.initError) {
            html += `<p style="color: orange; font-size: 0.9rem;">⚠️ ${results.initError}</p>`;
        }
    }
    
    if (results.databaseTest) {
        html += `<p style="color: green;">✅ 資料庫連接成功</p>`;
    } else if (results.databaseError) {
        html += `<p style="color: red;">❌ 資料庫連接失敗</p>`;
        html += `<p style="color: orange; font-size: 0.9rem; margin: 0.5rem 0;">⚠️ ${results.databaseError}</p>`;
    }
    
    if (results.storageTest) {
        html += '<p style="color: green;">✅ Storage 連接成功</p>';
    } else if (results.storageError) {
        html += '<p style="color: orange;">⚠️ Storage 連接失敗</p>';
        html += `<p style="color: orange; font-size: 0.9rem; margin: 0.5rem 0;">⚠️ ${results.storageError}</p>`;
    }
    
    html += '</div>';
    statusContent.innerHTML = html;
}

// 內部測試函數
async function testSupabaseConnectionInternal() {
    const results = {
        sdkLoaded: false,
        supabaseInitialized: false,
        initError: null,
        databaseTest: false,
        databaseError: null,
        storageTest: false,
        storageError: null
    };
    
    // 檢查 SDK 是否載入
    if (typeof supabase === 'undefined') {
        console.error('❌ Supabase SDK 未載入');
        results.initError = 'Supabase SDK 未載入，請檢查網路連接';
        return results;
    }
    results.sdkLoaded = true;
    console.log('✅ Supabase SDK 已載入');
    
    // 檢查是否初始化
    if (!supabaseClient) {
        console.warn('⚠️ Supabase 未初始化');
        console.log('💡 提示：請前往「⚙️ API 設定」標籤填寫 Supabase 設定');
        results.initError = 'Supabase 未初始化，請先儲存設定';
        return results;
    }
    results.supabaseInitialized = true;
    
    // 測試資料庫連接
    try {
        const { data, error } = await supabaseClient
            .from('properties')
            .select('id')
            .limit(1);
        
        if (error) throw error;
        
        console.log('✅ Supabase 資料庫連接正常');
        results.databaseTest = true;
    } catch (error) {
        console.error('❌ Supabase 資料庫連接失敗:', error);
        results.databaseError = error.message || '連接失敗';
    }
    
    // 測試 Storage 連接
    try {
        const { data, error } = await supabaseClient
            .storage
            .from('junyang666')
            .list('', { limit: 1 });
        
        if (error) throw error;
        
        console.log('✅ Supabase Storage 連接正常');
        results.storageTest = true;
    } catch (error) {
        console.error('❌ Supabase Storage 連接失敗:', error);
        results.storageError = error.message || '連接失敗';
    }
    
    return results;
}
