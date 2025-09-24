// 地圖分頁切換功能
        function showMapTab(tabId) {
            // 隱藏所有地圖內容
            const mapContents = document.querySelectorAll('.map-content');
            mapContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // 重置所有標籤按鈕樣式
            const mapTabs = document.querySelectorAll('.map-tab');
            mapTabs.forEach(tab => {
                tab.style.background = '#95a5a6';
            });
            
            // 顯示選中的地圖內容
            const selectedContent = document.getElementById(tabId);
            if (selectedContent) {
                selectedContent.style.display = 'block';
            }
            
            // 高亮選中的標籤按鈕
            const selectedTab = event.target;
            selectedTab.style.background = '#3498db';
        }
        
        // 優化的手機觸控處理
        document.addEventListener('DOMContentLoaded', function() {
            let startX = 0;
            let startY = 0;
            let isScrolling = false;
            
            // 允許縮放手勢，不阻止
            document.addEventListener('gesturestart', function(e) {
                // 允許縮放手勢，不阻止
            }, { passive: true });
            
            // 優化的觸控開始處理
            document.addEventListener('touchstart', function(e) {
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    startX = touch.clientX;
                    startY = touch.clientY;
                    isScrolling = false;
                }
            }, { passive: true });
            
            // 優化的觸控移動處理 - 允許縮放但防止網頁滾動
            document.addEventListener('touchmove', function(e) {
                // 允許多指觸控（縮放）
                if (e.touches.length > 1) {
                    return; // 不阻止縮放手勢
                }
                
                // 單指觸控時，檢查是否在可滾動區域內
                if (e.touches.length === 1) {
                    const touch = e.touches[0];
                    const deltaX = Math.abs(touch.clientX - startX);
                    const deltaY = Math.abs(touch.clientY - startY);
                    
                    // 檢查是否在可滑動區域內
                    const target = e.target;
                    const scrollableParent = target.closest('.photo-scroll-container, .property-card, .info-card, .container, .loan-modal');
                    
                    // 如果不在可滑動區域內，阻止預設行為
                    if (!scrollableParent) {
                        e.preventDefault();
                    }
                    isScrolling = true;
                }
            }, { passive: false });
            
            // 觸控結束時重置狀態
            document.addEventListener('touchend', function(e) {
                isScrolling = false;
            }, { passive: true });
            
            // 優化照片滑動容器
            const photoScrollContainers = document.querySelectorAll('.photo-scroll-container');
            photoScrollContainers.forEach(container => {
                // 添加平滑滑動
                container.style.scrollBehavior = 'smooth';
                container.style.webkitOverflowScrolling = 'touch';
                
                // 優化觸控滑動
                let isDragging = false;
                let startScrollLeft = 0;
                let startTouchX = 0;
                
                container.addEventListener('touchstart', function(e) {
                    isDragging = true;
                    startScrollLeft = this.scrollLeft;
                    startTouchX = e.touches[0].clientX;
                }, { passive: true });
                
                container.addEventListener('touchmove', function(e) {
                    if (isDragging) {
                        const touchX = e.touches[0].clientX;
                        const diff = startTouchX - touchX;
                        this.scrollLeft = startScrollLeft + diff;
                    }
                }, { passive: true });
                
                container.addEventListener('touchend', function(e) {
                    isDragging = false;
                }, { passive: true });
            });
        });
        
        // 添加一些互動效果
        document.addEventListener('DOMContentLoaded', function() {
            // 滾動動畫效果
            const cards = document.querySelectorAll('.property-card, .info-card');
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }
                });
            });
            
            cards.forEach(card => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            });
            
            // 優化的按鈕點擊效果
            const buttons = document.querySelectorAll('.contact-button');
            buttons.forEach(button => {
                // 添加觸控反饋
                button.addEventListener('touchstart', function(e) {
                    this.style.transform = 'scale(0.95)';
                    this.style.transition = 'transform 0.1s ease';
                }, { passive: true });
                
                button.addEventListener('touchend', function(e) {
                    this.style.transform = 'scale(1)';
                    this.style.transition = 'transform 0.2s ease';
                }, { passive: true });
                
                button.addEventListener('click', function() {
                    this.style.transform = 'scale(0.95)';
                    setTimeout(() => {
                        this.style.transform = 'scale(1)';
                    }, 100);
                });
            });
        });
        
        // 貸款試算彈窗功能
        function openLoanModal(propertyPrice = 896, monthlyIncome = 8) {
            try {
                console.log('開啟貸款試算彈窗');
                document.getElementById('loanModal').style.display = 'block';
                // 不設定 body overflow，讓彈窗內部可以滾動
                
                // 設置預設值
                document.getElementById('modalHousePrice').value = propertyPrice;
                document.getElementById('modalMonthlyIncome').value = monthlyIncome;
                
                // 重新綁定滑桿事件
                setTimeout(() => {
                    bindSliderEvents();
                    bindInputEvents(); // 綁定輸入框事件
                    calculateModalLoan(); // 立即計算一次顯示結果
                }, 100);
            } catch (error) {
                console.error('彈窗開啟錯誤:', error);
                alert('彈窗開啟失敗，請檢查控制台錯誤訊息');
            }
        }
        
        
        function closeLoanModal() {
            document.getElementById('loanModal').style.display = 'none';
            // 不需要恢復 body overflow，因為沒有設定
        }
        
        // 點擊彈窗外部關閉
        window.onclick = function(event) {
            const modal = document.getElementById('loanModal');
            if (event.target === modal) {
                closeLoanModal();
            }
        }
        
        // 滑桿值更新 - 確保在DOM載入後綁定
        function bindSliderEvents() {
            const loanRatioSlider = document.getElementById('modalLoanRatio');
            const loanYearsSlider = document.getElementById('modalLoanYears');
            const interestRateSlider = document.getElementById('modalInterestRate');
            
            if (loanRatioSlider) {
                loanRatioSlider.addEventListener('input', function() {
                    document.getElementById('modalLoanRatioValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                });
                loanRatioSlider.addEventListener('change', function() {
                    document.getElementById('modalLoanRatioValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                    // 只有在變更時才檢查新青安貸款設定
                    if (document.getElementById('modalExistingLoan').value === 'youth') {
                        showYouthLoanNotice();
                    }
                });
            }
            
            if (loanYearsSlider) {
                loanYearsSlider.addEventListener('input', function() {
                    document.getElementById('modalLoanYearsValue').textContent = this.value + '年';
                    calculateModalLoan(); // 即時計算
                });
                loanYearsSlider.addEventListener('change', function() {
                    document.getElementById('modalLoanYearsValue').textContent = this.value + '年';
                    calculateModalLoan(); // 即時計算
                });
            }
            
            if (interestRateSlider) {
                interestRateSlider.addEventListener('input', function() {
                    document.getElementById('modalInterestRateValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                });
                interestRateSlider.addEventListener('change', function() {
                    document.getElementById('modalInterestRateValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                });
            }
        }
        
        // 驗證計算準確性的測試函數
        function validateLoanCalculation() {
            // 測試案例1：無寬限期，標準計算
            console.log("=== 貸款計算驗證測試 ===");
            
            // 測試數據
            const testCases = [
                {
                    name: "標準案例：無寬限期",
                    housePrice: 1500, // 萬元
                    loanRatio: 80,    // %
                    loanYears: 20,    // 年
                    interestRate: 2.1, // %
                    gracePeriod: 0,   // 年
                    expectedMonthlyPayment: 7628, // 預期月付約7628元
                },
                {
                    name: "寬限期案例：3年寬限期",
                    housePrice: 1500,
                    loanRatio: 80,
                    loanYears: 20,
                    interestRate: 2.1,
                    gracePeriod: 3,
                    expectedGracePayment: 2100, // 預期寬限期月付約2100元
                },
                {
                    name: "新青安案例：5年寬限期",
                    housePrice: 1500,
                    loanRatio: 80,
                    loanYears: 30,
                    interestRate: 2.1,
                    gracePeriod: 5,
                    expectedGracePayment: 2100, // 預期寬限期月付約2100元
                }
            ];
            
            testCases.forEach(testCase => {
                console.log(`\n測試：${testCase.name}`);
                
                // 設置測試數據
                document.getElementById('modalHousePrice').value = testCase.housePrice;
                document.getElementById('modalLoanRatio').value = testCase.loanRatio;
                document.getElementById('modalLoanYears').value = testCase.loanYears;
                document.getElementById('modalInterestRate').value = testCase.interestRate;
                document.getElementById('modalGracePeriod').value = testCase.gracePeriod;
                
                // 執行計算
                calculateModalLoan();
                
                console.log("測試完成，請檢查結果是否合理");
            });
        }
        
        // 根據貸款狀況調整貸款條件
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
                
                gracePeriodSelect.value = '0'; // 強制設為無寬限期
                
                // 恢復一般利率範圍
                interestRateSlider.min = 1.5;
                interestRateSlider.max = 5;
                interestRateSlider.value = Math.max(interestRateSlider.value, 1.5);
                document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
                
                // 顯示政策提醒
                showPolicyNotice('第二戶房貸限制：貸款成數最高50%，無寬限期');
                
            } else if (existingLoan === 'youth') {
                // 新青安貸款：限制1000萬額度，優惠利率，5年寬限期
                loanRatioSlider.max = 80;
                loanRatioSlider.value = Math.min(loanRatioSlider.value, 80);
                document.getElementById('modalLoanRatioValue').textContent = loanRatioSlider.value + '%';
                
                gracePeriodSelect.value = '5'; // 強制設為新青安5年寬限期
                
                // 設置新青安優惠利率範圍 (基準利率+0.555%-政府補貼2碼)
                interestRateSlider.min = 1.2;
                interestRateSlider.max = 2.0;
                interestRateSlider.value = 1.8; // 預設新青安優惠利率
                document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
                
                // 顯示新青安政策提醒和一般貸款利率設定
                showYouthLoanNotice();
                
            } else {
                // 首購：恢復正常條件
                loanRatioSlider.max = 85;
                loanRatioSlider.value = Math.min(loanRatioSlider.value, 85);
                document.getElementById('modalLoanRatioValue').textContent = loanRatioSlider.value + '%';
                
                gracePeriodSelect.value = '5'; // 恢復新青安5年寬限期
                
                // 恢復一般利率範圍
                interestRateSlider.min = 1.5;
                interestRateSlider.max = 5;
                interestRateSlider.value = Math.max(interestRateSlider.value, 1.5);
                document.getElementById('modalInterestRateValue').textContent = interestRateSlider.value + '%';
                
                // 隱藏政策提醒
                hidePolicyNotice();
            }
            
            // 重新計算
            calculateModalLoan();
        }
        
        // 顯示政策提醒
        function showPolicyNotice(message) {
            let notice = document.getElementById('policyNotice');
            if (!notice) {
                notice = document.createElement('div');
                notice.id = 'policyNotice';
                notice.style.cssText = `
                    background: linear-gradient(135deg, #fef3c7, #fde68a);
                    border: 1px solid #f59e0b;
                    border-radius: 6px;
                    padding: 0.6rem;
                    margin: 0.6rem 0;
                    font-size: 0.8rem;
                    color: #92400e;
                    text-align: center;
                    animation: fadeIn 0.3s ease-in;
                `;
                
                // 插入到寬限期選擇框之後
                const gracePeriodGroup = document.querySelector('#modalGracePeriod').closest('div[style*="grid-template-columns"]');
                gracePeriodGroup.parentNode.insertBefore(notice, gracePeriodGroup.nextSibling);
            }
            notice.textContent = '⚠️ ' + message;
            notice.style.display = 'block';
        }
        
        // 隱藏政策提醒
        function hidePolicyNotice() {
            const notice = document.getElementById('policyNotice');
            if (notice) {
                notice.style.display = 'none';
            }
            // 同時隱藏新青安一般貸款利率設定
            const youthRateSetting = document.getElementById('youthNormalRateSetting');
            if (youthRateSetting) {
                youthRateSetting.style.display = 'none';
            }
        }
        
        // 顯示新青安貸款提醒和一般貸款利率設定
        function showYouthLoanNotice() {
            showPolicyNotice('新青安貸款：前1000萬享優惠利率1.8%，超過部分適用一般利率，優惠至2026/7/31');
            
            // 創建或顯示一般貸款利率設定區域
            let youthRateSetting = document.getElementById('youthNormalRateSetting');
            if (!youthRateSetting) {
                youthRateSetting = document.createElement('div');
                youthRateSetting.id = 'youthNormalRateSetting';
                youthRateSetting.style.cssText = `
                    background: linear-gradient(135deg, #e3f2fd, #bbdefb);
                    border: 1px solid #2196f3;
                    border-radius: 6px;
                    padding: 0.8rem;
                    margin: 0.6rem 0;
                    font-size: 0.85rem;
                    color: #0d47a1;
                    animation: fadeIn 0.3s ease-in;
                `;
                
                // 插入到政策提醒之後
                const policyNotice = document.getElementById('policyNotice');
                if (policyNotice) {
                    policyNotice.parentNode.insertBefore(youthRateSetting, policyNotice.nextSibling);
                }
            }
            
            // 獲取當前房屋總價和貸款成數來計算是否會超過1000萬
            const housePrice = parseFloat(document.getElementById('modalHousePrice').value) * 10000;
            const loanRatio = parseFloat(document.getElementById('modalLoanRatio').value) / 100;
            const totalLoanAmount = housePrice * loanRatio;
            const normalLoanAmount = Math.max(0, totalLoanAmount - 10000000);
            
            if (normalLoanAmount > 0) {
                const normalLoanAmountWan = Math.round(normalLoanAmount / 10000);
                youthRateSetting.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                        <span style="margin-right: 0.5rem;">💰</span>
                        <strong>超過1000萬部分 (${normalLoanAmountWan}萬元) 一般貸款利率設定</strong>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; align-items: center;">
                        <label style="font-size: 0.8rem;">一般貸款利率：</label>
                        <div style="display: flex; align-items: center; gap: 0.3rem;">
                            <input type="range" id="normalLoanRate" min="2.0" max="4.0" step="0.1" value="2.8" 
                                   style="flex: 1; height: 4px; border-radius: 2px; background: #e0e0e0; outline: none; cursor: pointer;">
                            <span id="normalLoanRateValue" style="font-weight: bold; min-width: 3rem; text-align: center;">2.8%</span>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; margin-top: 0.3rem; color: #666;">
                        💡 超過1000萬的部分將使用此利率計算
                    </div>
                `;
                youthRateSetting.style.display = 'block';
                
                // 綁定一般貸款利率滑桿事件（避免重複綁定）
                setTimeout(() => {
                    const normalRateSlider = document.getElementById('normalLoanRate');
                    const normalRateValue = document.getElementById('normalLoanRateValue');
                    
                    if (normalRateSlider && normalRateValue && !normalRateSlider.hasAttribute('data-bound')) {
                        normalRateSlider.setAttribute('data-bound', 'true');
                        normalRateSlider.addEventListener('input', function() {
                            normalRateValue.textContent = this.value + '%';
                            calculateModalLoan(); // 重新計算
                        });
                    }
                }, 100);
            } else {
                youthRateSetting.style.display = 'none';
            }
        }
        
        // 綁定輸入框事件
        function bindInputEvents() {
            // 房屋總價
            const housePriceInput = document.getElementById('modalHousePrice');
            if (housePriceInput) {
                housePriceInput.addEventListener('input', function() {
                    calculateModalLoan();
                });
                housePriceInput.addEventListener('change', function() {
                    calculateModalLoan();
                    // 只有在變更時才檢查新青安貸款設定
                    if (document.getElementById('modalExistingLoan').value === 'youth') {
                        showYouthLoanNotice();
                    }
                });
            }
            
            // 寬限期下拉選單
            const gracePeriodSelect = document.getElementById('modalGracePeriod');
            if (gracePeriodSelect) {
                gracePeriodSelect.addEventListener('change', calculateModalLoan);
            }
            
            // 代書費+契稅
            const serviceFeeInput = document.getElementById('modalServiceFee');
            if (serviceFeeInput) {
                serviceFeeInput.addEventListener('input', calculateModalLoan);
                serviceFeeInput.addEventListener('change', calculateModalLoan);
            }
            
            // 代書潤筆費
            const notaryFeeInput = document.getElementById('modalNotaryFee');
            if (notaryFeeInput) {
                notaryFeeInput.addEventListener('input', calculateModalLoan);
                notaryFeeInput.addEventListener('change', calculateModalLoan);
            }
            
            // 仲介費滑桿
            const agentFeeSlider = document.getElementById('modalAgentFee');
            if (agentFeeSlider) {
                agentFeeSlider.addEventListener('input', function() {
                    document.getElementById('modalAgentFeeValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                });
                agentFeeSlider.addEventListener('change', function() {
                    document.getElementById('modalAgentFeeValue').textContent = this.value + '%';
                    calculateModalLoan(); // 即時計算
                });
            }
            
            // 還款方式
            const repaymentTypeSelect = document.getElementById('modalRepaymentType');
            if (repaymentTypeSelect) {
                repaymentTypeSelect.addEventListener('change', calculateModalLoan);
            }
            
            // 名下有無其他房貸
            const existingLoanSelect = document.getElementById('modalExistingLoan');
            if (existingLoanSelect) {
                existingLoanSelect.addEventListener('change', adjustLoanConditions);
            }
            
            // 月收入
            const monthlyIncomeInput = document.getElementById('modalMonthlyIncome');
            if (monthlyIncomeInput) {
                monthlyIncomeInput.addEventListener('input', calculateModalLoan);
                monthlyIncomeInput.addEventListener('change', calculateModalLoan);
            }
            
            // 其他月支出
            const otherExpensesInput = document.getElementById('modalOtherExpenses');
            if (otherExpensesInput) {
                otherExpensesInput.addEventListener('input', calculateModalLoan);
                otherExpensesInput.addEventListener('change', calculateModalLoan);
            }
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
            const agentFee = housePrice * (agentFeeRate / 100); // 仲介費按房屋總價百分比計算
            const repaymentType = document.getElementById('modalRepaymentType').value;
            const monthlyIncome = parseFloat(document.getElementById('modalMonthlyIncome').value) * 10000 || 0;
            const otherExpenses = parseFloat(document.getElementById('modalOtherExpenses').value) * 10000 || 0;
            const existingLoan = document.getElementById('modalExistingLoan').value;
            
            if (!housePrice || housePrice <= 0) {
                alert('請輸入有效的房屋價格');
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
                // 新青安：前1000萬享優惠利率，超過部分一般利率
                youthLoanAmount = Math.min(loanAmount, 10000000);
                normalLoanAmount = Math.max(0, loanAmount - 10000000);
                youthInterestRate = 1.8 / 100; // 新青安優惠利率
                
                // 獲取用戶自定義的一般貸款利率
                const normalRateSlider = document.getElementById('normalLoanRate');
                if (normalRateSlider && normalLoanAmount > 0) {
                    normalInterestRate = parseFloat(normalRateSlider.value) / 100;
                } else {
                    normalInterestRate = 2.8 / 100; // 預設一般貸款利率
                }
            }
            
            // 貸款計算（月利率）
            const totalMonths = loanYears * 12;
            const graceMonths = gracePeriod * 12;
            const remainingMonths = totalMonths - graceMonths;
            
            // 計算月付金額
            let monthlyPayment = 0;
            let gracePayment = 0;
            let totalInterest = 0;
            
            if (existingLoan === 'youth' && normalLoanAmount > 0) {
                // 混合貸款：新青安 + 一般貸款
                const youthMonthlyRate = youthInterestRate / 12;
                const normalMonthlyRate = normalInterestRate / 12;
                
                // 寬限期內只付利息
                const youthGracePayment = youthLoanAmount * youthMonthlyRate;
                const normalGracePayment = normalLoanAmount * normalMonthlyRate;
                gracePayment = youthGracePayment + normalGracePayment;
                
                // 寬限期後的正常還款
                if (remainingMonths > 0) {
                    let youthMonthlyPayment = 0;
                    let normalMonthlyPayment = 0;
                    
                    if (repaymentType === 'equal_payment') {
                        // 等額本息公式
                        if (youthLoanAmount > 0) {
                            youthMonthlyPayment = youthLoanAmount * (youthMonthlyRate * Math.pow(1 + youthMonthlyRate, remainingMonths)) / (Math.pow(1 + youthMonthlyRate, remainingMonths) - 1);
                        }
                        if (normalLoanAmount > 0) {
                            normalMonthlyPayment = normalLoanAmount * (normalMonthlyRate * Math.pow(1 + normalMonthlyRate, remainingMonths)) / (Math.pow(1 + normalMonthlyRate, remainingMonths) - 1);
                        }
                    } else {
                        // 等額本金公式（第一個月）
                        if (youthLoanAmount > 0) {
                            const youthMonthlyPrincipal = youthLoanAmount / remainingMonths;
                            youthMonthlyPayment = youthMonthlyPrincipal + youthLoanAmount * youthMonthlyRate;
                        }
                        if (normalLoanAmount > 0) {
                            const normalMonthlyPrincipal = normalLoanAmount / remainingMonths;
                            normalMonthlyPayment = normalMonthlyPrincipal + normalLoanAmount * normalMonthlyRate;
                        }
                    }
                    
                    monthlyPayment = youthMonthlyPayment + normalMonthlyPayment;
                } else {
                    monthlyPayment = gracePayment;
                }
                
                // 正確的總利息計算
                const graceInterest = gracePayment * graceMonths;
                let normalPeriodTotalPayment = 0;
                
                if (repaymentType === 'equal_payment') {
                    // 等額本息：固定月付 × 剩餘月數
                    normalPeriodTotalPayment = monthlyPayment * remainingMonths;
                } else {
                    // 等額本金：逐月計算
                    if (youthLoanAmount > 0) {
                        const youthMonthlyPrincipal = youthLoanAmount / remainingMonths;
                        for (let i = 0; i < remainingMonths; i++) {
                            const youthRemainingPrincipal = youthLoanAmount - (youthMonthlyPrincipal * i);
                            normalPeriodTotalPayment += youthMonthlyPrincipal + (youthRemainingPrincipal * youthMonthlyRate);
                        }
                    }
                    if (normalLoanAmount > 0) {
                        const normalMonthlyPrincipal = normalLoanAmount / remainingMonths;
                        for (let i = 0; i < remainingMonths; i++) {
                            const normalRemainingPrincipal = normalLoanAmount - (normalMonthlyPrincipal * i);
                            normalPeriodTotalPayment += normalMonthlyPrincipal + (normalRemainingPrincipal * normalMonthlyRate);
                        }
                    }
                }
                
                totalInterest = graceInterest + (normalPeriodTotalPayment - loanAmount);
            } else {
                // 單一利率貸款
                const monthlyRate = interestRate / 12;
                
                if (loanAmount > 0 && monthlyRate > 0) {
                    // 寬限期內只付利息
                    gracePayment = loanAmount * monthlyRate;
                    
                    // 寬限期後的正常還款
                    if (remainingMonths > 0) {
                        if (repaymentType === 'equal_payment') {
                            // 等額本息公式
                            monthlyPayment = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths)) / (Math.pow(1 + monthlyRate, remainingMonths) - 1);
                        } else {
                            // 等額本金公式（第一個月）
                            const monthlyPrincipal = loanAmount / remainingMonths;
                            monthlyPayment = monthlyPrincipal + loanAmount * monthlyRate;
                        }
                    } else {
                        monthlyPayment = gracePayment;
                    }
                    
                    // 正確的總利息計算
                    const graceInterest = gracePayment * graceMonths;
                    let normalPeriodTotalPayment = 0;
                    
                    if (repaymentType === 'equal_payment') {
                        // 等額本息：固定月付 × 剩餘月數
                        normalPeriodTotalPayment = monthlyPayment * remainingMonths;
                    } else {
                        // 等額本金：逐月計算
                        const monthlyPrincipal = loanAmount / remainingMonths;
                        for (let i = 0; i < remainingMonths; i++) {
                            const remainingPrincipal = loanAmount - (monthlyPrincipal * i);
                            normalPeriodTotalPayment += monthlyPrincipal + (remainingPrincipal * monthlyRate);
                        }
                    }
                    
                    totalInterest = graceInterest + (normalPeriodTotalPayment - loanAmount);
                }
            }
            
            
            // 雜項費用計算
            const totalFees = serviceFee + notaryFee + agentFee;
            
            // 總成本計算（包含自備款和雜費）
            const totalCost = downPayment + totalFees;
            
            // 負擔能力分析
            const debtRatio = monthlyPayment / monthlyIncome; // 負債比
            const availableIncome = monthlyIncome - otherExpenses; // 可用收入
            const affordabilityRatio = monthlyPayment / availableIncome; // 房貸負擔比
            const recommendedIncome = monthlyPayment * 3; // 建議月收入（房貸不超過收入1/3）
            const isAffordable = affordabilityRatio <= 0.5; // 是否負擔得起（負擔比不超過50%）
            
            const results = `
                <div style="line-height: 1.3;">
                    <div class="loan-result-card" style="margin-bottom: 0.4rem;">
                        <div class="loan-result-title" style="margin-bottom: 0.4rem; font-size: 0.85rem;">💰 房屋資訊</div>
                        <div class="loan-result-grid" style="gap: 0.2rem; font-size: 0.75rem;">
                            <div>總價：</div><div class="font-semibold">${Math.round(housePrice / 10000)}萬</div>
                            <div>貸款：</div><div class="font-semibold text-blue-600">${Math.round(loanAmount / 10000)}萬${existingLoan === 'youth' && normalLoanAmount > 0 ? ` (新青安${Math.round(youthLoanAmount/10000)}萬@${(youthInterestRate*100).toFixed(1)}%+一般${Math.round(normalLoanAmount/10000)}萬@${(normalInterestRate*100).toFixed(1)}%)` : existingLoan === 'youth' ? ' @1.8%' : ''}</div>
                            <div>成數：</div><div class="font-semibold">${(loanRatio * 100).toFixed(0)}%</div>
                            <div>自備款：</div><div class="font-semibold text-red-600">${Math.round(downPayment / 10000)}萬</div>
                        </div>
                    </div>
                    
                    <div class="loan-result-card" style="margin-bottom: 0.4rem;">
                        <div class="loan-result-title" style="margin-bottom: 0.4rem; font-size: 0.85rem;">🏦 貸款條件</div>
                        <div class="loan-result-grid" style="gap: 0.2rem; font-size: 0.75rem;">
                            <div>年限：</div><div class="font-semibold">${loanYears}年</div>
                            <div>利率：</div><div class="font-semibold">${(interestRate * 100).toFixed(2)}%</div>
                            <div>還款：</div><div class="font-semibold">${repaymentType === 'equal_payment' ? '等額本息' : '等額本金'}</div>
                            <div>寬限期：</div><div class="font-semibold">${gracePeriod > 0 ? (gracePeriod === 5 ? '新青安5年' : `${gracePeriod}年`) : '無'}</div>
                            ${gracePeriod > 0 ? `<div>寬限期月付：</div><div class="font-semibold text-green-600">${Math.round(gracePayment).toLocaleString()}元</div>` : ''}
                            <div>正常期月付：</div><div class="font-semibold text-blue-600">${Math.round(monthlyPayment).toLocaleString()}元</div>
                            <div>總利息：</div><div class="font-semibold text-orange-600">${(totalInterest / 10000).toFixed(1)}萬</div>
                        </div>
                    </div>
                    
                    <div class="loan-result-card" style="margin-bottom: 0.4rem;">
                        <div class="loan-result-title" style="margin-bottom: 0.4rem; font-size: 0.85rem;">📋 雜項費用</div>
                        <div class="loan-result-grid" style="gap: 0.2rem; font-size: 0.75rem;">
                            <div>代書費+契稅：</div><div class="font-semibold">${serviceFee.toLocaleString()}元</div>
                            <div>貸書潤筆費：</div><div class="font-semibold">${notaryFee.toLocaleString()}元</div>
                            <div>仲介費(${agentFeeRate}%)：</div><div class="font-semibold">${Math.round(agentFee).toLocaleString()}元</div>
                            <div class="font-bold">雜費總計：</div><div class="font-bold text-red-600">${totalFees.toLocaleString()}元</div>
                        </div>
                    </div>
                    
                    <div class="loan-result-row" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin-bottom: 0.4rem;">
                        <div class="loan-result-highlight" style="padding: 0.6rem;">
                            <h3 style="font-size: 0.8rem; margin-bottom: 0.2rem;">🎯 購屋資金需求</h3>
                            <div class="amount" style="font-size: 1.1rem;">${(totalCost / 10000).toFixed(1)}萬</div>
                            <p style="opacity: 0.9; margin-top: 0.2rem; font-size: 0.7rem;">自備款+雜費</p>
                        </div>
                        
                        <div class="loan-result-highlight" style="padding: 0.6rem;">
                            <h3 style="font-size: 0.8rem; margin-bottom: 0.2rem;">💳 每月負擔</h3>
                            <div class="amount" style="font-size: 1.1rem;">${Math.round(monthlyPayment).toLocaleString()}元</div>
                            <p style="opacity: 0.9; margin-top: 0.2rem; font-size: 0.7rem;">${gracePeriod > 0 ? '正常期月付' : '房貸月付'}</p>
                        </div>
                    </div>
                    
                    <div class="loan-result-card" style="margin-bottom: 0.4rem;">
                        <div class="loan-result-title" style="margin-bottom: 0.4rem; font-size: 0.85rem;">📊 負擔能力分析</div>
                        <div class="loan-result-grid" style="gap: 0.2rem; font-size: 0.75rem;">
                            <div>負債比：</div><div class="font-semibold ${debtRatio > 0.3 ? 'text-red-600' : debtRatio > 0.2 ? 'text-orange-600' : 'text-green-600'}">${(debtRatio * 100).toFixed(1)}%</div>
                            <div>房貸負擔比：</div><div class="font-semibold ${affordabilityRatio > 0.5 ? 'text-red-600' : affordabilityRatio > 0.3 ? 'text-orange-600' : 'text-green-600'}">${(affordabilityRatio * 100).toFixed(1)}%</div>
                            <div>建議月收入：</div><div class="font-semibold text-blue-600">${Math.round(recommendedIncome / 10000).toFixed(1)}萬</div>
                            <div>負擔評估：</div><div class="font-semibold ${isAffordable ? 'text-green-600' : 'text-red-600'}">${isAffordable ? '✅ 可負擔' : '⚠️ 負擔過重'}</div>
                        </div>
                    </div>
                    
                </div>
            `;
            
            document.getElementById('modalLoanResults').innerHTML = results;
        }
        
        
        // 急售倒數計時功能
        function updateUrgentCountdown() {
            // 直接顯示「低自備」，不再使用倒數計時
            document.getElementById('urgentCountdown').textContent = '低自備';
        }
        
        // 頁面載入時啟動倒數計時
        document.addEventListener('DOMContentLoaded', function() {
            // 立即更新一次
            updateUrgentCountdown();
            
            // 每秒更新一次
            setInterval(updateUrgentCountdown, 1000);
        });
        
        // 複製 LINE ID 功能
        document.getElementById('copyLineId').addEventListener('click', async ()=>{
            try {
                await navigator.clipboard.writeText('@931aeinu');
                alert('已複製 LINE ID：@931aeinu');
            } catch(e) {
                // 備用方案：使用舊的複製方法
                const textArea = document.createElement('textarea');
                textArea.value = '@931aeinu';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                alert('已複製 LINE ID：@931aeinu');
            }
        });

        // 客戶見證輪播功能
        let currentTestimonialIndex = 0;
        const testimonialSlides = document.getElementById('testimonialSlides');
        const testimonialPrev = document.getElementById('testimonialPrev');
        const testimonialNext = document.getElementById('testimonialNext');
        const totalTestimonials = document.querySelectorAll('.testimonial-slide').length;

        function updateTestimonialCarousel() {
            testimonialSlides.style.transform = `translateX(-${currentTestimonialIndex * 100}%)`;
        }

        testimonialPrev.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex > 0 ? currentTestimonialIndex - 1 : totalTestimonials - 1;
            updateTestimonialCarousel();
        });

        testimonialNext.addEventListener('click', () => {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        });

        // 自動播放客戶見證
        setInterval(() => {
            currentTestimonialIndex = currentTestimonialIndex < totalTestimonials - 1 ? currentTestimonialIndex + 1 : 0;
            updateTestimonialCarousel();
        }, 5000);

        // 照片燈箱功能
        let currentPhotoIndex = 0;
        let currentPhotoSet = '';
        let photoSets = {
            'property1': {
                images: [
                    { src: 'images/2-1/客廳.jpg', title: '客廳' },
                    { src: 'images/2-1/客廳視角2.jpg', title: '客廳視角2' },
                    { src: 'images/2-1/客廳視角3.jpg', title: '客廳視角3' },
                    { src: 'images/2-1/客廳視角4.jpg', title: '客廳視角4' },
                    { src: 'images/2-1/玄關.jpg', title: '玄關' },
                    { src: 'images/2-1/主臥房.jpg', title: '主臥房' },
                    { src: 'images/2-1/主臥房2.jpg', title: '主臥房2' },
                    { src: 'images/2-1/次臥房.jpg', title: '次臥房' },
                    { src: 'images/2-1/衛浴.jpg', title: '衛浴' },
                    { src: 'images/2-1/陽台照片.jpg', title: '陽台照片' },
                    { src: 'images/2-1/陽台照片2.jpg', title: '陽台照片2' },
                    { src: 'images/2-1/格局圖.png', title: '格局圖' }
                ]
            },
            'property1b': {
                images: [
                    { src: 'images/2-2/客廳.jpg', title: '客廳' },
                    { src: 'images/2-2/客餐廳.jpg', title: '客餐廳' },
                    { src: 'images/2-2/主臥房.jpg', title: '主臥房' },
                    { src: 'images/2-2/次臥房.jpg', title: '次臥房' },
                    { src: 'images/2-2/廚房.jpg', title: '廚房' },
                    { src: 'images/2-2/衛浴.jpg', title: '衛浴' },
                    { src: 'images/2-2/格局圖.jpg', title: '格局圖' }
                ]
            },
            'property2': {
                images: [
                    { src: 'images/3-1/客廳.jpg', title: '客廳' },
                    { src: 'images/3-1/客廳1.jpg', title: '客廳1' },
                    { src: 'images/3-1/客廳2.jpg', title: '客廳2' },
                    { src: 'images/3-1/廚房.jpg', title: '廚房' },
                    { src: 'images/3-1/主臥.jpg', title: '主臥' },
                    { src: 'images/3-1/次臥房-1.jpg', title: '次臥房-1' },
                    { src: 'images/3-1/次臥房-1-1.jpg', title: '次臥房-1-1' },
                    { src: 'images/3-1/次臥房2.jpg', title: '次臥房2' },
                    { src: 'images/3-1/次臥房2-1.jpg', title: '次臥房2-1' },
                    { src: 'images/3-1/次臥房3.jpg', title: '次臥房3' },
                    { src: 'images/3-1/衛浴1.jpg', title: '衛浴1' },
                    { src: 'images/3-1/廁所.jpg', title: '廁所' },
                    { src: 'images/3-1/陽台.jpg', title: '陽台' },
                    { src: 'images/3-1/格局圖.jpg', title: '格局圖' }
                ]
            },
            'property2b': {
                images: [
                    { src: 'images/3-2/客廳.jpg', title: '客廳' },
                    { src: 'images/3-2/主臥.jpg', title: '主臥' },
                    { src: 'images/3-2/主臥1.jpg', title: '主臥1' },
                    { src: 'images/3-2/廚房.jpg', title: '廚房' },
                    { src: 'images/3-2/後陽台.jpg', title: '後陽台' },
                    { src: 'images/3-2/房間.jpg', title: '房間' },
                    { src: 'images/3-2/衛浴.jpg', title: '衛浴' },
                    { src: 'images/3-2/陽台景觀.jpg', title: '陽台景觀' },
                    { src: 'images/3-2/B205CS178329j.jpg', title: 'B205CS178329j' },
                    { src: 'images/3-2/B205CS178329k.jpg', title: 'B205CS178329k' },
                    { src: 'images/3-2/格局圖.jpg', title: '格局圖' }
                ]
            },
            'property3a': {
                images: [
                    { src: 'images/4-1/客廳.jpg', title: '客廳' },
                    { src: 'images/4-1/廚房.jpg', title: '廚房' },
                    { src: 'images/4-1/主臥房視角.jpg', title: '主臥房視角' },
                    { src: 'images/4-1/主臥房視角2.jpg', title: '主臥房視角2' },
                    { src: 'images/4-1/次臥房.jpg', title: '次臥房' },
                    { src: 'images/4-1/次臥房3.jpg', title: '次臥房3' },
                    { src: 'images/4-1/次臥房4.jpg', title: '次臥房4' },
                    { src: 'images/4-1/衛浴.jpg', title: '衛浴' },
                    { src: 'images/4-1/前陽台.jpg', title: '前陽台' },
                    { src: 'images/4-1/前陽台景觀.jpg', title: '前陽台景觀' },
                    { src: 'images/4-1/後陽台.jpg', title: '後陽台' },
                    { src: 'images/4-1/陽台景觀.jpg', title: '陽台景觀' },
                    { src: 'images/4-1/格局圖.jpg', title: '格局圖' }
                ]
            },
            'property3b': {
                images: [
                    { src: 'images/4-2/客廳全景.jpg', title: '客廳全景' },
                    { src: 'images/4-2/客廳細節.jpg', title: '客廳細節' },
                    { src: 'images/4-2/客廳角度二.jpg', title: '客廳角度二' },
                    { src: 'images/4-2/廚房.jpg', title: '廚房' },
                    { src: 'images/4-2/主臥室.jpg', title: '主臥室' },
                    { src: 'images/4-2/次臥室.jpg', title: '次臥室' },
                    { src: 'images/4-2/次臥房3.jpg', title: '次臥房3' },
                    { src: 'images/4-2/次臥房4.jpg', title: '次臥房4' },
                    { src: 'images/4-2/臥室細節.jpg', title: '臥室細節' },
                    { src: 'images/4-2/衛浴開窗.jpg', title: '衛浴開窗' },
                    { src: 'images/4-2/主臥衛浴開窗.jpg', title: '主臥衛浴開窗' },
                    { src: 'images/4-2/後陽台.jpg', title: '後陽台' },
                    { src: 'images/4-2/陽台景觀.jpg', title: '陽台景觀' },
                    { src: 'images/4-2/格局圖.jpg', title: '格局圖' }
                ]
            }
        };
        
        function openLightbox(index, photoSet) {
            currentPhotoIndex = index;
            currentPhotoSet = photoSet;
            
            const lightbox = document.getElementById('photoLightbox');
            const mainImage = document.getElementById('lightboxMainImage');
            const title = document.getElementById('lightboxTitle');
            const counter = document.getElementById('lightboxCounter');
            const thumbnails = document.getElementById('lightboxThumbnails');
            
            // 顯示燈箱
            lightbox.style.display = 'block';
            document.body.style.overflow = 'hidden';
            
            // 更新主圖
            const currentPhoto = photoSets[photoSet].images[index];
            mainImage.src = currentPhoto.src;
            mainImage.alt = currentPhoto.title;
            
            // 更新標題和計數器
            title.textContent = currentPhoto.title;
            counter.textContent = `${index + 1} / ${photoSets[photoSet].images.length}`;
            
            // 生成縮圖
            thumbnails.innerHTML = '';
            photoSets[photoSet].images.forEach((photo, i) => {
                const thumbnail = document.createElement('img');
                thumbnail.src = photo.src;
                thumbnail.alt = photo.title;
                thumbnail.className = 'lightbox-thumbnail';
                if (i === index) thumbnail.classList.add('active');
                thumbnail.onclick = () => switchToImage(i);
                thumbnails.appendChild(thumbnail);
            });
            
            // 綁定鍵盤事件
            document.addEventListener('keydown', handleKeyPress);
        }
        
        function closeLightbox() {
            document.getElementById('photoLightbox').style.display = 'none';
            document.body.style.overflow = 'auto';
            document.removeEventListener('keydown', handleKeyPress);
        }
        
        function nextImage() {
            const totalImages = photoSets[currentPhotoSet].images.length;
            currentPhotoIndex = (currentPhotoIndex + 1) % totalImages;
            switchToImage(currentPhotoIndex);
        }
        
        function previousImage() {
            const totalImages = photoSets[currentPhotoSet].images.length;
            currentPhotoIndex = (currentPhotoIndex - 1 + totalImages) % totalImages;
            switchToImage(currentPhotoIndex);
        }
        
        function switchToImage(index) {
            currentPhotoIndex = index;
            const currentPhoto = photoSets[currentPhotoSet].images[index];
            
            // 更新主圖
            document.getElementById('lightboxMainImage').src = currentPhoto.src;
            document.getElementById('lightboxTitle').textContent = currentPhoto.title;
            document.getElementById('lightboxCounter').textContent = `${index + 1} / ${photoSets[currentPhotoSet].images.length}`;
            
            // 更新縮圖活動狀態
            const thumbnails = document.querySelectorAll('.lightbox-thumbnail');
            thumbnails.forEach((thumb, i) => {
                thumb.classList.toggle('active', i === index);
            });
        }
        
        function handleKeyPress(event) {
            switch(event.key) {
                case 'Escape':
                    closeLightbox();
                    break;
                case 'ArrowLeft':
                    previousImage();
                    break;
                case 'ArrowRight':
                    nextImage();
                    break;
            }
        }
        
        // 點擊燈箱背景關閉
        document.getElementById('photoLightbox').addEventListener('click', function(event) {
            if (event.target === this) {
                closeLightbox();
            }
        });
        
        // 分頁切換功能
        function switchTab(tabName) {
            // 隱藏所有分頁內容
            const tabPanes = document.querySelectorAll('.tab-pane');
            tabPanes.forEach(pane => {
                pane.classList.remove('active');
            });
            
            // 移除所有按鈕的active狀態
            const tabButtons = document.querySelectorAll('.tab-button');
            tabButtons.forEach(button => {
                button.classList.remove('active');
                button.style.background = 'transparent';
                button.style.color = '#666';
                button.style.boxShadow = 'none';
            });
            
            // 顯示選中的分頁
            const activePane = document.getElementById('tab-' + tabName);
            if (activePane) {
                activePane.classList.add('active');
            }
            
            // 激活選中的按鈕
            const activeButton = event.target;
            activeButton.classList.add('active');
            activeButton.style.background = 'linear-gradient(45deg, #667eea, #764ba2)';
            activeButton.style.color = 'white';
            activeButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
            
            // 同步切換地圖分頁
            switchMapTab(tabName);
        }
        
        // 地圖分頁同步切換功能
        function switchMapTab(tabName) {
            // 隱藏所有地圖內容
            const mapContents = document.querySelectorAll('.map-content');
            mapContents.forEach(content => {
                content.style.display = 'none';
            });
            
            // 重置所有地圖標籤按鈕樣式
            const mapTabs = document.querySelectorAll('.map-tab');
            mapTabs.forEach(tab => {
                tab.style.background = '#95a5a6';
            });
            
            // 根據物件分頁切換對應的地圖
            let mapId = '';
            switch(tabName) {
                case 'property1':
                    mapId = 'map-2room';
                    break;
                case 'property2':
                    mapId = 'map-3room';
                    break;
                case 'property3':
                    mapId = 'map-4room';
                    break;
            }
            
            // 顯示對應的地圖內容
            if (mapId) {
                const selectedMapContent = document.getElementById(mapId);
                if (selectedMapContent) {
                    selectedMapContent.style.display = 'block';
                }
                
                // 高亮對應的地圖標籤按鈕
                const mapTabButtons = document.querySelectorAll('.map-tab');
                mapTabButtons.forEach(tab => {
                    if (tab.onclick && tab.onclick.toString().includes(mapId)) {
                        tab.style.background = '#3498db';
                    }
                });
            }
        }
