// 主要腳本模組
// ✅ v2.0 - 模組化版本
// 包含：照片燈箱、地圖彈窗、貸款試算、工具函數、初始化邏輯

// 自動調整標題字體大小避免換行
function adjustTitleFontSize() {
    const titles = document.querySelectorAll('.property-title');
    const screenWidth = window.innerWidth;
    
    titles.forEach(title => {
        // 根據螢幕尺寸設定不同的初始字體大小
        let fontSize;
        if (screenWidth <= 480) {
            fontSize = 0.85; // 超小螢幕
        } else if (screenWidth <= 768) {
            fontSize = 0.9; // 手機
        } else if (screenWidth <= 1024) {
            fontSize = 0.9; // 平板
        } else {
            fontSize = 0.95; // 桌面
        }
        
        title.style.fontSize = fontSize + 'rem';
        
        // 檢查是否需要調整字體大小
        const minFontSize = screenWidth <= 480 ? 0.65 : 0.7;
        while (title.scrollWidth > title.clientWidth && fontSize > minFontSize) {
            fontSize -= 0.05;
            title.style.fontSize = fontSize + 'rem';
        }
    });
}

// 監聽視窗大小變化
window.addEventListener('resize', () => {
    setTimeout(() => {
        adjustTitleFontSize();
    }, 100);
});

// 優化的物件資料結構


// 全域變數儲存當前彈窗
let currentLightbox = null;
let currentMapModal = null;
// currentPropertyModal 在 property-modals.js 中聲明
let currentLoanCalculator = null;

// ✅ 地圖 iframe 快取
const mapIframeCache = new Map();

// 關閉燈箱函數
function closeLightbox() {
    if (currentLightbox) {
        currentLightbox.remove();
        currentLightbox = null;
        
        // 如果有詳細資訊彈窗被隱藏，重新顯示它
        if (currentPropertyModal && currentPropertyModal.style.display === 'none') {
            currentPropertyModal.style.display = 'flex';
        }
    }
}

// 關閉地圖彈窗函數
function closeMapModal() {
    if (currentMapModal) {
        currentMapModal.remove();
        currentMapModal = null;
    }
}

// 貸款試算功能
function showLoanCalculator(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property) {
        // 提取價格數字（移除"萬"字）
        const priceMatch = property.price.match(/(\d+(?:,\d+)*)/);
        const propertyPrice = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : 896;
        
        // 設定房屋總價
        document.getElementById('modalHousePrice').value = propertyPrice;
        
        // 顯示彈窗
        document.getElementById('loanModal').style.display = 'block';
        
        // 重新綁定滑桿事件
        setTimeout(() => {
            bindSliderEvents();
            bindInputEvents();
            calculateModalLoan();
        }, 100);
    }
}

// 關閉貸款試算彈窗
function closeLoanModal() {
    document.getElementById('loanModal').style.display = 'none';
}

// 滑桿值更新
function bindSliderEvents() {
    const loanRatioSlider = document.getElementById('modalLoanRatio');
    const loanYearsSlider = document.getElementById('modalLoanYears');
    const interestRateSlider = document.getElementById('modalInterestRate');
    const agentFeeSlider = document.getElementById('modalAgentFee');
    
    if (loanRatioSlider) {
        loanRatioSlider.addEventListener('input', function() {
            document.getElementById('modalLoanRatioValue').textContent = this.value + '%';
            calculateModalLoan();
        });
    }
    
    if (loanYearsSlider) {
        loanYearsSlider.addEventListener('input', function() {
            document.getElementById('modalLoanYearsValue').textContent = this.value + '年';
            calculateModalLoan();
        });
    }
    
    if (interestRateSlider) {
        interestRateSlider.addEventListener('input', function() {
            document.getElementById('modalInterestRateValue').textContent = this.value + '%';
            calculateModalLoan();
        });
    }
    
    if (agentFeeSlider) {
        agentFeeSlider.addEventListener('input', function() {
            document.getElementById('modalAgentFeeValue').textContent = this.value + '%';
            calculateModalLoan();
        });
    }
}

// 綁定輸入框事件
function bindInputEvents() {
    const inputs = ['modalHousePrice', 'modalServiceFee', 'modalNotaryFee', 'modalMonthlyIncome', 'modalOtherExpenses'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('input', calculateModalLoan);
        }
    });
    
    const selects = ['modalExistingLoan', 'modalGracePeriod', 'modalRepaymentType'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.addEventListener('change', calculateModalLoan);
        }
    });
}

// 調整貸款條件
function adjustLoanConditions() {
    const existingLoan = document.getElementById('modalExistingLoan').value;
    const loanRatioSlider = document.getElementById('modalLoanRatio');
    const gracePeriodSelect = document.getElementById('modalGracePeriod');
    const interestRateSlider = document.getElementById('modalInterestRate');
    
    if (existingLoan === 'existing') {
        // 第二戶貸款：限制貸款成數50%，取消寬限期
        loanRatioSlider.max = 50;
        loanRatioSlider.value = Math.min(loanRatioSlider.value, 50);
        document.getElementById('modalLoanRatioValue').textContent = loanRatioSlider.value + '%';
        
        gracePeriodSelect.value = '0';
        
        interestRateSlider.min = 1.5;
        interestRateSlider.max = 5;
        interestRateSlider.value = Math.max(interestRateSlider.value, 1.5);
        document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
        
    } else if (existingLoan === 'youth') {
        // 新青安貸款：限制1000萬額度，優惠利率，5年寬限期
        loanRatioSlider.max = 80;
        loanRatioSlider.value = Math.min(loanRatioSlider.value, 80);
        document.getElementById('modalLoanRatioValue').textContent = loanRatioSlider.value + '%';
        
        gracePeriodSelect.value = '5';
        
        interestRateSlider.min = 1.2;
        interestRateSlider.max = 2.0;
        interestRateSlider.value = 1.8;
        document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
        
    } else {
        // 首購：恢復正常條件
        loanRatioSlider.max = 85;
        loanRatioSlider.value = Math.min(loanRatioSlider.value, 85);
        document.getElementById('modalLoanRatioValue').textContent = loanRatioSlider.value + '%';
        
        gracePeriodSelect.value = '5';
        
        interestRateSlider.min = 1.5;
        interestRateSlider.max = 5;
        interestRateSlider.value = Math.max(interestRateSlider.value, 1.5);
        document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
    }
    
    calculateModalLoan();
}

// 貸款試算計算功能
function calculateModalLoan() {
    const housePrice = parseFloat(document.getElementById('modalHousePrice').value) * 10000;
    const loanRatio = parseFloat(document.getElementById('modalLoanRatio').value) / 100;
    const loanYears = parseInt(document.getElementById('modalLoanYears').value);
    const interestRate = parseFloat(document.getElementById('modalInterestRate').value) / 100;
    const gracePeriod = parseInt(document.getElementById('modalGracePeriod').value) || 0;
    const serviceFee = parseFloat(document.getElementById('modalServiceFee').value) || 0;
    const notaryFee = parseFloat(document.getElementById('modalNotaryFee').value) || 0;
    const agentFeeRate = parseFloat(document.getElementById('modalAgentFee').value) || 0;
    const agentFee = housePrice * (agentFeeRate / 100);
    const repaymentType = document.getElementById('modalRepaymentType').value;
    const monthlyIncome = parseFloat(document.getElementById('modalMonthlyIncome').value) * 10000 || 0;
    const otherExpenses = parseFloat(document.getElementById('modalOtherExpenses').value) * 10000 || 0;
    const existingLoan = document.getElementById('modalExistingLoan').value;
    
    if (!housePrice || housePrice <= 0) {
        return;
    }
    
    // 基本計算
    const loanAmount = housePrice * loanRatio;
    const downPayment = housePrice - loanAmount;
    
    // 新青安混合貸款計算
    let youthLoanAmount = 0;
    let normalLoanAmount = 0;
    let youthInterestRate = interestRate;
    let normalInterestRate = interestRate;
    
    if (existingLoan === 'youth') {
        youthLoanAmount = Math.min(loanAmount, 10000000);
        normalLoanAmount = Math.max(0, loanAmount - 10000000);
        youthInterestRate = 1.8 / 100;
        normalInterestRate = 2.8 / 100;
    }
    
    // 貸款計算
    const totalMonths = loanYears * 12;
    const graceMonths = gracePeriod * 12;
    const remainingMonths = totalMonths - graceMonths;
    
    // 計算月付金額
    let gracePayment = 0;
    let normalPayment = 0;
    
    if (existingLoan === 'youth' && youthLoanAmount > 0) {
        // 新青安混合貸款
        const youthMonthlyRate = youthInterestRate / 12;
        const normalMonthlyRate = normalInterestRate / 12;
        
        gracePayment = (youthLoanAmount * youthMonthlyRate) + (normalLoanAmount * normalMonthlyRate);
        
        if (remainingMonths > 0) {
            const youthNormalPayment = youthLoanAmount * youthMonthlyRate * Math.pow(1 + youthMonthlyRate, remainingMonths) / 
                                     (Math.pow(1 + youthMonthlyRate, remainingMonths) - 1);
            const normalNormalPayment = normalLoanAmount > 0 ? 
                normalLoanAmount * normalMonthlyRate * Math.pow(1 + normalMonthlyRate, remainingMonths) / 
                (Math.pow(1 + normalMonthlyRate, remainingMonths) - 1) : 0;
            normalPayment = youthNormalPayment + normalNormalPayment;
        }
    } else {
        // 一般貸款
        const monthlyRate = interestRate / 12;
        gracePayment = loanAmount * monthlyRate;
        
        if (remainingMonths > 0) {
            if (repaymentType === 'equal_payment') {
                normalPayment = loanAmount * monthlyRate * Math.pow(1 + monthlyRate, remainingMonths) / 
                              (Math.pow(1 + monthlyRate, remainingMonths) - 1);
            } else {
                // 等額本金
                const principalPayment = loanAmount / remainingMonths;
                normalPayment = principalPayment + (loanAmount * monthlyRate);
            }
        }
    }
    
    // 計算總費用
    const totalFees = serviceFee + notaryFee + agentFee;
    const totalCost = downPayment + totalFees;
    
    // 計算負擔比
    const currentPayment = gracePeriod > 0 ? gracePayment : normalPayment;
    const availableIncome = monthlyIncome - otherExpenses;
    const debtRatio = availableIncome > 0 ? (currentPayment / availableIncome) * 100 : 0;
    
    // 生成結果 HTML
    let resultsHTML = `
        <div class="loan-result-card">
            <div class="loan-result-title">💰 貸款資訊</div>
            <div class="loan-result-grid">
                <div>房屋總價：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(housePrice / 10000)}萬</div>
                <div>貸款金額：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(loanAmount / 10000)}萬</div>
                <div>自備款：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(downPayment / 10000)}萬</div>
            </div>
        </div>
        
        <div class="loan-result-card">
            <div class="loan-result-title">📅 還款計劃</div>
            <div class="loan-result-grid">
                <div>${gracePeriod > 0 ? `寬限期${gracePeriod}年：` : '每月還款：'}</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(currentPayment).toLocaleString()}元</div>
                ${gracePeriod > 0 ? `
                <div>正常還款：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(normalPayment).toLocaleString()}元</div>
                ` : ''}
            </div>
        </div>
        
        <div class="loan-result-card">
            <div class="loan-result-title">💸 買方費用</div>
            <div class="loan-result-grid">
                <div>代書費+契稅：</div>
                <div style="color: #10b981; font-weight: bold;">${serviceFee.toLocaleString()}元</div>
                <div>代書潤筆費：</div>
                <div style="color: #10b981; font-weight: bold;">${notaryFee.toLocaleString()}元</div>
                <div>仲介費：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(agentFee).toLocaleString()}元</div>
                <div>總費用：</div>
                <div style="color: #e74c3c; font-weight: bold;">${totalFees.toLocaleString()}元</div>
            </div>
        </div>
        
        <div class="loan-result-card">
            <div class="loan-result-title">📊 負擔評估</div>
            <div class="loan-result-grid">
                <div>月收入：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(monthlyIncome / 10000)}萬元</div>
                <div>其他支出：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(otherExpenses / 10000)}萬元</div>
                <div>可用資金：</div>
                <div style="color: #10b981; font-weight: bold;">${Math.round(availableIncome / 10000)}萬元</div>
                <div>房貸占比：</div>
                <div style="color: ${debtRatio <= 30 ? '#27ae60' : debtRatio <= 40 ? '#f39c12' : '#e74c3c'}; font-weight: bold;">${debtRatio.toFixed(1)}%</div>
            </div>
        </div>
        
        <div class="loan-result-highlight">
            <h3>建議評估</h3>
            <div style="font-size: 0.9rem;">
                ${debtRatio <= 30 ? '房貸負擔合理，建議可考慮此物件' : 
                  debtRatio <= 40 ? '房貸負擔較重，建議謹慎評估' : 
                  '房貸負擔過重，建議重新考慮'}
            </div>
            <div class="amount">
                總準備金：${Math.round(totalCost / 10000)}萬元
            </div>
        </div>
    `;
    
    document.getElementById('modalLoanResults').innerHTML = resultsHTML;
}

// 點擊背景關閉彈窗
window.onclick = function(event) {
    const loanModal = document.getElementById('loanModal');
    if (event.target === loanModal) {
        closeLoanModal();
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

// 觸控手勢變數
let touchStartX = 0;
let touchStartY = 0;

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
        // 隱藏詳細資訊彈窗
        if (currentPropertyModal) {
            currentPropertyModal.style.display = 'none';
        }
        
        const modal = document.createElement('div');
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
            <div style="
                position: relative;
                max-width: 100vw;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                align-items: center;
            ">
                <!-- 關閉按鈕 -->
                <button onclick="closeLightbox()" style="
                    position: absolute;
                    top: -50px;
                    right: 0;
                    background: linear-gradient(45deg, #e74c3c, #c0392b);
                    color: white;
                    border: none;
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    cursor: pointer;
                    font-size: 20px;
                    font-weight: bold;
                    z-index: 10001;
                    box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
                    transition: all 0.3s ease;
                " onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">×</button>
                
                <!-- 照片容器 -->
                <div style="
                    background: white;
                    border-radius: 15px;
                    padding: 20px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.4);
                    position: relative;
                    overflow: hidden;
                ">
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
        
        // 點擊背景關閉
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeLightbox();
            }
        });
        
        // ESC 鍵關閉
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeLightbox();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
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
                        📍 ${property.address}
                    </p>
                </div>
                
                <!-- 地圖容器（✅ 快取優化） -->
                <div id="map-iframe-container-${propertyId}" class="map-container" style="width: 100%; height: 30vh; min-height: 300px;">
                    ${cachedIframe ? cachedIframe : `
                    <iframe src="${property.google_maps || 'https://www.google.com/maps/embed?pb=!4v1758635508112!6m8!1m7!1sTcuziJwB6dHCbFzTFsQVIw!2m2!1d24.90580115978875!2d121.1774002660474!3f281.776500634199!4f24.362884434893175!5f0.7820865974627469'}" 
                            width="100%" 
                            height="100%" 
                            style="border:0;" 
                            allowfullscreen="" 
                            loading="eager" 
                            referrerpolicy="no-referrer-when-downgrade"
                            allow="">
                    </iframe>
                    `}
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
        
        // ✅ 儲存 iframe HTML 到快取（首次載入後）
        if (!cachedIframe) {
            setTimeout(() => {
                const iframeContainer = document.getElementById(`map-iframe-container-${propertyId}`);
                if (iframeContainer) {
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

// F5 鍵處理 - 確保在當前頁面刷新
document.addEventListener('keydown', function(e) {
    // F5 鍵的 keyCode 是 116
    if (e.keyCode === 116 || e.key === 'F5') {
        e.preventDefault();
        location.reload();
    }
});

// 初始化系統
let embeddedPaginationSystem;
document.addEventListener('DOMContentLoaded', function() {
    embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
    
    // 客戶見證輪播功能
    let currentTestimonialIndex = 0;
    const testimonialSlides = document.getElementById('testimonialSlides');
    const testimonialPrev = document.getElementById('testimonialPrev');
    const testimonialNext = document.getElementById('testimonialNext');
    const totalTestimonials = document.querySelectorAll('.testimonial-slide').length;

    function updateTestimonialCarousel() {
        if (testimonialSlides) {
            testimonialSlides.style.transform = `translateX(-${currentTestimonialIndex * 100}%)`;
        }
    }

    if (testimonialPrev) {
        testimonialPrev.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex > 0 ? currentTestimonialIndex - 1 : totalTestimonials - 1;
            updateTestimonialCarousel();
        });
    }

    if (testimonialNext) {
        testimonialNext.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        });
    }

    // 自動播放客戶見證
    setInterval(() => {
        if (totalTestimonials > 1) {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        }
    }, 5000);
    
    // 房產資訊參考下拉選單功能
    const propertyInfoDropdown = document.getElementById('propertyInfoDropdown');
    const propertyInfoMenu = document.getElementById('propertyInfoMenu');
    
    if (propertyInfoDropdown && propertyInfoMenu) {
        propertyInfoDropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = propertyInfoMenu.style.display === 'block';
            propertyInfoMenu.style.display = isVisible ? 'none' : 'block';
            
            // 更新箭頭方向
            const arrow = propertyInfoDropdown.querySelector('span');
            if (arrow) {
                arrow.textContent = isVisible ? '▼' : '▲';
            }
        });
        
        // 點擊其他地方關閉選單
        document.addEventListener('click', () => {
            propertyInfoMenu.style.display = 'none';
            const arrow = propertyInfoDropdown.querySelector('span');
            if (arrow) {
                arrow.textContent = '▼';
            }
        });
        
        // 防止選單內部點擊關閉選單
        propertyInfoMenu.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }
});
    
