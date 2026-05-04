/**
 * 照片燈箱 - 從 main-script.js 抽出
 * 依賴：embeddedPropertiesData, window.currentPropertyModal (property-modals.js)
 */
(function() {
    "use strict";
    let currentLightbox = null;
    let touchStartX = 0;
    let touchStartY = 0;

// 關閉燈箱函數
function closeLightbox() {
    // 🔥 關閉所有燈箱實例
    if (currentLightbox) {
        currentLightbox.remove();
        currentLightbox = null;
    }
    
    // 移除所有遺留的燈箱元素
    const existingLightboxes = document.querySelectorAll('.lightbox-modal');
    existingLightboxes.forEach(lb => {
        lb.remove();
    });
    
    // 如果有詳細資訊彈窗被隱藏，重新顯示它
    if (window.currentPropertyModal && window.currentPropertyModal.style.display === 'none') {
        window.currentPropertyModal.style.display = 'flex';
    }
}

// 縮圖滾動功能
function scrollThumbnails(direction) {
    const thumbnailsContainer = document.querySelector('.thumbnails');
    if (thumbnailsContainer) {
        const scrollAmount = 200; // 每次滾動的距離
        if (direction === 'left') {
            thumbnailsContainer.scrollLeft -= scrollAmount;
        } else if (direction === 'right') {
            thumbnailsContainer.scrollLeft += scrollAmount;
        }
    }
}



// 處理觸控開始
function handleTouchStart(event, propertyId) {
    if (event.touches.length === 1) {
        touchStartX = event.touches[0].clientX;
        touchStartY = event.touches[0].clientY;
    }
}

// 處理觸控結束
function handleTouchEnd(event, propertyId) {
    if (event.changedTouches.length === 1) {
        const touchEndX = event.changedTouches[0].clientX;
        const touchEndY = event.changedTouches[0].clientY;
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        
        // 確保是水平滑動（水平距離大於垂直距離）
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
            const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
            if (!property || !property.images || !currentLightbox) return;
            
            const currentIndexElement = currentLightbox.querySelector('.current-image-index');
            if (!currentIndexElement) return;
            
            let currentIndex = parseInt(currentIndexElement.textContent.split('/')[0]) - 1;
            let newIndex;
            
            if (deltaX > 0) {
                // 向右滑動，顯示上一張
                newIndex = currentIndex - 1;
                if (newIndex < 0) {
                    newIndex = property.images.length - 1;
                }
            } else {
                // 向左滑動，顯示下一張
                newIndex = currentIndex + 1;
                if (newIndex >= property.images.length) {
                    newIndex = 0;
                }
            }
            
            updateLightboxImage(newIndex, propertyId);
        }
    }
}


// 切換主圖片（箭頭按鈕用）
function changeMainImage(direction, propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property || !property.images || !currentLightbox) return;
    
    const currentIndexElement = currentLightbox.querySelector('.current-image-index');
    if (!currentIndexElement) return;
    
    let currentIndex = parseInt(currentIndexElement.textContent.trim().split('/')[0].replace('照片', '').trim()) - 1;
    let newIndex = currentIndex + direction;
    
    // 循環切換
    if (newIndex < 0) {
        newIndex = property.images.length - 1;
    } else if (newIndex >= property.images.length) {
        newIndex = 0;
    }
    
    updateLightboxImage(newIndex, propertyId);
}

// 更新燈箱照片內容
function updateLightboxImage(newImageIndex, propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property && property.images && property.images[newImageIndex] && currentLightbox) {
        // 更新主照片
        const mainImage = currentLightbox.querySelector('img[alt="物件照片"]');
        if (mainImage) {
            mainImage.src = property.images[newImageIndex];
        }
        
        // 更新照片資訊
        const photoInfo = currentLightbox.querySelector('.current-image-index');
        if (photoInfo) {
            photoInfo.textContent = `照片 ${newImageIndex + 1} / ${property.images.length}`;
        }
        
        // 更新縮圖邊框樣式
        const thumbnails = currentLightbox.querySelectorAll('.thumbnails img');
        thumbnails.forEach((thumb, idx) => {
            if (idx === newImageIndex) {
                thumb.style.border = '2px solid #667eea';
            } else {
                thumb.style.border = '1px solid #ddd';
            }
        });
    }
}
// 照片燈箱功能
function openLightbox(imageIndex, propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property && property.images && property.images[imageIndex]) {
        // 🔥 先關閉所有現有的燈箱
        if (currentLightbox) {
            currentLightbox.remove();
            currentLightbox = null;
        }
        
        // 查找並移除所有 .lightbox-modal 元素（防止重複）
        const existingLightboxes = document.querySelectorAll('.lightbox-modal');
        existingLightboxes.forEach(lb => lb.remove());
        
        // 隱藏詳細資訊彈窗
        if (window.currentPropertyModal) {
            window.currentPropertyModal.style.display = 'none';
        }
        
        const modal = document.createElement('div');
        modal.className = 'lightbox-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            z-index: 10001;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            box-sizing: border-box;
        `;
        
        modal.innerHTML = `
            <div class="lightbox-content" style="
                position: relative;
                max-width: 100vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                align-items: center;
            ">
                <!-- 關閉按鈕 -->
                <button class="lightbox-close-btn" onclick="window.closeLightbox(); return false;" style="
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    color: white;
                    border: none;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 28px;
                    font-weight: bold;
                    z-index: 10002;
                    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    line-height: 1;
                    pointer-events: auto;
                ">×</button>
                
                <!-- 照片容器 -->
                <div class="lightbox-image-container" style="
                    background: white;
                    border-radius: 15px;
                    padding: 20px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
                    position: relative;
                    overflow: hidden;
                " onclick="event.stopPropagation();">
                    <!-- 左箭頭 -->
                    <button class="main-image-arrow-left" data-direction="-1" data-property-id="${propertyId}" style="
                        position: absolute;
                        left: 40px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        border: none;
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        cursor: pointer;
                        z-index: 10002;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                        transition: all 0.3s ease;
                        pointer-events: auto;
                    " onmouseover="this.style.background='rgba(0, 0, 0, 0.9)'; this.style.transform='translateY(-50%) scale(1.1)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.7)'; this.style.transform='translateY(-50%) scale(1)'">‹</button>
                    
                    <!-- 右箭頭 -->
                    <button class="main-image-arrow-right" data-direction="1" data-property-id="${propertyId}" style="
                        position: absolute;
                        right: 40px;
                        top: 50%;
                        transform: translateY(-50%);
                        background: rgba(0, 0, 0, 0.7);
                        color: white;
                        border: none;
                        width: 60px;
                        height: 60px;
                        border-radius: 50%;
                        cursor: pointer;
                        z-index: 10002;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 24px;
                        font-weight: bold;
                        box-shadow: 0 4px 15px rgba(0,0,0,0.4);
                        transition: all 0.3s ease;
                        pointer-events: auto;
                    " onmouseover="this.style.background='rgba(0, 0, 0, 0.9)'; this.style.transform='translateY(-50%) scale(1.1)'" onmouseout="this.style.background='rgba(0, 0, 0, 0.7)'; this.style.transform='translateY(-50%) scale(1)'">›</button>
                    
                    <img src="${property.images[imageIndex]}" 
                         alt="物件照片" 
                         loading="eager"
                         decoding="async"
                         style="
                             max-width: 80vw;
                             max-height: 70vh;
                             object-fit: contain;
                             border-radius: 10px;
                             box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                             touch-action: manipulation;
                             -webkit-user-select: none;
                             user-select: none;
                             pointer-events: auto;
                             z-index: 1;
                         "
                         onerror="this.style.border='2px solid #e74c3c'; this.alt='❌ 照片載入失敗'"
                         ondragstart="return false;"
                         ontouchstart="handleTouchStart(event, '${propertyId}')"
                         ontouchend="handleTouchEnd(event, '${propertyId}')"
                         onclick="event.stopPropagation();">
                </div>
                
                <!-- 照片資訊 -->
                <div style="
                    background: rgba(255,255,255,0.95);
                    color: #2c3e50;
                    padding: 15px 25px;
                    border-radius: 25px;
                    margin-top: 20px;
                    text-align: center;
                    backdrop-filter: blur(10px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.2);
                ">
                    <h3 style="margin: 0 0 5px 0; font-size: 1.2rem; font-weight: 700;">
                        ${property.title}
                    </h3>
                    <p class="current-image-index" style="margin: 0; opacity: 0.8; font-size: 0.9rem;">
                        照片 ${imageIndex + 1} / ${property.images.length}
                    </p>
                </div>
                
                
                <!-- 縮圖導航 -->
                ${property.images.length > 1 ? `
                <div style="margin-top: 15px; z-index: 10; position: relative;">
                    <div class="thumbnails" style="display: flex; gap: 8px; padding: 10px; background: rgba(255,255,255,0.9); border-radius: 10px; width: 100%; max-width: 100vw; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; justify-content: center; pointer-events: auto;">
                        ${property.images.map((img, idx) => `
                            <img src="${img}" 
                                 alt="縮圖 ${idx + 1}" 
                                 loading="lazy"
                                 onclick="updateLightboxImage(${idx}, '${propertyId}'); event.stopPropagation();"
                                 style="width: 50px; height: 38px; object-fit: cover; border-radius: 6px; cursor: pointer; border: ${idx === imageIndex ? '2px solid #667eea' : '1px solid #ddd'}; flex-shrink: 0; pointer-events: auto;"
                                 onmouseover="this.style.transform='scale(1.05)'" 
                                 onmouseout="this.style.transform='scale(1)'">
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        `;
        
        modal.className = 'modal';
        document.body.appendChild(modal);
        
        // 儲存到全域變數
        currentLightbox = modal;
        
        // 添加主圖片箭頭按鈕事件監聽器
        const leftArrow = modal.querySelector('.main-image-arrow-left');
        const rightArrow = modal.querySelector('.main-image-arrow-right');
        
        if (leftArrow) {
            leftArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const direction = parseInt(leftArrow.getAttribute('data-direction'));
                const propertyId = leftArrow.getAttribute('data-property-id');
                changeMainImage(direction, propertyId);
            });
        }
        
        if (rightArrow) {
            rightArrow.addEventListener('click', (e) => {
                e.stopPropagation();
                const direction = parseInt(rightArrow.getAttribute('data-direction'));
                const propertyId = rightArrow.getAttribute('data-property-id');
                changeMainImage(direction, propertyId);
            });
        }
        
        // 點擊背景關閉（在 innerHTML 設置後重新綁定）
        modal.addEventListener('click', (e) => {
            // 檢查是否點擊的是背景或關閉按鈕
            if (e.target === modal || 
                e.target.classList.contains('lightbox-modal') ||
                e.target.classList.contains('lightbox-close-btn') ||
                e.target.closest('.lightbox-close-btn')) {
                closeLightbox();
                return;
            }
            // 如果點擊的是內容區域，不關閉
            if (e.target.closest('.lightbox-content') || 
                e.target.closest('.lightbox-image-container')) {
                return;
            }
        });
        
        // 為關閉按鈕添加事件監聽器（立即綁定）
        const closeBtn = modal.querySelector('.lightbox-close-btn');
        if (closeBtn) {
            // 移除舊的事件監聽器並添加新的
            const closeHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeLightbox();
            };
            
            closeBtn.addEventListener('click', closeHandler, { capture: true });
            closeBtn.addEventListener('mousedown', closeHandler, { capture: true });
            closeBtn.addEventListener('touchend', closeHandler, { capture: true });
        }
        
        // ESC 鍵關閉
        const handleEsc = (e) => {
            if (e.key === 'Escape' || e.keyCode === 27) {
                closeLightbox();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
    }
}

    window.closeLightbox = closeLightbox;
    window.openLightbox = openLightbox;
    window.changeMainImage = changeMainImage;
    window.updateLightboxImage = updateLightboxImage;
    window.scrollThumbnails = scrollThumbnails;
    window.handleTouchStart = handleTouchStart;
    window.handleTouchEnd = handleTouchEnd;
})();

