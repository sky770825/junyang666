// 直接新增龍潭百年大鎮雙車別墅物件到 Supabase
// 執行方式: node add-bainian-dazhen-script.js

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
            title: '龍潭百年大鎮雙車別墅',
            type: '別墅',
            city: '桃園市',
            district: '龍潭區',
            address: '桃園市龍潭區百年一街48巷2弄13號',
            address_detail: '百年一街48巷2弄13號',
            hide_address_number: false,
            price: '1580萬',
            layout: '4房3廳3衛',
            total_area: '83.28坪',
            main_area: '63.455坪',
            auxiliary_area: '9.51坪',
            common_area: '10.32坪',
            land_area: '23.57坪',
            parking_area: null,
            age: '28年',
            floor: 'B1-4樓/4樓',
            building_type: '別墅',
            orientation: '座東朝西',
            management_fee: '2294元/月',
            parking_type: 'B1地下室',
            parking_space: 'B1地下室（附雙車位）',
            current_status: '自住,需提前約',
            community: '百年大鎮',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `龍潭百年大鎮雙車別墅

龍潭指標造鎮社區，正中豐路超熱鬧地段！
近國道3號、66快速道路、台三線中豐路，交通便利
挑高客廳採光好、氣派又寬敞，附雙車位
單層大主臥設計，每間房都有自己的陽台

【房屋現況】
- 格局：4房3廳3衛
- 房屋型式：別墅
- 屋齡：28年（建物完成日：民國86年6月26日）
- 管理費：2294元/月
- 出售樓層：別墅B1-4樓
- 最高樓層：4樓
- 地下樓層：1樓
- 套房：無
- 警衛管理：有
- 座向：座東朝西
- 天然瓦斯：有
- 裝潢：無
- 車位：B1地下室（附雙車位）
- 目前現況：自住,需提前約
- KEY：洽開發

【環境及交通】
- 鄰近設施：全聯福利中心、龍潭夜市、全家、7-11、美聯社、八方雲集、炸雞大獅
- 交通：縣道113、國道3號、66快速道路、台三線中豐路
- 學校：潛龍國小、幼兒園
- 市場：無
- 公園：龍潭日出公園

（本資料為內部流通，詳細解說以不動產說明書為主。）`,
            images: [],
            transportation: {
                facilities: ['全聯福利中心', '龍潭夜市', '全家', '7-11', '美聯社', '八方雲集', '炸雞大獅'],
                transport: ['縣道113', '國道3號', '66快速道路', '台三線中豐路'],
                schools: ['潛龍國小', '幼兒園'],
                market: null,
                park: '龍潭日出公園'
            },
            features: [
                '龍潭指標造鎮社區、正中豐路熱鬧地段',
                '近國道3號、66快速道路、台三線',
                '挑高客廳採光好、氣派寬敞',
                '附雙車位、B1地下室',
                '單層大主臥、每間房有陽台',
                '警衛管理',
                '天然瓦斯'
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
