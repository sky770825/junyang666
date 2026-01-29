// 直接新增龍華路大空間別墅（非本店物件）到 Supabase
// 執行方式: node add-longhua-villa-external-script.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 類型前綴（與後台一致）
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

// 取得所有現有編號
async function getAllPropertyNumbers() {
    try {
        const { data, error } = await supabase
            .from('properties')
            .select('number')
            .not('number', 'is', null);
        if (error) throw error;
        return (data || []).map(p => p.number).filter(Boolean);
    } catch (error) {
        console.error('獲取編號失敗:', error);
        return [];
    }
}

// 店外物件：取得下一個 EX 前綴序號（格式 EXVI0001）
function getNextExternalSequenceNumber(existingNumbers, prefix) {
    const externalPrefix = `EX${prefix}`;
    const typeNumbers = existingNumbers
        .filter(num => {
            if (!num || typeof num !== 'string') return false;
            if (!num.startsWith(externalPrefix)) return false;
            if (num.includes('-')) return false;
            const standardFormat = new RegExp(`^EX${prefix}\\d{4}$`);
            return standardFormat.test(num);
        })
        .map(num => {
            const match = num.match(new RegExp(`^EX${prefix}(\\d+)$`));
            return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => !isNaN(n) && n > 0)
        .sort((a, b) => b - a);
    return typeNumbers.length === 0 ? 1 : typeNumbers[0] + 1;
}

function formatSequenceNumber(seq, digits) {
    return String(seq).padStart(digits, '0');
}

// 生成「非本店物件」編號：EXVI0001
async function generateExternalPropertyNumber() {
    const type = '別墅';
    const prefix = getTypePrefix(type); // VI
    if (!prefix || prefix === 'XX') {
        throw new Error('無法識別的房型');
    }
    const existingNumbers = await getAllPropertyNumbers();
    const nextSeq = getNextExternalSequenceNumber(existingNumbers, prefix);
    const formattedSeq = formatSequenceNumber(nextSeq, 4);
    const newNumber = `EX${prefix}${formattedSeq}`;
    if (existingNumbers.includes(newNumber)) {
        throw new Error('生成的編號重複，請重試');
    }
    return newNumber;
}

async function addProperty() {
    try {
        console.log('🚀 開始新增非本店物件（龍華路大空間別墅）...');

        const propertyNumber = await generateExternalPropertyNumber();
        console.log('✅ 生成的非本店編號:', propertyNumber);

        const propertyData = {
            number: propertyNumber,
            title: '龍華路大空間別墅',
            type: '別墅',
            city: '桃園市',
            district: '龍潭區',
            address: '桃園市龍潭區龍華路526巷',
            address_detail: '龍華路526巷',
            hide_address_number: false,
            price: '2288萬',
            layout: '6房3廳4衛',
            total_area: '97坪',
            main_area: null,
            auxiliary_area: null,
            common_area: null,
            land_area: '25坪',
            parking_area: null,
            age: '10年',
            floor: '1-4樓/4樓',
            building_type: '別墅',
            orientation: null,
            management_fee: null,
            parking_type: null,
            parking_space: null,
            current_status: null,
            community: null,
            is_published: true,
            is_external: true,
            status: null,
            status_text: null,
            description: `龍華路大空間別墅（非本店物件）

【物件基本資料】
- 售價：2,288 萬
- 地坪：25 坪
- 建坪（權狀）：97 坪（含車位）
- 格局：6 房 / 3 廳 / 4 衛
- 樓層：1F ~ 4F
- 屋齡：約 10 年
- 地址：桃園市龍潭區龍華路526巷

【物件核心優勢】
1️⃣ 超大使用空間  
建坪約 97 坪、規劃 6 房 3 廳 4 衛，是龍潭區少見的大型別墅產品，適合三代同堂、大家庭或需要預留工作室、書房、影音室等多功能空間的買方。

2️⃣ 地坪價值佳  
25 坪地坪提供穩固的土地持分基礎，搭配近年來龍潭發展與交通建設，整體保值性與長期持有價值都相對出色。

3️⃣ 黃金屋齡  
約 10 年屋齡，屋況通常維持優良，結構與外觀仍新穎，可大幅降低未來整修與維護成本，對自住與長期置產都具吸引力。

【備註】
本物件為非本店委託之合作案件，詳細權狀資料、使用分區與實際坪數等，以不動產說明書與謄本為準。`,
            images: [],
            transportation: {
                facilities: ['龍潭市區生活機能', '周邊商店與餐飲'],
                transport: ['龍華路'],
                schools: [],
                market: null,
                park: null
            },
            features: [
                '龍潭少見 6 房大坪數別墅產品',
                '建坪約 97 坪，適合大家庭或多用途空間規劃',
                '25 坪地坪，土地持分價值佳',
                '約 10 年黃金屋齡，屋況維持良好',
                '位於龍潭區龍華路巷弄內，生活機能便利'
            ]
        };

        // 清理空字串
        Object.keys(propertyData).forEach(key => {
            if (propertyData[key] === '') {
                propertyData[key] = null;
            }
        });

        console.log('📤 準備新增物件:', JSON.stringify(propertyData, null, 2));

        const { data: insertData, error: insertError } = await supabase
            .from('properties')
            .insert([propertyData])
            .select();

        if (insertError) throw insertError;

        const data = insertData && insertData.length > 0 ? insertData[0] : null;
        if (!data) {
            throw new Error('新增成功但無法取得資料');
        }

        console.log('\n✅ 非本店物件新增成功！');
        console.log('📋 物件資訊:');
        console.log(`   編號: ${data.number}`);
        console.log(`   ID: ${data.id}`);
        console.log(`   案名: ${data.title}`);
        console.log(`   地址: ${data.address}`);
        console.log(`   售價: ${data.price}`);
        console.log(`   非本店物件: ${data.is_external ? '✅ 是' : '❌ 否'}`);
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

if (require.main === module) {
    addProperty()
        .then(() => {
            console.log('\n🎉 完成！');
            process.exit(0);
        })
        .catch(() => {
            console.error('\n💥 執行失敗');
            process.exit(1);
        });
}

module.exports = { addProperty, generateExternalPropertyNumber };

