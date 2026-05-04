// 依 PDF 資料更新已新增的「益展學院景觀2房車」TW00012
// 執行一次即可，執行方式: node update-yizhan-college-2room.js

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const updateData = {
    hide_address_number: true,
    address: '桃園市楊梅區福羚路151號9樓',
    address_detail: '福羚路151號9樓',
    total_area: '38.71坪',
    main_area: '18.165坪',
    auxiliary_area: '1.42坪',
    common_area: '9.28坪',
    land_area: '6.025坪',
    parking_area: '9.85坪',
    age: '8年',
    floor: '9樓/14樓',
    management_fee: '2100元/月',
    parking_space: 'B2-150',
    current_status: '空屋，隨時可看',
    description: `益展學院景觀2房車

・近瑞塘國小、瑞坪國中，孩童接送路程短
・近三商圈：四維商圈、文化商圈、梅獅路商圈
・近埔心車站、楊梅交流道，南北往返方便
・周邊商家成熟完善，全聯、萬大黃昏市場、四維公園
・社區環境單純清幽，居住氛圍舒適安心
・建物完成日：106.06.07，警衛管理、有天然瓦斯
・樂屋網詳情：https://www.leju.com.tw/community/Lce6102089c82c4`,
    transportation: {
        facilities: ['四維商圈', '文化商圈', '梅獅路商圈', '全聯', '萬大黃昏市場'],
        transport: ['縣道115號', '楊梅交流道', '幼獅交流道', '五楊交流道', '66快速道路', '楊梅區免費公車', '埔心火車站'],
        schools: ['瑞塘國小', '瑞坪國中'],
        market: '萬大黃昏市場',
        park: '四維公園'
    }
};

async function updateProperty() {
    const { data, error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('number', 'TW00012')
        .select();

    if (error) {
        console.error('❌ 更新失敗:', error.message);
        process.exit(1);
    }
    console.log('✅ 已依 PDF 更新 TW00012 益展學院景觀2房車');
    console.log('更新欄位：地址、坪數、樓層、管理費、車位、現況、說明、交通生活圈');
    if (data && data[0]) console.log('物件 ID:', data[0].id);
}

updateProperty().then(() => process.exit(0));
