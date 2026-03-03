// 將「未隱藏門牌」的物件全部改為隱藏門牌
// 執行方式: node bulk-hide-address.js
// 之後若某筆要顯示完整門牌，可到後台編輯該物件取消勾選「隱藏門牌號碼」

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cnzqtuuegdqwkgvletaa.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNuenF0dXVlZ2Rxd2tndmxldGFhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMjUxMTksImV4cCI6MjA4MzcwMTExOX0.gsO3RKdMu2bUXW4b5aHseouIkjXtJyIqqP_0x3Y6trE';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function bulkHideAddress() {
    const { data: list, error: listErr } = await supabase
        .from('properties')
        .select('id, number, title, hide_address_number')
        .or('hide_address_number.eq.false,hide_address_number.is.null');

    if (listErr) {
        console.error('❌ 查詢失敗:', listErr.message);
        process.exit(1);
    }

    if (!list || list.length === 0) {
        console.log('✅ 沒有需要更新的物件（已全部為隱藏門牌）');
        return;
    }

    console.log(`找到 ${list.length} 筆未隱藏門牌，即將全部設為隱藏門牌：`);
    list.forEach(p => console.log(`   ${p.number} ${(p.title || '').slice(0, 40)}`));

    const ids = list.map(p => p.id);
    const { data: updated, error } = await supabase
        .from('properties')
        .update({ hide_address_number: true })
        .in('id', ids)
        .select('number, title');

    if (error) {
        console.error('❌ 更新失敗:', error.message);
        process.exit(1);
    }

    console.log(`\n✅ 已將 ${updated?.length || list.length} 筆物件設為「隱藏門牌」`);
}

bulkHideAddress().then(() => process.exit(0));
