/**
 * 地圖彈窗 - 從 main-script.js 抽出
 * 依賴：embeddedPropertiesData
 */
(function() {
    "use strict";
    let currentMapModal = null;
    const mapIframeCache = new Map();

// 關閉地圖彈窗函數
function closeMapModal() {
    if (currentMapModal) {
        currentMapModal.remove();
        currentMapModal = null;
    }
}

// 地圖彈窗功能（✅ 支援 iframe 快取）
function showMapModal(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property) {
        // ✅ 檢查快取
        let cachedIframe = mapIframeCache.get(propertyId);
        if (cachedIframe) {
            console.log('📦 使用快取的地圖:', propertyId);
        } else {
            console.log('🗺️ 首次載入地圖:', propertyId);
        }
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
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
                    max-width: 100vw;
                    max-height: 350vh;
                    position: relative;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
                    overflow: hidden;
                ">
                <!-- 關閉按鈕 -->
                <button onclick="closeMapModal()" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
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
                ">×</button>
                
                <!-- 地圖標題 -->
                <div style="padding: 20px 30px 10px 30px; background: linear-gradient(135deg, #667eea, #764ba2); color: white;">
                    <h2 style="margin: 0; font-size: 1.3rem; font-weight: 600;">
                        <i class="fas fa-map-marker-alt"></i> ${property.title} - 位置地圖
                    </h2>
                    <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 0.9rem;">
                        📍 ${(typeof window.formatAddressForDisplay === 'function' 
                            ? window.formatAddressForDisplay(property.address, property.hide_address_number, property.type)
                            : property.address || '')}
                    </p>
                </div>
                
                <!-- 地圖容器（✅ 快取優化） -->
                <div id="map-iframe-container-${propertyId}" class="map-container" style="width: 100%; height: 30vh; min-height: 300px;">
                    ${cachedIframe ? (() => {
                        // 確保快取的 iframe 有正確的 allow 屬性
                        if (cachedIframe.includes('allow=') && !cachedIframe.includes('allow="accelerometer')) {
                            return cachedIframe.replace(/allow=["'][^"']*["']/i, 'allow="accelerometer; gyroscope; geolocation"');
                        } else if (!cachedIframe.includes('allow=')) {
                            return cachedIframe.replace(/<iframe/i, '<iframe allow="accelerometer; gyroscope; geolocation"');
                        }
                        return cachedIframe;
                    })() : `
                    <iframe src="${(() => {
                        let mapUrl = property.google_maps || '';
                        // 如果 google_maps 是完整的 iframe HTML，提取 src 屬性值
                        if (mapUrl && mapUrl.includes('<iframe')) {
                            const srcMatch = mapUrl.match(/src=["']([^"']+)["']/i);
                            if (srcMatch && srcMatch[1]) {
                                mapUrl = srcMatch[1];
                            } else {
                                mapUrl = '';
                            }
                        }
                        mapUrl = mapUrl.trim();
                        // 如果沒有 URL，使用預設或根據地址生成
                        if (!mapUrl) {
                            const address = property.address || '';
                            if (address) {
                                const encodedAddress = encodeURIComponent(address);
                                mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;
                            } else {
                                mapUrl = 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469';
                            }
                        }
                        return mapUrl;
                    })()}" 
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="eager" 
                            referrerpolicy="no-referrer-when-downgrade"
                            allow="accelerometer; gyroscope; geolocation">
                    </iframe>
                    `}
                </div>
                
                <!-- 地圖操作按鈕（🔒 地址隱藏時不提供 Maps/導航連結，避免完整地址經 href 外洩） -->
                <div class="map-buttons" style="padding: 20px 30px; background: #f8f9fa; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                    ${!property.hide_address_number ? `
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}" 
                       target="_blank" 
                       style="
                           background: linear-gradient(45deg, #4285f4, #34a853);
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
                        <i class="fas fa-external-link-alt"></i> 在 Google Maps 中開啟
                    </a>
                    <a href="https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(property.address)}" 
                       target="_blank" 
                       style="
                           background: linear-gradient(45deg, #ff6b6b, #ee5a24);
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
                        <i class="fas fa-route"></i> 規劃路線
                    </a>
                    ` : `
                    <p style="text-align: center; color: #666; font-size: 0.9rem; margin: 0;">地址已隱藏，如需確切位置請聯絡我們</p>
                    `}
                </div>
            </div>
        `;
        
        modal.className = 'modal';
        document.body.appendChild(modal);
        
        // 儲存到全域變數
        currentMapModal = modal;
        
        // ✅ 儲存 iframe HTML 到快取（首次載入後）
        if (!cachedIframe) {
            setTimeout(() => {
                const iframeContainer = document.getElementById(`map-iframe-container-${propertyId}`);
                if (iframeContainer) {
                    // 確保快取的 iframe 有正確的 allow 屬性
                    const iframe = iframeContainer.querySelector('iframe');
                    if (iframe && (!iframe.getAttribute('allow') || !iframe.getAttribute('allow').includes('accelerometer'))) {
                        iframe.setAttribute('allow', 'accelerometer; gyroscope; geolocation');
                    }
                    mapIframeCache.set(propertyId, iframeContainer.innerHTML);
                    console.log('💾 已快取地圖:', propertyId);
                }
            }, 1000);
        }
        
        // 點擊背景關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeMapModal();
            }
        });
        
        // ESC 鍵關閉
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeMapModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }
}

    window.closeMapModal = closeMapModal;
    window.showMapModal = showMapModal;
})();

