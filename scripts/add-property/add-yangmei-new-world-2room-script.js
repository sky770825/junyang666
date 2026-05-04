// 新增「龍科兩房雙衛開窗車」楊梅新天地兩房物件到 Supabase
// 執行方式: node add-yangmei-new-world-2room-script.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function getTypePrefix(type) {
    const prefixMap = {
        '套房': 'SU',
        '2房': 'TW',
        '3房': 'TH',
        '4房': 'FO',
        '華廈': 'HS',
        '公寓': 'AP',
        '透天': 'TT',
        '店面': 'ST',
        '別墅': 'VH'
    };
    return prefixMap[type] || 'XX';
}

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

function formatSequenceNumber(seq, length) {
    return String(seq).padStart(length, '0');
}

async function generatePropertyNumber() {
    const type = '2房';
    const prefix = getTypePrefix(type);
    if (!prefix || prefix === 'XX') throw new Error('無法識別的房型');
    const existingNumbers = await getAllPropertyNumbers();
    const nextSeq = getNextInternalSequenceNumber(existingNumbers, prefix);
    const newNumber = `${prefix}${formatSequenceNumber(nextSeq, 5)}`;
    if (existingNumbers.includes(newNumber)) throw new Error('生成的編號重複，請重試');
    return newNumber;
}

async function addProperty() {
    try {
        console.log('🚀 開始新增龍科兩房雙衛開窗車物件...');
        const propertyNumber = await generatePropertyNumber();
        console.log('✅ 生成的編號:', propertyNumber);

        const propertyData = {
            number: propertyNumber,
            title: '龍科兩房雙衛開窗車',
            type: '2房',
            city: '桃園市',
            district: '楊梅區',
            address: '桃園市楊梅區三民東路408號4樓',
            address_detail: '三民東路408號4樓',
            hide_address_number: false,
            price: '898萬',
            layout: '2房2廳2衛',
            total_area: '34.29坪',
            main_area: '15.851坪',
            auxiliary_area: '1.497坪',
            common_area: '8.858坪',
            land_area: '8.137坪',
            parking_area: '8.085坪',
            age: '1年',
            floor: '4/7樓',
            building_type: '大樓',
            orientation: '座西北朝東南',
            management_fee: '待管委會決議',
            parking_type: '平面車位',
            parking_space: 'B2-44',
            current_status: '空屋，需提前約（鑰匙）',
            community: '楊梅新天地',
            is_published: true,
            is_external: false,
            status: 'new',
            status_text: '新上架',
            description: `楊梅新天地｜龍科兩房雙衛開窗車

・社區有預留充電線槽
・稀有兩房雙衛浴皆開窗
・近龍潭科學園區，上交流道便利
・歡迎預約賞屋洽開發

基地面積：3736 M²
持分比例：72/10000
建物完成日：114.09.08（民國）
警衛管理：有
天然瓦斯：有
地下樓層：2樓
臨路寬：6米`,
            images: [],
            transportation: {
                facilities: [
                    '四維路商圈',
                    '中興路商圈',
                    '梅獅路商圈',
                    '味全埔心牧場',
                    '星巴克',
                    '全聯福利中心',
                    '職人的店',
                    '貴族世家',
                    '天成醫院',
                    '草湳派出所'
                ],
                transport: [
                    '台1線',
                    '楊梅交流道',
                    '幼獅交流道',
                    '五楊交流道',
                    '埔心火車站'
                ],
                schools: ['瑞坪國中', '楊光國中小學', '瑞塘國小'],
                market: '埔心市場、萬大黃昏市場',
                park: '瑞溪公園、四維公園、頭重溪公園、柚子公園'
            },
            features: [
                '兩房雙衛浴皆開窗',
                '近龍潭科學園區',
                '社區預留充電線槽',
                '警衛管理',
                '空屋可約看'
            ]
        };

        Object.keys(propertyData).forEach(key => {
            if (propertyData[key] === '') propertyData[key] = null;
        });

        const { data: insertData, error: insertError } = await supabase
            .from('properties')
            .insert([propertyData])
            .select();

        if (insertError) throw insertError;
        const result = insertData && insertData[0];
        if (!result) throw new Error('新增成功但無法取得資料');
        console.log('✅ 物件新增成功');
        console.log('   ID:', result.id);
        console.log('   編號:', result.number);
        console.log('   標題:', result.title);
        return result;
    } catch (error) {
        console.error('❌ 新增失敗:', error.message || error);
        throw error;
    }
}

addProperty()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
