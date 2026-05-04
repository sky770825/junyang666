/**
 * 貸款試算 - 從 main-script.js 抽出
 * 依賴：index.html 的 #loanModal, #modalHousePrice 等元素
 */
(function() {
    "use strict";
    const sliderHandlers = new Map();
    const inputHandlers = new Map();

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
                    // 等額本金：首月月付
                    normalPayment = (loanAmount / remainingMonths) + (loanAmount * monthlyRate);
                }
            }
        }
        const totalCost = downPayment + serviceFee + notaryFee + agentFee;
        const monthlyTotal = graceMonths > 0 ? gracePayment : normalPayment;
        const incomeRatio = monthlyIncome > 0 ? ((monthlyTotal + (otherExpenses || 0)) / monthlyIncome * 100).toFixed(1) : '-';
        modalLoanResults.innerHTML = `
            <div class="loan-result-grid">
                <div class="loan-result-item"><span class="loan-result-label">自備款</span><span class="loan-result-value">${(downPayment / 10000).toFixed(0)} 萬</span></div>
                <div class="loan-result-item"><span class="loan-result-label">貸款金額</span><span class="loan-result-value">${(loanAmount / 10000).toFixed(0)} 萬</span></div>
                <div class="loan-result-item"><span class="loan-result-label">寬限期月付</span><span class="loan-result-value">${graceMonths > 0 ? (gracePayment / 10000).toFixed(2) + ' 萬' : '-'}</span></div>
                <div class="loan-result-item"><span class="loan-result-label">本息月付</span><span class="loan-result-value">${(normalPayment / 10000).toFixed(2)} 萬</span></div>
                <div class="loan-result-item"><span class="loan-result-label">契稅+規費</span><span class="loan-result-value">${((serviceFee + notaryFee) / 10000).toFixed(1)} 萬</span></div>
                <div class="loan-result-item"><span class="loan-result-label">服務費</span><span class="loan-result-value">${(agentFee / 10000).toFixed(1)} 萬</span></div>
                <div class="loan-result-item"><span class="loan-result-label">月收入負擔比</span><span class="loan-result-value">${incomeRatio}%</span></div>
            </div>
        `;
    } catch (e) {
        console.error('貸款試算錯誤', e);
        const modalLoanResults = document.getElementById('modalLoanResults');
        if (modalLoanResults) modalLoanResults.innerHTML = '<p style="color:#dc3545;padding:1rem;">計算發生錯誤，請檢查輸入。</p>';
    }
}

    window.showLoanCalculator = showLoanCalculator;
    window.openLoanModal = openLoanModal;
    window.closeLoanModal = closeLoanModal;
    window.adjustLoanConditions = adjustLoanConditions;
    window.calculateModalLoan = calculateModalLoan;

    window.addEventListener("click", function(event) {
        const loanModal = document.getElementById("loanModal");
        if (event.target === loanModal) closeLoanModal();
    });

    document.addEventListener("DOMContentLoaded", function() {
        setTimeout(function() {
            try {
                bindSliderEvents();
                bindInputEvents();
                var housePrice = document.getElementById("modalHousePrice");
                if (housePrice && housePrice.value) calculateModalLoan();
            } catch (e) { console.error("貸款試算初始化失敗", e); }
        }, 100);
    });
})();

