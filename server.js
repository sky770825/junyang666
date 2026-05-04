// 物件管理後端 API
// 使用 Node.js + Express + SQLite + Multer

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_PATHS = [
    '/admin-dashboard',
    '/admin-dashboard.html',
    '/property-admin-db',
    '/property-admin-db.html',
    '/js/admin/',
    '/js/property-admin-db.js',
    '/css/admin-dashboard.css',
    '/css/property-admin-db.css',
    '/modules/related-links/backend.js',
    '/api/cache/properties/invalidate',
    '/api/customer-inquiries',
    '/api/customer-inquiries/',
];

const REMOVED_PUBLIC_PATHS = [
    '/games',
    '/games.html',
    '/mobile-games.js',
];

// Supabase 配置（從 supabase-config.js 讀取或直接設定）
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

// 初始化 Supabase 客戶端
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseAdmin = SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false, autoRefreshToken: false }
    })
    : null;

// ============================================
// 伺服器端快取（記憶體 TTL，減少資料庫查詢）
// ============================================
const CACHE_TTL_MS = 5 * 60 * 1000; // 預設 5 分鐘
const PROPERTIES_CACHE_TTL_MS = Number(process.env.PROPERTIES_CACHE_TTL_MS || 30 * 1000); // 物件資料需要更即時
const cache = new Map(); // key -> { data, expiresAt }

function getCached(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache(key, data, ttlMs = CACHE_TTL_MS) {
    cache.set(key, {
        data,
        expiresAt: Date.now() + ttlMs
    });
}

function invalidateCache(keyOrPrefix) {
    if (!keyOrPrefix) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
            cache.delete(key);
        }
    }
}

function normalizeRequestPath(pathname) {
    return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

function isAdminPath(pathname) {
    const normalizedPathname = normalizeRequestPath(pathname);
    return ADMIN_PATHS.some((adminPath) => {
        if (adminPath.endsWith('/')) return pathname.startsWith(adminPath);
        return normalizedPathname === adminPath;
    });
}

function isRemovedPublicPath(pathname) {
    return REMOVED_PUBLIC_PATHS.includes(normalizeRequestPath(pathname));
}

function parseBasicAuth(header) {
    if (!header || !header.startsWith('Basic ')) return null;

    try {
        const decoded = Buffer.from(header.slice('Basic '.length), 'base64').toString('utf8');
        const separator = decoded.indexOf(':');
        if (separator === -1) return null;

        return {
            username: decoded.slice(0, separator),
            password: decoded.slice(separator + 1),
        };
    } catch (error) {
        return null;
    }
}

function timingSafeEqual(a, b) {
    const left = String(a || '');
    const right = String(b || '');
    if (left.length !== right.length) return false;

    let result = 0;
    for (let i = 0; i < left.length; i += 1) {
        result |= left.charCodeAt(i) ^ right.charCodeAt(i);
    }
    return result === 0;
}

function protectPrivateRoutes(req, res, next) {
    if (isRemovedPublicPath(req.path)) {
        res.set('Cache-Control', 'no-store');
        return res.status(404).type('text/plain').send('Not found');
    }

    if (!isAdminPath(req.path)) {
        return next();
    }

    const expectedUsername = process.env.ADMIN_USERNAME || process.env.ADMIN_USER;
    const expectedPassword = process.env.ADMIN_PASSWORD;
    const isProduction = process.env.NODE_ENV === 'production';

    if (!expectedUsername || !expectedPassword) {
        if (!isProduction) return next();

        res.set('Cache-Control', 'no-store');
        return res.status(503).type('text/plain').send('Admin access is not configured. Set ADMIN_USERNAME and ADMIN_PASSWORD.');
    }

    const credentials = parseBasicAuth(req.get('Authorization'));
    const validUsername = credentials && timingSafeEqual(credentials.username, expectedUsername);
    const validPassword = credentials && timingSafeEqual(credentials.password, expectedPassword);

    if (!validUsername || !validPassword) {
        res.set('WWW-Authenticate', 'Basic realm="Junyang Admin", charset="UTF-8"');
        res.set('Cache-Control', 'no-store');
        return res.status(401).type('text/plain').send('Admin authentication required');
    }

    res.set('Cache-Control', 'no-store');
    return next();
}

// 中間件
// CORS 設定（允許所有來源，包括 127.0.0.1 和 localhost）
// 注意：origin 為 '*' 時不可搭配 credentials:true（瀏覽器會拒絕），故關閉 credentials
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: false
}));
app.use(express.json());
app.use(protectPrivateRoutes);
app.use('/uploads', express.static('uploads'));
// 提供靜態文件（HTML、CSS、JS等）
app.use(express.static(__dirname));

// 建立上傳資料夾
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// 設定 Multer（圖片上傳）
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            cb(null, true);
        } else {
            cb(new Error('只允許上傳圖片檔案（JPG、PNG、GIF、WEBP）'));
        }
    }
});

// 初始化資料庫
let db = null;

try {
    db = new sqlite3.Database('properties.db', (err) => {
        if (err) {
            console.error('❌ 資料庫連接錯誤:', err);
            console.warn('⚠️ 將繼續運行，但物件 API 可能無法使用');
        } else {
            console.log('✅ 已連接到 SQLite 資料庫');
            
            // 建立物件表
            db.run(`CREATE TABLE IF NOT EXISTS properties (
            id TEXT PRIMARY KEY,
            number TEXT,
            title TEXT NOT NULL,
            type TEXT NOT NULL,
            address TEXT NOT NULL,
            price TEXT NOT NULL,
            layout TEXT NOT NULL,
            total_area TEXT NOT NULL,
            community TEXT,
            main_area TEXT,
            auxiliary_area TEXT,
            common_area TEXT,
            land_area TEXT,
            parking_area TEXT,
            age TEXT,
            floor TEXT,
            building_type TEXT,
            orientation TEXT,
            management_fee TEXT,
            parking_type TEXT,
            parking_space TEXT,
            current_status TEXT,
            status TEXT,
            statusText TEXT,
            description TEXT,
            google_maps TEXT,
            tiktok_video_id TEXT,
            tiktok_username TEXT,
            reference_link TEXT,
            images TEXT,
            transportation TEXT,
            features TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, (err) => {
                if (err) {
                    console.error('建立資料表錯誤:', err);
                } else {
                    console.log('✅ 資料表已準備就緒');
                }
            });
        }
    });
} catch (dbError) {
    console.error('❌ 資料庫初始化失敗:', dbError);
    console.warn('⚠️ 將繼續運行，但物件 API 可能無法使用');
}

// 生成物件 ID
function generatePropertyId() {
    return 'prop_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
}

// 路由

function requireDb(res) {
    if (!db) {
        res.status(503).json({
            error: '資料庫未連接',
            message: 'SQLite 資料庫尚未初始化，請檢查 server.js 日誌'
        });
        return false;
    }
    return true;
}

function parseJsonField(value, fallback) {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function formatAddressForDisplay(address, hideAddressNumber, propertyType) {
    if (!address) return '';

    const typesToShowOnlyRoad = ['透天', '別墅', '店面'];
    const shouldShowOnlyRoad = propertyType && typesToShowOnlyRoad.includes(propertyType);

    if (!hideAddressNumber && !shouldShowOnlyRoad) {
        return address;
    }

    let displayAddress = address;
    const cityDistrictMatch = displayAddress.match(/^([^路街道]+[市縣區鄉鎮])/i);
    const cityDistrict = cityDistrictMatch ? cityDistrictMatch[1] : '';

    displayAddress = displayAddress.replace(/^[^路街道]+[市縣區鄉鎮]/i, '');
    const roadPattern = /([^路街道]+(?:[一二三四五六七八九十]+段)?[路街道大道])/;
    const roadMatch = displayAddress.match(roadPattern);

    if (roadMatch) {
        displayAddress = (cityDistrict + roadMatch[1]).trim();
    } else {
        const simpleRoadMatch = displayAddress.match(/([^路街道]*[路街道])/);
        if (simpleRoadMatch) {
            displayAddress = (cityDistrict + simpleRoadMatch[1]).trim();
        } else {
            displayAddress = displayAddress.replace(/[\d]+[巷弄號].*$/i, '');
            displayAddress = displayAddress.replace(/[巷弄號][\d\w\-\s]*.*$/i, '');
            displayAddress = (cityDistrict + displayAddress).trim();
        }
    }

    return displayAddress.replace(/[\s\-]+$/, '').trim();
}

function normalizePublicProperty(prop) {
    const images = parseJsonField(prop.images, []);
    const transportation = parseJsonField(prop.transportation, {});
    const features = parseJsonField(prop.features, []);
    const safeAddress = formatAddressForDisplay(prop.address || '', prop.hide_address_number, prop.type);

    return {
        ...prop,
        address: safeAddress,
        statusText: prop.status_text || prop.statusText || '',
        images: Array.isArray(images) ? images : [],
        transportation: transportation || {},
        features: Array.isArray(features) ? features : [],
        tiktok_thumbnail: prop.tiktok_thumbnail || (Array.isArray(images) && images.length > 0 ? images[0] : null),
    };
}

function isUuidLike(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ''));
}

const VALID_INQUIRY_STATUSES = new Set(['new', 'contacted', 'scheduled', 'closed']);

function requireInquiryAdminClient(res) {
    if (supabaseAdmin) return supabaseAdmin;

    res.status(503).json({
        error: '客戶詢問後台尚未啟用',
        message: '請在伺服器或 Cloudflare Pages 設定 SUPABASE_SERVICE_ROLE_KEY，後台才可讀取客戶姓名與電話。'
    });
    return null;
}

// 上傳圖片
app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: '沒有上傳圖片' });
    }
    
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({
        success: true,
        url: imageUrl,
        filename: req.file.filename
    });
});

// 獲取前台公開物件（與前台 Supabase 資料源一致，僅回傳已上架）
app.get('/api/properties', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const cached = getCached('properties:public:list');
    if (cached !== null) {
        console.log('📦 API: 從快取返回公開物件列表');
        return res.json(cached);
    }

    try {
        console.log('🔄 API: 正在從 Supabase 查詢公開物件...');
        const { data, error } = await supabase
            .from('properties')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const properties = (data || []).map(normalizePublicProperty);
        console.log(`✅ API: 成功返回 ${properties.length} 個公開物件`);
        setCache('properties:public:list', properties, PROPERTIES_CACHE_TTL_MS);
        return res.json(properties);
    } catch (error) {
        console.error('❌ API: Supabase 查詢失敗:', error);
        return res.status(500).json({
            error: 'Supabase 查詢失敗',
            message: error.message
        });
    }
});

// 獲取單一前台公開物件（支援 id 或物件編號，僅回傳已上架）
app.get('/api/properties/:identifier', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const identifier = req.params.identifier;
    const cacheKey = 'properties:public:item:' + identifier;
    
    const cached = getCached(cacheKey);
    if (cached !== null) {
        console.log('📦 API: 從快取返回單一公開物件');
        return res.json(cached);
    }

    try {
        let data = null;

        if (isUuidLike(identifier)) {
            const byId = await supabase
                .from('properties')
                .select('*')
                .eq('id', identifier)
                .eq('is_published', true)
                .maybeSingle();

            if (byId.error) throw byId.error;
            data = byId.data;
        }

        if (!data) {
            const byNumber = await supabase
                .from('properties')
                .select('*')
                .eq('number', identifier)
                .eq('is_published', true)
                .maybeSingle();
            if (byNumber.error) throw byNumber.error;
            data = byNumber.data;
        }

        if (!data) {
            return res.status(404).json({ error: '物件不存在或尚未上架' });
        }

        const property = normalizePublicProperty(data);
        setCache(cacheKey, property, PROPERTIES_CACHE_TTL_MS);
        return res.json(property);
    } catch (error) {
        console.error('❌ API: 單一物件查詢失敗:', error);
        return res.status(500).json({
            error: 'Supabase 查詢失敗',
            message: error.message
        });
    }
});

// 後台儲存後可呼叫此端點，讓前台 API 立刻讀到 Supabase 最新資料。
app.post('/api/cache/properties/invalidate', (req, res) => {
    invalidateCache('properties');
    res.set('Cache-Control', 'no-store');
    return res.json({
        success: true,
        invalidated: 'properties',
        timestamp: new Date().toISOString()
    });
});

// 後台客戶詢問列表（需 Admin Basic Auth + Supabase service role）
app.get('/api/customer-inquiries', async (req, res) => {
    const client = requireInquiryAdminClient(res);
    if (!client) return;

    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 120, 1), 300);
    const status = String(req.query.status || '').trim();

    try {
        let query = client
            .from('customer_inquiries')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        const { data, error } = await query;
        if (error) throw error;

        return res.json({
            inquiries: data || [],
            count: Array.isArray(data) ? data.length : 0
        });
    } catch (error) {
        console.error('❌ API: 客戶詢問查詢失敗:', error);
        return res.status(500).json({
            error: '客戶詢問查詢失敗',
            message: error.message
        });
    }
});

// 後台更新客戶詢問狀態
app.patch('/api/customer-inquiries/:id', async (req, res) => {
    const client = requireInquiryAdminClient(res);
    if (!client) return;

    const id = req.params.id;
    const status = String(req.body?.status || '').trim();

    if (!VALID_INQUIRY_STATUSES.has(status)) {
        return res.status(400).json({
            error: '狀態不正確',
            message: 'status 必須是 new、contacted、scheduled 或 closed'
        });
    }

    try {
        const { data, error } = await client
            .from('customer_inquiries')
            .update({
                status,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*')
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: '找不到此詢問紀錄' });

        return res.json({
            success: true,
            inquiry: data
        });
    } catch (error) {
        console.error('❌ API: 客戶詢問狀態更新失敗:', error);
        return res.status(500).json({
            error: '客戶詢問狀態更新失敗',
            message: error.message
        });
    }
});

function rejectLegacyPropertyWrite(req, res) {
    return res.status(410).json({
        error: '物件寫入 API 已停用',
        message: '目前物件新增、編輯與刪除請使用後台物件管理頁，資料會直接寫入 Supabase。'
    });
}

app.post('/api/properties', rejectLegacyPropertyWrite);
app.put('/api/properties/:id', rejectLegacyPropertyWrite);
app.delete('/api/properties/:id', rejectLegacyPropertyWrite);

// 新增物件（新增後清除列表快取）
app.post('/api/properties', (req, res) => {
    if (!requireDb(res)) return;
    const property = req.body;
    
    // 生成 ID（如果沒有提供）
    if (!property.id) {
        property.id = generatePropertyId();
    }
    
    // 將陣列轉換為 JSON 字串
    const images = property.images ? JSON.stringify(property.images) : '[]';
    const transportation = property.transportation ? JSON.stringify(property.transportation) : '{}';
    const features = property.features ? JSON.stringify(property.features) : '[]';
    
    const sql = `INSERT INTO properties (
        id, number, title, type, address, price, layout, total_area,
        community, main_area, auxiliary_area, common_area, land_area,
        parking_area, age, floor, building_type, orientation,
        management_fee, parking_type, parking_space, current_status,
        status, statusText, description, google_maps, tiktok_video_id,
        tiktok_username, reference_link, images, transportation, features
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
        property.id,
        property.number || null,
        property.title,
        property.type,
        property.address,
        property.price,
        property.layout,
        property.total_area,
        property.community || null,
        property.main_area || null,
        property.auxiliary_area || null,
        property.common_area || null,
        property.land_area || null,
        property.parking_area || null,
        property.age || null,
        property.floor || null,
        property.building_type || null,
        property.orientation || null,
        property.management_fee || null,
        property.parking_type || null,
        property.parking_space || null,
        property.current_status || null,
        property.status || null,
        property.statusText || null,
        property.description || null,
        property.google_maps || null,
        property.tiktok_video_id || null,
        property.tiktok_username || null,
        property.reference_link || null,
        images,
        transportation,
        features
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('新增錯誤:', err);
            return res.status(500).json({ error: '新增失敗' });
        }
        invalidateCache('properties');
        res.json({
            success: true,
            id: property.id,
            message: '物件已新增'
        });
    });
});

// 更新物件（更新後清除該筆與列表快取）
app.put('/api/properties/:id', (req, res) => {
    if (!requireDb(res)) return;
    const id = req.params.id;
    const property = req.body;
    
    // 將陣列轉換為 JSON 字串
    const images = property.images ? JSON.stringify(property.images) : '[]';
    const transportation = property.transportation ? JSON.stringify(property.transportation) : '{}';
    const features = property.features ? JSON.stringify(property.features) : '[]';
    
    const sql = `UPDATE properties SET
        number = ?, title = ?, type = ?, address = ?, price = ?, layout = ?, total_area = ?,
        community = ?, main_area = ?, auxiliary_area = ?, common_area = ?, land_area = ?,
        parking_area = ?, age = ?, floor = ?, building_type = ?, orientation = ?,
        management_fee = ?, parking_type = ?, parking_space = ?, current_status = ?,
        status = ?, statusText = ?, description = ?, google_maps = ?, tiktok_video_id = ?,
        tiktok_username = ?, reference_link = ?, images = ?, transportation = ?, features = ?,
        updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`;
    
    const values = [
        property.number || null,
        property.title,
        property.type,
        property.address,
        property.price,
        property.layout,
        property.total_area,
        property.community || null,
        property.main_area || null,
        property.auxiliary_area || null,
        property.common_area || null,
        property.land_area || null,
        property.parking_area || null,
        property.age || null,
        property.floor || null,
        property.building_type || null,
        property.orientation || null,
        property.management_fee || null,
        property.parking_type || null,
        property.parking_space || null,
        property.current_status || null,
        property.status || null,
        property.statusText || null,
        property.description || null,
        property.google_maps || null,
        property.tiktok_video_id || null,
        property.tiktok_username || null,
        property.reference_link || null,
        images,
        transportation,
        features,
        id
    ];
    
    db.run(sql, values, function(err) {
        if (err) {
            console.error('更新錯誤:', err);
            return res.status(500).json({ error: '更新失敗' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: '物件不存在' });
        }
        invalidateCache('properties');
        res.json({
            success: true,
            message: '物件已更新'
        });
    });
});

// 刪除物件（刪除後清除該筆與列表快取）
app.delete('/api/properties/:id', (req, res) => {
    if (!requireDb(res)) return;
    const id = req.params.id;
    
    // 先獲取物件資訊（包含圖片路徑）
    db.get('SELECT images FROM properties WHERE id = ?', [id], (err, row) => {
        if (err) {
            console.error('查詢錯誤:', err);
            return res.status(500).json({ error: '查詢失敗' });
        }
        
        if (!row) {
            return res.status(404).json({ error: '物件不存在' });
        }
        
        // 刪除相關圖片檔案
        try {
            const images = JSON.parse(row.images || '[]');
            images.forEach(imageUrl => {
                if (imageUrl.startsWith('/uploads/')) {
                    const imagePath = path.join(__dirname, imageUrl);
                    if (fs.existsSync(imagePath)) {
                        fs.unlinkSync(imagePath);
                    }
                }
            });
        } catch (e) {
            console.error('刪除圖片錯誤:', e);
        }
        
        // 刪除資料庫記錄
        db.run('DELETE FROM properties WHERE id = ?', [id], function(err) {
            if (err) {
                console.error('刪除錯誤:', err);
                return res.status(500).json({ error: '刪除失敗' });
            }
            invalidateCache('properties');
            res.json({
                success: true,
                message: '物件已刪除'
            });
        });
    });
});

// ============================================
// 相關連結 API 端點（含快取）
// ============================================

// 獲取所有啟用的相關連結（前端使用，5 分鐘快取）
app.get('/api/related-links', async (req, res) => {
    try {
        const cached = getCached('related-links');
        if (cached !== null) {
            console.log('📦 後端 API: 從快取返回相關連結');
            return res.json(cached);
        }
        
        console.log('🔄 後端 API: 正在從 Supabase 載入相關連結...');
        
        // 從 Supabase 載入啟用的連結
        const { data: links, error: linksError } = await supabase
            .from('related_links')
            .select('*')
            .eq('is_active', true)
            .order('display_order', { ascending: true });
        
        if (linksError) {
            console.error('❌ Supabase 查詢失敗:', linksError);
            return res.status(500).json({ 
                error: '載入連結失敗',
                message: linksError.message 
            });
        }
        
        // 載入下拉選單項目
        let items = [];
        if (links && links.length > 0) {
            const { data: itemsData, error: itemsError } = await supabase
                .from('related_link_items')
                .select('*')
                .eq('is_active', true)
                .order('display_order', { ascending: true });
            
            if (!itemsError && itemsData) {
                items = itemsData;
            }
        }
        
        // 將項目分組到對應的連結
        const itemsByParent = {};
        items.forEach(item => {
            if (!itemsByParent[item.parent_link_id]) {
                itemsByParent[item.parent_link_id] = [];
            }
            itemsByParent[item.parent_link_id].push(item);
        });
        
        // 組合連結和項目
        const result = links.map(link => ({
            ...link,
            items: itemsByParent[link.id] || []
        }));
        
        console.log(`✅ 後端 API: 成功載入 ${result.length} 個連結`);
        const response = {
            success: true,
            data: result,
            count: result.length
        };
        setCache('related-links', response);
        res.json(response);
    } catch (error) {
        console.error('❌ 後端 API 錯誤:', error);
        res.status(500).json({
            error: '伺服器錯誤',
            message: error.message
        });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`🚀 伺服器運行在 http://localhost:${PORT}`);
    console.log(`📝 API 端點: http://localhost:${PORT}/api`);
    console.log(`📸 圖片上傳: http://localhost:${PORT}/api/upload`);
    console.log(`🔗 相關連結: http://localhost:${PORT}/api/related-links`);
    console.log(`📊 資料庫狀態: ${db ? '✅ 已連接' : '❌ 未連接'}`);
});

// 優雅關閉
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('關閉資料庫錯誤:', err);
            } else {
                console.log('✅ 資料庫連接已關閉');
            }
            process.exit(0);
        });
    } else {
        console.log('✅ 伺服器已關閉');
        process.exit(0);
    }
});
