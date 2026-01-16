// 地圖模組 - 從模組化.html提取
// 包含地圖彈窗相關功能

// 地圖彈窗功能
function showMapModal(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property) {
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
                        📍 ${property.address}
                    </p>
                </div>
                
                <!-- 地圖容器 -->
                <div class="map-container" style="width: 100%; height: 30vh; min-height: 300px;">
                    <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" 
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="lazy" 
                            referrerpolicy="no-referrer-when-downgrade">
                    </iframe>
                </div>
                
                <!-- 地圖操作按鈕 -->
                <div class="map-buttons" style="padding: 20px 30px; background: #f8f9fa; display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
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
                </div>
            </div>
        `;
        
        modal.className = 'modal';
        document.body.appendChild(modal);
        
        // 儲存到全域變數
        currentMapModal = modal;
        
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

// 關閉地圖彈窗函數
function closeMapModal() {
    if (currentMapModal) {
        currentMapModal.remove();
        currentMapModal = null;
    }
}
