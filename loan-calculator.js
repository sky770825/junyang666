// 貸款試算模組 - 從模組化.html提取
// 包含貸款計算器相關功能

// 貸款試算相關功能
function showLoanCalculator(propertyId) {
    const property = embeddedPropertiesData.properties.find(p => p.id === propertyId);
    if (property) {
        // 提取價格數字（移除"萬"字）
        const priceMatch = property.price.match(/(\d+(?:,\d+)*)/);
        if (priceMatch) {
            const price = priceMatch[1].replace(/,/g, '');
            document.getElementById('modalHousePrice').value = price;
        }
        
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

function openLoanModal() {
    // 顯示彈窗
    document.getElementById('loanModal').style.display = 'block';
    
    // 重新綁定滑桿事件
    setTimeout(() => {
        bindSliderEvents();
        bindInputEvents();
        calculateModalLoan();
    }, 100);
}

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
        loanRatioSlider.max = 85;
        gracePeriodSelect.value = '5';
        interestRateSlider.min = 0.5;
        interestRateSlider.max = 2.1;
        interestRateSlider.value = Math.min(interestRateSlider.value, 2.1);
        document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
        
    } else {
        // 首購：恢復正常設定
        loanRatioSlider.max = 85;
        interestRateSlider.min = 0.5;
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
        document.getElementById('modalLoanResults').innerHTML = `
            <div class="text-center text-gray-500 py-4">
                <div style="font-size: 2rem; margin-bottom: 0.5rem;">📊</div>
                <p style="font-size: 0.75rem;">請輸入房屋價格開始計算</p>
            </div>
        `;
        return;
    }
    
    // 基本計算
    const loanAmount = housePrice * loanRatio;
    const downPayment = housePrice - loanAmount;
    
    // 計算月付金額
    let monthlyPayment = 0;
    let totalInterest = 0;
    
    if (loanYears > 0 && interestRate >= 0) {
        const monthlyRate = interestRate / 12;
        const totalPeriods = loanYears * 12;
        
        if (repaymentType === 'equal_payment') {
            // 等額本息
            if (monthlyRate > 0) {
                monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPeriods)) / (Math.pow(1 + monthlyRate, totalPeriods) - 1);
            } else {
                monthlyPayment = loanAmount / totalPeriods;
            }
            totalInterest = (monthlyPayment * totalPeriods) - loanAmount;
        } else {
            // 等額本金
            const monthlyPrincipal = loanAmount / totalPeriods;
            let totalPayment = 0;
            
            for (let i = 0; i < totalPeriods; i++) {
                const remainingPrincipal = loanAmount - (monthlyPrincipal * i);
                const monthlyInterest = remainingPrincipal * monthlyRate;
                const monthlyTotal = monthlyPrincipal + monthlyInterest;
                totalPayment += monthlyTotal;
            }
            
            monthlyPayment = totalPayment / totalPeriods;
            totalInterest = totalPayment - loanAmount;
        }
    }
    
    const totalPayment = loanAmount + totalInterest;
    
    // 計算買方費用
    const totalBuyerCosts = serviceFee + notaryFee + agentFee;
    
    // 計算收支比
    const debtRatio = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
    const availableIncome = monthlyIncome - otherExpenses;
    const affordability = availableIncome > 0 ? (availableIncome / monthlyPayment) * 100 : 0;
    
    // 生成結果HTML
    const resultsHTML = `
        <div class="loan-result-card">
            <div class="loan-result-highlight" style="
                background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
                color: white;
                padding: 1rem;
                border-radius: 8px;
                text-align: center;
                margin-bottom: 1rem;
            ">
                <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">月付金額</h3>
                <div style="font-size: 1.8rem; font-weight: bold;">${Math.round(monthlyPayment / 10000 * 10) / 10} 萬元</div>
                <p style="margin: 0.5rem 0 0 0; opacity: 0.9; font-size: 0.85rem;">本息平均攤還</p>
            </div>
            
            <div class="loan-result-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-bottom: 1rem;">
                <div class="loan-result-row" style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <span style="color: #666; font-size: 0.85rem;">貸款金額：</span>
                    <span style="color: #10b981; font-weight: bold; font-size: 0.85rem;">${Math.round(loanAmount / 10000)} 萬元</span>
                </div>
                <div class="loan-result-row" style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <span style="color: #666; font-size: 0.85rem;">自備款：</span>
                    <span style="color: #10b981; font-weight: bold; font-size: 0.85rem;">${Math.round(downPayment / 10000)} 萬元</span>
                </div>
                <div class="loan-result-row" style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <span style="color: #666; font-size: 0.85rem;">總利息：</span>
                    <span style="color: #e74c3c; font-weight: bold; font-size: 0.85rem;">${Math.round(totalInterest / 10000)} 萬元</span>
                </div>
                <div class="loan-result-row" style="display: flex; justify-content: space-between; padding: 0.5rem; background: #f8f9fa; border-radius: 4px;">
                    <span style="color: #666; font-size: 0.85rem;">總還款：</span>
                    <span style="color: #2c3e50; font-weight: bold; font-size: 0.85rem;">${Math.round(totalPayment / 10000)} 萬元</span>
                </div>
            </div>
            
            <div class="loan-result-card">
                <div class="loan-result-title" style="color: #10b981; font-weight: bold; margin-bottom: 0.8rem; font-size: 0.9rem;">💸 買方費用</div>
                <div class="loan-result-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
                    <div>代書費+契稅：</div>
                    <div style="color: #10b981; font-weight: bold;">${serviceFee.toLocaleString()}元</div>
                    <div>代書潤筆費：</div>
                    <div style="color: #10b981; font-weight: bold;">${notaryFee.toLocaleString()}元</div>
                    <div>仲介費：</div>
                    <div style="color: #10b981; font-weight: bold;">${Math.round(agentFee).toLocaleString()}元</div>
                    <div style="grid-column: 1 / -1; text-align: center; padding: 0.5rem; background: #e8f5e8; border-radius: 4px; margin-top: 0.5rem;">
                        <strong style="color: #2c3e50;">總費用：${Math.round(totalBuyerCosts).toLocaleString()}元</strong>
                    </div>
                </div>
            </div>
            
            ${monthlyIncome > 0 ? `
            <div class="loan-result-card">
                <div class="loan-result-title" style="color: #10b981; font-weight: bold; margin-bottom: 0.8rem; font-size: 0.9rem;">📊 收支分析</div>
                <div class="loan-result-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-size: 0.85rem;">
                    <div>負債比：</div>
                    <div style="color: ${debtRatio <= 30 ? '#10b981' : debtRatio <= 50 ? '#f39c12' : '#e74c3c'}; font-weight: bold;">${debtRatio.toFixed(1)}%</div>
                    <div>可負擔性：</div>
                    <div style="color: ${affordability >= 200 ? '#10b981' : affordability >= 150 ? '#f39c12' : '#e74c3c'}; font-weight: bold;">${affordability.toFixed(1)}%</div>
                </div>
                <div style="margin-top: 0.5rem; padding: 0.5rem; background: #f8f9fa; border-radius: 4px; font-size: 0.8rem; color: #666;">
                    💡 建議負債比不超過30%，可負擔性至少150%
                </div>
            </div>
            ` : ''}
        </div>
    `;
    
    document.getElementById('modalLoanResults').innerHTML = resultsHTML;
}

// 點擊背景關閉彈窗
window.addEventListener('click', function(event) {
    const loanModal = document.getElementById('loanModal');
    if (event.target === loanModal) {
        closeLoanModal();
    }
});
