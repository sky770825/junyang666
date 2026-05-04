/**
 * TikTok 彈窗 - 從 main-script.js 抽出
 * 依賴：embeddedPropertiesData
 */
(function() {
    "use strict";
    let currentTikTokModal = null;
    const tiktokEmbedCache = new Map();
    let tiktokScriptLoaded = false;
    let tiktokScriptLoading = false;



// TikTok 彈窗功能（✅ 支援快取優化）
function showTikTokModal(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property || !property.tiktok_video_id) return;
    
    console.log('🎵 開啟 TikTok 影片:', propertyId);
    
    // ✅ 檢查快取
    let cachedEmbed = tiktokEmbedCache.get(propertyId);
    if (cachedEmbed) {
        console.log('📦 使用快取的 TikTok 嵌入內容');
    } else {
        console.log('🔄 首次載入 TikTok 影片');
    }
    
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.95);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="
            background: white;
            border-radius: 15px;
            max-width: 605px;
            width: 100%;
            max-height: 90vh;
            position: relative;
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            overflow: hidden;
            overflow-y: auto;
        ">
            <!-- 關閉按鈕 -->
            <button onclick="closeTikTokModal()" style="
                position: sticky;
                top: 15px;
                right: 15px;
                float: right;
                background: #e74c3c;
                color: white;
                border: none;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                font-size: 20px;
                font-weight: bold;
                z-index: 10001;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                margin: 10px 10px 0 0;
            ">×</button>
            
            <!-- TikTok 標題 -->
            <div style="padding: 20px 30px 10px 30px; background: linear-gradient(135deg, #000000, #fe2c55); color: white; clear: both;">
                <h2 style="margin: 0; font-size: 1.3rem; font-weight: 600;">
                    <i class="fab fa-tiktok"></i> ${property.title}
                </h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                    ${property.tiktok_username || '@aihouse168'} 的 TikTok 影片
                </p>
            </div>
            
            <!-- TikTok 嵌入影片容器 -->
            <div id="tiktok-embed-container-${propertyId}" style="padding: 20px; background: #f8f9fa; display: flex; justify-content: center; align-items: flex-start; min-height: 600px;">
                ${cachedEmbed || `
                    <div style="text-align: center; color: #666; padding: 3rem 1rem;">
                        <div style="font-size: 3rem; margin-bottom: 1rem; color: #fe2c55;">
                            <i class="fab fa-tiktok"></i>
                        </div>
                        <div style="font-size: 1rem; margin-bottom: 1rem; font-weight: 600;">載入 TikTok 影片中...</div>
                        <div style="width: 40px; height: 40px; border: 4px solid #f3f3f3; border-top: 4px solid #fe2c55; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto;"></div>
                        <div style="font-size: 0.85rem; color: #999; margin-top: 1rem;">
                            💡 影片將自動開始播放
                        </div>
                    </div>
                    <style>
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    </style>
                `}
            </div>
            
            <!-- 外部連結按鈕 -->
            <div style="padding: 20px 30px; background: #f8f9fa; display: flex; gap: 15px; justify-content: center; border-top: 1px solid #e9ecef;">
                <a href="https://www.tiktok.com/${property.tiktok_username || '@aihouse168'}/video/${property.tiktok_video_id}" 
                   target="_blank" 
                   style="
                       background: linear-gradient(45deg, #000000, #fe2c55);
                       color: white;
                       text-decoration: none;
                       padding: 10px 20px;
                       border-radius: 25px;
                       font-weight: 600;
                       display: inline-flex;
                       align-items: center;
                       gap: 8px;
                       transition: all 0.3s ease;
                   " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                    <i class="fab fa-tiktok"></i> 在 TikTok 中開啟
                </a>
            </div>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // 儲存到全域變數
    currentTikTokModal = modal;
    
    // ✅ 載入或初始化 TikTok 嵌入內容
    if (!cachedEmbed) {
        loadTikTokEmbed(propertyId, property);
    } else {
        // 如果有快取，直接渲染（如果 TikTok 脚本已載入）
        if (tiktokScriptLoaded && window.tiktokEmbed) {
            setTimeout(() => {
                window.tiktokEmbed.lib.render(modal);
            }, 100);
        }
    }
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTikTokModal();
        }
    });
    
    // ESC 鍵關閉
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closeTikTokModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// ✅ 載入 TikTok 嵌入內容（優化版 + 自動播放）
function loadTikTokEmbed(propertyId, property) {
    const container = document.getElementById(`tiktok-embed-container-${propertyId}`);
    if (!container) return;
    
    // 使用 iframe 方式嵌入，支援更多控制選項
    const embedHTML = `
        <iframe 
            src="https://www.tiktok.com/embed/v2/${property.tiktok_video_id}?lang=zh-Hant&referrer=${encodeURIComponent(window.location.href)}" 
            width="100%" 
            height="700" 
            frameborder="0" 
            scrolling="no" 
            allow="encrypted-media; autoplay; fullscreen; picture-in-picture" 
            allowfullscreen
            style="max-width: 605px; min-width: 325px; border-radius: 10px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        </iframe>
    `;
    
    container.innerHTML = embedHTML;
    
    // ✅ 儲存到快取
    tiktokEmbedCache.set(propertyId, embedHTML);
    console.log('💾 已快取 TikTok 嵌入內容:', propertyId);
    console.log('🎬 TikTok 影片已載入（iframe 模式）');
    
    // 嘗試觸發自動播放（某些瀏覽器可能會阻擋）
    setTimeout(() => {
        const iframe = container.querySelector('iframe');
        if (iframe) {
            // 發送播放訊息到 iframe（如果 TikTok 支援）
            try {
                iframe.contentWindow.postMessage('{"event":"play"}', '*');
                console.log('🎵 已嘗試觸發自動播放');
            } catch (e) {
                console.log('ℹ️ 瀏覽器政策限制自動播放，需手動點擊播放');
            }
        }
    }, 1000);
}

// 關閉 TikTok 彈窗函數
function closeTikTokModal() {
    if (currentTikTokModal) {
        currentTikTokModal.remove();
        currentTikTokModal = null;
    }
}

    window.showTikTokModal = showTikTokModal;
    window.closeTikTokModal = closeTikTokModal;
})();

