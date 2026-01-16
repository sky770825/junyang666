// 物件內容模組 - 從原始 index.html 提取
// 包含物件卡片、統計資訊、相關連結等內容

// 物件卡片生成函數
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.innerHTML = `
        ${property.status && property.statusText ? `
            <div class="property-status-tag status-${property.status}">
                ${property.statusText}
            </div>
        ` : ''}
        <h3 class="property-title">${property.title}</h3>
        
        <!-- 照片滾動區 -->
        <div class="photo-scroll-container" style="margin: 0.6rem 0; overflow-x: auto; padding: 0.5rem 0;">
            <div class="photo-scroll" style="display: flex; gap: 0.5rem; width: max-content;">
                ${property.images.map((img, index) => `
                    <div class="photo-item" onclick="openLightbox(${index}, '${property.id}')" 
                         style="flex-shrink: 0; width: 80px; height: 60px; border-radius: 4px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <img src="${img}" alt="物件照片" style="width: 100%; height: 100%; object-fit: cover;" loading="lazy" onerror="this.style.display='none'">
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- 物件資訊 -->
        <div class="property-info" style="padding: 0.8rem; background: #f8f9fa; border-radius: 8px; margin: 0.5rem 0;">
            <div style="display: flex; gap: 0.3rem; margin-bottom: 0.6rem;">
                <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 4px; font-weight: 600;">
                    <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">售價</div>
                    <div style="font-size: 1.2rem;">${property.price}</div>
                </div>
                <div style="flex: 1; text-align: center; padding: 0.3rem 0.2rem; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 4px; font-weight: 600;">
                    <div style="font-size: 0.7rem; opacity: 0.9; margin-bottom: 0.1rem;">坪數</div>
                    <div style="font-size: 1.2rem;">${property.total_area || property.area || '未設定'}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 0.6rem;">
                <strong>📍 地址：</strong>${property.address}
            </div>
            
            ${property.layout ? `
            <div style="margin-bottom: 0.6rem; display: flex; gap: 0.3rem;">
                <div style="flex: 1; text-align: center; padding: 0.2rem 0.1rem; background: #e8f5e8; border-radius: 4px; font-size: 0.8rem;">
                    <strong>格局：</strong>${property.layout}
                </div>
                <div style="flex: 1; text-align: center; padding: 0.2rem 0.1rem; background: #e8f5e8; border-radius: 4px; font-size: 0.8rem;">
                    <strong>屋齡：</strong>${property.age || '未設定'}
                </div>
            </div>
            ` : ''}
            
            ${property.parking_type ? `
            <div style="margin-bottom: 0.6rem;">
                <strong>🚗 車位：</strong>${property.parking_type} (${property.parking_space || '未設定'})
            </div>
            ` : ''}
        </div>

        <!-- 聯絡資訊 -->
        <div class="loan-info" style="padding: 0.8rem; background: linear-gradient(135deg, #e8f5e8, #d4edda); border-radius: 8px; margin: 0.5rem 0;">
            <div style="text-align: center; margin-bottom: 0.5rem;">
                <h4 style="margin: 0; color: #2c3e50; font-size: 0.9rem;">🏠 專業服務 | 值得信賴</h4>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem;">
                <button onclick="window.open('tel:0925666597')" 
                        style="padding: 0.4rem; background: linear-gradient(135deg, #28a745, #20c997); color: white; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: all 0.3s ease;">
                    <i class="fas fa-phone" style="margin-right: 4px;"></i>立即來電
                </button>
                <button onclick="window.open('https://line.me/R/ti/p/@931aeinu')" 
                        style="padding: 0.4rem; background: linear-gradient(135deg, #00c851, #007e33); color: white; border: none; border-radius: 4px; font-size: 0.8rem; cursor: pointer; transition: all 0.3s ease;">
                    <i class="fab fa-line" style="margin-right: 4px;"></i>LINE諮詢
                </button>
            </div>
        </div>
    `;
    return card;
}

// 統計資訊生成函數
function createStatsSection() {
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer) {
        statsContainer.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin: 2rem 0; text-align: center;">
                <div style="padding: 1rem; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border-radius: 8px;">
                    <h3 style="margin: 0; font-size: 1.5rem;">6</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">總物件數</p>
                </div>
                <div style="padding: 1rem; background: linear-gradient(135deg, #f093fb, #f5576c); color: white; border-radius: 8px;">
                    <h3 style="margin: 0; font-size: 1.5rem;">2</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">2房物件</p>
                </div>
                <div style="padding: 1rem; background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; border-radius: 8px;">
                    <h3 style="margin: 0; font-size: 1.5rem;">2</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">3房物件</p>
                </div>
                <div style="padding: 1rem; background: linear-gradient(135deg, #43e97b, #38f9d7); color: white; border-radius: 8px;">
                    <h3 style="margin: 0; font-size: 1.5rem;">2</h3>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">4房物件</p>
                </div>
            </div>
        `;
    }
}

// 相關資料連結生成函數
function createRelatedLinksSection() {
    return `
        <!-- 相關資料連結 -->
        <section style="background: #f8f9fa; padding: 1.2rem 0; margin: 1rem 0; text-align: center;">
            <h2 style="color: #2c3e50; margin-bottom: 0.8rem;">📎 相關資料連結</h2>
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 0.8rem; max-width: 1000px; margin: 0 auto;">
                <a href="https://realtor.houseprice.tw/agent/buy/0925666597/" class="contact-button" target="_blank" style="background: linear-gradient(45deg, #2ecc71, #27ae60); color: white; padding: 0.6rem 1.2rem; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(46, 204, 113, 0.3); min-width: 180px; text-align: center; justify-content: center; font-size: 0.9rem;">🏠 更多物件資料</a>
                <a href="https://www.tiktok.com/@aihouse168" class="contact-button" target="_blank" style="background: linear-gradient(45deg, #000000, #333333); color: white; padding: 0.6rem 1.2rem; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(0, 0, 0, 0.3); min-width: 180px; text-align: center; justify-content: center; font-size: 0.9rem;">🎵 TikTok短影音</a>
                <a href="https://sky770825.github.io/junyang666/checkpice" class="contact-button" target="_blank" style="background: linear-gradient(45deg, #ff6b6b, #ee5a24); color: white; padding: 0.6rem 1.2rem; border-radius: 20px; text-decoration: none; font-weight: bold; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(255, 107, 107, 0.3); min-width: 180px; text-align: center; justify-content: center; font-size: 0.9rem;">🧮 房產比價試算</a>
                
                <!-- 房產資訊參考下拉選單 -->
                <div style="position: relative; display: inline-block;">
                    <button id="propertyInfoDropdown" style="background: linear-gradient(45deg, #667eea, #764ba2); color: white; padding: 0.6rem 1.2rem; border-radius: 20px; border: none; font-weight: bold; display: inline-flex; align-items: center; gap: 0.4rem; transition: all 0.3s ease; box-shadow: 0 3px 12px rgba(102, 126, 234, 0.3); min-width: 180px; text-align: center; justify-content: center; font-size: 0.9rem; cursor: pointer;">
                        📊 房產資訊參考 <span style="font-size: 0.8rem;">▼</span>
                    </button>
                    <div id="propertyInfoMenu" style="position: absolute; top: 100%; left: 0; background: white; border-radius: 12px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); min-width: 250px; z-index: 1000; display: none; margin-top: 0.5rem; overflow: hidden;">
                        <a href="https://drive.google.com/file/d/1NddGgXcysK-QRoozRA4XXww6c-NUv-OJ/view?usp=drive_link" target="_blank" style="display: block; padding: 0.8rem 1rem; color: #2c3e50; text-decoration: none; border-bottom: 1px solid #f0f0f0; transition: all 0.3s ease; font-size: 0.9rem;">
                            📈 楊梅優勢簡報
                        </a>
                        <a href="https://drive.google.com/file/d/1PeGDx2IruOjWkeIHgVVqpk0tceB0l7Vg/view?usp=drive_link" target="_blank" style="display: block; padding: 0.8rem 1rem; color: #2c3e50; text-decoration: none; border-bottom: 1px solid #f0f0f0; transition: all 0.3s ease; font-size: 0.9rem;">
                            🏦 新青安寬鬆政策
                        </a>
                        <a href="https://drive.google.com/file/d/1vVluYlY81Ew76Dc4ZyWI_Y9CZ3cWbj0t/view?usp=drive_link" target="_blank" style="display: block; padding: 0.8rem 1rem; color: #2c3e50; text-decoration: none; transition: all 0.3s ease; font-size: 0.9rem;">
                            📊 2025年房產分析
                        </a>
                    </div>
                </div>
            </div>
        </section>
    `;
}

// 客戶見證生成函數
function createTestimonialSection() {
    return `
        <!-- 客戶見證 -->
        <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 1.2rem 0.8rem; margin: 0.8rem 0; position: relative; overflow: hidden;">
            <!-- 背景裝飾 -->
            <div style="position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: url('data:image/svg+xml,<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; viewBox=&quot;0 0 100 100&quot;><circle cx=&quot;20&quot; cy=&quot;20&quot; r=&quot;2&quot; fill=&quot;rgba(255,255,255,0.1)&quot;/><circle cx=&quot;80&quot; cy=&quot;80&quot; r=&quot;1&quot; fill=&quot;rgba(255,255,255,0.1)&quot;/><circle cx=&quot;60&quot; cy=&quot;30&quot; r=&quot;1.5&quot; fill=&quot;rgba(255,255,255,0.1)&quot;/></svg>') repeat; animation: float 20s infinite linear;"></div>
            
            <h2 style="text-align: center; margin-bottom: 1.2rem; color: white; font-size: 1.4rem; font-weight: 800; text-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: 2;">💬 客戶見證</h2>
            
            <div style="max-width: 800px; margin: 0 auto; position: relative; z-index: 2;">
                <div id="testimonialSlides" style="display: flex; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);">
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「洽談透明、節奏流暢，從估價到交屋都超放心！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 陳先生（屋主）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「實地看屋安排有效率，重點介紹到位，沒有話術。」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 吳小姐（買方）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「文件與流程超專業，價格談成比預期更好！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 葉先生（買方）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「劉小姐服務超專業，從看屋到成交都很細心！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 林太太（買方）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「蔡先生很誠實，不會亂推銷，價格也很合理。」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 王先生（屋主）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「服務態度很好，專業度也很高，推薦給需要買房的朋友！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 張小姐（買方）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「從看屋到簽約，整個流程都很順暢，非常滿意！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 李太太（買方）</p>
                    </div>
                    <div class="testimonial-slide" style="min-width: 100%; padding: 1.4rem; text-align: center; background: rgba(255,255,255,0.95); border-radius: 12px; box-shadow: 0 6px 20px rgba(0,0,0,0.2); backdrop-filter: blur(10px);">
                        <div style="color: #ffd700; font-size: 1.3rem; margin-bottom: 1rem; text-shadow: 0 1px 2px rgba(0,0,0,0.1);">⭐⭐⭐⭐⭐</div>
                        <p style="font-size: 0.95rem; color: #2c3e50; margin-bottom: 1rem; line-height: 1.5; font-weight: 500;">「賣房過程很順利，價格也達到預期，非常推薦！」</p>
                        <p style="color: #7f8c8d; font-weight: 600; font-size: 0.85rem;">— 林先生（屋主）</p>
                    </div>
                </div>
                <div style="display: flex; gap: 0.6rem; justify-content: center; margin-top: 1.2rem;">
                    <button id="testimonialPrev" style="background: linear-gradient(45deg, #ff6b6b, #ee5a52); color: white; border: none; padding: 0.5rem 1rem; border-radius: 18px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(255,107,107,0.3);">‹ 上一則</button>
                    <button id="testimonialNext" style="background: linear-gradient(45deg, #4ecdc4, #44a08d); color: white; border: none; padding: 0.5rem 1rem; border-radius: 18px; cursor: pointer; font-size: 0.85rem; font-weight: 600; transition: all 0.3s ease; box-shadow: 0 2px 10px rgba(78,205,196,0.3);">下一則 ›</button>
                </div>
            </div>
        </section>
    `;
}

// 匯出函數供其他模組使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        createPropertyCard,
        createStatsSection,
        createRelatedLinksSection,
        createTestimonialSection
    };
}
