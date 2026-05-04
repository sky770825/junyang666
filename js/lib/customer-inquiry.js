(function () {
    const LINE_ID = '@931aeinu';
    const LINE_FALLBACK_URL = 'https://lin.ee/Lax7jMka';
    const INQUIRY_TABLE = 'customer_inquiries';

    let inquiryClient = null;
    let activeProperty = {};

    function safeText(value) {
        return String(value || '').replace(/[&<>"']/g, function (char) {
            return ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[char];
        });
    }

    function getSupabaseClient() {
        if (inquiryClient) return inquiryClient;

        if (typeof window.createSupabaseClient === 'function') {
            inquiryClient = window.createSupabaseClient();
            return inquiryClient;
        }

        if (window.supabaseClient) {
            inquiryClient = window.supabaseClient;
            return inquiryClient;
        }

        if (window.supabase && window.SUPABASE_CONFIG) {
            inquiryClient = window.supabase.createClient(
                window.SUPABASE_CONFIG.url,
                window.SUPABASE_CONFIG.anonKey,
                window.SUPABASE_CONFIG.defaultOptions || {}
            );
            return inquiryClient;
        }

        return null;
    }

    function normalizeProperty(property) {
        const source = property || {};
        return {
            id: source.id || source.property_id || '',
            number: source.number || source.property_number || '',
            title: source.title || source.property_title || '',
            price: source.price || source.property_price || '',
            address: source.address || source.property_address || '',
            layout: source.layout || '',
            type: source.type || '',
            total_area: source.total_area || source.totalArea || '',
            detail_url: source.detail_url || source.detailUrl || ''
        };
    }

    function getCurrentProperty() {
        if (window.currentProperty) return normalizeProperty(window.currentProperty);
        if (window.__currentInquiryProperty) return normalizeProperty(window.__currentInquiryProperty);
        return {};
    }

    function propertyFromTrigger(trigger) {
        const holder = trigger.closest('[data-property-id], [data-property-number]') || trigger;
        const dataset = holder.dataset || {};
        const direct = trigger.dataset || {};
        return normalizeProperty({
            id: direct.propertyId || dataset.propertyId,
            number: direct.propertyNumber || dataset.propertyNumber,
            title: direct.propertyTitle || dataset.propertyTitle,
            price: direct.propertyPrice || dataset.propertyPrice,
            address: direct.propertyAddress || dataset.propertyAddress,
            type: direct.propertyType || dataset.propertyType,
            layout: direct.propertyLayout || dataset.propertyLayout,
            total_area: direct.propertyTotalArea || dataset.propertyTotalArea,
            detail_url: direct.propertyDetailUrl || dataset.propertyDetailUrl
        });
    }

    function buildDetailUrl(property) {
        const prop = normalizeProperty(property);
        if (prop.detail_url) return prop.detail_url;
        const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
        if (prop.number) return base + 'property-detail.html?number=' + encodeURIComponent(prop.number);
        if (prop.id) return base + 'property-detail.html?id=' + encodeURIComponent(prop.id);
        return window.location.href;
    }

    function buildLineMessage(property) {
        const prop = normalizeProperty(property);
        const lines = ['您好，我想詢問物件。'];

        if (prop.number) lines.push('物件編號：' + prop.number);
        if (prop.title) lines.push('物件名稱：' + prop.title);
        if (prop.price) lines.push('開價：' + prop.price);
        if (prop.address) lines.push('位置：' + prop.address);
        if (prop.layout || prop.total_area) {
            lines.push('格局坪數：' + [prop.layout, prop.total_area].filter(Boolean).join(' / '));
        }
        lines.push('連結：' + buildDetailUrl(prop));
        lines.push('方便的話，請協助安排看屋或提供更多資料，謝謝。');

        return lines.join('\n');
    }

    function buildLineInquiryUrl(property) {
        const message = buildLineMessage(property || getCurrentProperty());
        return 'https://line.me/R/oaMessage/' + LINE_ID + '/?' + encodeURIComponent(message);
    }

    function setStatus(type, message) {
        const status = document.getElementById('customer-inquiry-status');
        if (!status) return;
        status.className = 'customer-inquiry-status ' + (type || 'info');
        status.textContent = message || '';
        status.hidden = !message;
    }

    function ensureStyles() {
        if (document.getElementById('customer-inquiry-styles')) return;

        const style = document.createElement('style');
        style.id = 'customer-inquiry-styles';
        style.textContent = `
            .customer-inquiry-modal[hidden] { display: none; }
            .customer-inquiry-modal {
                position: fixed;
                inset: 0;
                z-index: 10020;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1rem;
                background: rgba(15, 23, 42, 0.52);
            }
            .customer-inquiry-dialog {
                width: min(560px, 100%);
                max-height: min(92vh, 760px);
                overflow: auto;
                background: #ffffff;
                border-radius: 16px;
                box-shadow: 0 24px 80px rgba(15, 23, 42, 0.32);
                border: 1px solid rgba(226, 232, 240, 0.95);
            }
            .customer-inquiry-head {
                display: flex;
                justify-content: space-between;
                gap: 1rem;
                padding: 1.2rem 1.25rem 0.8rem;
                border-bottom: 1px solid #e5e7eb;
            }
            .customer-inquiry-head h2 {
                margin: 0;
                color: #162033;
                font-size: 1.18rem;
                letter-spacing: 0;
            }
            .customer-inquiry-close {
                width: 36px;
                height: 36px;
                border: 1px solid #cbd5e1;
                border-radius: 999px;
                background: #fff;
                color: #334155;
                cursor: pointer;
                font-size: 1.35rem;
                line-height: 1;
            }
            .customer-inquiry-body { padding: 1.2rem 1.25rem 1.3rem; }
            .customer-inquiry-summary {
                margin: 0 0 1rem;
                padding: 0.85rem;
                border-radius: 10px;
                background: #f8fafc;
                border: 1px solid #e2e8f0;
                color: #334155;
                line-height: 1.55;
                font-size: 0.92rem;
            }
            .customer-inquiry-form {
                display: grid;
                gap: 0.9rem;
            }
            .customer-inquiry-field {
                display: grid;
                gap: 0.35rem;
            }
            .customer-inquiry-field label {
                font-weight: 800;
                color: #334155;
                font-size: 0.92rem;
            }
            .customer-inquiry-field input,
            .customer-inquiry-field textarea {
                width: 100%;
                border: 1px solid #cbd5e1;
                border-radius: 10px;
                padding: 0.78rem 0.85rem;
                font-size: 1rem;
                line-height: 1.4;
                outline: none;
                background: #fff;
            }
            .customer-inquiry-field input:focus,
            .customer-inquiry-field textarea:focus {
                border-color: #2563eb;
                box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
            }
            .customer-inquiry-actions {
                display: grid;
                grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
                gap: 0.65rem;
                margin-top: 0.2rem;
            }
            .customer-inquiry-submit,
            .customer-inquiry-line {
                min-height: 46px;
                border: 0;
                border-radius: 12px;
                color: #fff;
                font-weight: 900;
                font-size: 0.95rem;
                cursor: pointer;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                text-align: center;
                gap: 0.35rem;
            }
            .customer-inquiry-submit { background: linear-gradient(135deg, #2563eb, #4f46e5); }
            .customer-inquiry-line { background: linear-gradient(135deg, #06c755, #059669); }
            .customer-inquiry-submit:disabled {
                opacity: 0.62;
                cursor: wait;
            }
            .customer-inquiry-status {
                margin: 0.35rem 0 0;
                padding: 0.72rem 0.8rem;
                border-radius: 10px;
                font-weight: 700;
                line-height: 1.5;
                font-size: 0.9rem;
            }
            .customer-inquiry-status.success {
                color: #065f46;
                background: #d1fae5;
                border: 1px solid #a7f3d0;
            }
            .customer-inquiry-status.error {
                color: #991b1b;
                background: #fee2e2;
                border: 1px solid #fecaca;
            }
            .customer-inquiry-status.info {
                color: #1e3a8a;
                background: #dbeafe;
                border: 1px solid #bfdbfe;
            }
            .customer-inquiry-note {
                margin: 0.25rem 0 0;
                color: #64748b;
                font-size: 0.82rem;
                line-height: 1.45;
            }
            @media (max-width: 520px) {
                .customer-inquiry-modal {
                    align-items: flex-end;
                    padding: 0.6rem;
                }
                .customer-inquiry-dialog {
                    max-height: 88vh;
                    border-radius: 16px 16px 12px 12px;
                }
                .customer-inquiry-actions {
                    grid-template-columns: 1fr;
                }
            }
        `;
        document.head.appendChild(style);
    }

    function ensureModal() {
        ensureStyles();
        let modal = document.getElementById('customer-inquiry-modal');
        if (modal) return modal;

        modal = document.createElement('div');
        modal.id = 'customer-inquiry-modal';
        modal.className = 'customer-inquiry-modal';
        modal.hidden = true;
        modal.innerHTML = `
            <div class="customer-inquiry-dialog" role="dialog" aria-modal="true" aria-labelledby="customer-inquiry-title">
                <div class="customer-inquiry-head">
                    <div>
                        <h2 id="customer-inquiry-title">預約看屋 / 問房</h2>
                        <p class="customer-inquiry-note">留下聯絡方式後，後台會保留紀錄，也可以直接用 LINE 傳送物件資料。</p>
                    </div>
                    <button type="button" class="customer-inquiry-close" data-inquiry-close aria-label="關閉">×</button>
                </div>
                <div class="customer-inquiry-body">
                    <p id="customer-inquiry-summary" class="customer-inquiry-summary"></p>
                    <form id="customer-inquiry-form" class="customer-inquiry-form">
                        <div class="customer-inquiry-field">
                            <label for="customer-inquiry-name">姓名 *</label>
                            <input id="customer-inquiry-name" name="name" autocomplete="name" required placeholder="請輸入姓名">
                        </div>
                        <div class="customer-inquiry-field">
                            <label for="customer-inquiry-phone">手機 / 電話 *</label>
                            <input id="customer-inquiry-phone" name="phone" autocomplete="tel" inputmode="tel" required placeholder="例如：0912-345-678">
                        </div>
                        <div class="customer-inquiry-field">
                            <label for="customer-inquiry-time">方便聯絡或看屋時間</label>
                            <input id="customer-inquiry-time" name="preferred_time" placeholder="例如：平日晚上、週六下午">
                        </div>
                        <div class="customer-inquiry-field">
                            <label for="customer-inquiry-message">想補充的需求</label>
                            <textarea id="customer-inquiry-message" name="message" rows="4" placeholder="例如：想看採光、車位、附近生活機能"></textarea>
                        </div>
                        <div class="customer-inquiry-actions">
                            <button type="submit" class="customer-inquiry-submit">送出預約</button>
                            <a id="customer-inquiry-line-link" class="customer-inquiry-line" target="_blank" rel="noopener">用 LINE 問房</a>
                        </div>
                        <p id="customer-inquiry-status" class="customer-inquiry-status info" hidden></p>
                    </form>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.addEventListener('click', function (event) {
            if (event.target === modal || event.target.closest('[data-inquiry-close]')) {
                closeInquiryForm();
            }
        });

        const form = modal.querySelector('#customer-inquiry-form');
        form.addEventListener('submit', submitInquiryForm);

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !modal.hidden) closeInquiryForm();
        });

        return modal;
    }

    function renderSummary(property) {
        const prop = normalizeProperty(property);
        const parts = [];
        if (prop.number) parts.push('編號 ' + prop.number);
        if (prop.title) parts.push(prop.title);
        if (prop.price) parts.push(prop.price);
        if (prop.address) parts.push(prop.address);

        return parts.length ? parts.join(' / ') : '未指定物件，送出後會以目前頁面作為來源。';
    }

    function openInquiryForm(property) {
        activeProperty = normalizeProperty(property || getCurrentProperty());
        window.__currentInquiryProperty = activeProperty;

        const modal = ensureModal();
        const summary = document.getElementById('customer-inquiry-summary');
        const lineLink = document.getElementById('customer-inquiry-line-link');

        summary.innerHTML = '<strong>詢問物件：</strong>' + safeText(renderSummary(activeProperty));
        lineLink.href = buildLineInquiryUrl(activeProperty);
        setStatus('', '');
        modal.hidden = false;

        const nameInput = document.getElementById('customer-inquiry-name');
        if (nameInput) setTimeout(function () { nameInput.focus(); }, 60);
    }

    function closeInquiryForm() {
        const modal = document.getElementById('customer-inquiry-modal');
        if (modal) modal.hidden = true;
    }

    async function submitInquiryForm(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const submitButton = form.querySelector('.customer-inquiry-submit');
        const formData = new FormData(form);
        const prop = normalizeProperty(activeProperty || getCurrentProperty());
        const phone = String(formData.get('phone') || '').trim();

        if (phone.replace(/[^\d+]/g, '').length < 8) {
            setStatus('error', '請留下可聯絡的手機或電話。');
            return;
        }

        const payload = {
            name: String(formData.get('name') || '').trim(),
            phone,
            preferred_time: String(formData.get('preferred_time') || '').trim(),
            message: String(formData.get('message') || '').trim(),
            property_id: prop.id || null,
            property_number: prop.number || null,
            property_title: prop.title || null,
            property_price: prop.price || null,
            source_url: buildDetailUrl(prop),
            source_page: window.location.href,
            user_agent: String(navigator.userAgent || '').slice(0, 500),
            status: 'new'
        };

        submitButton.disabled = true;
        setStatus('info', '正在送出詢問...');

        try {
            const client = getSupabaseClient();
            if (!client) throw new Error('Supabase 尚未載入');

            const { error } = await client.from(INQUIRY_TABLE).insert([payload]);
            if (error) throw error;

            form.reset();
            setStatus('success', '已收到您的詢問，我們會盡快與您聯絡。');
        } catch (error) {
            console.warn('customer inquiry submit failed:', error);
            setStatus('error', '目前線上表單暫時無法送出，請先點「用 LINE 問房」傳送物件資料。');
        } finally {
            submitButton.disabled = false;
        }
    }

    function openLineInquiry(property) {
        const url = buildLineInquiryUrl(property || getCurrentProperty());
        const opened = window.open(url, '_blank', 'noopener');
        if (!opened) window.location.href = LINE_FALLBACK_URL;
    }

    function attachGlobalInquiryHandlers() {
        if (document.documentElement.dataset.customerInquiryBound === 'true') return;
        document.documentElement.dataset.customerInquiryBound = 'true';

        document.addEventListener('click', function (event) {
            const trigger = event.target.closest('[data-action="line-inquiry"], [data-action="appointment"], [data-inquiry-action]');
            if (!trigger) return;

            const action = trigger.dataset.action || trigger.dataset.inquiryAction;
            if (action !== 'line-inquiry' && action !== 'appointment') return;

            const property = propertyFromTrigger(trigger);
            const mergedProperty = Object.values(property).some(Boolean) ? property : getCurrentProperty();

            event.preventDefault();

            if (action === 'line-inquiry') {
                openLineInquiry(mergedProperty);
            } else {
                openInquiryForm(mergedProperty);
            }
        });
    }

    window.CustomerInquiry = {
        LINE_ID,
        buildLineMessage,
        buildLineInquiryUrl,
        openLineInquiry,
        openInquiryForm,
        closeInquiryForm,
        attachGlobalInquiryHandlers,
        normalizeProperty
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachGlobalInquiryHandlers);
    } else {
        attachGlobalInquiryHandlers();
    }
})();
