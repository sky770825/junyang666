// 直接新增省道全聯旁美四房車物件到 Supabase
// 執行方式: node add-fujia-jixiang-property-script.js

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
    const type = '4房';
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
            title: '省道全聯旁美四房車',
            type: '4房',
            city: '桃園市',
            district: '楊梅區',
            address: '桃園市楊梅區中山北路一段74巷17號2樓',
            address_detail: '中山北路一段74巷17號2樓',
            hide_address_number: false,
            price: '1388萬',
            layout: '4房2廳2衛',
            total_area: '46.68坪',
            main_area: '31.13坪',
            auxiliary_area: '5.29坪',
            common_area: '5.8坪',
            land_area: '9.74坪',
            parking_area: '7.45坪',
            age: '25年',
            floor: '2樓/7樓',
            building_type: '華廈',
            orientation: '座西北朝東南',
            management_fee: '2565元/月',
            parking_type: '坡道平面',
            parking_space: 'B1-45',
            current_status: '空屋,隨時可看',
            community: '富佳吉祥',
            is_published: true,
            is_external: false,
            status: null,
            status_text: null,
            description: `省道全聯旁美四房車

使用近35坪大空間好規劃
三面採光明亮通風
下樓就是楊梅最大的全聯示範店
地下坡道平面車位
近大同國小大成商圈

房屋型式：華廈
屋齡：25年（建物完成日：民國90年01月11日）
管理費：2565元/月
出售樓層：2樓
最高樓層：7樓
地下樓層：1樓
套房：一間
警衛管理：有
座向：座西北朝東南
天然瓦斯：有
裝潢：有
臨路寬：0米
面寬：0米
車位：B1-45
機車位：0
目前現況：空屋,隨時可看`,
            images: [],
            transportation: {
                facilities: ['大成路商圈'],
                transport: ['楊梅交流道'],
                schools: ['大同國小'],
                market: '全聯',
                park: '貴山公園'
            },
            features: []
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
