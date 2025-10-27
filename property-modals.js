// 物件詳細彈窗與浮框功能模組
// ✅ v2.0 - 包含所有彈窗和浮框功能
// 提取自模組化.html，確保樣式100%相同

// 全域變數儲存當前彈窗
let currentPropertyModal = null;

// 顯示物件詳細資訊彈窗
function showPropertyDetails(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property) return;

    // 如果已經有彈窗，先關閉
    if (currentPropertyModal) {
        currentPropertyModal.remove();
    }

    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        z-index: 10000;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20px;
        box-sizing: border-box;
    `;
    
    modal.innerHTML = `
        <div style="
            background: #ffffff;
            border-radius: 15px;
            max-width: 100vw;
            max-height: 90vh;
            position: relative;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            overflow: hidden;
            display: flex;
            flex-direction: column;
        ">
            <!-- 關閉按鈕 -->
            <button onclick="closePropertyModal()" style="
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
                font-size: 18px;
                font-weight: bold;
                z-index: 10002;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            " onmouseover="this.style.background='#c0392b'" onmouseout="this.style.background='#e74c3c'">×</button>
            
            <!-- 標題區域 -->
            <div style="
                background: #667eea;
                color: white;
                padding: 15px 20px;
                position: relative;
            ">
                ${property.status && property.statusText ? `
                    <div class="modal-status-tag modal-status-${property.status}">
                        ${property.statusText}
                    </div>
                ` : ''}
                <h2 style="margin: 0; font-size: 1.3rem; font-weight: 600;">
                    🏠 ${property.title}
                </h2>
                <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 0.95rem;">
                    📍 ${property.address}
                </p>
            </div>
            
            <!-- 內容區域 -->
            <div style="padding: 10px 15px; flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; scrollbar-width: thin; scrollbar-color: #667eea #f1f1f1; min-height: 0; max-height: none;">
                <!-- 主要資訊卡片 -->
                <div class="main-info-grid" style="
                    display: flex;
                    gap: 0.3rem;
                    margin-bottom: 15px;
                ">
                    <div style="
                        flex: 1;
                        background: #667eea;
                        color: white;
                        padding: 0.4rem 0.2rem;
                        border-radius: 6px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">💰 售價</div>
                        <div style="font-size: 1rem; font-weight: 600;">${property.price}</div>
                    </div>
                    
                    <div style="
                        flex: 1;
                        background: #f093fb;
                        color: white;
                        padding: 0.4rem 0.2rem;
                        border-radius: 6px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">📐 坪數</div>
                        <div style="font-size: 1rem; font-weight: 600;">${property.total_area || '未設定'}</div>
                    </div>
                    
                    <div style="
                        flex: 1;
                        background: #4ecdc4;
                        color: white;
                        padding: 0.4rem 0.2rem;
                        border-radius: 6px;
                        text-align: center;
                    ">
                        <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">🏠 格局</div>
                        <div style="font-size: 1rem; font-weight: 600;">${property.layout || '未設定'}</div>
                    </div>
                </div>
                
                <!-- 詳細資訊 -->
                <div style="
                    background: #f8f9fa;
                    border-radius: 12px;
                    padding: 12px;
                    margin-bottom: 12px;
                    border-left: 4px solid #667eea;
                ">
                    <h3 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1rem; display: flex; align-items: center;">
                        <i class="fas fa-info-circle" style="margin-right: 6px; color: #667eea; font-size: 0.9rem;"></i>物件詳細資訊
                    </h3>
                    <div class="property-detail-grid" style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; font-size: 0.9rem;">
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">屋齡：</span>
                            <span style="color: #2c3e50; font-weight: 600;">${property.age || '未設定'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">樓層：</span>
                            <span style="color: #2c3e50; font-weight: 600;">${property.floor || '未設定'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">車位：</span>
                            <span style="color: #2c3e50; font-weight: 600;">${property.parking_type || '平面車位'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">類型：</span>
                            <span style="color: #2c3e50; font-weight: 600;">${property.type}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">座向：</span>
                            <span style="color: #2c3e50; font-weight: 600;">${property.orientation || '座北朝南'}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">學區交通：</span>
                            <span style="color: #667eea; font-weight: 600; cursor: pointer; text-decoration: underline;" 
                                  onclick="showTransportationDetails('${property.id}')" 
                                  onmouseover="this.style.color='#5a6fd8'" 
                                  onmouseout="this.style.color='#667eea'">查看詳情</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">權狀坪數：</span>
                            <span style="color: #667eea; font-weight: 600; cursor: pointer; text-decoration: underline;" 
                                  onclick="showAreaDetails('${property.id}')" 
                                  onmouseover="this.style.color='#5a6fd8'" 
                                  onmouseout="this.style.color='#667eea'">${property.total_area || '未設定'}</span>
                        </div>
                        ${(property.building_type && property.building_type.includes('別墅') && (property.land_area || property.land_share)) ? `
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">地坪：</span>
                            <span style="color: #e74c3c; font-weight: 600;">${property.land_area || property.land_share || '未設定'}</span>
                        </div>
                        ` : ''}
                        <div style="display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                            <span style="color: #666; font-weight: 500;">機能特色：</span>
                            <span style="color: #667eea; font-weight: 600; cursor: pointer; text-decoration: underline;" 
                                  onclick="showFeaturesDetails('${property.id}')" 
                                  onmouseover="this.style.color='#5a6fd8'" 
                                  onmouseout="this.style.color='#667eea'">
                                ${property.features && property.features.length > 0 ? property.features.length + '項特色' : '查看特色'}
                            </span>
                        </div>
                    </div>
                </div>
                
                <!-- 照片預覽 -->
                <div style="margin-bottom: 15px;">
                    <h3 style="margin: 0 0 12px 0; color: #2c3e50; font-size: 1.1rem; display: flex; align-items: center;">
                        <i class="fas fa-images" style="margin-right: 8px; color: #667eea;"></i>物件照片
                    </h3>
                    <div style="
                        display: flex;
                        gap: 10px;
                        overflow-x: auto;
                        padding: 10px 0;
                        -webkit-overflow-scrolling: touch;
                    ">
                        ${property.images.slice(0, 6).map(img => `
                            <img src="${img}" 
                                 alt="物件照片" 
                                 loading="lazy"
                                 style="
                                     width: 80px;
                                     height: 60px;
                                     object-fit: cover;
                                     border-radius: 8px;
                                     cursor: pointer;
                                     box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                     transition: transform 0.3s ease;
                                 "
                                 onmouseover="this.style.transform='scale(1.05)'"
                                 onmouseout="this.style.transform='scale(1)'"
                                 onclick="openLightbox(${property.images.indexOf(img)}, '${property.id}');">
                        `).join('')}
                        ${property.images.length > 6 ? `
                            <div style="
                                width: 80px;
                                height: 60px;
                                background: linear-gradient(135deg, #667eea, #764ba2);
                                color: white;
                                border-radius: 8px;
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                font-size: 0.8rem;
                                font-weight: 600;
                                cursor: pointer;
                                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                            " onclick="openLightbox(0, '${property.id}');">
                                +${property.images.length - 6}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- 聯絡按鈕 -->
                <div style="
                    display: flex;
                    gap: 15px;
                    margin-top: 25px;
                ">
                    <a href="tel:0925666597" style="
                        background: linear-gradient(45deg, #667eea, #764ba2);
                        color: white;
                        text-decoration: none;
                        padding: 12px 20px;
                        border-radius: 25px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
                        flex: 1;
                        justify-content: center;
                        font-size: 0.9rem;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <i class="fas fa-phone"></i> 立即來電
                    </a>
                    <a href="https://line.me/R/ti/p/@931aeinu" target="_blank" style="
                        background: linear-gradient(45deg, #00c851, #00a085);
                        color: white;
                        text-decoration: none;
                        padding: 12px 20px;
                        border-radius: 25px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.3s ease;
                        box-shadow: 0 4px 15px rgba(0, 200, 81, 0.3);
                        flex: 1;
                        justify-content: center;
                        font-size: 0.9rem;
                    " onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform='translateY(0)'">
                        <i class="fab fa-line"></i> LINE諮詢
                    </a>
                </div>
            </div>
        </div>
    `;
    
    modal.className = 'modal';
    modal.id = 'propertyModal';
    currentPropertyModal = modal;
    document.body.appendChild(modal);
    
    // 點擊背景關閉
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePropertyModal();
        }
    });
    
    // ESC 鍵關閉
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            closePropertyModal();
            document.removeEventListener('keydown', handleEsc);
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 關閉物件詳細資訊彈窗
function closePropertyModal() {
    if (currentPropertyModal) {
        currentPropertyModal.remove();
        currentPropertyModal = null;
    }
}

// 顯示學區交通詳細資訊浮框
function showTransportationDetails(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property) return;

    const existingTooltip = document.getElementById('transportation-details-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
        return;
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'transportation-details-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid #667eea;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        z-index: 10001;
        max-width: 700px;
        width: 90vw;
        max-height: 80vh;
        font-size: 0.9rem;
        overflow: hidden;
    `;

    const clickedElement = event.target;
    
    if (window.innerWidth <= 768) {
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.maxWidth = '95vw';
        tooltip.style.maxHeight = '85vh';
        tooltip.style.width = '95vw';
    } else {
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.width = 'auto';
        tooltip.style.maxWidth = '600px';
        tooltip.style.minWidth = '400px';
        tooltip.style.maxHeight = '70vh';
    }

    const transportation = property.transportation || {};
    const schools = property.transportation?.schools || property.schools || {};
    const facilities = property.facilities || {};
    const parks = property.parks || [];
    
    let facilitiesItems = [];
    if (typeof facilities === 'object' && !Array.isArray(facilities)) {
        if (facilities.shopping_district) facilitiesItems.push(facilities.shopping_district);
        if (facilities.supermarket) facilitiesItems.push(facilities.supermarket);
        if (facilities.market) facilitiesItems.push(facilities.market);
        if (facilities.restaurants && Array.isArray(facilities.restaurants)) {
            facilitiesItems = facilitiesItems.concat(facilities.restaurants);
        }
    } else if (Array.isArray(facilities)) {
        facilitiesItems = facilities;
    } else if (transportation.facilities && Array.isArray(transportation.facilities)) {
        facilitiesItems = transportation.facilities;
    }
    
    const facilitiesList = facilitiesItems.length > 0
        ? facilitiesItems.map(facility => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: rgba(46, 204, 113, 0.05); border-radius: 6px; border-left: 3px solid #2ecc71;">
                <span style="color: #2ecc71; font-size: 1rem;">🏢</span>
                <span style="color: #2c3e50; font-weight: 500;">${facility}</span>
            </div>
        `).join('')
        : '<div style="text-align: center; color: #666; padding: 10px;">暫無設施資訊</div>';

    let transportItems = [];
    if (typeof transportation === 'object') {
        if (transportation.train_station) transportItems.push(transportation.train_station);
        if (transportation.highway) transportItems.push(transportation.highway);
        if (transportation.main_roads && Array.isArray(transportation.main_roads)) {
            transportItems = transportItems.concat(transportation.main_roads.map(road => road));
        }
        if (transportation.transport && Array.isArray(transportation.transport)) {
            transportItems = transportItems.concat(transportation.transport);
        }
    }
    
    const transportList = transportItems.length > 0
        ? transportItems.map(trans => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: rgba(52, 152, 219, 0.05); border-radius: 6px; border-left: 3px solid #3498db;">
                <span style="color: #3498db; font-size: 1rem;">🚗</span>
                <span style="color: #2c3e50; font-weight: 500;">${trans}</span>
            </div>
        `).join('')
        : '<div style="text-align: center; color: #666; padding: 10px;">暫無交通資訊</div>';

    let schoolsItems = [];
    if (typeof schools === 'object' && !Array.isArray(schools)) {
        if (schools.elementary) schoolsItems.push(`國小：${schools.elementary}`);
        if (schools.junior_high) schoolsItems.push(`國中：${schools.junior_high}`);
    } else if (Array.isArray(schools)) {
        schoolsItems = schools;
    } else if (transportation.schools && Array.isArray(transportation.schools)) {
        schoolsItems = transportation.schools;
    }
    
    // 調試：確保學區資料正確獲取
    console.log('🔍 學區資料調試:', {
        schools: schools,
        transportation_schools: transportation.schools,
        schoolsItems: schoolsItems
    });
    
    const schoolsList = schoolsItems.length > 0
        ? schoolsItems.map(school => `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: rgba(155, 89, 182, 0.05); border-radius: 6px; border-left: 3px solid #9b59b6;">
                <span style="color: #9b59b6; font-size: 1rem;">🎓</span>
                <span style="color: #2c3e50; font-weight: 500;">${school}</span>
            </div>
        `).join('')
        : '<div style="text-align: center; color: #666; padding: 10px;">暫無學校資訊</div>';

    const marketInfo = typeof facilities === 'object' ? facilities.market : (transportation.market || '');
    const parkInfo = Array.isArray(parks) && parks.length > 0 ? parks.join('、') : (transportation.park || '');
    
    const marketPark = `
        ${marketInfo ? `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: rgba(230, 126, 34, 0.05); border-radius: 6px; border-left: 3px solid #e67e22;">
                <span style="color: #e67e22; font-size: 1rem;">🛒</span>
                <span style="color: #2c3e50; font-weight: 500;">${marketInfo}</span>
            </div>
        ` : ''}
        ${parkInfo ? `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding: 6px 10px; background: rgba(39, 174, 96, 0.05); border-radius: 6px; border-left: 3px solid #27ae60;">
                <span style="color: #27ae60; font-size: 1rem;">🌳</span>
                <span style="color: #2c3e50; font-weight: 500;">${parkInfo}</span>
            </div>
        ` : ''}
        ${!marketInfo && !parkInfo ? '<div style="text-align: center; color: #666; padding: 10px;">暫無市場/公園資訊</div>' : ''}
    `;

    tooltip.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
        " onclick="closeTransportationTooltip()">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.1rem;">🚌</span>
                <span style="font-weight: 600;">學區交通環境</span>
            </div>
        </div>
        <div style="padding: 15px; line-height: 1.4; cursor: pointer; max-height: calc(80vh - 60px); overflow-y: auto;" onclick="closeTransportationTooltip()">
            <div style="margin-bottom: 15px; color: #2c3e50; font-weight: 600; font-size: 0.95rem; text-align: center; padding-bottom: 10px; border-bottom: 2px solid #667eea;">
                ${property.title}
            </div>
            
            <div style="display: grid; grid-template-columns: ${window.innerWidth <= 768 ? '1fr' : '1fr 1fr'}; gap: 20px;">
                <div>
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: #2ecc71; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <span>🏢</span> 鄰近明顯設施
                        </h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${facilitiesList}
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #3498db; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <span>🚗</span> 交通
                        </h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${transportList}
                        </div>
                    </div>
                </div>
                
                <div>
                    <div style="margin-bottom: 15px;">
                        <h4 style="margin: 0 0 10px 0; color: #9b59b6; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <span>🎓</span> 學校
                        </h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${schoolsList}
                        </div>
                    </div>
                    
                    <div>
                        <h4 style="margin: 0 0 10px 0; color: #e67e22; font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 5px;">
                            <span>🛒</span> 市場 & <span>🌳</span> 公園
                        </h4>
                        <div style="max-height: 200px; overflow-y: auto;">
                            ${marketPark}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    window.closeTransportationTooltip = function() {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
        document.removeEventListener('scroll', closeTooltip);
        delete window.closeTransportationTooltip;
    };

    document.body.appendChild(tooltip);

    const closeTooltip = (e) => {
        if (!tooltip.contains(e.target) && e.target !== clickedElement) {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
            document.removeEventListener('scroll', closeTooltip);
            delete window.closeTransportationTooltip;
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeTooltip);
        document.addEventListener('scroll', closeTooltip, true);
    }, 100);
}

// 顯示權狀坪數詳細資訊浮框
function showAreaDetails(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property) return;

    const existingTooltip = document.getElementById('area-details-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
        return;
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'area-details-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid #667eea;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        z-index: 10001;
        max-width: 320px;
        font-size: 0.9rem;
        overflow: hidden;
    `;

    const clickedElement = event.target;
    const rect = clickedElement.getBoundingClientRect();
    
    if (window.innerWidth <= 768) {
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.maxWidth = '90vw';
        tooltip.style.maxHeight = '80vh';
    } else {
        const tooltipX = rect.left + rect.width / 2 - 160;
        const tooltipY = rect.top - 15;
        tooltip.style.left = Math.max(10, tooltipX) + 'px';
        tooltip.style.top = Math.max(10, tooltipY) + 'px';
    }

    tooltip.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
        " onclick="closeAreaTooltip()">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.1rem;">📐</span>
                <span style="font-weight: 600;">坪數詳細資訊</span>
            </div>
        </div>
        <div style="padding: 15px; line-height: 1.4; cursor: pointer;" onclick="closeAreaTooltip()">
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">主建物：</span>
                <span style="color: #2c3e50; font-weight: 600;">${property.main_area || '未設定'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">附屬建物：</span>
                <span style="color: #2c3e50; font-weight: 600;">${property.auxiliary_area || '未設定'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">車位坪數：</span>
                <span style="color: #2c3e50; font-weight: 600;">${property.parking_area || '未設定'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">公設：</span>
                <span style="color: #2c3e50; font-weight: 600;">${property.common_area || '未設定'}</span>
            </div>
            ${(property.land_area || property.land_share) ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">地坪：</span>
                <span style="color: #e74c3c; font-weight: 600;">${property.land_area || property.land_share || '未設定'}</span>
            </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-bottom: 8px; padding: 6px 0; border-bottom: 1px solid #e9ecef;">
                <span style="color: #666; font-weight: 500;">車位編號：</span>
                <span style="color: #2c3e50; font-weight: 600;">${property.parking_space || '未設定'}</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0; padding: 6px 0; background: rgba(102, 126, 234, 0.05); border-radius: 4px; padding: 8px;">
                <span style="color: #666; font-weight: 500;">管理費：</span>
                <span style="color: #e74c3c; font-weight: 600;">${property.management_fee || '未設定'}</span>
            </div>
        </div>
    `;

    window.closeAreaTooltip = function() {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
        document.removeEventListener('scroll', closeTooltip);
        delete window.closeAreaTooltip;
    };

    document.body.appendChild(tooltip);

    const closeTooltip = (e) => {
        if (!tooltip.contains(e.target) && e.target !== clickedElement) {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
            document.removeEventListener('scroll', closeTooltip);
            delete window.closeAreaTooltip;
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeTooltip);
        document.addEventListener('scroll', closeTooltip, true);
    }, 100);
}

// 顯示機能特色詳細資訊浮框
function showFeaturesDetails(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (!property) return;

    const existingTooltip = document.getElementById('features-details-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
        return;
    }

    const tooltip = document.createElement('div');
    tooltip.id = 'features-details-tooltip';
    tooltip.style.cssText = `
        position: fixed;
        background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        border: 2px solid #667eea;
        border-radius: 15px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.25);
        z-index: 10001;
        max-width: 400px;
        font-size: 0.9rem;
        overflow: hidden;
    `;

    const clickedElement = event.target;
    const rect = clickedElement.getBoundingClientRect();
    
    if (window.innerWidth <= 768) {
        tooltip.style.left = '50%';
        tooltip.style.top = '50%';
        tooltip.style.transform = 'translate(-50%, -50%)';
        tooltip.style.maxWidth = '90vw';
        tooltip.style.maxHeight = '80vh';
    } else {
        const tooltipX = rect.left + rect.width / 2 - 200;
        const tooltipY = rect.top - 15;
        tooltip.style.left = Math.max(10, tooltipX) + 'px';
        tooltip.style.top = Math.max(10, tooltipY) + 'px';
    }

    const featuresList = property.features && property.features.length > 0 
        ? property.features.map(feature => `
            <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 10px; padding: 8px; background: rgba(102, 126, 234, 0.05); border-radius: 8px; border-left: 3px solid #667eea;">
                <span style="color: #667eea; font-size: 1.1rem; margin-top: 2px;">✨</span>
                <span style="color: #2c3e50; font-weight: 500; line-height: 1.4;">${feature}</span>
            </div>
        `).join('')
        : '<div style="text-align: center; color: #666; padding: 20px;">暫無特色資訊</div>';

    tooltip.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 15px 20px;
            text-align: center;
            cursor: pointer;
        " onclick="closeFeaturesTooltip()">
            <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
                <span style="font-size: 1.1rem;">🏠</span>
                <span style="font-weight: 600;">物件機能特色</span>
            </div>
        </div>
        <div style="padding: 15px; line-height: 1.4; cursor: pointer; max-height: 400px; overflow-y: auto;" onclick="closeFeaturesTooltip()">
            <div style="margin-bottom: 10px; color: #2c3e50; font-weight: 600; font-size: 0.95rem; text-align: center; padding-bottom: 10px; border-bottom: 1px solid #e9ecef;">
                ${property.title}
            </div>
            ${featuresList}
        </div>
    `;

    window.closeFeaturesTooltip = function() {
        tooltip.remove();
        document.removeEventListener('click', closeTooltip);
        document.removeEventListener('scroll', closeTooltip);
        delete window.closeFeaturesTooltip;
    };

    document.body.appendChild(tooltip);

    const closeTooltip = (e) => {
        if (!tooltip.contains(e.target) && e.target !== clickedElement) {
            tooltip.remove();
            document.removeEventListener('click', closeTooltip);
            document.removeEventListener('scroll', closeTooltip);
            delete window.closeFeaturesTooltip;
        }
    };

    setTimeout(() => {
        document.addEventListener('click', closeTooltip);
        document.addEventListener('scroll', closeTooltip, true);
    }, 100);
}

// 匯出函數供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showPropertyDetails,
        closePropertyModal,
        showTransportationDetails,
        showAreaDetails,
        showFeaturesDetails
    };
}

