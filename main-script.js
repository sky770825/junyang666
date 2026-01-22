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
let currentTikTokModal = null;
// currentPropertyModal 在 property-modals.js 中聲明
let currentLoanCalculator = null;

// ✅ 地圖 iframe 快取
const mapIframeCache = new Map();

// ✅ TikTok 嵌入內容快取
const tiktokEmbedCache = new Map();

// ✅ TikTok 脚本载入状态
let tiktokScriptLoaded = false;
let tiktokScriptLoading = false;

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
    if (currentPropertyModal && currentPropertyModal.style.display === 'none') {
        currentPropertyModal.style.display = 'flex';
    }
}

// 確保函數在 window 物件上可用
window.closeLightbox = closeLightbox;

// 關閉地圖彈窗函數
function closeMapModal() {
    if (currentMapModal) {
        currentMapModal.remove();
        currentMapModal = null;
    }
}

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

// 打開貸款試算彈窗（不帶物件ID）
function openLoanModal() {
    // 顯示彈窗
    const loanModal = document.getElementById('loanModal');
    if (loanModal) {
        loanModal.style.display = 'block';
        
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
    const loanModal = document.getElementById('loanModal');
    if (loanModal) {
        loanModal.style.display = 'none';
    }
}

// 滑桿事件處理器（儲存引用以便移除）
const sliderHandlers = new Map();

// 滑桿值更新
function bindSliderEvents() {
    const loanRatioSlider = document.getElementById('modalLoanRatio');
    const loanYearsSlider = document.getElementById('modalLoanYears');
    const interestRateSlider = document.getElementById('modalInterestRate');
    const agentFeeSlider = document.getElementById('modalAgentFee');
    
    // 先移除舊的監聽器
    if (loanRatioSlider && sliderHandlers.has('loanRatio')) {
        loanRatioSlider.removeEventListener('input', sliderHandlers.get('loanRatio'));
    }
    if (loanYearsSlider && sliderHandlers.has('loanYears')) {
        loanYearsSlider.removeEventListener('input', sliderHandlers.get('loanYears'));
    }
    if (interestRateSlider && sliderHandlers.has('interestRate')) {
        interestRateSlider.removeEventListener('input', sliderHandlers.get('interestRate'));
    }
    if (agentFeeSlider && sliderHandlers.has('agentFee')) {
        agentFeeSlider.removeEventListener('input', sliderHandlers.get('agentFee'));
    }
    
    // 添加新的監聽器
    if (loanRatioSlider) {
        const handler = function() {
            document.getElementById('modalLoanRatioValue').textContent = this.value + '%';
            calculateModalLoan();
        };
        loanRatioSlider.addEventListener('input', handler);
        sliderHandlers.set('loanRatio', handler);
    }
    
    if (loanYearsSlider) {
        const handler = function() {
            document.getElementById('modalLoanYearsValue').textContent = this.value + '年';
            calculateModalLoan();
        };
        loanYearsSlider.addEventListener('input', handler);
        sliderHandlers.set('loanYears', handler);
    }
    
    if (interestRateSlider) {
        const handler = function() {
            document.getElementById('modalInterestRateValue').textContent = this.value + '%';
            calculateModalLoan();
        };
        interestRateSlider.addEventListener('input', handler);
        sliderHandlers.set('interestRate', handler);
    }
    
    if (agentFeeSlider) {
        const handler = function() {
            document.getElementById('modalAgentFeeValue').textContent = this.value + '%';
            calculateModalLoan();
        };
        agentFeeSlider.addEventListener('input', handler);
        sliderHandlers.set('agentFee', handler);
    }
}

// 輸入框事件處理器（儲存引用以便移除）
const inputHandlers = new Map();

// 綁定輸入框事件
function bindInputEvents() {
    const inputs = ['modalHousePrice', 'modalServiceFee', 'modalNotaryFee', 'modalMonthlyIncome', 'modalOtherExpenses'];
    inputs.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            // 先移除舊的監聽器
            if (inputHandlers.has(id)) {
                input.removeEventListener('input', inputHandlers.get(id));
            }
            // 添加新的監聽器
            const handler = calculateModalLoan;
            input.addEventListener('input', handler);
            inputHandlers.set(id, handler);
        }
    });
    
    const selects = ['modalExistingLoan', 'modalGracePeriod', 'modalRepaymentType'];
    selects.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            // 先移除舊的監聽器
            if (inputHandlers.has(id)) {
                select.removeEventListener('change', inputHandlers.get(id));
            }
            // 添加新的監聽器
            const handler = id === 'modalExistingLoan' ? function() {
                adjustLoanConditions();
            } : calculateModalLoan;
            select.addEventListener('change', handler);
            inputHandlers.set(id, handler);
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
    try {
        const modalHousePrice = document.getElementById('modalHousePrice');
        const modalLoanResults = document.getElementById('modalLoanResults');
        
        if (!modalHousePrice || !modalLoanResults) {
            console.error('❌ 找不到貸款試算相關元素');
            return;
        }
        
        const housePriceInput = parseFloat(modalHousePrice.value);
        if (!housePriceInput || housePriceInput <= 0 || isNaN(housePriceInput)) {
            modalLoanResults.innerHTML = `
                <div class="text-center text-gray-500 py-4">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                    <p style="font-size: 0.75rem;">請輸入房屋價格開始計算</p>
                </div>
            `;
            return;
        }
        
        const housePrice = housePriceInput * 10000;
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
        
        modalLoanResults.innerHTML = resultsHTML;
    } catch (error) {
        console.error('❌ 貸款試算計算錯誤:', error);
        const modalLoanResults = document.getElementById('modalLoanResults');
        if (modalLoanResults) {
            modalLoanResults.innerHTML = `
                <div class="text-center text-red-500 py-4">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                    <p style="font-size: 0.75rem;">計算時發生錯誤，請重新輸入</p>
                </div>
            `;
        }
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
        // 🔥 先關閉所有現有的燈箱
        if (currentLightbox) {
            currentLightbox.remove();
            currentLightbox = null;
        }
        
        // 查找並移除所有 .lightbox-modal 元素（防止重複）
        const existingLightboxes = document.querySelectorAll('.lightbox-modal');
        existingLightboxes.forEach(lb => lb.remove());
        
        // 隱藏詳細資訊彈窗
        if (currentPropertyModal) {
            currentPropertyModal.style.display = 'none';
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

// 🔥 重要：在 DOMContentLoaded 之前設置事件監聽器，確保不會錯過資料載入事件
// 監聽需要初始化的自定義事件
window.addEventListener('needPaginationInit', function(event) {
    console.log('📦 收到需要初始化分頁系統的事件');
    if (!embeddedPaginationSystem && typeof EmbeddedPropertyPaginationSystem !== 'undefined') {
        // 確保 embeddedPropertiesData 存在且有資料
        if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            console.log('🚀 從 needPaginationInit 事件初始化分頁系統');
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
        }
    }
});

// 監聽 Supabase 資料載入事件（優先）- 在 DOMContentLoaded 之前設置
// 🔥 防止重複更新：使用標記確保同一批資料只更新一次
let lastUpdateTimestamp = null;
let isUpdatingPagination = false;

window.addEventListener('supabaseDataLoaded', function(event) {
    const eventData = event.detail || {};
    const propertyCount = eventData.count || (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0);
    const eventTimestamp = eventData.timestamp || new Date().toISOString();
    
    // 🔥 防止重複更新：如果時間戳相同，跳過更新
    if (lastUpdateTimestamp === eventTimestamp && isUpdatingPagination) {
        console.log('⏭️ 跳過重複更新（相同時間戳）');
        return;
    }
    
    console.log(`📦 收到 Supabase 資料載入事件，更新分頁系統... (物件數: ${propertyCount})`);
    
    // 🔥 檢查資料數量變化
    if (window.lastPropertyCount !== undefined && window.lastPropertyCount !== propertyCount) {
        console.warn(`⚠️ 物件數量變化：${window.lastPropertyCount} → ${propertyCount}`);
    }
    window.lastPropertyCount = propertyCount;
    
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
        // 設置更新標記
        isUpdatingPagination = true;
        lastUpdateTimestamp = eventTimestamp;
        
        if (embeddedPaginationSystem) {
            // 更新現有分頁系統
            const oldCount = embeddedPaginationSystem.allProperties ? embeddedPaginationSystem.allProperties.length : 0;
            console.log(`🔄 更新分頁系統... (舊: ${oldCount} → 新: ${propertyCount})`);
            
            embeddedPaginationSystem.allProperties = embeddedPropertiesData.properties;
            embeddedPaginationSystem.properties = embeddedPropertiesData.properties.filter(p => p.status !== 'sold');
            embeddedPaginationSystem.soldProperties = embeddedPropertiesData.properties.filter(p => p.status === 'sold');
            
            // 清除緩存
            embeddedPaginationSystem.filteredCache = null;
            embeddedPaginationSystem.cacheKey = '';
            if (embeddedPaginationSystem.cardCache) {
                embeddedPaginationSystem.cardCache.clear();
            }
            
            // 重新渲染
            embeddedPaginationSystem.renderProperties();
            
            // 更新篩選計數
            if (typeof embeddedPaginationSystem.updateFilterCounts === 'function') {
                embeddedPaginationSystem.updateFilterCounts();
            }
            
            console.log(`✅ 分頁系統已更新！目前有 ${embeddedPropertiesData.properties.length} 個物件（未售: ${embeddedPaginationSystem.properties.length}，已售: ${embeddedPaginationSystem.soldProperties.length}）`);
        } else if (typeof EmbeddedPropertyPaginationSystem !== 'undefined') {
            // 如果分頁系統還沒初始化，現在初始化
            console.log('🚀 資料已載入，立即初始化分頁系統（從事件）');
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
            
            // 🔥 確保初始化後立即渲染（即使資料是空的也要渲染，顯示「目前沒有物件」）
            if (embeddedPaginationSystem) {
                console.log('✅ 分頁系統已初始化，立即渲染（物件數: ' + (embeddedPaginationSystem.properties ? embeddedPaginationSystem.properties.length : 0) + '）');
                embeddedPaginationSystem.renderProperties();
            } else {
                console.warn('⚠️ 分頁系統初始化失敗');
            }
        } else {
            console.error('❌ EmbeddedPropertyPaginationSystem 類別未定義，無法初始化分頁系統');
        }
        
        // 清除更新標記
        setTimeout(() => {
            isUpdatingPagination = false;
        }, 100);
    } else {
        console.warn('⚠️ Supabase 資料載入事件觸發，但 embeddedPropertiesData 不存在');
        isUpdatingPagination = false;
    }
}, { once: false });

// 監聽 API 資料載入事件（備用）- 在 DOMContentLoaded 之前設置
// 🔥 注意：只有在 Supabase 載入失敗時才會觸發此事件
window.addEventListener('apiDataLoaded', function() {
    // 🔥 如果已經有 Supabase 資料，跳過 API 資料（避免覆蓋）
    if (window.lastPropertyCount !== undefined && window.lastPropertyCount > 0) {
        console.log('⏭️ 已有 Supabase 資料，跳過 API 資料載入');
        return;
    }
    
    console.log('📦 收到 API 資料載入事件，更新分頁系統...');
    
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties) {
        if (embeddedPaginationSystem) {
            // 更新現有分頁系統
            embeddedPaginationSystem.allProperties = embeddedPropertiesData.properties;
            embeddedPaginationSystem.properties = embeddedPropertiesData.properties.filter(p => p.status !== 'sold');
            embeddedPaginationSystem.soldProperties = embeddedPropertiesData.properties.filter(p => p.status === 'sold');
            
            // 清除緩存
            embeddedPaginationSystem.filteredCache = null;
            embeddedPaginationSystem.cacheKey = '';
            if (embeddedPaginationSystem.cardCache) {
                embeddedPaginationSystem.cardCache.clear();
            }
            
            // 重新渲染
            embeddedPaginationSystem.renderProperties();
            
            // 更新篩選計數
            if (typeof embeddedPaginationSystem.updateFilterCounts === 'function') {
                embeddedPaginationSystem.updateFilterCounts();
            }
            
            console.log(`✅ 分頁系統已更新！目前有 ${embeddedPropertiesData.properties.length} 個物件`);
        } else if (typeof EmbeddedPropertyPaginationSystem !== 'undefined') {
            // 如果分頁系統還沒初始化，現在初始化
            console.log('🚀 API 資料已載入，立即初始化分頁系統（從事件）');
            embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
            window.paginationSystem = embeddedPaginationSystem;
        }
    } else {
        console.warn('⚠️ API 資料載入事件觸發，但 embeddedPropertiesData 不存在');
    }
    }, { once: false });
}

// 暴露貸款試算函數到全域
window.showLoanCalculator = showLoanCalculator;
window.openLoanModal = openLoanModal;
window.closeLoanModal = closeLoanModal;
window.adjustLoanConditions = adjustLoanConditions;
window.calculateModalLoan = calculateModalLoan;

// 點擊背景關閉貸款試算彈窗
window.addEventListener('click', function(event) {
    const loanModal = document.getElementById('loanModal');
    if (event.target === loanModal) {
        closeLoanModal();
    }
});

document.addEventListener('DOMContentLoaded', function() {
    // 初始化貸款試算功能
    setTimeout(() => {
        console.log('🔧 初始化貸款試算功能...');
        try {
            bindSliderEvents();
            bindInputEvents();
            // 初始計算一次（如果有預設值）
            const housePrice = document.getElementById('modalHousePrice');
            if (housePrice && housePrice.value) {
                console.log('💰 執行初始計算，房屋價格:', housePrice.value);
                calculateModalLoan();
            } else {
                console.log('⏳ 等待輸入房屋價格...');
            }
            console.log('✅ 貸款試算功能初始化完成');
        } catch (error) {
            console.error('❌ 貸款試算功能初始化失敗:', error);
        }
    }, 100);
    
    // 等待資料載入後再初始化分頁系統
    function initializePaginationSystem() {
        // 確保 embeddedPropertiesData 存在且有資料
        if (typeof embeddedPropertiesData === 'undefined' || !embeddedPropertiesData.properties || embeddedPropertiesData.properties.length === 0) {
            console.log('⏳ 等待資料載入...');
            console.log('   當前狀態:', {
                hasData: typeof embeddedPropertiesData !== 'undefined',
                dataLength: typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0
            });
            return false;
        }
        
        // 如果分頁系統還沒初始化，才初始化
        if (!embeddedPaginationSystem) {
            console.log('🚀 初始化分頁系統...');
            try {
                embeddedPaginationSystem = new EmbeddedPropertyPaginationSystem();
                window.paginationSystem = embeddedPaginationSystem;
                console.log(`✅ 分頁系統已初始化，載入 ${embeddedPropertiesData.properties.length} 個物件`);
                
                // 🔥 驗證初始化是否成功
                if (!window.paginationSystem) {
                    console.error('❌ 分頁系統初始化失敗：window.paginationSystem 未設置');
                    return false;
                }
                
                return true;
            } catch (error) {
                console.error('❌ 分頁系統初始化時發生錯誤:', error);
                return false;
            }
        } else {
            console.log('⏭️ 分頁系統已存在，跳過初始化');
            // 🔥 確保 window.paginationSystem 已設置
            if (!window.paginationSystem) {
                window.paginationSystem = embeddedPaginationSystem;
                console.log('✅ 已設置 window.paginationSystem');
            }
            return false;
        }
    }
    
    // 🔥 注意：事件監聽器已在 DOMContentLoaded 之前設置，這裡不再重複設置
    
    // 立即檢查並初始化（如果資料已經載入）
    console.log('🔍 DOMContentLoaded: 檢查資料和分頁系統狀態...');
    console.log('- embeddedPropertiesData:', typeof embeddedPropertiesData !== 'undefined' ? '✅' : '❌');
    console.log('- 資料數量:', typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0);
    console.log('- embeddedPaginationSystem:', embeddedPaginationSystem ? '✅' : '❌');
    console.log('- EmbeddedPropertyPaginationSystem:', typeof EmbeddedPropertyPaginationSystem !== 'undefined' ? '✅' : '❌');
    
    if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
        console.log('✅ 資料已存在，立即初始化分頁系統');
        const initResult = initializePaginationSystem();
        if (!initResult) {
            console.warn('⚠️ 初始化返回 false，可能分頁系統已存在');
        }
    } else {
        console.warn('⚠️ 資料尚未載入，等待資料載入事件...');
    }
    
    // 延遲初始化（給資料載入一些時間，作為備用）
    setTimeout(() => {
        if (!embeddedPaginationSystem && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            console.log('⏰ 延遲初始化分頁系統（備用機制 500ms）');
            initializePaginationSystem();
        }
    }, 500);
    
    // 更長的延遲檢查（確保資料載入完成）
    setTimeout(() => {
        if (!embeddedPaginationSystem && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
            console.log('⏰ 最終檢查並初始化分頁系統（2000ms）');
            initializePaginationSystem();
        } else if (!embeddedPaginationSystem) {
            console.warn('⚠️ 分頁系統未初始化，資料可能尚未載入');
            console.log('📊 當前狀態:', {
                hasData: typeof embeddedPropertiesData !== 'undefined',
                dataLength: typeof embeddedPropertiesData !== 'undefined' ? embeddedPropertiesData.properties?.length : 0,
                hasSystem: !!embeddedPaginationSystem,
                hasClass: typeof EmbeddedPropertyPaginationSystem !== 'undefined'
            });
            
            // 如果類別存在但系統未初始化，強制初始化
            if (typeof EmbeddedPropertyPaginationSystem !== 'undefined' && typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
                console.log('🔧 強制初始化分頁系統...');
                const initResult = initializePaginationSystem();
                if (initResult) {
                    console.log('✅ 強制初始化成功');
                } else {
                    console.error('❌ 強制初始化失敗');
                }
            } else {
                console.error('❌ 無法強制初始化：缺少必要條件');
                console.log('   - EmbeddedPropertyPaginationSystem:', typeof EmbeddedPropertyPaginationSystem !== 'undefined' ? '✅' : '❌');
                console.log('   - embeddedPropertiesData:', typeof embeddedPropertiesData !== 'undefined' ? '✅' : '❌');
                console.log('   - 資料數量:', typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties ? embeddedPropertiesData.properties.length : 0);
            }
        }
    }, 2000);
    
    // 最終備用檢查（5000ms）
    setTimeout(() => {
        if (!embeddedPaginationSystem) {
            console.warn('⚠️ 分頁系統仍未初始化，執行最終備用檢查');
            if (typeof EmbeddedPropertyPaginationSystem !== 'undefined') {
                if (typeof embeddedPropertiesData !== 'undefined' && embeddedPropertiesData.properties && embeddedPropertiesData.properties.length > 0) {
                    console.log('🔧 最終備用：強制初始化分頁系統');
                    initializePaginationSystem();
                } else {
                    console.error('❌ 無法初始化：資料未載入');
                    // 🔥 移除手動觸發，避免無限循環
                    // 資料載入應該由 supabase-data-loader.js 自動處理
                    console.log('⏳ 等待 Supabase 資料載入器自動載入資料...');
                }
            } else {
                console.error('❌ 無法初始化：EmbeddedPropertyPaginationSystem 類別未定義');
            }
        }
    }, 5000);
    
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
    
