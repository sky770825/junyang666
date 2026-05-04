// 直接新增近龍潭科學園區城市花園別墅物件到 Supabase
// 執行方式: node add-longtan-city-garden-script.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 獲取類型前綴
function getTypePrefix(type) {
    const prefixMap = {
        '套房': 'SU',
        '2房': 'TW',
        '3房': 'TH',
        '4房': 'FO',
        '華廈': 'HS',
        '公寓': 'AP',
        '透天': 'TH',
        '店面': 'ST',
        '別墅': 'VI',
        '店住': 'ST'
    };
    return prefixMap[type] || 'XX';
}

// 獲取所有物件編號
async function getAllPropertyNumbers() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('number')
            .not('number', 'is', null);

        if (error) throw error;

        return (data || []).map(p => p.number).filter(n => n);
    } catch (error) {
        console.error('獲取編號失敗:', error);
        return [];
    }
}

// 獲取下一個序號（店內物件）
function getNextInternalSequenceNumber(existingNumbers, prefix) {
    const typeNumbers = existingNumbers
        .filter(num => {
            if (!num || typeof num !== 'string') return false;
            if (num.startsWith('EX')) return false;
            const pattern = new RegExp(`^${prefix}\\d{5}$`);
            return pattern.test(num);
        })
        .map(num => {
            const match = num.match(new RegExp(`^${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(num => !isNaN(num) && num > 0)
        .sort((a, b) => b - a);

    return typeNumbers.length > 0 ? typeNumbers[0] + 1 : 1;
}

// 格式化序號
function formatSequenceNumber(seq, length) {
    return String(seq).padStart(length, '0');
}

// 生成物件編號
async function generatePropertyNumber() {
    const type = '別墅';
    const prefix = getTypePrefix(type);

    if (!prefix || prefix === 'XX') {
        throw new Error('無法識別的房型');
    }

    const existingNumbers = await getAllPropertyNumbers();
    const nextSeq = getNextInternalSequenceNumber(existingNumbers, prefix);
    const formattedSeq = formatSequenceNumber(nextSeq, 5);
    const newNumber = `${prefix}${formattedSeq}`;

    if (existingNumbers.includes(newNumber)) {
        throw new Error('生成的編號重複，請重試');
    }

    return newNumber;
}

// 新增物件
async function addProperty() {
    try {
        console.log('🚀 開始新增物件...');

        // 生成編號
        const propertyNumber = await generatePropertyNumber();
        console.log('✅ 生成的編號:', propertyNumber);

        // 準備物件資料
        const propertyData = {
            number: propertyNumber,
            title: '近龍潭科學園區城市花園別墅',
            type: '別墅',
            city: '桃園市',
            district: '龍潭區',
            address: '桃園市龍潭區梅龍三街189巷',
            address_detail: '梅龍三街189巷',
            hide_address_number: false,
            price: '1188萬',
            layout: '4房3廳3衛',
            total_area: '52.7坪',
            main_area: '52.7坪',
            auxiliary_area: null,
            common_area: null,
            land_area: null,
            parking_area: null,
            age: '32年',
            floor: '1-4樓/4樓',
            building_type: '透天',
            orientation: '座東北朝西南',
            management_fee: null,
            parking_type: null,
            parking_space: null,
            current_status: null,
            community: '城市花園',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `近龍潭科學園區城市花園別墅

【亮點推薦】
• 地段優勢：鄰近龍潭科學園區，下樓即可享受超商購物、美食餐飲及公園休閒。
• 價格優勢：低於周邊同格局物件之均價，總價 1,188 萬極具競爭力。
• 空間設計：主建物空間足夠，採光與通風表現極佳；格局方正，現況為 4 房設計，室內採簡易裝潢。
• 環境機能：位於城市花園社區，屬於單純的住宅環境，具備住家與工作通勤的便利性。

【房屋基本資料】
- 案名：近龍潭科學園區城市花園別墅
- 售價：1,188 萬
- 單價：22.54 萬/坪
- 建坪：52.7 坪
- 格局：4 房 / 3 廳 / 3 衛
- 樓層：1 - 4 樓 / 共 4 樓
- 屋齡：32 年
- 型態：透天厝
- 座向：座東北朝西南
- 車位：無
- 社區：城市花園（總戶數 32 戶）
- 地址：桃園市龍潭區梅龍三街189巷

（本資料為內部流通，詳細解說以不動產說明書為主。）`,
            images: [],
            transportation: {
                facilities: ['龍潭科學園區', '超商', '美食餐飲', '公園'],
                transport: ['龍潭科學園區（工作通勤便利）'],
                schools: [],
                market: null,
                park: '公園（社區週邊）'
            },
            features: [
                '鄰近龍潭科學園區、生活機能便利',
                '總價 1,188 萬，低於周邊均價',
                '主建物採光通風佳、格局方正',
                '4 房設計、簡易裝潢',
                '城市花園社區、單純住宅環境',
                '住家與工作通勤便利'
            ]
        };

        // 清理空字串，轉換為 null
        Object.keys(propertyData).forEach(key => {
            if (propertyData[key] === '') {
                propertyData[key] = null;
            }
        });

        console.log('📤 準備新增物件:', JSON.stringify(propertyData, null, 2));

        // 新增到資料庫
        const { data: insertData, error: insertError } = await supabase
            .from('properties')
            .insert([propertyData])
            .select();

        if (insertError) throw insertError;

        const data = insertData && insertData.length > 0 ? insertData[0] : null;
        if (!data) {
            throw new Error('新增成功但無法取得資料');
        }

        console.log('\n✅ 物件新增成功！');
        console.log('📋 物件資訊:');
        console.log(`   編號: ${data.number}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   案名: ${data.title}`);
        console.log(`   地址: ${data.address}`);
        console.log(`   售價: ${data.price}`);
        console.log(`   隱藏地址: ${data.hide_address_number ? '✅ 已勾選' : '❌ 未勾選'}`);
        console.log(`   狀態: ${data.is_published ? '✅ 已上架' : '❌ 已下架'}`);

        return data;

    } catch (error) {
        console.error('\n❌ 新增失敗:', error.message);
        console.error('錯誤詳情:', {
            message: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint
        });
        throw error;
    }
}

// 執行新增
if (require.main === module) {
    addProperty()
        .then(() => {
            console.log('\n🎉 完成！');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n💥 執行失敗');
            process.exit(1);
        });
}

module.exports = { addProperty, generatePropertyNumber };
