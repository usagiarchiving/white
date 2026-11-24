/* ==========================================================================
   김민정 — 나를 게임 캐릭터처럼 키우기
   - 화면: 방 배경(옆으로 밀어서 바꾸기) + 캐릭터 + 미연시 대사창 + 하트(HP)
   - 메뉴: Profile / Condition / Daily / Diary / Menu
     모바일은 아래 메뉴 → 화면 가득 창, PC는 바탕화면 아이콘 → 윈도우 창(여러 개, 끌어서 이동)
   - 기록: 이 저장소의 minjung/minjung.json (형식은 minjung/README.md)
   - 사진: minjung/images/<outfit|icons>/...
   ========================================================================== */

/* ---------------- 설정 ---------------- */
const DATA = 'minjung/minjung.json';
const IMG_DIR = 'minjung/images/';
/* 하시온(Sion) 메시지·편지: GitHub Actions(.github/workflows/letter.yml)가 Gemini로 쓰고 minjung/letters.json 에 저장 */
const SION_DATA = 'minjung/letters.json';
const SION_CFG = 'minjung/sion.json';
const SION_WF = '/actions/workflows/letter.yml';
const SION_SEEN = 'mj_sion_seen';
const SION_MAX = 1000;
const LISTS = ['hp', 'lines', 'library', 'condition', 'beauty', 'outfit', 'diary'];
const PREFIX = { hp: 'hp', lines: 'ln', library: 'lb', condition: 'cd', beauty: 'bt', outfit: 'of', diary: 'dy' };   // 기록 id 앞글자

const DEFAULT_PROFILE = [
    ['이름', '김민정'], ['생년월일', '2002년생'], ['성별', '여성'], ['외형', ''], ['성격', ''],
    ['좋아하는 것', ''], ['좋아하는 음식', ''], ['싫어하는 것', ''], ['etc.', '']
];
const DEFAULT_SYMPTOMS = ['배아픔', '두통'];
/* 퀘스트(루틴): daily = 매일 / repeat = N일마다(마지막으로 한 날부터) 또는 요일마다 */
const QSLOTS = [['morning', 'Morning'], ['lunch', 'Lunch'], ['evening', 'Evening'], ['etc', 'etc.']];
const DOW_KO = ['일', '월', '화', '수', '목', '금', '토'];
const DEFAULT_QUESTS = [
    { id: 'q1', kind: 'daily', slot: 'morning', title: '이부자리 정리' },
    { id: 'q2', kind: 'daily', slot: 'morning', title: '물 한 잔' },
    { id: 'q3', kind: 'daily', slot: 'lunch', title: '점심 챙겨 먹기' },
    { id: 'q4', kind: 'daily', slot: 'evening', title: '스킨케어' },
    { id: 'q5', kind: 'repeat', mode: 'every', every: 3, title: '빨래' },
    { id: 'q6', kind: 'repeat', mode: 'week', days: [1, 4], title: '분리수거' }
];
const DEFAULT_BGS = [
    { id: 'living', mobile: 'minjung/assets/living-mobile.webp', pc: 'minjung/assets/living-pc.webp' },
    { id: 'bedroom', mobile: 'minjung/assets/bedroom.webp', pc: 'minjung/assets/bedroom.webp' }
];
const DEFAULT_CHAR = 'minjung/assets/character.webp';
const DEFAULT_LAYOUT = { mobile: { x: 50, h: 72 }, pc: { x: 50, h: 90 } };   // 캐릭터 가운데 위치(%) · 높이(%)
const DEFAULT_STEPS = { morning: ['세안', '토너', '로션', '선크림'], night: ['클렌징', '토너', '세럼', '크림'], etc: ['팩', '각질 케어'], shower: ['샴푸', '트리트먼트', '바디워시', '바디로션'] };

const MEAL_SLOTS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snack', 'Snack'], ['night', 'Late night']];
const MOODS = [['love', '🥰', 'love'], ['good', '😊', 'good'], ['okay', '🙂', 'okay'], ['meh', '😐', 'meh'], ['tired', '😪', 'tired'], ['sad', '😢', 'sad'], ['anxious', '😰', 'anxious'], ['angry', '😠', 'angry']];
const LIB_TYPES = [['book', 'Book'], ['youtube', 'YouTube'], ['movie', 'Movie'], ['drama', 'Drama'], ['anime', 'Anime'],
    ['webtoon', 'Webtoon'], ['game', 'Game'], ['song', 'Song'], ['show', 'Show'], ['etc', 'etc.']];
// 작품 검색 (예전 '흐린 날의 고백'에서 쓰던 키): 영화·드라마·애니 = TMDB, 책 = 카카오
const TMDB_KEY = 'd6224997a8f1d896b0244b268bcefd54';
const KAKAO_KEY = '261889b87c5bf523ddd8846c0c45ec2e';
const LIB_SEARCH = { movie: 'movie', drama: 'tv', anime: 'tv', book: 'book' };
const LIB_STATUS = [['want', 'Want'], ['now', 'Now'], ['done', 'Done']];
const BEAUTY_SLOTS = [['morning', 'Morning'], ['night', 'Night'], ['etc', 'etc.'], ['shower', 'Shower']];
const BEAUTY_SUBS = [['all', 'All'], ['morning', 'Morning'], ['night', 'Night'], ['etc', 'etc.']];   // Shower는 탭 없이 + 버튼으로만 (All에서 보임)
const COND_TYPES = [['meal', 'Meal'], ['medicine', 'Medicine'], ['symptom', 'Symptom'], ['mood', 'Mood']];

/* ---------------- 아이콘 (기본 그림, 창 위 아이콘을 누르면 내 이미지로 바꿀 수 있음) ---------------- */
const SV = b => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${b}</svg>`;
const ICON = {
    profile: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="11" r="2.2"/><path d="M5.5 16.5c.6-1.6 1.7-2.4 3-2.4s2.4.8 3 2.4M14 10h4.5M14 13h3.5"/>'),
    condition: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/><path d="M12 11v4.4M9.8 13.2h4.4"/>'),
    daily: SV('<path d="M12 11.5c-2-3.2-6.5-4.6-7.4-2.6-.8 1.9 2.4 4.2 7.4 2.6zM12 11.5c2-3.2 6.5-4.6 7.4-2.6.8 1.9-2.4 4.2-7.4 2.6z"/><circle cx="12" cy="11.5" r="1.2"/><path d="M11.2 12.6 8.6 19M12.8 12.6l2.6 6.4"/>'),
    diary: SV('<path d="M5 4.5h11a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z"/><path d="M5 17.5a2 2 0 0 1 2-2h11M9 8.5h5"/><path d="M12 12.6s-2-1.2-2-2.4a1 1 0 0 1 2-.3 1 1 0 0 1 2 .3c0 1.2-2 2.4-2 2.4z"/>'),
    food: SV('<path d="M7 4v6a2 2 0 0 0 4 0V4M9 4v16M16 20V4c-1.8 0-3 2.2-3 5.5S14.2 13 16 13"/>'),
    state: SV('<circle cx="12" cy="12" r="8"/><path d="M9 10h.01M15 10h.01M9 14.5c1.6 1.4 4.4 1.4 6 0"/>'),
    room: SV('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m3.5 16 5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="9" r="1.5"/>'),
    library: SV('<path d="M5 5.5h4v13H5zM10 5.5h4v13h-4z"/><path d="m15.2 6.4 3.6-1 3 12.6-3.6 1z"/>'),
    menu: SV('<rect x="4.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="13.5" y="4.5" width="6" height="6" rx="1.5"/><rect x="4.5" y="13.5" width="6" height="6" rx="1.5"/><path d="M16.5 14v5M14 16.5h5"/>'),
    quest: SV('<path d="M7 4.5h10a2 2 0 0 1 2 2V17a2.5 2.5 0 0 1-2.5 2.5H7"/><path d="M7 4.5a2 2 0 0 0-2 2v1.5h4V6.5a2 2 0 0 0-2-2zM7 19.5A2.5 2.5 0 0 0 9.5 17V8M12 9.5l1 1 2.2-2.2M12 14h4"/>'),
    hp: SV('<path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.4C19 15.6 12 20 12 20z"/>'),
    lines: SV('<path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16h-8l-4 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 6z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/>'),
    schedule: SV('<rect x="4" y="5.5" width="16" height="14" rx="2"/><path d="M4 9.5h16M8.5 3.5v4M15.5 3.5v4M8 13h2M12 13h2M8 16h2"/>'),
    inventory: SV('<path d="M4 8.5 12 5l8 3.5v8L12 20l-8-3.5z"/><path d="M4 8.5 12 12l8-3.5M12 12v8"/>'),
    bag: SV('<path d="M6 8.5h12l-1 11H7z"/><path d="M9 10V7.5a3 3 0 0 1 6 0V10"/>'),
    shop: SV('<path d="M4.5 9.5 6 5h12l1.5 4.5"/><path d="M4.5 9.5a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0M6 12v7.5h12V12"/><path d="M10 19.5v-4h4v4"/>'),
    workout: SV('<path d="M7 8v8M17 8v8M4.5 10v4M19.5 10v4M7 12h10"/>'),
    sion: SV('<path d="M5 6h14a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 19 16h-8l-4 3v-3H5a1.5 1.5 0 0 1-1.5-1.5v-7A1.5 1.5 0 0 1 5 6z"/><path d="M12 13.2s-2.2-1.3-2.2-2.6a1.1 1.1 0 0 1 2.2-.3 1.1 1.1 0 0 1 2.2.3c0 1.3-2.2 2.6-2.2 2.6z"/>'),
    letter: SV('<rect x="3.5" y="6" width="17" height="12" rx="1.5"/><path d="m4 7 8 6 8-6"/><path d="M12 16.6s-1.6-1-1.6-2a.8.8 0 0 1 1.6-.2.8.8 0 0 1 1.6.2c0 1-1.6 2-1.6 2z"/>'),
    bell: SV('<path d="M6.5 16.5h11l-1.3-1.8V10.5a4.2 4.2 0 0 0-8.4 0v4.2z"/><path d="M10.5 19a1.6 1.6 0 0 0 3 0"/>'),
    bang: SV('<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2"/><path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21"/>'),
    friends: SV('<circle cx="9" cy="9" r="2.6"/><path d="M4.5 18c.7-2.6 2.4-4 4.5-4s3.8 1.4 4.5 4"/><path d="M17 15.5s-2.6-1.6-2.6-3.2a1.3 1.3 0 0 1 2.6-.4 1.3 1.3 0 0 1 2.6.4c0 1.6-2.6 3.2-2.6 3.2z"/>')
};
const PLUS_SVG = '<svg viewBox="0 0 24 24" width="16" height="16"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"><path d="M12 5v14M5 12h14"/></g></svg>';
const X_SVG = '<svg viewBox="0 0 24 24" width="14" height="14"><g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.6"><path d="M18 6 6 18M6 6l12 12"/></g></svg>';

/* 창 설정 — main: 아래 메뉴/바탕화면 아이콘에 나오는 5개 */
const WIN = {
    profile:   { title: 'Profile',   main: true, w: 360 },
    library:   { title: 'Library',   tabs: ['All'], dyn: true, w: 560 },   // 탭은 settings.lib_types로
    food:      { title: 'Meal · Medicine', tabs: ['All', 'Meal', 'Medicine'], types: ['meal', 'medicine'], w: 380 },
    state:     { title: 'Symptom · Mood',  tabs: ['All', 'Symptom', 'Mood'], types: ['symptom', 'mood'], w: 380 },
    daily:     { title: 'Daily',     tabs: ['Beauty', 'Outfit'], main: true, w: 480 },
    diary:     { title: 'Diary',     tabs: ['Diary', 'Daily', 'Letter'], main: true, w: 400 },
    hp:        { title: 'HP Log',    w: 340 },
    quest:     { title: 'Quest',     tabs: ['Daily', 'Weekly'], w: 400 },
    room:      { title: 'Backgrounds', w: 420 },
    lines:     { title: 'Lines',     w: 360 },
    sion:      { title: '내 여보♡',  tabs: ['Message'], w: 390 },
    bang:      { title: 'BANG',      tabs: ['Profile', 'Prompt', 'Memory', 'Log'], w: 430 }
};
/* 아래 메뉴 / 바탕화면 아이콘 5개 — pick이 있으면 누를 때 작은 고르기 팝업이 먼저 뜸 */
const NAV = [
    { id: 'profile', title: 'Profile' },
    { id: 'condition', title: 'Condition', pick: [['food', 'Meal · Medicine'], ['state', 'Symptom · Mood']] },
    { id: 'daily', title: 'Daily' },
    { id: 'diary', title: 'Diary' },
    { id: 'menu', title: 'Menu', pick: 'soon' }
];
// 아이패드·PC에서 창이 처음 뜨는 자리 (0~1 비율: 왼쪽→오른쪽, 위→아래)
const SPOT = { quest: [0.12, 0.12], room: [0.5, 0.1], profile: [0, 0], library: [0.3, 0.4], food: [1, 0], state: [0.62, 0.3], diary: [0, 1], daily: [1, 1], hp: [1, 0.08], lines: [0.5, 0.85], sion: [0.78, 0.18], bang: [0.3, 0.2] };
const SOON = [['schedule', 'Schedule'], ['inventory', 'Inventory'], ['bag', 'Bag'], ['shop', 'Shop'], ['workout', 'Workout'], ['friends', 'Friends']];

/* To Do: 기존 투두 카테고리(data/todos.json)를 그대로 씀 */
const TODO_URL = 'https://ofhadtlrsccipnvdohqh.supabase.co';

/* ---------------- 작은 도우미 ---------------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const hmOf = d => pad(d.getHours()) + ':' + pad(d.getMinutes());
const todayKey = () => keyOf(new Date());
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nl = s => esc(s).replace(/\n/g, '<br>');
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = o => JSON.parse(JSON.stringify(o));
const DOW = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const label = (list, k) => (list.find(x => x[0] === k) || [k, k])[1];
// 해 뜨는 시각 (위도·경도로 계산, 인터넷 없이). HP는 마지막 기록 뒤로 해가 한 번 뜨면 5칸 다 참 (자고 일어났으니까)
function sunriseOn(d, lat, lon) {
    const rad = Math.PI / 180, day = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 86400000);
    const g = 2 * Math.PI / 365 * (day - 1);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dec)) - Math.tan(lat * rad) * Math.tan(dec)) / rad;
    const min = 720 - 4 * (lon + ha) - eq;   // UTC 분
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) + min * 60000;
}
function lastSunrise(lat, lon) {
    const now = new Date();
    let r = sunriseOn(now, lat, lon);
    if (isNaN(r)) { const x = new Date(now); x.setHours(7, 10, 0, 0); r = x.getTime(); }
    if (r > now.getTime()) { const y = new Date(now.getTime() - 86400000); r = sunriseOn(y, lat, lon); if (isNaN(r)) r = new Date(now).setHours(7, 10, 0, 0) - 86400000; }
    return r;
}
const byNewest = (a, b) => ((b.date || '') + (b.time || '')).localeCompare((a.date || '') + (a.time || ''));
const byOldest = (a, b) => -byNewest(a, b);
function stamp() { const d = new Date(), o = -d.getTimezoneOffset(); return new Date(d.getTime() + o * 60000).toISOString().slice(0, 19) + (o >= 0 ? '+' : '-') + pad(Math.floor(Math.abs(o) / 60)) + ':' + pad(Math.abs(o) % 60); }
function shiftDay(k, n) { const [y, m, d] = k.split('-').map(Number); return keyOf(new Date(y, m - 1, d + n)); }
function dayTitle(k) { const [y, m, d] = k.split('-').map(Number); return y + '.' + pad(m) + '.' + pad(d) + ' ' + DOW[new Date(y, m - 1, d).getDay()]; }
function ytId(url) { const m = /(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/.exec(url || ''); return m ? m[1] : ''; }

/* 픽셀 하트 (7x6 칸) */
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
function pixelHeart(full) {
    const on = (r, c) => HEART[r] && HEART[r][c] === 'X';
    let s = '';
    HEART.forEach((row, r) => [...row].forEach((ch, c) => {
        if (ch !== 'X') return;
        const inner = on(r - 1, c) && on(r + 1, c) && on(r, c - 1) && on(r, c + 1);
        const fill = full ? (inner ? 'var(--mj-heart)' : 'var(--mj-heart-line)') : (inner ? '#fff' : 'var(--mj-heart-empty)');
        s += `<rect x="${c}" y="${r}" width="1.02" height="1.02" fill="${fill}"/>`;
    }));
    return `<svg class="mj-heart" viewBox="0 0 7 6" shape-rendering="crispEdges">${s}</svg>`;
}
const hearts = (v, n = 5) => Array.from({ length: n }, (_, i) => pixelHeart(i < v)).join('');

/* 저장 형식 — 모든 기록은 { id, date: 'YYYY-MM-DD', time: 'HH:MM', at: 저장 시각 } + 각자 내용 */
function normalize(d) {
    d = d && typeof d === 'object' && !Array.isArray(d) ? d : {};
    d.version = 1;
    if (!Array.isArray(d.profile) || !d.profile.length) d.profile = DEFAULT_PROFILE.map(([l, v], i) => ({ id: 'pf' + i, label: l, value: v }));
    d.icons = d.icons && typeof d.icons === 'object' ? d.icons : {};
    d.settings = d.settings && typeof d.settings === 'object' ? d.settings : {};
    const st = d.settings;                                     // 첫 화면 꾸미기 (README '설정' 참고)
    if (!Array.isArray(st.backgrounds) || !st.backgrounds.length) st.backgrounds = clone(DEFAULT_BGS);
    if (!st.character) st.character = DEFAULT_CHAR;
    st.layout = st.layout && typeof st.layout === 'object' ? st.layout : {};
    st.stickers = st.stickers && typeof st.stickers === 'object' ? st.stickers : {};
    ['mobile', 'pc'].forEach(k => {
        if (!st.layout[k] || typeof st.layout[k].x !== 'number') st.layout[k] = Object.assign({}, DEFAULT_LAYOUT[k]);
        if (!Array.isArray(st.stickers[k])) st.stickers[k] = [];
    });
    LISTS.forEach(k => { d[k] = Array.isArray(d[k]) ? d[k] : []; });
    if (!Array.isArray(d.quests)) d.quests = clone(DEFAULT_QUESTS);
    d.quest_log = d.quest_log && typeof d.quest_log === 'object' && !Array.isArray(d.quest_log) ? d.quest_log : {};   // { 'YYYY-MM-DD': { 퀘스트id: '완료 시각 HH:MM' } }
    d.symptom_tags = Array.isArray(d.symptom_tags) ? d.symptom_tags : DEFAULT_SYMPTOMS.slice();
    d.beauty_steps = d.beauty_steps && typeof d.beauty_steps === 'object' ? d.beauty_steps : {};
    // 초록 버튼으로 고치는 목록: Library 종류, Beauty 구분 (tab: 위 탭에 보일지, false면 + 버튼으로만)
    if (!Array.isArray(st.lib_types) || !st.lib_types.length) st.lib_types = LIB_TYPES.map(([key, label]) => ({ key, label }));
    if (!Array.isArray(st.beauty_slots) || !st.beauty_slots.length) st.beauty_slots = BEAUTY_SLOTS.map(([key, label]) => ({ key, label, tab: key !== 'shower' }));
    if (!Array.isArray(st.mood_list) || !st.mood_list.length) st.mood_list = MOODS.map(([key, emoji, label]) => ({ key, emoji, label }));   // Mood 목록
    if (!Array.isArray(st.med_list)) st.med_list = ['비타민C', '마그네슘'].map(label => ({ key: label, label }));   // Medicine 고르기 목록
    st.beauty_slots.forEach(({ key }) => { if (!Array.isArray(d.beauty_steps[key])) d.beauty_steps[key] = (DEFAULT_STEPS[key] || []).slice(); });
    return d;
}
/* 빈 칸은 저장하지 않음 (파일을 깔끔하게) */
function tidy(o) { Object.keys(o).forEach(k => { const v = o[k]; if (v === '' || v == null || (Array.isArray(v) && !v.length)) delete o[k]; }); return o; }

/* 사진 줄이기 → 바이트 */
function shrink(file, max, type, q) {
    return new Promise((res, rej) => {
        const img = new Image(), url = URL.createObjectURL(file);
        img.onload = () => {
            const s = Math.min(1, max / Math.max(img.width, img.height));
            const c = document.createElement('canvas');
            c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
            const g = c.getContext('2d');
            if (type === 'image/jpeg') { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
            g.drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            c.toBlob(b => b ? b.arrayBuffer().then(a => res({ bytes: new Uint8Array(a), blob: b })) : rej(new Error('사진을 바꾸지 못했어요')), type, q);
        };
        img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('사진을 열지 못했어요')); };
        img.src = url;
    });
}

/* ========================================================================== */
export function init() {
    const root = document.getElementById('mj-root');
    if (!root) return;

    /* ---- 화면 안 팝업 (브라우저 기본 alert·confirm·prompt 대신) — 항상 화면 가운데 ---- */
    function mjDialog({ title, msg, input, value, ok, cancel, hint }) {
        return new Promise(resolve => {
            const bg = document.createElement('div');
            bg.className = 'mj-dlg-bg';
            bg.innerHTML = `
                <div class="mj-dlg" role="dialog">
                    ${title ? `<div class="mj-dlg-t">${esc(title)}</div>` : ''}
                    ${msg ? `<div class="mj-dlg-m">${nl(msg)}</div>` : ''}
                    ${input ? `<input class="mj-dlg-in" value="${esc(value || '')}">${hint ? `<div class="mj-dlg-h">${esc(hint)}</div>` : ''}` : ''}
                    <div class="mj-btns"><span class="sp"></span>
                        ${cancel ? `<button class="mj-btn ghost" data-r="no">${esc(cancel)}</button>` : ''}
                        <button class="mj-btn" data-r="yes">${esc(ok || 'OK')}</button>
                    </div>
                </div>`;
            root.appendChild(bg);
            const inp = bg.querySelector('.mj-dlg-in');
            const done = r => { bg.remove(); document.removeEventListener('keydown', key, true); resolve(r); };
            const key = e => {
                if (e.key === 'Escape') { e.preventDefault(); done(input ? null : false); }
                if (e.key === 'Enter' && (!inp || document.activeElement === inp)) { e.preventDefault(); done(input ? inp.value : true); }
            };
            document.addEventListener('keydown', key, true);
            bg.addEventListener('click', e => {
                const b = e.target.closest('[data-r]');
                if (b) done(b.dataset.r === 'yes' ? (input ? inp.value : true) : (input ? null : false));
                else if (e.target === bg && cancel) done(input ? null : false);
            });
            setTimeout(() => (inp || bg.querySelector('[data-r=yes]')).focus(), 30);
        });
    }
    const mjAlert = msg => mjDialog({ msg, ok: 'OK' });
    const mjConfirm = (msg, ok) => mjDialog({ msg, ok: ok || 'OK', cancel: 'Cancel' });
    const mjPrompt = (title, value, hint) => mjDialog({ title, input: true, value, hint, ok: 'Save', cancel: 'Cancel' });
    const repo = window.ghdb.repo();
    const todoDb = window.ghdb.createClient(TODO_URL);
    const $ = id => document.getElementById(id);
    const game = $('mj-game'), layer = $('mj-layer'), fileIn = $('mj-file');
    const isPC = () => window.matchMedia('(min-width: 744px)').matches;   // 아이패드 이상: 윈도우 팝업

    let db = normalize({});
    const wins = {};            // 열린 창: id → { el, st }
    let zTop = 1100, opened = 0, pending = 0;
    const localImg = {};         // 방금 올린 사진: 경로 → 미리보기 주소 (사이트 반영 전까지)
    let todos = null, todoErr = '';

    /* ---------------- 이미지 주소 ---------------- */
    const imgSrc = p => localImg[p] || (/^https?:/.test(p) ? p : repo.url(p));
    const imgTag = (p, cls) => /^https?:/.test(p) ? `<img class="${cls || ''}" src="${esc(p)}" alt="" loading="lazy">` : `<img class="${cls || ''}" src="${esc(imgSrc(p))}" onerror="this.onerror=null;this.src='${esc(repo.rawUrl(p))}'" alt="" loading="lazy">`;
    const iconHtml = id => db.icons[id] ? imgTag(db.icons[id], 'mj-ico-img') : (ICON[id] || '');

    /* ---------------- 불러오기 / 저장 ---------------- */
    // 첫 화면 꾸미기(배경 끔·배치 등)는 이 기기에도 기억해 둠 → 새로고침 때 기본 화면이 잠깐 튀어나오지 않게
    const ROOM_KEY = 'mj_room_settings';
    // 마지막으로 받은 기록 전체도 기억 → 다음에 열 때 HP·퀘스트 등이 기본값으로 잠깐 보였다 바뀌지 않게
    const DB_KEY = 'mj_db_cache';
    function rememberRoom() {
        try { localStorage.setItem(ROOM_KEY, JSON.stringify(db.settings)); } catch (e) {}
        try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) {}
    }
    function recallDb() { try { const v = JSON.parse(localStorage.getItem(DB_KEY) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
    function recallRoom() { try { const v = JSON.parse(localStorage.getItem(ROOM_KEY) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
    async function load() {
        try { db = normalize(await repo.readJSON(DATA, {})); } catch (e) { console.error(e); }
        loadSion();
        rememberRoom();
        redraw();
        root.classList.remove('mj-booting');
    }
    function setPending(n) {
        pending = n;
        const el = $('mj-saving');
        if (el) { el.textContent = pending ? 'saving…' : ''; el.classList.toggle('on', !!pending); }
    }
    // 화면 먼저 바꾸고 GitHub 커밋은 뒤에서 (files: { 경로: blobSha | null(삭제) })
    function save(message, fn, files) {
        fn(db);
        redraw();
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); load(); return Promise.resolve(); }
        setPending(pending + 1);
        const j = {}; j[DATA] = { mutate: cur => { cur = normalize(cur); fn(cur); cur.updated_at = stamp(); return cur; }, fallback: {} };
        return repo.commit('김민정: ' + message, files || {}, j).then(res => {
            setPending(pending - 1);
            if (!pending && res && res[DATA]) { db = normalize(clone(res[DATA])); rememberRoom(); redraw(true); }
        }, e => {
            setPending(pending - 1);
            mjAlert('저장하지 못했어요.\n' + (e.message || e));
            load();
        });
    }
    function upsert(list, item, message, files) {
        return save(message, d => {
            const a = d[list], i = a.findIndex(x => x.id === item.id);
            if (i >= 0) a[i] = clone(item); else a.push(clone(item));
        }, files);
    }
    function remove(list, id, message, files) {
        return save(message, d => { d[list] = d[list].filter(x => x.id !== id); }, files);
    }
    async function uploadImage(file, folder, max, type) {
        const ext = type === 'image/png' ? 'png' : 'jpg';
        const { bytes, blob } = await shrink(file, max, type, 0.86);
        const path = IMG_DIR + folder + '/' + Date.now() + '_' + Math.random().toString(36).slice(2, 7) + '.' + ext;
        localImg[path] = URL.createObjectURL(blob);
        const sha = await repo.putBlob(bytes);
        return { path, sha };
    }

    /* ---------------- 게임 화면 ---------------- */
    // 배치는 모바일·PC(아이패드 포함) 따로 저장: settings.layout.mobile / .pc, settings.stickers.mobile / .pc
    const lay = () => isPC() ? 'pc' : 'mobile';
    const S = () => db.settings;
    const bgOff = () => !!S().bg_off;
    const libTypes = () => S().lib_types.map(x => [x.key, x.label]);
    const moodList = () => S().mood_list.map(x => [x.key, x.emoji || '', x.label]);
    const beautySlots = () => S().beauty_slots.map(x => [x.key, x.label]);
    const beautySubs = () => [['all', 'All']].concat(S().beauty_slots.filter(x => x.tab).map(x => [x.key, x.label]));
    const tabsOf = id => WIN[id].dyn ? ['All'].concat(libTypes().map(x => x[1])) : WIN[id].tabs;
    let bgIdx = -1;                 // -1: 아직 안 정함 (밤 20시~아침 7시는 침실로 시작)
    let edit = null;                // 배치 편집 중: { k, char: {x,h}, stickers: [...], files: {} }

    function bgList() { return S().backgrounds; }
    function bgSrc(b) { return (lay() === 'pc' ? (b.pc || b.mobile) : (b.mobile || b.pc)) || ''; }
    function drawBgs() {
        const list = bgList();
        if (bgIdx < 0) {
            const h = new Date().getHours(), night = h >= 20 || h < 7;
            const bi = list.findIndex(b => b.id === 'bedroom');
            bgIdx = night && bi >= 0 ? bi : 0;
        }
        bgIdx = Math.min(bgIdx, list.length - 1);
        const box = $('mj-bgs');
        box.innerHTML = list.map(b => { const p = bgSrc(b); return `<div class="mj-bg mj-bg-${esc(b.id)}">${p ? imgTag(p, 'mj-bg-img').replace(' loading="lazy"', '') : ''}</div>`; }).join('');
        // 처음 그릴 때·다시 그릴 때는 넘기는 움직임 없이 바로 그 배경 (밀어서 넘길 때만 움직임)
        box.style.transition = 'none';
        box.style.transform = `translateX(${-bgIdx * 100}%)`;
        void box.offsetWidth;
        requestAnimationFrame(() => requestAnimationFrame(() => { box.style.transition = ''; }));
    }
    function goBg(i) {
        const n = bgList().length;
        bgIdx = (i + n) % n;
        $('mj-bgs').style.transform = `translateX(${-bgIdx * 100}%)`;
    }

    // 캐릭터: 아래 빈 공간 없이 항상 바닥에 붙음. x = 가운데 위치(%), h = 높이(화면 높이의 %)
    function charLayout() { return (edit && edit.char) || S().layout[lay()]; }
    function drawChar() {
        const el = $('mj-char'), c = charLayout(), src = imgSrc(S().character);
        if (el.dataset.src !== S().character) { el.dataset.src = S().character; el.src = src; el.onerror = () => { el.onerror = null; el.src = repo.rawUrl(S().character); }; }
        el.style.left = c.x + '%';
        el.style.height = c.h + '%';
    }
    // 스티커: x, y = 가운데 위치(%), w = 너비(화면 너비의 %)
    function stickerList() { return edit ? edit.stickers : S().stickers[lay()]; }
    function drawStickers() {
        $('mj-stickers').innerHTML = stickerList().map(t => `
            <div class="mj-stk" data-id="${esc(t.id)}" style="left:${t.x}%;top:${t.y}%;width:${t.w}%">
                ${imgTag(t.img)}
                ${edit ? '<button class="del" data-sdel="1" aria-label="지우기">✕</button><span class="rz" data-rz="1"></span>' : ''}
            </div>`).join('');
    }
    function applyRoom() {
        game.classList.toggle('bg-off', bgOff());
        game.classList.toggle('editing', !!edit);
        drawChar();
        drawStickers();
    }

    // 옆으로 밀어서 배경 바꾸기 + 꾹 누르면(0.6초) 편집 메뉴
    let sw = null, press = 0;
    const stopPress = () => { clearTimeout(press); press = 0; };
    game.addEventListener('pointerdown', e => {
        if (edit) return editDown(e);
        if (e.target.closest('button, .mj-nav, .mj-ask, .mj-edit-bar')) return;
        sw = { x: e.clientX, y: e.clientY };
        stopPress();
        press = setTimeout(() => { press = 0; sw = null; roomMenu(); }, 600);
    });
    game.addEventListener('pointermove', e => {
        if (sw && press && Math.hypot(e.clientX - sw.x, e.clientY - sw.y) > 10) stopPress();
    });
    game.addEventListener('pointerup', e => {
        stopPress();
        if (!sw || edit) return;
        const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null;
        if (!bgOff() && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) goBg(bgIdx + (dx < 0 ? 1 : -1));
    });
    game.addEventListener('pointercancel', () => { sw = null; stopPress(); });
    game.addEventListener('contextmenu', e => e.preventDefault());       // 꾹 누를 때 폰 메뉴가 뜨지 않게

    // 가운데 작은 창 (메뉴·확인용)
    function sheet(title, sub, items) {
        const old = game.querySelector('.mj-ask'); if (old) old.remove();
        const box = document.createElement('div');
        box.className = 'mj-ask';
        box.innerHTML = `
            <div class="mj-ask-card">
                <div class="mj-ask-t">${title}</div>
                ${sub ? `<div class="mj-ask-s">${sub}</div>` : ''}
                <div class="mj-ask-list">${items.map((it, i) => `<button class="${it.cls || ''}" data-i="${i}">${it.label}</button>`).join('')}</div>
            </div>`;
        game.appendChild(box);
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-i]');
            if (!b && e.target.closest('.mj-ask-card')) return;
            box.remove();
            if (b && items[Number(b.dataset.i)].run) items[Number(b.dataset.i)].run();
        });
    }
    function roomMenu() {
        const off = bgOff(), k = lay() === 'pc' ? 'PC' : 'Mobile';
        sheet('Room', off ? 'The room is off — only stickers are showing.' : 'Long-press anytime to come back here.', [
            off ? { label: 'Turn the room on', run: () => sheet('Bring the room back?', 'Background and Minjung will show again.', [
                    { label: 'On', cls: 'main', run: () => save('방 on', d => { d.settings.bg_off = false; }) }, { label: 'Cancel', cls: 'ghost' }]) }
                : { label: 'Turn the room off', run: () => sheet('Turn off the room?', 'Background and Minjung hide. Stickers stay.', [
                    { label: 'Off', cls: 'main', run: () => save('방 off', d => { d.settings.bg_off = true; }) }, { label: 'Cancel', cls: 'ghost' }]) },
            { label: `Edit layout · ${k}`, run: startEdit },
            { label: 'Add sticker', run: () => { startEdit(); addSticker(); } },
            { label: 'Change character', run: () => pickFile(changeChar) },
            { label: 'Backgrounds', run: () => openWin('room') },
            { label: 'Cancel', cls: 'ghost' }
        ]);
    }

    /* ---- 배치 편집: 캐릭터(좌우 이동·크기) + 스티커(이동·크기·삭제) ---- */
    function startEdit() {
        if (edit) return;
        const k = lay();
        edit = { k, char: Object.assign({}, S().layout[k]), stickers: clone(S().stickers[k]), files: {} };
        const bar = document.createElement('div');
        bar.className = 'mj-edit-bar';
        bar.innerHTML = `
            <div class="row"><b>Edit · ${k === 'pc' ? 'PC' : 'Mobile'}</b><span class="sp"></span>
                <button class="mj-btn ghost" data-e="cancel">Cancel</button><button class="mj-btn" data-e="done">Done</button></div>
            <div class="row">
                <button class="mj-add" data-e="sticker">+ Sticker</button>
                ${bgOff() ? '' : `<label class="size">Size <input type="range" min="30" max="140" value="${edit.char.h}" data-e="size"></label>
                <button class="mj-link" data-e="reset">reset</button>`}
            </div>
            <div class="hint">${bgOff() ? 'Drag stickers · corner to resize' : 'Drag Minjung left/right · drag stickers · corner to resize'}</div>`;
        game.appendChild(bar);
        bar.addEventListener('click', e => {
            const b = e.target.closest('[data-e]'); if (!b) return;
            const a = b.dataset.e;
            if (a === 'cancel') endEdit(false);
            if (a === 'done') endEdit(true);
            if (a === 'sticker') addSticker();
            if (a === 'reset') { edit.char = Object.assign({}, DEFAULT_LAYOUT[edit.k]); bar.querySelector('[data-e=size]').value = edit.char.h; drawChar(); }
        });
        bar.addEventListener('input', e => { if (e.target.dataset.e === 'size') { edit.char.h = Number(e.target.value); drawChar(); } });
        applyRoom();
    }
    function endEdit(keep) {
        const ed = edit; edit = null;
        const bar = game.querySelector('.mj-edit-bar'); if (bar) bar.remove();
        if (!keep || !ed) { applyRoom(); return; }
        const k = ed.k, before = S().stickers[k], other = S().stickers[k === 'pc' ? 'mobile' : 'pc'];
        const files = {}, added = [];
        ed.stickers.forEach(t => { if (ed.files[t.img]) { files[t.img] = ed.files[t.img]; added.push(t.img); } });   // 새로 올린 스티커 → 모음에도
        const lib = S().sticker_lib || [];
        before.forEach(t => {                                                                         // 지운 스티커 그림 파일도 지움 (모음에 있는 건 남김)
            if (!ed.stickers.some(x => x.img === t.img) && !other.some(x => x.img === t.img) && !lib.includes(t.img)) files[t.img] = null;
        });
        const round = o => { Object.keys(o).forEach(key => { if (typeof o[key] === 'number') o[key] = Math.round(o[key] * 10) / 10; }); return o; };
        save('배치 수정 (' + k + ')', d => {
            d.settings.layout[k] = round(Object.assign({}, ed.char));
            d.settings.stickers[k] = ed.stickers.map(t => round(Object.assign({}, t)));
            if (added.length) d.settings.sticker_lib = [...new Set((d.settings.sticker_lib || []).concat(added))];
        }, files);
    }
    // 내 스티커 모음 = settings.sticker_lib (다이어리 스티커 서랍과 같이 씀) + 방에 붙인 것
    function stickerLib() {
        return [...new Set((S().sticker_lib || []).concat(S().stickers.pc.map(t => t.img), S().stickers.mobile.map(t => t.img)))].filter(Boolean);
    }
    function addSticker() {
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        const lib = stickerLib();
        if (!lib.length) return uploadSticker();
        const old = game.querySelector('.mj-ask'); if (old) old.remove();
        const box = document.createElement('div');
        box.className = 'mj-ask';
        box.innerHTML = `<div class="mj-ask-card"><div class="mj-ask-t">Sticker</div><div class="mj-ask-s">My stickers (shared with Diary)</div>
            <div class="mj-stk-lib">${lib.map(p => `<button data-p="${esc(p)}">${imgTag(p)}</button>`).join('')}</div>
            <div class="mj-ask-list"><button class="main" data-up="1">Upload new</button><button class="ghost">Cancel</button></div></div>`;
        game.appendChild(box);
        box.addEventListener('click', e => {
            const b = e.target.closest('[data-p]'), up = e.target.closest('[data-up]');
            if (!b && !up && !e.target.closest('.ghost') && e.target.closest('.mj-ask-card')) return;
            box.remove();
            if (b) { if (!edit) startEdit(); edit.stickers.push({ id: uid('st'), img: b.dataset.p, x: 50, y: 40, w: 28 }); drawStickers(); }
            if (up) uploadSticker();
        });
    }
    function uploadSticker() {
        pickFile(async f => {
            try {
                toast('uploading…');
                const { path, sha } = await uploadImage(f, 'stickers', 800, 'image/png');
                if (!edit) startEdit();
                edit.files[path] = sha;
                edit.stickers.push({ id: uid('st'), img: path, x: 50, y: 40, w: 28 });
                drawStickers();
            } catch (e) { mjAlert('스티커를 올리지 못했어요.\n' + (e.message || e)); }
        });
    }
    // 끌기: 캐릭터는 좌우만, 스티커는 어디든. 모서리 점은 크기
    function editDown(e) {
        if (e.target.closest('.mj-edit-bar, .mj-ask')) return;
        const r = $('mj-scene').getBoundingClientRect();
        const del = e.target.closest('[data-sdel]');
        const stkEl = e.target.closest('.mj-stk');
        if (del && stkEl) { edit.stickers = edit.stickers.filter(t => t.id !== stkEl.dataset.id); drawStickers(); return; }
        let move;
        if (stkEl) {
            const t = edit.stickers.find(x => x.id === stkEl.dataset.id);
            const sx = e.clientX, sy = e.clientY, o = Object.assign({}, t);
            if (e.target.closest('[data-rz]')) move = ev => { t.w = Math.max(5, Math.min(100, o.w + (ev.clientX - sx) / r.width * 200)); stkEl.style.width = t.w + '%'; };
            else move = ev => {
                t.x = Math.max(0, Math.min(100, o.x + (ev.clientX - sx) / r.width * 100));
                t.y = Math.max(0, Math.min(100, o.y + (ev.clientY - sy) / r.height * 100));
                stkEl.style.left = t.x + '%'; stkEl.style.top = t.y + '%';
            };
        } else if (e.target.closest('.mj-char') && !bgOff()) {
            const sx = e.clientX, ox = edit.char.x;
            move = ev => { edit.char.x = Math.max(0, Math.min(100, ox + (ev.clientX - sx) / r.width * 100)); drawChar(); };
        }
        if (!move) return;
        e.preventDefault();
        const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
        window.addEventListener('pointercancel', up);
    }

    /* ---- 캐릭터 그림 바꾸기 (배경이 투명한 PNG 추천) ---- */
    async function changeChar(file) {
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'character', 1600, 'image/png');
            const old = S().character, files = {}; files[path] = sha;
            if (old && old.startsWith(IMG_DIR)) files[old] = null;
            save('캐릭터 그림', d => { d.settings.character = path; }, files);
        } catch (e) { mjAlert('그림을 올리지 못했어요.\n' + (e.message || e)); }
    }
    /* ---- 배경 목록 (Backgrounds 창) ---- */
    async function setBgImage(i, which, file) {
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'room', 2000, 'image/jpeg');
            const files = {}; files[path] = sha;
            const list = bgList();
            if (i < 0) {
                save('배경 추가', d => { d.settings.backgrounds.push({ id: uid('bg'), mobile: path, pc: path }); }, files);
                return;
            }
            const id = list[i].id, old = list[i][which];
            const usedElsewhere = list.some((b, j) => ['mobile', 'pc'].some(w => !(j === i && w === which) && b[w] === old));
            if (old && old.startsWith(IMG_DIR) && !usedElsewhere) files[old] = null;
            save('배경 ' + which, d => { const b = d.settings.backgrounds.find(x => x.id === id); if (b) b[which] = path; }, files);
        } catch (e) { mjAlert('배경을 올리지 못했어요.\n' + (e.message || e)); }
    }
    async function delBg(i) {
        const list = bgList();
        if (list.length <= 1) { mjAlert('배경은 하나는 남겨 둬야 해요.'); return; }
        if (!await mjConfirm('이 배경을 지울까요?', 'Delete')) return;
        const b = list[i], files = {};
        [b.mobile, b.pc].forEach(p => {
            if (p && p.startsWith(IMG_DIR) && !list.some((x, j) => j !== i && (x.mobile === p || x.pc === p))) files[p] = null;
        });
        if (bgIdx >= i) bgIdx = Math.max(0, bgIdx - 1);
        save('배경 삭제', d => { d.settings.backgrounds = d.settings.backgrounds.filter(x => x.id !== b.id); }, files);
    }

    function drawDate() {
        const el = $('mj-date');
        if (el) el.textContent = dayTitle(todayKey());
    }
    // 지금 HP: 마지막 기록 뒤로 해가 떴으면 5 (자고 일어남)
    function hpNow() {
        const hp = db.hp.slice().sort(byNewest)[0];
        if (!hp) return 5;
        let pl = null; try { pl = sion.cfg && sion.cfg.place; } catch (e) {}
        const at = new Date((hp.date || '') + 'T' + (hp.time || '00:00')).getTime();
        return at < lastSunrise(pl && pl.lat || 35.1, pl && pl.lon || 129) ? 5 : hp.v;
    }
    let shownLine = null, typer = 0;
    function drawScreen() {
        drawDate();
        applyRoom();
        $('mj-hp').innerHTML = hearts(hpNow());
        const qt = todayKey(), qs = db.quests.filter(q => qDue(q, qt)), qd = qs.filter(q => qDone(qt, q.id)).length;
        $('mj-quest').innerHTML = `<span class="mj-ico">${ICON.quest}</span><span class="n">${qd}/${qs.length}</span>${qs.length && qd === qs.length ? '<span class="clr">clear</span>' : ''}`;
        $('mj-quest').classList.toggle('done', !!qs.length && qd === qs.length);
        drawSionBtn();
        drawNoti();
        const line = db.lines.slice().sort(byNewest)[0];
        const text = line ? line.text : '…';
        if (text !== shownLine) {
            shownLine = text;
            const say = $('mj-say');
            clearInterval(typer);
            let i = 0;
            say.textContent = '';
            typer = setInterval(() => {
                if (!say.isConnected) return clearInterval(typer);
                i++; say.textContent = text.slice(0, i);
                if (i >= text.length) clearInterval(typer);
            }, 38);
        }
    }
    $('mj-hp').addEventListener('click', () => openWin('hp'));
    $('mj-quest').addEventListener('click', () => openWin('quest'));
    $('mj-sion').addEventListener('click', () => openSion('Message'));
    $('mj-noti').addEventListener('click', e => { e.stopPropagation(); if (root.querySelector('.mj-noti-panel')) notiClose(); else notiOpen(); });

    /* ---------------- 퀘스트 ---------------- */
    const qDone = (date, id) => !!(db.quest_log[date] || {})[id];
    const dayDiff = (a, b) => Math.round((new Date(b + 'T00:00') - new Date(a + 'T00:00')) / 864e5);
    function qLastBefore(id, date) {          // date 전날까지 중 마지막으로 한 날
        return Object.keys(db.quest_log).filter(k => k < date && db.quest_log[k][id]).sort().pop() || '';
    }
    function qDue(q, date) {
        if (q.kind !== 'repeat') return true;
        if (qDone(date, q.id)) return true;
        if (q.mode === 'week') return (q.days || []).includes(new Date(date + 'T00:00').getDay());
        const last = qLastBefore(q.id, date);
        return !last || dayDiff(last, date) >= (q.every || 1);
    }
    function qWhen(q, date) {                  // 다음에 할 때까지
        if (q.mode === 'week') {
            for (let n = 1; n <= 7; n++) if ((q.days || []).includes((new Date(date + 'T00:00').getDay() + n) % 7)) return n === 1 ? 'tomorrow' : 'D-' + n;
            return '';
        }
        const last = qLastBefore(q.id, date) || (qDone(date, q.id) ? date : '');
        const left = (q.every || 1) - (last ? dayDiff(last, date) : 0);
        return left <= 1 ? 'tomorrow' : 'D-' + left;
    }
    const qRule = q => q.mode === 'week' ? (q.days || []).slice().sort().map(d => DOW_KO[d]).join('·') : (q.every || 1) + '일마다';
    function toggleQuest(st, id) {
        const q = db.quests.find(x => x.id === id); if (!q) return;
        const date = st.date, on = !qDone(date, id), time = hmOf(new Date());
        save('퀘스트 ' + (on ? '완료 ' : '취소 ') + date + ' ' + q.title, d => {
            d.quest_log[date] = d.quest_log[date] || {};
            if (on) d.quest_log[date][id] = time; else delete d.quest_log[date][id];
            if (!Object.keys(d.quest_log[date]).length) delete d.quest_log[date];
        });
    }
    function questView(st) {
        const daily = st.tab === 'Daily';
        if (st.qedit) return questEdit(st, daily);
        const date = st.date;
        let list = db.quests.filter(q => (q.kind === 'repeat') !== daily);
        if (daily && st.sub !== 'all') list = list.filter(q => (q.slot || 'etc') === st.sub);
        const due = daily ? list : list.filter(q => qDue(q, date));
        const done = due.filter(q => qDone(date, q.id)).length;
        const pct = due.length ? Math.round(done / due.length * 100) : 0;
        const row = q => {
            const ok = qDone(date, q.id), isDue = qDue(q, date);
            return `
                <button class="mj-q ${ok ? 'ok' : ''} ${isDue ? '' : 'rest'}" data-act="q-toggle" data-id="${q.id}">
                    <span class="box">${ok ? '✓' : ''}</span>
                    <span class="tt">${esc(q.title)}</span>
                    ${!daily ? `<span class="rule">${qRule(q)}</span><span class="when">${ok ? (db.quest_log[date][q.id] || '') : isDue ? 'today' : qWhen(q, date)}</span>` : (ok ? `<span class="when">${db.quest_log[date][q.id]}</span>` : '')}
                </button>`;
        };
        let body = '';
        if (daily && st.sub === 'all') {
            body = QSLOTS.map(([k, l]) => { const g = list.filter(q => (q.slot || 'etc') === k); return g.length ? `<div class="mj-log-day">${l}</div>` + g.map(row).join('') : ''; }).join('');
        } else if (daily) body = list.map(row).join('');
        else body = due.map(row).join('') + (list.length > due.length ? `<div class="mj-log-day">later</div>` + list.filter(q => !qDue(q, date)).map(row).join('') : '');
        return `
            ${daily ? `<div class="mj-subs">${[['all', 'All']].concat(QSLOTS).map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>` : ''}
            <div class="mj-day">
                <button data-act="day" data-v="-1">‹</button>
                <input type="date" data-day value="${date}">
                <button data-act="day" data-v="1">›</button>
                <button class="today" data-act="day" data-v="0">Today</button>
            </div>
            <div class="mj-qbar"><span class="fill" style="width:${pct}%"></span></div>
            <div class="mj-qstat">${done}/${due.length}${due.length && done === due.length ? ' · clear ♡' : ''}<button class="mj-link" data-act="q-edit">edit</button></div>
            <div class="mj-log">${body || empty('퀘스트가 없어요.')}</div>`;
    }
    function questEdit(st, daily) {
        const list = db.quests.filter(q => (q.kind === 'repeat') !== daily);
        return `
            <div class="mj-sec">${daily ? 'Daily' : 'Weekly'} quests</div>
            <div class="mj-pf-edit mj-qe">${list.map(q => qeRow(q, daily)).join('')}</div>
            <button class="mj-add" data-act="q-add">+ quest</button>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="q-cancel">Cancel</button><button class="mj-btn" data-act="q-save">Save</button></div>`;
    }
    const qeRow = (q, daily) => `
        <div class="mj-qe-row" data-id="${esc(q.id || '')}">
            <div class="top">
                <input data-k="title" value="${esc(q.title || '')}" placeholder="quest">
                <div class="mj-pf-tools"><button data-act="pup">▲</button><button data-act="pdown">▼</button><button data-act="q-del">✕</button></div>
            </div>
            ${daily
                ? `<div class="mj-chips" data-single="slot">${QSLOTS.map(([k, l]) => `<button class="mj-chip ${(q.slot || 'morning') === k ? 'on' : ''}" data-act="chip" data-v="${k}">${l}</button>`).join('')}</div>`
                : `<div class="rep">
                    <div class="mj-chips" data-single="mode">
                        <button class="mj-chip ${q.mode !== 'week' ? 'on' : ''}" data-act="chip" data-v="every">every</button>
                        <button class="mj-chip ${q.mode === 'week' ? 'on' : ''}" data-act="chip" data-v="week">weekday</button>
                    </div>
                    <label class="every"><input data-k="every" type="number" min="1" max="60" value="${q.every || 3}" inputmode="numeric">일마다</label>
                    <div class="mj-chips days" data-multi="days">${DOW_KO.map((d, i) => `<button class="mj-chip ${(q.days || []).includes(i) ? 'on' : ''}" data-act="chip" data-v="${i}">${d}</button>`).join('')}</div>
                </div>`}
        </div>`;
    function saveQuests(id, el, st) {
        const daily = st.tab === 'Daily';
        const rows = [...el.querySelectorAll('.mj-qe-row')].map(r => {
            const title = r.querySelector('[data-k=title]').value.trim(); if (!title) return null;
            const q = { id: r.dataset.id || uid('q'), kind: daily ? 'daily' : 'repeat', title };
            const pick = sel => { const c = r.querySelector(`[data-single=${sel}] .mj-chip.on`); return c ? c.dataset.v : ''; };
            if (daily) q.slot = pick('slot') || 'morning';
            else {
                q.mode = pick('mode') === 'week' ? 'week' : 'every';
                if (q.mode === 'week') q.days = [...r.querySelectorAll('[data-multi=days] .mj-chip.on')].map(c => Number(c.dataset.v));
                else q.every = Math.max(1, Number(r.querySelector('[data-k=every]').value) || 1);
            }
            return q;
        }).filter(Boolean);
        st.qedit = false;
        save((daily ? 'Daily' : 'Weekly') + ' 퀘스트 수정', d => {
            const others = d.quests.filter(q => (q.kind === 'repeat') === daily);
            d.quests = daily ? rows.concat(others) : others.concat(rows);
        });
    }
    $('mj-dialog').addEventListener('click', () => openWin('lines'));

    // 아래 메뉴(모바일) + 바탕화면 아이콘(PC)
    function drawMenus() {
        $('mj-nav').innerHTML = NAV.map(n => `<button data-nav="${n.id}"><span class="mj-ico">${iconHtml(n.id)}</span><span>${n.title}</span></button>`).join('');
        $('mj-icons').innerHTML = NAV.map(n => `<button class="mj-file" data-nav="${n.id}"><span class="mj-ico">${iconHtml(n.id)}</span><span class="mj-file-name">${n.title}</span></button>`).join('');
    }
    root.addEventListener('click', e => {
        const b = e.target.closest('[data-nav]');
        if (!b) return;
        const n = NAV.find(x => x.id === b.dataset.nav);
        if (!n.pick) { closePick(); openWin(n.id); return; }
        const items = n.pick === 'soon'
            ? [{ icon: iconHtml('library'), label: 'Library', run: () => openWin('library') },
               { icon: iconHtml('bang'), label: 'BANG', run: () => { openWin('bang'); if (!sion.data) loadSion(); } }]
                .concat(SOON.map(([k, l]) => ({ icon: ICON[k], label: l, run: () => toast(l + ' · Coming soon ♡') })))
            : n.pick.map(([k, l]) => ({ icon: iconHtml(k), label: l, run: () => openWin(k) }));
        showPick(b, items, n.title);
    });

    /* 작은 고르기 팝업: 누른 아이콘 바로 위(모바일)·옆(PC)에 뜨고, 바깥을 누르면 닫힘 */
    let pickEl = null;
    function closePick() { if (pickEl) { pickEl.remove(); pickEl = null; } }
    function showPick(anchor, items, title) {
        const same = pickEl && pickEl.dataset.for === (title || '');
        closePick();
        if (same) return;                       // 같은 아이콘을 다시 누르면 닫기만
        pickEl = document.createElement('div');
        pickEl.className = 'mj-pick-bg';
        pickEl.dataset.for = title || '';
        if (anchor.closest('.mj-win-food, .mj-win-state, .mj-win-sion, .mj-win-bang')) pickEl.classList.add('dark');   // 블랙·핑크 창에서는 어둡게
        pickEl.innerHTML = `<div class="mj-pick">${title ? `<div class="mj-pick-title">${title}</div>` : ''}${items.map((it, i) =>
            `<button class="${it.small ? 'small' : ''}" data-i="${i}">${it.icon ? `<span class="mj-ico">${it.icon}</span>` : ''}<span>${it.label}</span></button>`).join('')}</div>`;
        root.appendChild(pickEl);
        const box = pickEl.querySelector('.mj-pick'), a = anchor.getBoundingClientRect(), r = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
        const bw = box.offsetWidth, bh = box.offsetHeight;
        let left, top;
        if (anchor.closest('.mj-icons')) { left = a.left - r.left - bw - 8; top = a.top - r.top; }                       // PC: 아이콘 왼쪽
        else if (anchor.closest('.mj-nav')) { left = a.left - r.left + a.width / 2 - bw / 2; top = a.top - r.top - bh - 6; }   // 모바일: 아이콘 바로 위
        else { left = a.right - r.left - bw; top = a.bottom - r.top + 4; }                                                // 창 안 + 버튼: 아래
        left = Math.max(6, Math.min(left, r.width - bw - 6));
        top = Math.max(6, Math.min(top, r.height - bh - 6));
        box.style.left = left + 'px'; box.style.top = top + 'px';
        pickEl.addEventListener('click', e => {
            const btn = e.target.closest('[data-i]');
            closePick();
            if (btn) items[Number(btn.dataset.i)].run();
        });
    }

    function toast(msg) {
        const t = $('mj-toast');
        t.textContent = msg; t.classList.add('on');
        clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 1600);
    }

    /* ---------------- 창 ---------------- */
    function newState(id) {
        const st = { tab: tabsOf(id) ? tabsOf(id)[0] : null, date: todayKey(), form: null };
        if (id === 'daily' || id === 'quest') st.sub = 'all';
        if (id === 'hp' || id === 'lines') st.form = {};
        return st;
    }
    function openWin(id) {
        if (!WIN[id]) return;
        closePick();
        if (wins[id]) { focusWin(id); return; }
        const el = document.createElement('div');
        el.className = 'mj-win mj-win-' + id;
        el.dataset.win = id;
        wins[id] = { el, st: newState(id) };
        layer.appendChild(el);
        if (isPC()) {
            // 한쪽에 쌓이지 않게 창마다 화면 여기저기 자리를 정해 둠 (가로·세로 비율)
            const w = Math.min(WIN[id].w, window.innerWidth - 40);
            el.style.width = w + 'px';
        }
        bindWin(id);
        renderWin(id);
        if (isPC()) placeWin(id);
        focusWin(id);
        if (id === 'diary') loadTodos();
    }
    function placeWin(id) {
        const el = wins[id].el;
        const [fx, fy] = SPOT[id] || [Math.random(), Math.random()];
        const j = (opened++ % 3) * 14;
        const top0 = Math.max(0, root.getBoundingClientRect().top) + 46;        // 날짜·하트 아래부터
        const roomX = Math.max(0, window.innerWidth - el.offsetWidth - 130);   // 오른쪽 폴더 아이콘 자리는 비움
        const roomY = Math.max(0, window.innerHeight - top0 - el.offsetHeight - 16);
        el.style.left = Math.round(16 + fx * roomX + (fx > .5 ? -j : j)) + 'px';
        el.style.top = Math.round(top0 + fy * roomY + (fy > .5 ? -j : j)) + 'px';
    }
    function closeWin(id) { const w = wins[id]; if (!w) return; w.el.remove(); delete wins[id]; }
    function focusWin(id) {
        const w = wins[id]; if (!w) return;
        w.el.style.zIndex = ++zTop;
        Object.keys(wins).forEach(k => wins[k].el.classList.toggle('front', k === id));
    }
    function listEditView(id) {
        if (id === 'state') return `
            <div class="mj-sec">Symptom tags</div>
            <div class="mj-pf-edit mj-le" data-list="symptom">${db.symptom_tags.map(t => leRow(id, { key: t, label: t })).join('')}</div>
            <button class="mj-add" data-act="le-add" data-v="symptom">+ add</button>
            <div class="mj-sec" style="margin-top:14px">Mood</div>
            <div class="mj-pf-edit mj-le" data-list="mood">${S().mood_list.map(r => leRow(id, r, true)).join('')}</div>
            <button class="mj-add" data-act="le-add" data-v="mood">+ add</button>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="le-cancel">Cancel</button><button class="mj-btn" data-act="le-save">Save</button></div>`;
        const rows = id === 'library' ? S().lib_types : id === 'food' ? S().med_list : S().beauty_slots;
        const name = id === 'library' ? 'Library' : id === 'food' ? 'Medicine' : 'Beauty';
        return `
            <div class="mj-sec">${name} list</div>
            <div class="mj-pf-edit mj-le">${rows.map(r => leRow(id, r)).join('')}</div>
            <button class="mj-add" data-act="le-add">+ add</button>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="le-cancel">Cancel</button><button class="mj-btn" data-act="le-save">Save</button></div>`;
    }
    const leRow = (id, r, mood) => `
        <div class="mj-pf-row mj-le-row${mood ? ' mood' : ''}" data-key="${esc(r.key || '')}">
            ${mood ? `<input data-k="emoji" class="emo-in" value="${esc(r.emoji || '')}" maxlength="4">` : ''}
            <input data-k="label" value="${esc(r.label || '')}">
            ${id === 'daily' ? `<label class="tabchk"><input type="checkbox" data-k="tab" ${r.tab !== false ? 'checked' : ''}>tab</label>` : '<span></span>'}
            <div class="mj-pf-tools"><button data-act="pup">▲</button><button data-act="pdown">▼</button><button data-act="le-del">✕</button></div>
        </div>`;
    async function saveListEdit(id, el) {
        if (id === 'state') {
            const read = sel => [...el.querySelectorAll(`.mj-le[data-list=${sel}] .mj-le-row`)];
            const tags = [...new Set(read('symptom').map(r => r.querySelector('[data-k=label]').value.trim()).filter(Boolean))];
            const moods = read('mood').map(r => ({ key: r.dataset.key || uid('m'), emoji: r.querySelector('[data-k=emoji]').value.trim(), label: r.querySelector('[data-k=label]').value.trim() })).filter(m => m.label);
            if (!moods.length) { mjAlert('Mood는 하나는 남겨 둬야 해요.'); return; }
            wins[id].st.listedit = false;
            save('Symptom·Mood 목록 수정', d => { d.symptom_tags = tags; d.settings.mood_list = moods; });
            return;
        }
        const rows = [...el.querySelectorAll('.mj-le-row')].map(r => ({
            key: r.dataset.key || uid('c'), label: r.querySelector('[data-k=label]').value.trim(),
            tab: r.querySelector('[data-k=tab]') ? r.querySelector('[data-k=tab]').checked : undefined
        })).filter(r => r.label);
        if (!rows.length) { mjAlert('하나는 남겨 둬야 해요.'); return; }
        const list = id === 'library' ? 'lib_types' : id === 'food' ? 'med_list' : 'beauty_slots';
        if (list === 'med_list') rows.forEach(r => { r.key = r.label; });                 // 약은 이름 그대로 기록에 남김
        const records = id === 'library' ? db.library : id === 'food' ? [] : db.beauty, field = id === 'library' ? 'type' : 'slot';
        const gone = S()[list].filter(o => !rows.some(r => r.key === o.key) && records.some(x => x[field] === o.key));
        if (gone.length && !await mjConfirm(gone.map(o => o.label).join(', ') + ' 에 쓴 기록은 지워지지 않고 All에서 계속 보여요. 저장할까요?', 'Save')) return;
        wins[id].st.listedit = false;
        if (id !== 'food') wins[id].st.tab = tabsOf(id)[0];
        if (id === 'daily') wins[id].st.sub = 'all';
        save((id === 'library' ? 'Library' : id === 'food' ? 'Medicine' : 'Beauty') + ' 목록 수정', d => {
            d.settings[list] = rows.map(r => { const o = { key: r.key, label: r.label }; if (list === 'beauty_slots') o.tab = r.tab; return o; });
            if (list === 'beauty_slots') rows.forEach(r => { if (!Array.isArray(d.beauty_steps[r.key])) d.beauty_steps[r.key] = []; });
        });
    }
    function renderWin(id) {
        const w = wins[id]; if (!w) return;
        const def = WIN[id], st = w.st;
        const body = w.el.querySelector('.mj-win-body');
        const top = body ? body.scrollTop : 0;
        const tabsEl = w.el.querySelector('.mj-tabs'), tabsLeft = tabsEl ? tabsEl.scrollLeft : 0;
        const tabs = tabsOf(id), canList = id === 'library' || id === 'daily' || id === 'food' || id === 'state';
        if (id === 'sion') w.el.classList.toggle('kk-themed', !!KT.theme);
        w.el.innerHTML = id === 'sion' ? (st.view === 'call' || st.view === 'ring' ? `<div class="mj-win-body kk-callbody">${VIEW[id](st)}</div>` : `
            <div class="mj-win-head sn-head kk-head" data-drag>
                <button class="kk-pill kk-back" data-act="sn-back" aria-label="뒤로">${KK.back}${!st.view || st.view === 'chat' ? `<span class="n">${(sion.data && sion.data.chat || []).length}</span>` : ''}</button>
                <b class="kk-name">${esc(st.view === 'kset' ? '채팅방 설정' : st.view === 'cedit' ? '프로필 편집' : '')}</b>
                ${!st.view || st.view === 'chat' ? `<span class="kk-pill kk-r"><button data-act="sn-search" aria-label="검색">${KK.search}</button><button data-act="sn-contact" aria-label="전화">${KK.phone}</button><button data-act="sn-menu" aria-label="메뉴">${KK.menu}</button></span>`
                    : st.view === 'contact' ? '<span class="kk-pill kk-r kk-txt"><button data-act="call-edit">편집</button></span>' : '<span class="kk-r"></span>'}
            </div>
            <div class="mj-win-body">${VIEW[id](st)}</div>`) : `
            <div class="mj-win-head" data-drag>
                <button class="mj-badge" ${(id !== 'hp' && id !== 'lines') ? 'data-act="icon" title="아이콘 바꾸기"' : 'tabindex="-1"'}>${iconHtml(id)}</button>
                <div class="mj-title">${def.title}</div>
                <span class="mj-dots3"><i class="y"></i><button class="g${canList ? ' on' : ''}" ${canList ? 'data-act="listedit" title="목록 편집"' : 'tabindex="-1"'}></button></span>
                <button class="mj-x" data-act="close" aria-label="닫기">${X_SVG}</button>
            </div>
            ${tabs ? `<div class="mj-tabs">${tabs.map(t => `<button data-act="tab" data-v="${t}" class="${st.tab === t ? 'on' : ''}">${t}</button>`).join('')}
                <span class="sp"></span>${canAdd(id, st) ? `<button class="mj-plus" data-act="plus" aria-label="추가">${PLUS_SVG}</button>` : ''}</div>` : ''}
            <div class="mj-win-body">${st.listedit ? listEditView(id) : VIEW[id](st)}</div>`;
        w.el.querySelector('.mj-win-body').scrollTop = top;
        const nt = w.el.querySelector('.mj-tabs'); if (nt) nt.scrollLeft = tabsLeft;
        if (id === 'sion') sionAfterRender(w);
    }
    // 탭 줄 오른쪽 + 버튼이 보이는 곳
    function canAdd(id, st) { return id === 'daily' && st.tab === 'Outfit' && !st.form && !st.listedit; }
    function plus(id, st, btn) {
        const fresh = () => renderWin(id);
        if (WIN[id].types) {
            if (st.tab !== 'All') { st.form = { type: st.tab.toLowerCase() }; fresh(); return; }
            showPick(btn, WIN[id].types.map(k => ({ label: label(COND_TYPES, k), run: () => { st.form = { type: k }; fresh(); } })));
            return;
        }
        if (id === 'daily' && st.tab === 'Outfit') { pickFile(f => { st.form = { file: f, preview: URL.createObjectURL(f) }; fresh(); }); return; }
        if (id === 'daily' && st.sub === 'all') {
            showPick(btn, beautySlots().map(([k, l]) => ({ label: l, run: () => { st.form = { slot: k }; fresh(); } })));
            return;
        }
        st.form = {}; fresh();
    }
    // 저장 뒤 다시 그림 (적고 있는 칸이 있는 창은 건드리지 않음)
    let bgSig = '';
    function redraw(fromServer) {
        const sig = JSON.stringify(bgList());
        if (sig !== bgSig) { bgSig = sig; drawBgs(); }
        drawScreen();
        drawMenus();
        Object.keys(wins).forEach(id => {
            const st = wins[id].st;
            const typing = wins[id].el.contains(document.activeElement) || st.pedit || (st.form && st.form.id) ||
                (st.form && Object.keys(st.form).length && id !== 'hp' && id !== 'lines');
            if ((fromServer && typing) || ((id === 'diary' || id === 'library') && st.form) || st.qedit) return;   // 다이어리 쓰는 중엔 안 건드림
            renderWin(id);
        });
    }

    // 창 안 버튼들
    function bindWin(id) {
        const w = wins[id], el = w.el;
        el.addEventListener('pointerdown', () => focusWin(id));
        // 탭 줄: 마우스 휠(위아래)로도 좌우 이동, 마우스로 잡아 끌기
        el.addEventListener('wheel', e => {
            const t = e.target.closest('.mj-tabs');
            if (!t || t.scrollWidth <= t.clientWidth) return;
            t.scrollLeft += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
            e.preventDefault();
        }, { passive: false });
        let tabDrag = null;
        el.addEventListener('pointerdown', e => {
            const t = e.target.closest('.mj-tabs');
            if (!t || e.pointerType !== 'mouse') return;
            tabDrag = { t, x: e.clientX, left: t.scrollLeft, moved: false };
        });
        window.addEventListener('pointermove', e => {
            if (!tabDrag) return;
            const dx = e.clientX - tabDrag.x;
            if (Math.abs(dx) > 4) tabDrag.moved = true;
            tabDrag.t.scrollLeft = tabDrag.left - dx;
        });
        window.addEventListener('pointerup', () => { if (tabDrag && tabDrag.moved) el.dataset.noclick = '1'; tabDrag = null; setTimeout(() => { delete el.dataset.noclick; }, 0); });
        // PC: 머리 부분 끌어서 옮기기
        el.addEventListener('pointerdown', e => {
            if (!isPC() || !e.target.closest('[data-drag]') || e.target.closest('button')) return;
            const r = el.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
            const move = ev => {
                el.style.left = Math.min(window.innerWidth - 60, Math.max(-r.width + 80, ev.clientX - ox)) + 'px';
                el.style.top = Math.min(window.innerHeight - 40, Math.max(0, ev.clientY - oy)) + 'px';
            };
            const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', up);
            e.preventDefault();
        });
        if (id === 'sion' || id === 'diary') sionBind(w);
        if (id === 'bang') el.addEventListener('input', e => {
            const t = e.target;
            if (t.matches('[data-bg=mem]')) { w.st.mdraft = t.value; const n = el.querySelector('.bg-count'); if (n) n.textContent = t.value.length + '자'; }
            if (t.matches('[data-bf]')) {
                const first = !(w.st.pd && Object.keys(w.st.pd).length);
                (w.st.pd = w.st.pd || {})[t.dataset.bf] = t.value;
                if (first) { el.querySelectorAll('.bg-bar').forEach(bar => { bar.querySelector('.bg-count').textContent = '고친 내용이 있어요'; const sv = bar.querySelector('[data-act=bg-psave]'); if (sv) sv.disabled = false; }); }
            }
        });
        el.addEventListener('click', e => {
            if (el.dataset.noclick) return;
            const b = e.target.closest('[data-act]');
            if (!b || !el.contains(b)) return;
            const st = w.st, act = b.dataset.act, v = b.dataset.v;
            const fresh = () => renderWin(id);
            switch (act) {
                case 'close': closeWin(id); break;
                // 시온 메시지·편지
                case 'sn-send': if ((st.draft || '').trim()) sionSendChat(st); else { st.searching = true; st.q = ''; fresh(); const q = el.querySelector('[data-sn=q]'); if (q) q.focus(); } break;
                case 'sn-letter': sionRun('letter', st.ldate); break;
                case 'sn-lsend': sionSendLetterReply(st); break;
                case 'sn-retry': sionRun(v, st.ldate); break;
                case 'bg-save': bangSave(st); break;
                case 'bg-psave': bangPromptSave(st); break;
                case 'bg-pcancel': st.pd = null; fresh(); break;
                case 'bg-photo': bangPhoto(st); break;
                case 'bg-photo-del': bangPhoto(st, true); break;
                case 'bg-reset': st.mdraft = null; fresh(); break;
                case 'dl-open': st.dday = v; fresh(); break;
                case 'dl-back': st.dday = null; fresh(); break;
                case 'dl-del': dailyDelete(v); break;
                case 'sn-back': if (st.view === 'cedit') { st.view = st.from === 'kset' ? 'kset' : 'contact'; fresh(); } else if (st.view === 'calllog') { st.view = st.logFrom === 'chat' ? 'chat' : 'contact'; fresh(); } else if (st.view && st.view !== 'chat') { st.view = 'chat'; fresh(); } else closeWin(id); break;
                case 'sn-contact': st.view = 'contact'; fresh(); break;
                case 'sn-menu': showPick(b, [
                        { icon: SN_SVG.heart(!st.favs), label: st.favs ? '하트 모아 보기 닫기' : '하트 모아 보기', run: () => { st.favs = !st.favs; st.searching = false; st.q = ''; st.stick = true; fresh(); } },
                        { icon: SN_SVG.bell(sion.push === true), label: sion.push === true ? '알림 끄기' : '알림 켜기', run: sionPushToggle },
                        { icon: KK.menu, label: '채팅방 설정 · 테마', run: () => { st.view = 'kset'; fresh(); } }
                    ]); break;
                case 'kk-opt': if (sionNeedToken()) break; KT.opt[v] = !KT.opt[v]; ktSaveOpt(); fresh(); break;
                case 'kk-font':
                    if (sionNeedToken()) break;
                    if (v === 'mine') { pickAny('.ttf,.otf,.woff,.woff2,font/*', async f => { toast('글꼴 올리는 중…'); try { await ktFont(f); toast('글꼴을 바꿨어요'); } catch (err) { mjAlert('글꼴을 넣지 못했어요.\n' + (err.message || err)); } }); break; }
                    KT.opt.font = v; ktSaveOpt(); break;
                case 'kk-theme': if (sionNeedToken()) break; pickAny('.ktheme,.apk,.zip,application/zip,application/vnd.android.package-archive', async f => {
                        toast('테마 읽는 중…');
                        try { const th = await ktImport(f); toast(th.name + ' 적용 ♡'); } catch (err) { console.error(err); mjAlert('테마를 넣지 못했어요.\n' + (err.message || err)); }
                    }); break;
                case 'kk-theme-del': if (!sionNeedToken()) ktReset().catch(err => mjAlert('되돌리지 못했어요.\n' + (err.message || err))); break;
                case 'kk-name': (async () => {
                        const t = ((await mjPrompt('대화 상대 이름', contact())) || '').trim(); if (!t || t === contact() || sionNeedToken()) return;
                        sion.cfg.contact = t; WIN.sion.title = t; fresh(); drawSionBtn();
                        repo.commit('김민정: 시온 이름', {}, { [SION_CFG]: { fallback: {}, mutate: c => { c.contact = t; return c; } } }).catch(e => mjAlert('저장하지 못했어요.\n' + (e.message || e)));
                    })(); break;
                case 'call-edit': st.from = st.view; st.view = 'cedit'; fresh(); break;
                case 'ce-photo': pickFile(f => callCfgSave('call_photo', f)); break;
                case 'ce-photo-del': callCfgSave('call_photo', null); break;
                case 'ce-ring': pickFile(f => callCfgSave('ring_bg', f)); break;
                case 'ce-ring-del': callCfgSave('ring_bg', null); break;
                case 'ce-emoji': (() => {
                        const i = el.querySelector('[data-ce=emoji]'); const t = (i && i.value.trim()) || '🐱'; if (sionNeedToken()) return;
                        sion.cfg.call_emoji = t; fresh();
                        repo.commit('김민정: 시온 전화 이모티콘', {}, { [SION_CFG]: { fallback: {}, mutate: c => { c.call_emoji = t; return c; } } }).then(() => toast('저장했어요'), e => mjAlert('저장하지 못했어요.\n' + (e.message || e)));
                    })(); break;
                case 'call-start': startCall(); break;
                case 'call-del': callDelete(v); break;
                case 'call-log': if (!callOf(v)) break; st.logFrom = st.view; st.view = 'calllog'; st.logId = v; fresh(); break;
                case 'call-accept': acceptCall(v); break;
                case 'call-decline': missCall(v, true); break;
                case 'call-end': endCall(); break;
                case 'call-mic': callListen(); break;
                case 'call-keypad': sion.callKeypad = !sion.callKeypad; fresh(); if (sion.callKeypad) { const i = el.querySelector('[data-call=in]'); if (i) i.focus(); } break;
                case 'call-speaker': sion.callSpeaker = !sion.callSpeaker; if (!sion.callSpeaker && window.speechSynthesis) speechSynthesis.cancel(); fresh(); break;
                case 'call-send': callSendTyped(); break;
                case 'sn-callback': startCall(); break;
                case 'sn-favs': st.favs = !st.favs; st.stick = true; fresh(); break;
                case 'sn-search': st.searching = !st.searching; st.q = ''; st.lfavs = false; st.stick = true; fresh(); if (st.searching) { const q = el.querySelector('[data-sn=q]'); if (q) q.focus(); } break;
                case 'sn-push': sionPushToggle(); break;
                case 'sn-lgo': st.ldate = v; st.searching = false; st.q = ''; st.lfavs = false; fresh(); break;
                case 'sn-lfavs': st.lfavs = !st.lfavs; st.searching = false; st.q = ''; fresh(); break;
                case 'sn-lfav': sionLetterFav(st.ldate); break;
                case 'sn-ld': { const ks = sionDays(), i = ks.indexOf(st.ldate) + Number(v); if (ks[i]) { st.ldate = ks[i]; fresh(); } break; }
                case 'plus': plus(id, st, b); break;
                // 퀘스트
                case 'q-toggle': toggleQuest(st, b.dataset.id); break;
                case 'q-edit': st.qedit = true; fresh(); break;
                case 'q-cancel': st.qedit = false; fresh(); break;
                case 'q-save': saveQuests(id, el, st); break;
                case 'q-del': b.closest('.mj-qe-row').remove(); break;
                case 'q-add': { const box = el.querySelector('.mj-qe'); box.insertAdjacentHTML('beforeend', qeRow({}, st.tab === 'Daily')); box.lastElementChild.querySelector('input').focus(); break; }
                // 초록 버튼: 목록 편집 (순서·이름·추가·삭제)
                case 'listedit': st.listedit = !st.listedit; st.form = null; fresh(); break;
                case 'le-cancel': st.listedit = false; fresh(); break;
                case 'le-save': saveListEdit(id, el); break;
                case 'le-del': b.closest('.mj-le-row').remove(); break;
                case 'le-add': { const box = el.querySelector(v ? `.mj-le[data-list=${v}]` : '.mj-le'); box.insertAdjacentHTML('beforeend', leRow(id, { key: '', label: '', tab: true }, v === 'mood')); box.lastElementChild.querySelector('input').focus(); break; }
                case 'tab': if (id === 'sion' && v === 'Daily') st.dday = null; st.tab = v; st.form = (id === 'hp' || id === 'lines') ? {} : null; st.pedit = false; st.qedit = false; fresh(); if (v === 'To Do') loadTodos(); break;
                case 'sub': st.sub = v; st.form = null; fresh(); break;
                case 'icon': pickFile(f => setIcon(id, f, WIN[id].title)); break;
                case 'day': st.date = v === '0' ? todayKey() : shiftDay(st.date, Number(v)); fresh(); break;
                case 'new': st.form = id === 'daily' ? { slot: v || null } : { type: v || null }; fresh(); break;
                case 'edit': {
                    const item = findItem(id, st, b.dataset.id);
                    if (item) { st.form = clone(item); fresh(); }
                    break;
                }
                case 'cancel': st.form = (id === 'hp' || id === 'lines') ? {} : null; fresh(); break;
                case 'save': submit(id, st, el); break;
                case 'del': delItem(id, st); break;
                case 'chip': {
                    const box = b.parentElement;
                    if (box.hasAttribute('data-single')) { [...box.children].forEach(c => c !== b && c.classList.remove('on')); b.classList.add('on'); }
                    else b.classList.toggle('on');
                    break;
                }
                case 'heart': {
                    const box = b.parentElement, n = Number(v), cur = Number(box.dataset.v || 0);
                    const nv = (n === cur) ? n - 1 : n;
                    box.dataset.v = nv;
                    box.innerHTML = Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < nv)}</button>`).join('');
                    break;
                }
                case 'add-tag': (async () => {
                    const t = ((await mjPrompt('New tag', '')) || '').trim();
                    if (!t || db.symptom_tags.includes(t)) return;
                    const box = el.querySelector('[data-multi="tags"]'); if (!box) return;
                    const chip = document.createElement('button');
                    chip.className = 'mj-chip on'; chip.dataset.act = 'chip'; chip.dataset.v = t; chip.textContent = t;
                    box.insertBefore(chip, b);
                    keepForm(id);
                    save('Symptom 태그 ' + t, d => { if (!d.symptom_tags.includes(t)) d.symptom_tags.push(t); });
                })(); break;
                case 'add-med': (async () => {
                    const t = ((await mjPrompt('New medicine', '')) || '').trim();
                    if (!t || S().med_list.some(x => x.label === t)) return;
                    const box = el.querySelector('[data-multi="meds"]'); if (!box) return;
                    const chip = document.createElement('button');
                    chip.className = 'mj-chip on'; chip.dataset.act = 'chip'; chip.dataset.v = t; chip.textContent = t;
                    box.insertBefore(chip, b);
                    keepForm(id);
                    save('Medicine 목록 ' + t, d => { if (!d.settings.med_list.some(x => x.label === t)) d.settings.med_list.push({ key: t, label: t }); });
                })(); break;
                case 'steps': (async () => {
                    const slot = (st.form && st.form.slot) || (st.sub === 'all' ? 'morning' : st.sub);
                    const t = await mjPrompt(label(beautySlots(), slot) + ' routine', db.beauty_steps[slot].join(', '), '쉼표(,)로 나눠 적어요');
                    if (t == null) return;
                    const steps = t.split(',').map(s => s.trim()).filter(Boolean);
                    keepForm(id);
                    save('Beauty ' + label(beautySlots(), slot) + ' 루틴', d => { d.beauty_steps[slot] = steps; });
                })(); break;
                // 프로필 고치기
                case 'pedit': st.pedit = true; fresh(); break;
                case 'pcancel': st.pedit = false; fresh(); break;
                case 'padd': {
                    const list = el.querySelector('.mj-pf-edit');
                    list.insertAdjacentHTML('beforeend', pfRow({ id: uid('pf'), label: '', value: '' }));
                    list.lastElementChild.querySelector('input').focus();
                    break;
                }
                case 'pdel': b.closest('.mj-pf-row').remove(); break;
                case 'pup': { const r = b.closest('.mj-pf-row, .mj-qe-row'); if (r.previousElementSibling) r.parentElement.insertBefore(r, r.previousElementSibling); break; }
                case 'pdown': { const r = b.closest('.mj-pf-row, .mj-qe-row'); if (r.nextElementSibling) r.parentElement.insertBefore(r.nextElementSibling, r); break; }
                case 'psave': {
                    const rows = [...el.querySelectorAll('.mj-pf-edit .mj-pf-row')].map(r => ({
                        id: r.dataset.id, label: r.querySelector('[data-k=label]').value.trim(), value: r.querySelector('[data-k=value]').value.trim()
                    })).filter(r => r.label || r.value);
                    st.pedit = false;
                    save('Profile 수정', d => { d.profile = rows; });
                    break;
                }
                // 옷 사진
                case 'pick': pickFile(f => { st.form = Object.assign(st.form || {}, { file: f, preview: URL.createObjectURL(f) }); fresh(); }); break;
                // 투두
                case 'todo-toggle': toggleTodo(Number(b.dataset.id)); break;
                case 'todo-open': if (window.loadPageByHash) window.loadPageByHash('todo'); break;
                case 'todo-reload': todos = null; loadTodos(); break;
                case 'soon': toast(v + ' · Coming soon ♡'); break;
                // 배경 목록
                case 'bg-img': pickFile(f => setBgImage(Number(b.dataset.i), b.dataset.w, f)); break;
                case 'bg-add': pickFile(f => setBgImage(-1, 'mobile', f)); break;
                case 'bg-del': delBg(Number(b.dataset.i)); break;
                // 라이브러리
                case 'dy-photo': pickFile(f => insertDiaryPhoto(el, st, f)); break;
                case 'alllist': st.all = !st.all; fresh(); break;
                case 'lib-add': showPick(b, libTypes().map(([k, l]) => ({ label: l, run: () => { st.form = { type: k }; fresh(); } }))); break;
                case 'lib-cover': pickFile(f => { keepForm(id); st.form.coverFile = f; st.form.cover = ''; st.form.preview = URL.createObjectURL(f); fresh(); }); break;
                case 'lib-uncover': keepForm(id); st.form.cover = ''; st.form.coverFile = null; st.form.preview = ''; fresh(); break;
                case 'lib-go': libSearch(id, st, el); break;
                case 'lib-pick': libPick(id, st, el, Number(b.dataset.i)); break;
            }
        });
        el.addEventListener('change', e => {
            if (e.target.matches('[data-day]') && e.target.value) { w.st.date = e.target.value; renderWin(id); }
        });
        // 라이브러리 안에서 찾기 (목록만 다시 그림)
        el.addEventListener('input', e => {
            if (!e.target.matches('[data-libq]')) return;
            w.st.q = e.target.value;
            const box = el.querySelector('.mj-liblist'); if (box) box.innerHTML = libList(w.st);
        });
        el.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-ls]')) { e.preventDefault(); libSearch(id, w.st, el); } });
    }

    /* 블로그식 본문 (다이어리·Library): 글 사이사이 사진.
       저장: 글은 글대로, 사진 한 줄은 `![](경로)` — 한 줄에 여러 개(최대 3)면 나란히 놓인 사진 */
    const MK = /!\[\]\(([^)\s]+)\)/g;
    const ROW_LINE = /^(\s*!\[\]\([^)\s]+\)\s*)+$/;
    const IMG_LINE = ROW_LINE;
    const marksOf = t => [...String(t || '').matchAll(MK)].map(m => m[1]);
    function diaryHtml(it) {
        const body = it.body || '', lines = body.split('\n');
        const inline = lines.some(l => ROW_LINE.test(l));
        const img = p => p.startsWith('new:')
            ? `<img class="mj-dimg" data-new="${esc(p.slice(4))}" src="${esc((it.newUrls || {})[p.slice(4)] || '')}" alt="" draggable="false">`
            : `<img class="mj-dimg" data-path="${esc(p)}" src="${esc(imgSrc(p))}" ${/^https?:/.test(p) ? '' : `onerror="this.onerror=null;this.src='${esc(repo.rawUrl(p))}'"`} alt="" draggable="false">`;
        const row = ps => `<div class="mj-irow n${Math.min(ps.length, 3)}" contenteditable="false">${ps.map(img).join('')}</div>`;
        let html = inline ? '' : (it.imgs || []).map(p => row([p])).join('');           // 옛 글: 사진은 맨 위에
        html += lines.map(l => ROW_LINE.test(l) ? row(marksOf(l).slice(0, 3)) : `<div>${l ? esc(l) : '<br>'}</div>`).join('');
        return html;
    }
    function diaryText(editor) {
        let out = '';
        const mark = c => '![](' + (c.dataset.path || ('new:' + c.dataset.new)) + ')';
        const walk = n => {
            n.childNodes.forEach(c => {
                if (c.nodeType === 3) { out += c.nodeValue.replace(/ /g, ' '); return; }
                if (c.nodeType !== 1) return;
                const tag = c.tagName;
                if (c.classList.contains('mj-irow')) {
                    const imgs = [...c.querySelectorAll('img.mj-dimg')];
                    if (imgs.length) out += (out && !out.endsWith('\n') ? '\n' : '') + imgs.map(mark).join(' ') + '\n';
                    return;
                }
                if (tag === 'IMG') { out += '\n' + mark(c) + '\n'; return; }
                if (tag === 'BR') { out += '\n'; return; }
                const block = /^(DIV|P|LI|H\d)$/.test(tag);
                if (block && out && !out.endsWith('\n')) out += '\n';
                walk(c);
                if (block && !out.endsWith('\n')) out += '\n';
            });
        };
        walk(editor);
        return out.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n')
            .replace(/\n\n(!\[\]\()/g, '\n$1').replace(/(!\[\]\([^)\n]+\))\n\n/g, '$1\n').trim();   // 사진 앞뒤 빈 줄은 하나로
    }
    // 블로그식 편집기 내용을 본문으로 (새 사진은 올려서 경로로 바꿈). 실패하면 null
    async function editorBody(box, st, folder) {
        let body = diaryText(box.querySelector('.mj-dedit'));
        const add = st.form.addFiles || [], files = {};
        const used = [...new Set([...body.matchAll(/!\[\]\(new:(\d+)\)/g)].map(m => Number(m[1])))];
        if (used.length) {
            if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return null; }
            const btn = box.querySelector('[data-act=save]'); btn.disabled = true; btn.textContent = 'Uploading…';
            try {
                for (const k of used) {
                    const up = await uploadImage(add[k], folder, 1600, 'image/jpeg'); files[up.path] = up.sha;
                    body = body.split('![](new:' + k + ')').join('![](' + up.path + ')');
                }
            } catch (e) { mjAlert('사진을 올리지 못했어요.\n' + (e.message || e)); btn.disabled = false; btn.textContent = 'Save'; return null; }
        }
        return { body, files, imgs: marksOf(body) };
    }
    let diaryRange = null;
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection(); if (!sel.rangeCount) return;
        const r = sel.getRangeAt(0), ed = r.startContainer && (r.startContainer.nodeType === 1 ? r.startContainer : r.startContainer.parentElement);
        if (ed && ed.closest && ed.closest('.mj-dedit')) diaryRange = r.cloneRange();
    });
    function newRow(img) { const r = document.createElement('div'); r.className = 'mj-irow n1'; r.contentEditable = 'false'; r.appendChild(img); return r; }
    function fixRows(ed) {
        ed.querySelectorAll('.mj-irow').forEach(r => {
            const n = r.querySelectorAll('img').length;
            if (!n) { r.remove(); return; }
            r.className = 'mj-irow n' + Math.min(n, 3);
        });
    }
    function insertDiaryPhoto(el, st, file) {
        const ed = el.querySelector('.mj-dedit'); if (!ed) return;
        st.form.addFiles = st.form.addFiles || [];
        const k = st.form.addFiles.push(file) - 1;
        const img = document.createElement('img');
        st.form.newUrls = st.form.newUrls || {};
        img.className = 'mj-dimg'; img.dataset.new = k; img.draggable = false; img.src = st.form.newUrls[k] = URL.createObjectURL(file);
        const row = newRow(img);
        const after = document.createElement('div'); after.innerHTML = '<br>';
        if (diaryRange && ed.contains(diaryRange.startContainer)) {
            let blk = diaryRange.startContainer; while (blk && blk.parentNode !== ed) blk = blk.parentNode;
            if (blk) { ed.insertBefore(row, blk.nextSibling); ed.insertBefore(after, row.nextSibling); }
            else { ed.appendChild(row); ed.appendChild(after); }
        } else { ed.appendChild(row); ed.appendChild(after); }
        const r = document.createRange(); r.setStart(after, 0); r.collapse(true);
        const sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r); diaryRange = r.cloneRange();
    }

    /* 본문 속 사진: 짧게 누르면 크게 보기(+ 삭제), 꾹 누르면 잡아서 옮기기
       — 다른 사진 옆에 놓으면 한 줄에 나란히 (최대 3장), 글 사이에 놓으면 그 자리에 한 줄로 */
    let pdrag = null;
    root.addEventListener('pointerdown', e => {
        const img = e.target.closest && e.target.closest('.mj-dedit img.mj-dimg'); if (!img) return;
        const ed = img.closest('.mj-dedit');
        e.preventDefault();
        pdrag = { img, ed, x: e.clientX, y: e.clientY, on: false, timer: setTimeout(() => startPhotoDrag(e), 420) };
    });
    function startPhotoDrag() {
        if (!pdrag) return;
        pdrag.on = true;
        const g = pdrag.img.cloneNode(); g.className = 'mj-dghost'; g.removeAttribute('data-path'); g.removeAttribute('data-new');
        document.body.appendChild(g); pdrag.ghost = g;
        const mark = document.createElement('div'); mark.className = 'mj-dmark'; document.body.appendChild(mark); pdrag.mark = mark;
        pdrag.img.classList.add('lifting');
        if (navigator.vibrate) try { navigator.vibrate(15); } catch (err) {}
        movePhotoDrag(pdrag.x, pdrag.y);
    }
    function dropTarget(x, y) {
        const d = pdrag, ed = d.ed;
        d.ghost.style.display = 'none';
        const under = document.elementFromPoint(x, y);
        d.ghost.style.display = '';
        if (!under || !ed.contains(under)) return null;
        const tImg = under.closest('img.mj-dimg');
        if (tImg && tImg !== d.img) {
            const row = tImg.closest('.mj-irow');
            const count = row.querySelectorAll('img').length - (d.img.closest('.mj-irow') === row ? 1 : 0);
            if (count < 3) { const r = tImg.getBoundingClientRect(); return { kind: 'side', img: tImg, before: x < r.left + r.width / 2, rect: r }; }
        }
        let blk = under; while (blk && blk.parentNode !== ed) blk = blk.parentNode;
        if (!blk) return null;
        const r = blk.getBoundingClientRect();
        return { kind: 'line', blk, before: y < r.top + r.height / 2, rect: r };
    }
    function movePhotoDrag(x, y) {
        const d = pdrag; if (!d || !d.on) return;
        d.ghost.style.left = x + 'px'; d.ghost.style.top = y + 'px';
        const t = d.target = dropTarget(x, y), m = d.mark;
        if (!t) { m.style.display = 'none'; return; }
        m.style.display = 'block';
        if (t.kind === 'side') Object.assign(m.style, { left: (t.before ? t.rect.left - 3 : t.rect.right - 1) + 'px', top: t.rect.top + 'px', width: '4px', height: t.rect.height + 'px' });
        else Object.assign(m.style, { left: t.rect.left + 'px', top: (t.before ? t.rect.top - 2 : t.rect.bottom - 2) + 'px', width: t.rect.width + 'px', height: '4px' });
    }
    function endPhotoDrag(cancel) {
        const d = pdrag; pdrag = null; if (!d) return;
        clearTimeout(d.timer);
        if (!d.on) {                                   // 짧게 눌렀음 → 크게 보기 (삭제 가능)
            if (cancel) return;
            const imgs = [...d.ed.querySelectorAll('img.mj-dimg')];
            if (window.lightbox) window.lightbox.open(imgs.map(i => i.src), imgs.indexOf(d.img), {
                onDelete: k => { const im = imgs[k]; if (im) { const ed = im.closest('.mj-dedit'); im.remove(); if (ed) fixRows(ed); } }
            });
            return;
        }
        d.ghost.remove(); d.mark.remove(); d.img.classList.remove('lifting');
        const t = d.target; if (cancel || !t) return;
        if (t.kind === 'side') t.img.parentNode.insertBefore(d.img, t.before ? t.img : t.img.nextSibling);
        else if (t.blk !== d.img.closest('.mj-irow') || d.img.closest('.mj-irow').querySelectorAll('img').length > 1) {
            const row = newRow(d.img);                 // newRow가 img를 원래 줄에서 빼 옴
            d.ed.insertBefore(row, t.before ? t.blk : t.blk.nextSibling);
        }
        fixRows(d.ed);
    }
    window.addEventListener('pointermove', e => {
        if (!pdrag) return;
        if (!pdrag.on) { if (Math.hypot(e.clientX - pdrag.x, e.clientY - pdrag.y) > 8) { clearTimeout(pdrag.timer); pdrag = null; } return; }
        e.preventDefault(); movePhotoDrag(e.clientX, e.clientY);
    }, { passive: false });
    window.addEventListener('pointerup', () => endPhotoDrag(false));
    window.addEventListener('pointercancel', () => endPhotoDrag(true));
    // 폰: 사진을 잡고 있는 동안은 화면이 스크롤되지 않게
    window.addEventListener('touchmove', e => { if (pdrag && pdrag.on) e.preventDefault(); }, { passive: false });
    root.addEventListener('contextmenu', e => { if (e.target.closest && e.target.closest('.mj-dedit img')) e.preventDefault(); });

    function pickFile(cb) {
        fileIn.value = '';
        fileIn.onchange = () => { const f = fileIn.files && fileIn.files[0]; if (f) cb(f); };
        fileIn.click();
    }
    async function setIcon(id, file, title) {
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        try {
            toast('uploading…');
            const { path, sha } = await uploadImage(file, 'icons', 256, 'image/png');
            const old = db.icons[id];
            const files = {}; files[path] = sha; if (old) files[old] = null;
            save(title + ' 아이콘', d => { d.icons[id] = path; }, files);
        } catch (e) { mjAlert('아이콘을 올리지 못했어요.\n' + (e.message || e)); }
    }

    /* ---------------- 폼 ---------------- */
    // 적던 내용을 st.form에 옮겨 둠 (창을 다시 그려도 그대로 남게)
    function keepForm(id) {
        const w = wins[id], box = w && w.el.querySelector('.mj-form');
        if (box && w.st.form) Object.assign(w.st.form, collect(box));
        const ed = w && w.el.querySelector('.mj-dedit');                 // Library 본문(사진 포함)도 그대로 남김
        if (ed && id === 'library' && w.st.form) w.st.form.memo = diaryText(ed);
    }
    function collect(box) {
        const f = {};
        box.querySelectorAll('[data-f]').forEach(i => { f[i.dataset.f] = i.value.trim(); });
        box.querySelectorAll('[data-multi]').forEach(g => { f[g.dataset.multi] = [...g.querySelectorAll('.mj-chip.on')].map(c => c.dataset.v); });
        box.querySelectorAll('[data-single]').forEach(g => { const c = g.querySelector('.mj-chip.on'); f[g.dataset.single] = c ? c.dataset.v : ''; });
        box.querySelectorAll('[data-hearts]').forEach(g => { f[g.dataset.hearts] = Number(g.dataset.v || 0); });
        return f;
    }
    const whenRow = (it) => `
        <div class="mj-when">
            <input type="date" data-f="date" value="${esc(it.date || todayKey())}">
            <input type="time" data-f="time" value="${esc(it.time || hmOf(new Date()))}">
        </div>`;
    const chips = (name, opts, sel, single, extra) => `
        <div class="mj-chips" ${single ? 'data-single' : 'data-multi'}="${name}">
            ${opts.map(([k, l]) => `<button class="mj-chip ${(single ? sel === k : (sel || []).includes(k)) ? 'on' : ''}" data-act="chip" data-v="${esc(k)}">${l}</button>`).join('')}${extra || ''}
        </div>`;
    const formBtns = it => `
        <div class="mj-btns">
            ${it.id ? '<button class="mj-btn ghost danger" data-act="del">Delete</button>' : ''}
            <span class="sp"></span>
            <button class="mj-btn ghost" data-act="cancel">Cancel</button>
            <button class="mj-btn" data-act="save">${it.id ? 'Update' : 'Save'}</button>
        </div>`;
    const LIST_SVG = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M8 7h11M8 12h11M8 17h11M4.5 7h.01M4.5 12h.01M4.5 17h.01"/></svg>';
    const dayNav = st => st.all ? `
        <div class="mj-day all"><span class="alllabel">All records</span><button class="lst on" data-act="alllist" title="날짜별로 보기">${LIST_SVG}</button></div>` : `
        <div class="mj-day">
            <button data-act="day" data-v="-1">‹</button>
            <input type="date" data-day value="${st.date}">
            <button data-act="day" data-v="1">›</button>
            <button class="today" data-act="day" data-v="0">Today</button>
            <button class="lst" data-act="alllist" title="모든 기록 최신순">${LIST_SVG}</button>
        </div>`;
    // 달이 바뀌는 곳에 굵은 핑크 가름선 + 'YYYY.MM'
    const monthOf = d => (d || '').slice(0, 7);
    const monthBar = m => `<div class="mj-month"><span>${m.replace('-', '.')}</span></div>`;
    const monthHead = (rows, i) => (i === 0 || monthOf(rows[i].date) !== monthOf(rows[i - 1].date)) ? monthBar(monthOf(rows[i].date)) : '';
    // 날짜별 묶음 (모든 기록 보기)
    function grouped(rows, rowHtml) {
        const g = {}; rows.forEach(r => (g[r.date] = g[r.date] || []).push(r));
        const keys = Object.keys(g).sort().reverse();
        return keys.map((k, i) => (i === 0 || monthOf(k) !== monthOf(keys[i - 1]) ? monthBar(monthOf(k)) : '') +
            `<div class="mj-log-day">${dayTitle(k)}</div>` + g[k].map(rowHtml).join('')).join('');
    }
    const empty = t => `<p class="mj-empty">${t}</p>`;

    function listOf(id, st) {
        if (id === 'hp') return 'hp';
        if (id === 'lines') return 'lines';
        if (id === 'library') return 'library';
        if (WIN[id].types) return 'condition';
        if (id === 'daily') return st.tab === 'Outfit' ? 'outfit' : 'beauty';
        if (id === 'diary') return 'diary';
    }
    function findItem(id, st, itemId) { const l = listOf(id, st); return l && db[l].find(x => x.id === itemId); }

    async function submit(id, st, el) {
        const box = el.querySelector('.mj-form');
        if (!box) return;
        const f = collect(box);
        const list = listOf(id, st);
        const base = { id: st.form.id || uid(PREFIX[list]), date: f.date || todayKey(), time: f.time || hmOf(new Date()), at: stamp() };
        let item, msg;
        const when = base.date + ' ' + base.time;
        if (id === 'hp') {
            item = tidy(Object.assign(base, { v: f.v, memo: f.memo }));
            if (item.v == null) item.v = 0;
            msg = 'HP ' + when + ' ♥' + item.v;
        } else if (id === 'lines') {
            if (!f.text) { mjAlert('대사를 적어 주세요.'); return; }
            item = Object.assign(base, { text: f.text });
            msg = '대사 ' + when;
        } else if (id === 'library') {
            // YouTube는 제목을 비우면 영상 제목·채널을 가져와서 채움 (다이어리 YouTube와 같은 규칙)
            if (!f.title && (st.form.type || libType(st)) === 'youtube' && /^https?:\/\//.test(f.url || '')) {
                toast('loading title…');
                for (const u of ['https://www.youtube.com/oembed?format=json&url=', 'https://noembed.com/embed?url=']) {
                    try { const r = await fetch(u + encodeURIComponent(f.url)); if (r.ok) { const j = await r.json(); if (j.title) { f.title = j.title; if (!f.creator && j.author_name) f.creator = j.author_name; break; } } } catch (e) {}
                }
            }
            if (!f.title) { mjAlert('제목을 적어 주세요.'); return; }
            const files = {}, old = st.form.id ? db.library.find(x => x.id === st.form.id) : null;
            let cover = st.form.cover || '';
            if (st.form.coverFile) {
                if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
                try { const up = await uploadImage(st.form.coverFile, 'covers', 900, 'image/jpeg'); files[up.path] = up.sha; cover = up.path; }
                catch (e) { mjAlert('표지를 올리지 못했어요.\n' + (e.message || e)); return; }
            }
            if (old && old.cover && old.cover !== cover && old.cover.startsWith(IMG_DIR)) files[old.cover] = null;
            const eb = await editorBody(box, st, 'library'); if (!eb) return;
            Object.assign(files, eb.files);
            marksOf(old && old.memo).forEach(p => { if (!eb.imgs.includes(p) && p.startsWith(IMG_DIR)) files[p] = null; });
            f.memo = eb.body;
            const tags = (f.tags || '').split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
            item = tidy(Object.assign(base, { type: st.form.type || libType(st), title: f.title, creator: f.creator, year: f.year, cover, url: f.url,
                status: f.status, rating: f.rating || undefined, tags, memo: f.memo }));
            if (old && old.from) item.from = old.from;
            msg = label(libTypes(), item.type) + ' ' + item.title;
            st.form = null;
            upsert('library', item, msg, files);
            return;
        } else if (WIN[id].types) {
            const type = st.form.type;
            const extra = type === 'meal' ? { slot: f.slot, memo: f.memo }
                : type === 'medicine' ? { meds: f.meds, other: f.other, name: (f.meds || []).concat(f.other ? [f.other] : []).join(', '), memo: f.memo }
                : type === 'symptom' ? { tags: f.tags, level: Number(f.level) || undefined, memo: f.memo }
                : { mood: f.mood, memo: f.memo };
            if (type === 'medicine' && !(f.meds || []).length && !f.other) { mjAlert('약을 고르거나 적어 주세요.'); return; }
            if (type === 'mood' && !f.mood) { mjAlert('기분을 골라 주세요.'); return; }
            const oldC = st.form.id ? db.condition.find(x => x.id === st.form.id) : null;
            if (oldC && oldC.imgs) extra.imgs = oldC.imgs;
            if (oldC && oldC.from) extra.from = oldC.from;
            item = tidy(Object.assign(base, { type }, extra));
            msg = label(COND_TYPES, type) + ' ' + when + ' ' + (extra.name || (f.tags || []).join(',') || f.slot || f.mood || '');
            st.date = item.date;
        } else if (id === 'daily' && st.tab === 'Beauty') {
            item = tidy(Object.assign(base, { slot: st.form.slot || (st.sub === 'all' ? 'etc' : st.sub), steps: f.steps, memo: f.memo }));
            msg = 'Beauty ' + label(beautySlots(), item.slot) + ' ' + when;
            st.date = item.date;
        } else if (id === 'daily') {
            msg = 'Outfit ' + when;
            let files = {};
            const old = st.form.id ? db.outfit.find(x => x.id === st.form.id) : null;
            let img = old ? old.img : '';
            if (st.form.file) {
                if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
                const btn = box.querySelector('[data-act=save]');
                btn.disabled = true; btn.textContent = 'Uploading…';
                try {
                    const up = await uploadImage(st.form.file, 'outfit', 1440, 'image/jpeg');
                    files[up.path] = up.sha;
                    if (img) files[img] = null;
                    img = up.path;
                } catch (e) { mjAlert('사진을 올리지 못했어요.\n' + (e.message || e)); btn.disabled = false; btn.textContent = 'Save'; return; }
            }
            if (!img) { mjAlert('사진을 골라 주세요.'); return; }
            item = tidy(Object.assign(base, { img, memo: f.memo }));
            st.form = null;
            upsert('outfit', item, msg, files);
            return;
        } else if (id === 'diary') {
            if (!f.title && !diaryText(box.querySelector('.mj-dedit'))) { mjAlert('내용을 적어 주세요.'); return; }
            const eb = await editorBody(box, st, 'diary'); if (!eb) return;
            const body = eb.body, files = eb.files, imgs = eb.imgs;
            const old = st.form.id ? db.diary.find(x => x.id === st.form.id) : null;
            ((old && old.imgs) || []).forEach(p => { if (!imgs.includes(p) && p.startsWith(IMG_DIR)) files[p] = null; });
            f.body = body;
            const tags = (f.tags || '').split(/[\s,]+/).map(t => t.replace(/^#/, '').trim()).filter(Boolean);
            item = tidy(Object.assign(base, { title: f.title, body: f.body, imgs, tags }));
            if (old && old.from) item.from = old.from;
            msg = '일기 ' + when + (item.title ? ' ' + item.title : '');
            st.form = null;
            upsert('diary', item, msg, files);
            return;
        }
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        upsert(list, item, msg);
    }
    async function delItem(id, st) {
        const list = listOf(id, st), it = st.form;
        if (!it || !it.id || !await mjConfirm('이 기록을 지울까요?', 'Delete')) return;
        const files = {};
        if (list === 'outfit' && it.img) files[it.img] = null;
        if (list === 'library' && it.cover && it.cover.startsWith(IMG_DIR)) files[it.cover] = null;
        st.form = (id === 'hp' || id === 'lines') ? {} : null;
        remove(list, it.id, list + ' 삭제 ' + (it.date || '') + ' ' + (it.time || ''), files);
    }

    /* ---------------- 창 내용 ---------------- */
    const pfRow = r => `
        <div class="mj-pf-row" data-id="${esc(r.id)}">
            <input data-k="label" value="${esc(r.label)}" placeholder="">
            <textarea data-k="value" rows="1" placeholder="">${esc(r.value)}</textarea>
            <div class="mj-pf-tools">
                <button data-act="pup" title="위로">▲</button><button data-act="pdown" title="아래로">▼</button><button data-act="pdel" title="지우기">✕</button>
            </div>
        </div>`;

    const VIEW = {
        /* 하시온: 메시지(iMessage) · 편지 */
        sion(st) { return st.view === 'kset' ? ktSettingsView() : st.view === 'cedit' ? callEditView() : st.view === 'contact' ? callContactView(st) : st.view === 'calllog' ? callLogView(st) : st.view === 'call' ? callView(st) : st.view === 'ring' ? ringView(st) : sionChatView(st); },
        /* BANG: 시온의 기억 (보고 고치기) · 그동안 정리한 기억 */
        bang(st) { return bangView(st); },
        /* 체력 */
        hp(st) {
            const it = st.form || {};
            const v = it.v ?? hpNow();
            const rows = db.hp.slice().sort(byNewest);
            const groups = {};
            rows.forEach(r => { (groups[r.date] = groups[r.date] || []).push(r); });
            return `
                <div class="mj-form mj-card">
                    <div class="mj-hearts-pick" data-hearts="v" data-v="${v}">${Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < v)}</button>`).join('')}</div>
                    <input data-f="memo" placeholder="memo" value="${esc(it.memo || '')}">
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-log">
                    ${rows.length ? Object.keys(groups).map((k, i, ks) => (i === 0 || monthOf(k) !== monthOf(ks[i - 1]) ? monthBar(monthOf(k)) : '') + `
                        <div class="mj-log-day">${dayTitle(k)}</div>
                        ${groups[k].map(r => `<button class="mj-row ${it.id === r.id ? 'sel' : ''}" data-act="edit" data-id="${r.id}"><span class="tm">${esc(r.time)}</span><span class="mj-mini">${hearts(r.v)}</span><span class="tx">${esc(r.memo || '')}</span></button>`).join('')}
                    `).join('') : empty('아직 기록이 없어요.')}
                </div>`;
        },
        /* 대사 */
        lines(st) {
            const it = st.form || {};
            const rows = db.lines.slice().sort(byNewest);
            return `
                <div class="mj-form mj-card">
                    <div class="mj-say-name">김민정</div>
                    <textarea data-f="text" rows="3" placeholder="">${esc(it.text || '')}</textarea>
                    ${whenRow(it)}
                    ${it.id ? formBtns(it) : '<div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="save">Save</button></div>'}
                </div>
                <div class="mj-sec">Backlog</div>
                <div class="mj-log">
                    ${rows.length ? rows.map((r, i) => monthHead(rows, i) + `
                        <button class="mj-line ${it.id === r.id ? 'sel' : ''}" data-act="edit" data-id="${r.id}">
                            <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                            <span class="tx">「${nl(r.text)}」</span>
                        </button>`).join('') : empty('아직 대사가 없어요.')}
                </div>`;
        },
        /* 프로필 + 라이브러리 */
        library(st) { return libraryView(st); },
        quest(st) { return questView(st); },
        room() {
            const list = bgList();
            return `
                                <div class="mj-bglist">
                    ${list.map((b, i) => `
                        <div class="mj-bgrow">
                            <span class="n">${i + 1}</span>
                            <button class="th m" data-act="bg-img" data-i="${i}" data-w="mobile">${b.mobile ? imgTag(b.mobile) : ''}<em>Mobile</em></button>
                            <button class="th p" data-act="bg-img" data-i="${i}" data-w="pc">${b.pc ? imgTag(b.pc) : ''}<em>PC</em></button>
                            <button class="mj-link" data-act="bg-del" data-i="${i}">delete</button>
                        </div>`).join('')}
                </div>
                <div class="mj-newbar"><button class="mj-add" data-act="bg-add">+ background</button></div>`;
        },
        profile(st) {
            if (st.pedit) return `
                <div class="mj-pf-edit">${db.profile.map(pfRow).join('')}</div>
                <button class="mj-add" data-act="padd">+ add field</button>
                <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="pcancel">Cancel</button><button class="mj-btn" data-act="psave">Save</button></div>`;
            return `
                <div class="mj-pf">
                    ${db.profile.map(r => `<div class="mj-pf-item"><span class="k">${esc(r.label)}</span><span class="v">${r.value ? nl(r.value) : '<i>—</i>'}</span></div>`).join('')}
                </div>
                <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="pedit">Edit</button></div>`;
        },
        /* 몸 상태 */
        food(st) { return condView('food', st); },
        state(st) { return condView('state', st); },
        /* 자기관리 */
        daily(st) {
            if (st.tab === 'Outfit') return outfitView(st);
            if (st.form) {
                const it = st.form, slot = it.slot || (st.sub === 'all' ? 'morning' : st.sub);
                return `
                    <div class="mj-form mj-card">
                        <div class="mj-sec">${label(beautySlots(), slot)} routine <button class="mj-link" data-act="steps">edit steps</button></div>
                        ${chips('steps', db.beauty_steps[slot].map(s => [s, s]), it.id ? it.steps : [], false)}
                        <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>
                        ${whenRow(it.id ? it : { date: st.date })}
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.beauty.filter(x => (st.all || x.date === st.date) && (st.sub === 'all' || x.slot === st.sub)).sort(byNewest);   // 최신순
            const brow = r => `
                        <button class="mj-row" data-act="edit" data-id="${r.id}">
                            <span class="tm">${esc(r.time)}</span>
                            ${st.sub === 'all' ? `<span class="ty">${label(beautySlots(), r.slot)}</span>` : ''}
                            <span class="tx">${(r.steps || []).length ? `<span class="steps">${r.steps.map(esc).join(' · ')}</span> ` : ''}${r.memo ? `<span class="memo">${esc(r.memo)}</span>` : ''}</span>
                        </button>`;
            return `
                <div class="mj-subs">${beautySubs().map(([k, l]) => `<button class="${st.sub === k ? 'on' : ''}" data-act="sub" data-v="${k}">${l}</button>`).join('')}</div>
                ${dayNav(st)}
                <div class="mj-newbar">${(st.sub === 'all' ? beautySlots() : S().beauty_slots.filter(x => x.key === st.sub || !x.tab).map(x => [x.key, x.label])).map(([k, l]) => `<button class="mj-add" data-act="new" data-v="${k}">+ ${l}</button>`).join('')}</div>
                <div class="mj-log">
                    ${rows.length ? (st.all ? grouped(rows, brow) : rows.map(brow).join('')) : empty(st.all ? '아직 기록이 없어요.' : '이 날은 기록이 없어요.')}
                </div>`;
        },
        /* 다이어리 + 투두 */
        diary(st) {
            // Daily(오늘의 알림 아카이브) · Letter(밤 편지)는 시온 기록이라 sion 쪽 화면을 그대로
            if (st.tab === 'Daily') { if (!sion.data) loadSion(); return dailyView(st); }
            if (st.tab === 'Letter') { if (!sion.data) loadSion(); return sionLetterView(st); }
            if (st.form) {
                const it = st.form;
                return `
                    <div class="mj-form mj-card">
                        ${whenRow(it)}
                        <input data-f="title" placeholder="title" value="${esc(it.title || '')}">
                        <div class="mj-dedit" contenteditable="true" spellcheck="false">${diaryHtml(it)}</div>
                        <div class="mj-dtools"><button class="mj-add" data-act="dy-photo">+ photo</button></div>
                        <input data-f="tags" placeholder="#tags" value="${esc(Array.isArray(it.tags) ? it.tags.map(x => '#' + x).join(' ') : (it.tags || ''))}">
                        ${formBtns(it)}
                    </div>`;
            }
            const rows = db.diary.slice().sort(byNewest);
            return `
                <div class="mj-newbar"><button class="mj-add" data-act="new">+ write</button></div>
                <div class="mj-log">
                    ${rows.length ? rows.map((r, i) => monthHead(rows, i) + `
                        <button class="mj-diary${(r.imgs || []).length ? ' has-img' : ''}" data-act="edit" data-id="${r.id}">
                            ${(r.imgs || []).length ? imgTag(r.imgs[0], 'dthumb') : ''}
                            <span class="dbody">
                                <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}${r.imgs && r.imgs.length > 1 ? ` · ${r.imgs.length} photos` : ''}</span>
                                ${r.title ? `<span class="tt">${esc(r.title)}</span>` : ''}
                                ${r.body ? `<span class="tx">${esc(r.body.split('\n').filter(l => !ROW_LINE.test(l)).join(' ').slice(0, 120))}</span>` : ''}
                                ${(r.tags || []).length ? `<span class="tags">${r.tags.map(x => '#' + esc(x)).join(' ')}</span>` : ''}
                            </span>
                        </button>`).join('') : empty('아직 일기가 없어요.')}
                </div>`;
        }
    };

    function condView(id, st) {
        if (st.form) return condForm(st);
        const types = WIN[id].types, type = st.tab === 'All' ? null : st.tab.toLowerCase();
        const rows = db.condition.filter(x => (st.all || x.date === st.date) && types.includes(x.type) && (!type || x.type === type)).sort(byNewest);   // 최신순
        return `
            ${dayNav(st)}
            <div class="mj-newbar">${(type ? [type] : types).map(k => `<button class="mj-add" data-act="new" data-v="${k}">+ ${label(COND_TYPES, k)}</button>`).join('')}</div>
            <div class="mj-log">
                ${rows.length ? (st.all ? grouped(rows, row) : rows.map(row).join('')) : empty(st.all ? '아직 기록이 없어요.' : '이 날은 기록이 없어요.')}
            </div>`;
        function row(r) { return `
                    <button class="mj-row" data-act="edit" data-id="${r.id}">
                        <span class="tm">${esc(r.time)}</span>
                        ${!type ? `<span class="ty ty-${r.type}">${label(COND_TYPES, r.type)}</span>` : ''}
                        <span class="tx">${condText(r)}</span>
                    </button>`; }
    }
    function condText(r) {
        const memo = r.memo ? ` <span class="memo">${esc(r.memo)}</span>` : '';
        if (r.type === 'meal') return `<b>${label(MEAL_SLOTS, r.slot || '') || ''}</b>${memo}${(r.imgs || []).length ? `<span class="mj-cimgs">${r.imgs.map(p => imgTag(p)).join('')}</span>` : ''}`;
        if (r.type === 'medicine') return `<b>${esc(r.name || '')}</b>${memo}`;
        if (r.type === 'symptom') return `<b>${esc((r.tags || []).join(', ') || '—')}</b> ${r.level ? `<span class="lv">${'●'.repeat(r.level)}${'○'.repeat(5 - r.level)}</span>` : ''}${memo}`;
        if (r.type === 'mood') { const m = moodList().find(x => x[0] === r.mood) || ['', '', r.mood]; return `<span class="emo">${m[1]}</span> <b>${esc(m[2])}</b>${memo}`; }
        return memo;
    }
    function condForm(st) {
        const it = st.form, type = it.type;
        let fields = '';
        if (type === 'meal') fields = `
            ${chips('slot', MEAL_SLOTS, it.slot || guessSlot(), true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        if (type === 'medicine') {
            const list = S().med_list.map(x => x.label);
            const picked = it.meds || (it.id && !it.meds && it.name ? it.name.split(/,\s*/).filter(n => list.includes(n)) : []);
            const other = it.meds ? (it.other || '') : (it.id && it.name ? it.name.split(/,\s*/).filter(n => !list.includes(n)).join(', ') : '');
            fields = `
                ${chips('meds', list.map(n => [n, n]), picked, false, '<button class="mj-chip add" data-act="add-med">+ add</button>')}
                <input data-f="other" placeholder="other" value="${esc(other)}">
                <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        }
        if (type === 'symptom') fields = `
            ${chips('tags', db.symptom_tags.map(t => [t, t]), it.tags || [], false, '<button class="mj-chip add" data-act="add-tag">+ tag</button>')}
            <div class="mj-sec">level</div>
            ${chips('level', [1, 2, 3, 4, 5].map(n => [String(n), '●'.repeat(n)]), it.level ? String(it.level) : '', true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        if (type === 'mood') fields = `
            ${chips('mood', moodList().map(([k, e, l]) => [k, `<span class="emo">${e}</span> ${l}`]), it.mood || '', true)}
            <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>`;
        return `
            <div class="mj-form mj-card">
                <div class="mj-sec">${label(COND_TYPES, type)}</div>
                ${fields}
                ${whenRow(it.id ? it : { date: st.date })}
                ${formBtns(it)}
            </div>`;
    }
    function guessSlot() { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'night'; }

    const libType = st => (libTypes().find(x => x[1] === st.tab) || ['all'])[0];
    const firstImg = t => marksOf(t)[0] || '';
    const plainMemo = t => (t || '').split('\n').filter(l => !ROW_LINE.test(l)).join(' ').trim();
    const libCover = r => r.cover ? r.cover : (r.type === 'youtube' && ytId(r.url) ? `https://i.ytimg.com/vi/${ytId(r.url)}/mqdefault.jpg` : firstImg(r.memo));
    const titleKey = r => r.type + '|' + String(r.title || '').trim().toLowerCase();
    function libraryView(st) {
        if (st.form) return libForm(st);
        const t = libType(st);
        const year = String(new Date().getFullYear());
        const counts = libTypes().map(([k, l]) => [l, db.library.filter(x => x.type === k && (x.date || '').startsWith(year)).length]).filter(x => x[1]);
        return `
            <div class="mj-libtop">
                <input class="mj-libq" data-libq placeholder="search" value="${esc(st.q || '')}">
            </div>
            ${t === 'all' ? `<div class="mj-libstat">${year} · ${counts.length ? counts.map(([l, n]) => `${l} <b>${n}</b>`).join(' · ') : '아직 기록이 없어요'}</div>` : ''}
            <div class="mj-newbar">${t === 'all' ? '<button class="mj-add" data-act="lib-add">+ add</button>' : `<button class="mj-add" data-act="new" data-v="${t}">+ ${label(libTypes(), t)}</button>`}</div>
            <div class="mj-log mj-liblist">${libList(st)}</div>`;
    }
    function libList(st) {
        const t = libType(st), q = (st.q || '').trim().toLowerCase();
        // N회차: 같은 종류·제목을 날짜 순서대로 셈
        const nth = {}, total = {};
        db.library.slice().sort(byOldest).forEach(r => { const k = titleKey(r); total[k] = (total[k] || 0) + 1; nth[r.id] = total[k]; });
        const rows = db.library.filter(x => (t === 'all' || x.type === t) &&
            (!q || [x.title, x.creator, x.memo, (x.tags || []).join(' ')].join(' ').toLowerCase().includes(q))).sort(byNewest);
        if (!rows.length) return empty(q ? '찾는 기록이 없어요.' : '아직 없어요.');
        return rows.map((r, i) => {
            const cv = libCover(r), k = titleKey(r);
            return monthHead(rows, i) + `
            <button class="mj-lib" data-act="edit" data-id="${r.id}">
                ${cv ? imgTag(cv, 'thumb' + (r.type === 'youtube' && !r.cover ? ' wide' : '')) : ''}
                <span class="body">
                    <span class="tt">${esc(r.title)}${total[k] > 1 ? ` <em class="nth">${nth[r.id]}회차</em>` : ''}</span>
                    <span class="meta">${t === 'all' ? `<em class="mj-tag">${label(libTypes(), r.type)}</em>` : ''}<em class="mj-tag st-${r.status || 'want'}">${label(LIB_STATUS, r.status || 'want')}</em>${[r.creator, r.year].filter(Boolean).map(esc).join(' · ')}</span>
                    ${r.rating ? `<span class="mj-mini">${hearts(r.rating)}</span>` : ''}
                    ${plainMemo(r.memo) ? `<span class="tx">${esc(plainMemo(r.memo).slice(0, 120))}</span>` : ''}
                    ${marksOf(r.memo).length ? `<span class="tm">${marksOf(r.memo).length} photos</span>` : ''}
                    ${(r.tags || []).length ? `<span class="tags">${r.tags.map(x => '#' + esc(x)).join(' ')}</span>` : ''}
                    <span class="tm">${dayTitle(r.date)} · ${esc(r.time)}</span>
                </span>
            </button>`;
        }).join('');
    }
    function libForm(st) {
        const it = st.form, type = it.type || libType(st);
        const cv = it.preview || it.cover || (type === 'youtube' && ytId(it.url) ? `https://i.ytimg.com/vi/${ytId(it.url)}/mqdefault.jpg` : '');
        return `
            <div class="mj-form mj-card">
                <div class="mj-sec">${label(libTypes(), type)}</div>
                ${LIB_SEARCH[type] ? `
                <div class="mj-libsearch"><input data-ls placeholder="search" value=""><button class="mj-btn ghost" data-act="lib-go">Search</button></div>
                <div class="mj-libres"></div>` : ''}
                <div class="mj-libform">
                    <div class="cover">
                        ${cv ? `<img src="${esc(/^https?:|^blob:/.test(cv) ? cv : imgSrc(cv))}" alt="">` : '<span>cover</span>'}
                        <div class="cv-btns"><button class="mj-link" data-act="lib-cover">사진</button>${cv && !(type === 'youtube' && !it.cover && !it.preview) ? '<button class="mj-link" data-act="lib-uncover">빼기</button>' : ''}</div>
                    </div>
                    <div class="fields">
                        <input data-f="title" placeholder="title" value="${esc(it.title || '')}">
                        <div class="two"><input data-f="creator" placeholder="creator" value="${esc(it.creator || '')}"><input data-f="year" placeholder="year" value="${esc(it.year || '')}" inputmode="numeric"></div>
                        ${type === 'youtube' ? `<input data-f="url" placeholder="link" value="${esc(it.url || '')}">` : ''}
                    </div>
                </div>
                ${chips('status', LIB_STATUS, it.status || 'want', true)}
                <div class="mj-hearts-pick sm" data-hearts="rating" data-v="${it.rating || 0}">${Array.from({ length: 5 }, (_, i) => `<button data-act="heart" data-v="${i + 1}">${pixelHeart(i < (it.rating || 0))}</button>`).join('')}</div>
                <input data-f="tags" placeholder="#tags" value="${esc(Array.isArray(it.tags) ? it.tags.map(x => '#' + x).join(' ') : (it.tags || ''))}">
                <div class="mj-dedit" contenteditable="true" spellcheck="false">${diaryHtml({ body: it.memo || '', newUrls: it.newUrls })}</div>
                <div class="mj-dtools"><button class="mj-add" data-act="dy-photo">+ photo</button></div>
                ${whenRow(it)}
                ${formBtns(it)}
            </div>`;
    }
    // 작품 검색
    let libResults = [];
    async function libSearch(id, st, el) {
        const type = st.form.type || libType(st), kind = LIB_SEARCH[type];
        const q = (el.querySelector('[data-ls]') || {}).value;
        const box = el.querySelector('.mj-libres');
        if (!q || !q.trim() || !box) return;
        box.innerHTML = '<p class="mj-empty">searching…</p>';
        try {
            if (kind === 'book') {
                const r = await fetch('https://dapi.kakao.com/v3/search/book?size=8&query=' + encodeURIComponent(q), { headers: { Authorization: 'KakaoAK ' + KAKAO_KEY } });
                libResults = ((await r.json()).documents || []).map(x => ({ title: x.title, year: (x.datetime || '').slice(0, 4), creator: (x.authors || []).join(', '), cover: x.thumbnail || '' }));
            } else {
                const r = await fetch(`https://api.themoviedb.org/3/search/${kind}?api_key=${TMDB_KEY}&language=ko-KR&query=` + encodeURIComponent(q));
                libResults = ((await r.json()).results || []).slice(0, 8).map(x => ({ id: x.id, kind, title: x.title || x.name, year: (x.release_date || x.first_air_date || '').slice(0, 4),
                    creator: '', cover: x.poster_path ? 'https://image.tmdb.org/t/p/w200' + x.poster_path : '' }));
            }
            box.innerHTML = libResults.length ? libResults.map((x, i) => `
                <button class="mj-libres-item" data-act="lib-pick" data-i="${i}">
                    ${x.cover ? `<img src="${esc(x.cover)}" alt="">` : '<span class="no"></span>'}
                    <span><b>${esc(x.title)}</b><small>${[x.year, x.creator].filter(Boolean).map(esc).join(' · ')}</small></span>
                </button>`).join('') : '<p class="mj-empty">결과가 없어요.</p>';
        } catch (e) { box.innerHTML = '<p class="mj-empty">검색하지 못했어요.</p>'; }
    }
    async function libPick(id, st, el, i) {
        const x = libResults[i]; if (!x) return;
        keepForm(id);
        Object.assign(st.form, { title: x.title, year: x.year, creator: x.creator || st.form.creator, cover: x.cover, coverFile: null, preview: '' });
        if (x.kind) {           // 감독(영화) · 만든 사람(드라마·애니)
            try {
                const r = await fetch(`https://api.themoviedb.org/3/${x.kind}/${x.id}?api_key=${TMDB_KEY}&language=ko-KR&append_to_response=credits`);
                const d = await r.json();
                const who = x.kind === 'movie' ? ((d.credits && d.credits.crew) || []).find(c => c.job === 'Director') : (d.created_by || [])[0];
                if (who) st.form.creator = who.name;
            } catch (e) { /* 없으면 비워 둠 */ }
        }
        renderWin(id);
    }

    function outfitView(st) {
        if (st.form) {
            const it = st.form;
            const src = it.preview || (it.img ? imgSrc(it.img) : '');
            return `
                <div class="mj-form mj-card mj-outfit-form">
                    ${src ? `<img class="mj-outfit-big" src="${esc(src)}" ${it.img && !it.preview ? `onerror="this.onerror=null;this.src='${esc(repo.rawUrl(it.img))}'"` : ''} alt="">` : ''}
                    <button class="mj-link" data-act="pick">${it.id ? '사진 바꾸기' : '다른 사진 고르기'}</button>
                    ${whenRow(it)}
                    <textarea data-f="memo" rows="2" placeholder="memo">${esc(it.memo || '')}</textarea>
                    ${formBtns(it)}
                </div>`;
        }
        const rows = db.outfit.slice().sort(byNewest);     // 최신 날짜·시간이 맨 앞
        if (!rows.length) return empty('아직 없어요.');
        return `
            <div class="mj-outfits">
                ${rows.map(r => `
                    <button class="mj-outfit" data-act="edit" data-id="${r.id}">
                        ${imgTag(r.img)}
                        <span class="d">${r.date.slice(5).replace('-', '.')}</span>
                    </button>`).join('')}
            </div>`;
    }

    /* ---------------- 투두 (기존 Todo 카테고리와 같은 파일) ---------------- */
    function todayTodos() {
        const t = todayKey();
        return (todos || []).filter(x => !x.parent_id && (
            (!x.is_completed && (!x.target_date || x.target_date <= t)) ||
            (x.is_completed && (x.completed_date || x.target_date) === t)
        )).sort((a, b) => (a.is_completed - b.is_completed) || ((a.sort_order || 0) - (b.sort_order || 0)));
    }
    function todoView() {
        if (todos === null) return `<p class="mj-empty">${todoErr ? esc(todoErr) + ' <button class="mj-link" data-act="todo-reload">retry</button>' : 'loading…'}</p>`;
        const rows = todayTodos(), left = rows.filter(x => !x.is_completed).length;
        return `
            <div class="mj-sec">Today · ${left} left <button class="mj-link" data-act="todo-reload">↻</button></div>
            <div class="mj-log">
                ${rows.length ? rows.map(x => `
                    <button class="mj-todo ${x.is_completed ? 'done' : ''}" data-act="todo-toggle" data-id="${x.id}">
                        <span class="box">${x.is_completed ? '✓' : ''}</span>
                        <span class="tx">${esc(x.content)}</span>
                        ${x.target_date && x.target_date < todayKey() && !x.is_completed ? `<span class="late">${x.target_date.slice(5).replace('-', '.')}</span>` : ''}
                    </button>`).join('') : empty('오늘 할 일이 없어요 ♡')}
            </div>
            <div class="mj-btns"><span class="sp"></span><button class="mj-btn ghost" data-act="todo-open">Open To Do ›</button></div>`;
    }
    async function loadTodos() {
        if (todos !== null) return;
        todoErr = '';
        const { data, error } = await todoDb.from('todos').select('*').order('created_at', { ascending: true });
        if (error) { todoErr = '투두를 불러오지 못했어요'; todos = null; }
        else todos = data || [];
        if (wins.diary) renderWin('diary');
        // 오늘의 알림 카드 · Daily 의 할 일도 지금 상태로 다시
        const np = root.querySelector('.mj-noti-panel'); if (np) notiRender(np);
        if (wins.diary && wins.diary.st.tab === 'Daily') renderWin('diary');
    }
    async function toggleTodo(tid) {
        const x = (todos || []).find(t => t.id === tid);
        if (!x) return;
        if (!window.ghdb.hasToken()) { mjAlert('저장하려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.'); return; }
        x.is_completed = !x.is_completed;
        x.completed_date = x.is_completed ? todayKey() : null;
        if (Array.isArray(x.subtasks)) x.subtasks.forEach(s => { s.is_completed = x.is_completed; });
        renderWin('diary');
        const { error } = await todoDb.from('todos').update({ is_completed: x.is_completed, completed_date: x.completed_date, subtasks: x.subtasks }).eq('id', tid);
        if (error) { mjAlert('투두를 저장하지 못했어요.\n' + (error.message || error)); todos = null; loadTodos(); }
    }

    /* ---------------- 하시온(내 여보♡): 메시지 · 편지 ----------------
       기록은 minjung/letters.json · 캐릭터는 minjung/sion.json
       보내기·편지 받기 = 저장소에 내 글 커밋 → GitHub Actions(letter.yml) 실행 → 끝나면 새로 불러옴
       새 메시지: 화면 위 알림 띠 + 웹앱 알림(sw.js, 켜 두었을 때) */
    const VAPID_PUBLIC = 'BErSE-Jfh-4jLGhteoW66_JV5rrta3rNeHaqBaHNBsS1hLsjVaG9UAtNT5fxYjtwlC5uPay67lYXdzkUF2zG7S4';
    const PUSH_FILE = 'minjung/push.json';
    const sion = { data: null, cfg: null, wait: {}, timer: null, last: Promise.resolve(), lastAi: null, lastLetters: null, push: null };
    const SION_CACHE = 'mj_sion_cache';   // 마지막으로 받은 메시지·설정 (창을 열 때 '불러오는 중' 없이 바로)
    try { const c = JSON.parse(localStorage.getItem(SION_CACHE) || 'null'); if (c && c.data) { sion.data = c.data; sion.cfg = c.cfg || null; } } catch (e) {}
    const contact = () => (sion.cfg && sion.cfg.contact) || '내 여보♡';
    // BANG에서 넣은 시온 프로필 사진 (없으면 기본 아이콘)
    const sionPhoto = () => sion.cfg && sion.cfg.photo ? imgTag(sion.cfg.photo, 'sn-photo-img') : '';
    const sionName = () => (sion.cfg && sion.cfg.short) || '시온';
    const PHOTO_RE = /^\(\s*사진\s*[:：]\s*([\s\S]+?)\s*\)$/;
    const IMG_SVG = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="m3.5 16 5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="9" r="1.5"/></svg>';
    const KK = {   // 카톡처럼 위 헤더 아이콘
        back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
        search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6"/><path d="m15.2 15.2 4.8 4.8"/></svg>',
        phone: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
        up: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>',
        hash: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/></svg>',
        smile: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 9.5v1M15 9.5v1M8.5 14.5c1.9 2 5.1 2 7 0"/></svg>',
        chat: '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M12 4C7 4 3 7.1 3 11c0 2.3 1.4 4.3 3.6 5.6L6 20l4-2.2c.6.1 1.3.2 2 .2 5 0 9-3.1 9-7s-4-7-9-7z"/></svg>',
        menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
        mic: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>',
        keypad: '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><circle cx="6" cy="5" r="1.6"/><circle cx="12" cy="5" r="1.6"/><circle cx="18" cy="5" r="1.6"/><circle cx="6" cy="11" r="1.6"/><circle cx="12" cy="11" r="1.6"/><circle cx="18" cy="11" r="1.6"/><circle cx="6" cy="17" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="18" cy="17" r="1.6"/></svg>',
        speaker: '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>',
        hang: '<svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M12 9c-2.6 0-5.1.5-7.4 1.5-.7.3-1.1 1-1.1 1.8v2.3c0 .8.7 1.4 1.5 1.3l2.9-.4c.7-.1 1.2-.7 1.2-1.4v-1.6c1.9-.6 3.9-.6 5.8 0v1.6c0 .7.5 1.3 1.2 1.4l2.9.4c.8.1 1.5-.5 1.5-1.3v-2.3c0-.8-.4-1.5-1.1-1.8C17.1 9.5 14.6 9 12 9z"/></svg>',
        pick: '<svg viewBox="0 0 24 24" width="30" height="30" fill="#fff"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>'
    };
    const SN_SVG = {
        search: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4.5 4.5"/></svg>',
        heart: on => `<svg viewBox="0 0 24 24" width="16" height="16" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M12 19.5s-7-4.3-7-9.4A3.9 3.9 0 0 1 12 7.8a3.9 3.9 0 0 1 7 2.3c0 5.1-7 9.4-7 9.4z"/></svg>`,
        bell: on => `<svg viewBox="0 0 24 24" width="16" height="16" fill="${on ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6.5 16.5h11l-1.3-1.8V10.5a4.2 4.2 0 0 0-8.4 0v4.2z"/><path d="M10.5 19a1.6 1.6 0 0 0 3 0"/></svg>`
    };
    // 새벽 5시 전은 아직 '어제' 밤 (스크립트와 같은 규칙)
    const sionLetterDay = () => keyOf(new Date(Date.now() - 5 * 3600000));
    function sionSeen() { try { return localStorage.getItem(SION_SEEN) || ''; } catch (e) { return ''; } }
    const lastAi = () => { const c = (sion.data && sion.data.chat) || []; for (let i = c.length - 1; i >= 0; i--) if (c[i].from === 'ai') return c[i]; return null; };
    function sionUnread() { const a = lastAi(); return !!a && a.at > sionSeen(); }
    function sionMarkSeen() {
        const a = lastAi(); if (!a) return;
        try { localStorage.setItem(SION_SEEN, a.at); } catch (e) {}
        drawSionBtn();
    }
    // 첫 화면 퀘스트 아래 버튼
    function drawSionBtn() {
        const b = $('mj-sion'); if (!b) return;
        // 2026.01.02(처음 만난 날)을 1일로 센 날짜
        const [y, m, d] = ((sion.cfg && sion.cfg.since) || '2026-01-02').split('-').map(Number);
        const now = new Date(), days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()) - new Date(y, m - 1, d)) / 86400000) + 1;
        b.innerHTML = `<span class="mj-ico">${pixelHeart(true)}</span><span class="n">${days}</span>`;
        b.title = contact() + ' · ' + days + '일';
        b.classList.toggle('unread', sionUnread());
    }
    async function loadSion(quiet, force) {
        try {
            const [d, c] = await Promise.all([repo.readJSON(SION_DATA, {}), repo.readJSON(SION_CFG, null)]);
            // 방금 저장한 직후엔 GitHub가 잠깐 옛 내용을 줄 때가 있음 → 30초 동안은 화면을 되돌리지 않음 (시온 새 글은 force 로 바로)
            if (force || !(sion.writeAt && Date.now() - sion.writeAt < 30000)) sion.data = Object.assign({ letters: {}, chat: [] }, d || {});
            if (c) { sion.cfg = c; WIN.sion.title = contact(); }
            try { localStorage.setItem(SION_CACHE, JSON.stringify({ data: sion.data, cfg: sion.cfg })); } catch (e) {}
        } catch (e) { console.error(e); if (!sion.data) sion.data = { letters: {}, chat: [] }; }
        sionCheckNew(quiet);
        drawSionBtn();
        const typingIn = w => w && w.el.contains(document.activeElement) && document.activeElement.matches('[data-sn=q], [data-sn=lreply], [data-sn=msg], [data-call=in]');
        if (wins.sion && !typingIn(wins.sion)) renderWin('sion');
        if (wins.diary && (wins.diary.st.tab === 'Daily' || wins.diary.st.tab === 'Letter') && !typingIn(wins.diary)) renderWin('diary');
        callAfterLoad();
        if (wins.bang && !wins.bang.el.contains(document.activeElement) && wins.bang.st.mdraft == null && !(wins.bang.st.pd && Object.keys(wins.bang.st.pd).length)) renderWin('bang');
        sionOpenFromNotice();
    }
    // 새로 온 메시지·편지 → 화면 위 알림 띠 (지금 보고 있는 탭이면 생략)
    // 날씨 위치: 마이홈에서 허용한 이 기기 위치(동네 정도로 반올림)를 시온 설정에 저장 → 아침 알림·날씨 알림이 그 위치로
    function syncPlace() {
        if (!sion.cfg || !window.ghdb.hasToken() || syncPlace.done) return;
        let p = null; try { p = (JSON.parse(localStorage.getItem('mh-place') || 'null') || {}).p; } catch (e) {}
        if (!p || !p.lat || !p.lon) return;
        const r = v => Math.round(v * 10) / 10;
        const next = { name: p.name || '', lat: r(p.lat), lon: r(p.lon) }, cur = sion.cfg.place || {};
        if (cur.lat === next.lat && cur.lon === next.lon && cur.name === next.name) return;
        syncPlace.done = true;
        repo.commit('김민정: 날씨 위치', {}, { [SION_CFG]: { fallback: {}, mutate: c => { c.place = next; return c; } } })
            .then(() => { sion.cfg.place = next; }, e => console.warn('place', e));
    }
    function sionCheckNew(quiet) {
        syncPlace();
        const a = lastAi(), today = sion.data.letters[sionLetterDay()];
        const first = sion.lastAi === null;
        const viewing = tab => wins.sion && wins.sion.st.tab === tab && document.visibilityState === 'visible';
        drawNoti();
        const briefShown = !quiet && briefBanner();
        if (briefShown) {
            // 아침 알림 띠에 시온 아침 메시지도 같이 보이니까 메시지 띠는 생략
        } else if (a && a.id !== sion.lastAi && !quiet && (first ? sionUnread() : true) && !viewing('Message') && !root.querySelector('.sn-banner.open') && !(a.slot === 'morning' && briefs()[todayKey()])) {
            const run = sion.data.chat.filter(r => r.from === 'ai' && r.at === a.at);
            sionBanner(run.map(r => PHOTO_RE.test(r.text) ? '사진' : r.text).join(' '), 'Message');
        } else if (today && sion.lastLetters !== null && !sion.lastLetters && !(wins.diary && wins.diary.st.tab === 'Letter')) sionBanner('편지가 도착했어요 ♡', null, { run: () => openArchive('Letter') });
        sion.lastAi = a ? a.id : '';
        sion.lastLetters = !!today;
    }
    // 화면 위 알림 띠 (아이폰 알림처럼): 프사 · 이름 · 내용 한두 줄
    function sionBanner(text, tab, o) {
        o = o || {};
        root.querySelectorAll('.sn-banner').forEach(x => x.remove());
        const el = document.createElement('button');
        el.className = 'sn-banner';
        const ph = sionPhoto();
        el.innerHTML = `<span class="ic${ph ? ' ph' : ''}">${ph || o.icon || iconHtml('sion')}</span><span class="tx"><b>${esc(o.title || contact())}</b><span>${esc(text)}</span></span><span class="tm">지금</span>`;
        el.addEventListener('click', () => { el.remove(); if (o.run) o.run(); else openSion(tab); });
        root.appendChild(el);
        setTimeout(() => el.classList.add('out'), 6200);
        setTimeout(() => el.remove(), 6600);
    }
    // 알림을 눌러서 들어왔으면 그 탭으로 열기
    function sionOpenFromNotice() {
        let tab = null;
        try { tab = sessionStorage.getItem('sion_open'); sessionStorage.removeItem('sion_open'); } catch (e) {}
        if (tab) tab === 'Notice' ? notiOpen(todayKey()) : tab === 'Letter' ? openArchive('Letter') : tab === 'Call' ? callCheckRing(true) : openSion('Message');
    }
    window.__openSion = tab => { if (!root.isConnected) return; if (tab === 'Notice') notiOpen(todayKey()); else if (tab === 'Letter') openArchive('Letter'); else if (tab === 'Call') { loadSion(true, true).then(() => callCheckRing(true)); } else openSion('Message'); };
    function openSion(tab) {
        const fresh = !wins.sion;
        openWin('sion');
        const st = wins.sion.st;
        if (fresh) Object.assign(st, { ldate: sionLetterDay(), stick: true, draft: '', ldraft: '', q: '', searching: false, favs: false, lfavs: false });
        st.tab = 'Message'; st.stick = true;
        if (st.view !== 'call' && st.view !== 'ring') st.view = 'chat';   // 통화 중이면 통화 화면 그대로
        renderWin('sion');
        root.querySelectorAll('.sn-banner').forEach(x => x.remove());
        if (!sion.data) loadSion();
    }
    // 시온 창 + Diary 창(Daily·Letter 보고 있을 때) 다시 그리기
    function sionRefresh() {
        if (wins.sion) renderWin('sion');
        if (wins.diary && (wins.diary.st.tab === 'Daily' || wins.diary.st.tab === 'Letter')) renderWin('diary');
    }
    // Daily · Letter 는 Diary 창으로
    function openArchive(tab, extra) {
        openWin('diary');
        const st = wins.diary.st;
        st.tab = tab; Object.assign(st, { ldate: st.ldate || sionLetterDay() }, extra || {});
        renderWin('diary');
        if (!sion.data) loadSion();
    }
    function sionAfterRender(w) {
        const c = w.el.querySelector('.sn-chat');
        if (c && w.st.stick !== false) c.scrollTop = c.scrollHeight;
        if (w.st.tab === 'Message' && sion.data && document.visibilityState === 'visible') sionMarkSeen();
        const t = w.el.querySelector('[data-sn=msg]');
        if (t && t.value) { t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 110) + 'px'; }
    }
    // 두 번 누르기 (휴대폰 · PC 둘 다). 꾹 누르기는 글자 선택(복사)으로 남겨 둠
    function onDoubleTap(el, sel, fn) {
        let last = null;
        el.addEventListener('pointerup', e => {
            const b = e.target.closest(sel); if (!b) { last = null; return; }
            const now = Date.now();
            if (last && last.b === b && now - last.t < 380 && Math.hypot(e.clientX - last.x, e.clientY - last.y) < 24) {
                last = null;
                try { const s = window.getSelection(); if (s) s.removeAllRanges(); } catch (err) {}
                fn(b);
            } else last = { b, t: now, x: e.clientX, y: e.clientY };
        });
    }
    function sionBind(w) {
        const el = w.el;
        // 적던 글은 다시 그려도 남게, 칸 높이는 글 길이에 맞게, Enter = 보내기 (Shift+Enter 줄바꿈)
        el.addEventListener('input', e => {
            const t = e.target;
            if (t.matches('[data-sn=msg]')) { w.st.draft = t.value; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 110) + 'px'; el.querySelector('.sn-send').classList.toggle('on', !!t.value.trim()); }
            if (t.matches('[data-sn=lreply]')) w.st.ldraft = t.value;
            if (t.matches('[data-sn=q]')) {
                w.st.q = t.value; w.st.stick = true;
                const box = el.querySelector('.sn-results'); if (box) { box.innerHTML = w.st.tab === 'Letter' ? sionLetterResults(w.st) : sionBubbles(w.st); sionAfterRender(w); }
            }
        });
        el.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229 && e.target.matches('[data-sn=msg]')) { e.preventDefault(); sionSendChat(w.st); }
            if (e.key === 'Escape' && e.target.matches('[data-sn=q]')) { w.st.searching = false; w.st.q = ''; renderWin(el.dataset.win); }
            if (e.key === 'Enter' && !e.isComposing && e.keyCode !== 229 && e.target.matches('[data-call=in]')) { e.preventDefault(); callSendTyped(); }
        });
        el.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('sn-chat')) { const c = e.target; w.st.stick = c.scrollHeight - c.scrollTop - c.clientHeight < 40; } }, true);
        // 말풍선 두 번 누르기 → 수정 · 하트 · 삭제 (꾹 누르면 글자 선택해서 복사)
        onDoubleTap(el, '.sn-b[data-id]', sionBubbleMenu);
        onDoubleTap(el, '.sn-b[data-bi]', b => briefMenuFor(b.dataset.bk, Number(b.dataset.bi), b, sionRefresh));
        // 메시지 입력 중엔 보내 준 폰처럼 화면 전체를 고정 (아이폰이 위아래로 밀지 않게)
        el.addEventListener('focusin', e => { if (e.target.matches('[data-sn=msg], [data-call=in]')) { document.documentElement.classList.add('sn-lock'); window.scrollTo(0, 0); } });
        el.addEventListener('focusout', e => { if (e.target.matches('[data-sn=msg], [data-call=in]')) document.documentElement.classList.remove('sn-lock'); });
        // Daily 목록: 꾹 누르면 그 날 지우기
        let lp = null;
        el.addEventListener('pointerdown', e => {
            const b = e.target.closest('.dl-item'); if (!b) return;
            lp = { x: e.clientX, y: e.clientY, t: setTimeout(() => { lp = null; el.dataset.noclick = '1'; setTimeout(() => { delete el.dataset.noclick; }, 400); showPick(b, [{ label: '이 날 지우기', run: () => dailyDelete(b.dataset.v) }]); }, 520) };
        });
        el.addEventListener('pointermove', e => { if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8) { clearTimeout(lp.t); lp = null; } });
        el.addEventListener('pointerup', () => { if (lp) { clearTimeout(lp.t); lp = null; } });
        el.addEventListener('contextmenu', e => { const b = e.target.closest('.dl-item'); if (!b) return; e.preventDefault(); showPick(b, [{ label: '이 날 지우기', run: () => dailyDelete(b.dataset.v) }]); });
    }
    function sionBubbleMenu(b) {
        const m = (sion.data.chat || []).find(x => x.id === b.dataset.id); if (!m) return;
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
        showPick(b, [
            { label: '수정', run: async () => {
                const t = await mjPrompt('수정', m.text); if (t == null || !t.trim() || t.trim() === m.text) return;
                sionEditMsg(m.id, x => { x.text = t.trim().slice(0, SION_MAX); x.edited = stamp(); }, '메시지 수정');
            } },
            { icon: SN_SVG.heart(!m.fav), label: '', run: () => sionEditMsg(m.id, x => { x.fav = !x.fav; if (!x.fav) delete x.fav; }, m.fav ? '하트 빼기' : '하트') },
            { label: '삭제', run: async () => {
                if (!await mjConfirm('이 메시지를 지울까요?', '삭제')) return;
                sionEditMsg(m.id, null, '메시지 삭제');
            } }
        ]);
    }
    // 메시지 하나 고치기(fn) 또는 지우기(fn 없음)
    function sionEditMsg(mid, fn, message) {
        if (sionNeedToken()) return;
        const apply = list => { const i = list.findIndex(x => x.id === mid); if (i < 0) return; if (fn) fn(list[i]); else list.splice(i, 1); };
        apply(sion.data.chat); renderWin('sion'); drawSionBtn();
        sionCommit(message, cur => apply(cur.chat)).catch(e => { mjAlert('저장하지 못했어요.\n' + (e.message || e)); loadSion(true); });
    }

    // 메시지: 시간 차가 1시간 넘으면 날짜·시각 줄, 같은 사람이 이어 보낸 말풍선은 마지막에만 꼬리
    const KDOW = '일월화수목금토';
    function sionStamp(at) {   // 기록된 한국 시간 그대로 (기기 시간대와 상관없이)
        const [y, mo, d, h, mi] = (at.match(/\d+/g) || []).map(Number);
        return `<b>${mo}월 ${d}일 (${KDOW[new Date(y, mo - 1, d).getDay()]})</b> ${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(mi)}`;
    }
    const snMark = (s, q) => { const t = esc(s); if (!q) return t; const qq = esc(q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return t.replace(new RegExp(qq, 'gi'), x => `<mark>${x}</mark>`); };
    function sionBubbles(st) {
        const all = sion.data.chat || [], q = (st.q || '').trim().toLowerCase();
        const filtered = st.favs || q;
        const c = all.filter(r => (!st.favs || r.fav) && (!q || r.text.toLowerCase().includes(q)));
        const t = r => new Date(r.at).getTime();
        let html = '';
        c.forEach((r, i) => {
            const prev = c[i - 1], next = c[i + 1];
            const head = filtered || !prev || t(r) - t(prev) > 3600000;
            const tail = filtered || !next || next.from !== r.from || t(next) - t(r) > 3600000;
            if (head) html += `<div class="sn-when">${sionStamp(r.at)}</div>`;
            if (r.kind === 'call') {   // 통화 기록 말풍선 (부재중이면 눌러서 다시 걸기)
                const missed = r.status === 'missed';
                html += `<div class="sn-row ${r.from === 'me' ? 'me' : 'you'} tail"><button class="sn-b sn-callb${missed ? ' missed' : ''}" data-act="${missed ? 'sn-callback' : 'call-log'}" data-v="${esc(r.call || '')}">${KK.phone}<span><b>${missed ? '부재중 전화' : r.from === 'me' ? '보이스톡' : '보이스톡'}</b><small>${missed ? '눌러서 다시 걸기' : r.status === 'noanswer' ? '응답 없음' : '통화 ' + esc(r.text || '')}</small></span></button></div>`;
                return;
            }
            const ph = PHOTO_RE.exec(r.text);
            const inner = ph ? `<span class="ph">${IMG_SVG}</span><span class="cap">${snMark(ph[1], q)}</span>` : snMark(r.text, q);
            const first = head || !prev || prev.from !== r.from || prev.kind === 'call';
            const you = r.from !== 'me', prof = you && (KT.opt.showPic || KT.opt.showName);
            html += `<div class="sn-row ${you ? 'you' : 'me'}${tail && !ph ? ' tail' : ''}${first ? ' first' : ''}${r.fav ? ' fav' : ''}${ph ? ' photo' : ''}${prof ? ' kk-p' + (KT.opt.showPic ? ' pic' : '') : ''}">
                ${prof && first && KT.opt.showPic ? `<span class="kk-av">${kkAvatar()}</span>` : ''}
                ${prof && first && KT.opt.showName ? `<span class="kk-nm">${esc(contact())}</span>` : ''}
                <div class="sn-b${ph ? ' sn-photo' : ''}" data-id="${esc(r.id)}">${inner}${r.fav ? `<i class="sn-heart">${SN_SVG.heart(true)}</i>` : ''}</div></div>`;
        });
        if (!filtered && sion.wait.chat) html += '<div class="sn-row you tail"><div class="sn-b sn-typing"><i></i><i></i><i></i></div></div>';
        if (!c.length && !sion.wait.chat) html += empty(st.favs ? '하트를 누른 메시지가 없어요.<br>말풍선을 꾹 누르면 하트를 줄 수 있어요.' : q ? '찾는 메시지가 없어요.' : `아침 · 점심 · 저녁에 ${esc(contact())}한테서 메시지가 와요`);
        return html;
    }
    function sionTools(st) {
        const pushOn = sion.push === true;
        return `<div class="sn-tools">
            <button class="${st.searching ? 'on' : ''}" data-act="sn-search" title="검색">${SN_SVG.search}</button>
            ${st.searching ? `<input data-sn="q" type="text" enterkeyhint="search" placeholder="${st.tab === 'Letter' ? '편지 검색' : '메시지 검색'}" value="${esc(st.q || '')}" autocomplete="off">` : '<span class="sp"></span>'}
            ${st.tab === 'Message' ? `<button class="${st.favs ? 'on' : ''}" data-act="sn-favs" title="하트 모아 보기">${SN_SVG.heart(st.favs)}</button>`
                : `<button class="${st.lfavs ? 'on' : ''}" data-act="sn-lfavs" title="하트 편지 모아 보기">${SN_SVG.heart(st.lfavs)}</button>`}
            <button class="${pushOn ? 'on' : ''}" data-act="sn-push" title="${pushOn ? '알림 켜짐' : '알림 켜기'}">${SN_SVG.bell(pushOn)}</button>
        </div>`;
    }
    function sionChatView(st) {
        if (!sion.data) return '<div class="sn-chat">' + empty('불러오는 중…') + '</div>';
        if (sion.push === null) sionPushState();
        const top = st.searching ? `<div class="kk-search"><input data-sn="q" type="text" enterkeyhint="search" placeholder="대화 내용 검색" value="${esc(st.q || '')}" autocomplete="off"><button data-act="sn-search">취소</button></div>`
            : st.favs ? `<div class="kk-search kk-fav"><span>♥ 하트 모아 보기</span><button data-act="sn-favs">닫기</button></div>` : '';
        return top + `<div class="sn-chat sn-results">${sionBubbles(st)}</div>
            <div class="sn-bar kk-bar">
                <span class="kk-plus">+</span>
                <div class="sn-field">
                    <textarea data-sn="msg" rows="1" maxlength="${SION_MAX}" placeholder="메시지 입력">${esc(st.draft || '')}</textarea>
                    <span class="kk-smile">${KK.smile}</span>
                </div>
                <button class="sn-send kk-send${(st.draft || '').trim() ? ' on' : ''}" data-act="sn-send" aria-label="보내기"><span class="i-up">${KK.up}</span><span class="i-hash">${KK.hash}</span></button>
            </div>`;
    }
    function sionDays() {
        const ks = Object.keys((sion.data && sion.data.letters) || {});
        if (!ks.includes(sionLetterDay())) ks.push(sionLetterDay());
        return ks.sort();
    }
    function sionLetterResults(st) {
        const q = (st.q || '').trim().toLowerCase();
        if (!q) return empty('편지 내용으로 찾아요.');
        const hits = Object.keys(sion.data.letters).sort().reverse().filter(k => {
            const lt = sion.data.letters[k];
            return (lt.body || '').toLowerCase().includes(q) || (lt.replies || []).some(r => r.text.toLowerCase().includes(q));
        });
        if (!hits.length) return empty('찾는 편지가 없어요.');
        return hits.map(k => {
            const body = sion.data.letters[k].body || '', i = body.toLowerCase().indexOf(q);
            const snip = i < 0 ? body.slice(0, 60) : (i > 20 ? '…' : '') + body.slice(Math.max(0, i - 20), i + 50);
            return `<button class="sn-hit" data-act="sn-lgo" data-v="${k}"><span class="d">${dayTitle(k)}</span><span class="s">${snMark(snip.replace(/\s+/g, ' '), st.q.trim())}</span></button>`;
        }).join('');
    }
    function sionLetterView(st) {
        if (!sion.data) return empty('불러오는 중…');
        if (st.searching) return sionTools(st) + `<div class="sn-results">${sionLetterResults(st)}</div>`;
        if (st.lfavs) {
            const favs = Object.keys(sion.data.letters).sort().reverse().filter(k => sion.data.letters[k].fav);
            return sionTools(st) + (favs.length ? favs.map(k => `<button class="sn-hit" data-act="sn-lgo" data-v="${k}"><span class="d">${dayTitle(k)}</span><span class="s">${esc((sion.data.letters[k].body || '').replace(/\s+/g, ' ').slice(0, 70))}…</span></button>`).join('')
                : empty('하트를 누른 편지가 없어요.<br>편지 오른쪽 위 하트를 눌러 모아 둘 수 있어요.'));
        }
        const k = st.ldate || sionLetterDay(), ks = sionDays(), i = ks.indexOf(k);
        const lt = sion.data.letters[k], name = esc(contact());
        const nav = sionTools(st) + `<div class="sn-lnav"><button data-act="sn-ld" data-v="-1" ${i > 0 ? '' : 'disabled'}>‹</button><span>${dayTitle(k)}</span><button data-act="sn-ld" data-v="1" ${i < ks.length - 1 ? '' : 'disabled'}>›</button></div>`;
        if (!lt) {
            if (k !== sionLetterDay()) return nav + empty('이 날은 편지가 없어요.');
            return nav + `<div class="sn-env">
                <div class="sn-seal">${ICON.letter}</div>
                <button class="mj-btn" data-act="sn-letter" ${sion.wait.letter ? 'disabled' : ''}>${sion.wait.letter ? esc(sionName()) + '이 편지 쓰는 중…' : '내 토끼에게'}</button>
            </div>`;
        }
        const reps = lt.replies || [], waiting = reps.length && reps[reps.length - 1].from === 'me';
        const maxed = reps.filter(r => r.from === 'ai').length >= ((sion.cfg && sion.cfg.max_letter_replies) || 5);
        return nav + `<article class="sn-paper"><button class="sn-lheart${lt.fav ? ' on' : ''}" data-act="sn-lfav" title="하트">${SN_SVG.heart(!!lt.fav)}</button><div class="sn-body">${esc(lt.body).split(/\n{2,}/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('')}</div></article>
            <div class="sn-thread">${reps.map(r => `<div class="sn-rep ${r.from === 'me' ? 'me' : 'you'}"><span class="who">${r.from === 'me' ? 'Me' : name} · ${esc((r.at || '').slice(11, 16))}</span>${nl(r.text)}</div>`).join('')}
                ${waiting ? `<div class="sn-note">${sion.wait.reply ? esc(sionName()) + '이 답글 쓰는 중…' : `답글을 기다리는 중 · <button class="mj-link" data-act="sn-retry" data-v="reply">다시 부르기</button>`}</div>` : ''}
            </div>
            ${waiting || maxed ? '' : `<div class="mj-form sn-lform"><textarea data-sn="lreply" rows="3" maxlength="${SION_MAX}" placeholder="답장 쓰기">${esc(st.ldraft || '')}</textarea>
                <div class="mj-btns"><span class="sp"></span><button class="mj-btn" data-act="sn-lsend">Send</button></div></div>`}`;
    }

    function sionLetterFav(k) {
        const lt = sion.data.letters[k]; if (!lt || sionNeedToken()) return;
        const on = !lt.fav;
        const set = x => { if (!x) return; if (on) x.fav = true; else delete x.fav; };
        set(lt); sionRefresh();
        sionCommit(on ? '편지 하트' : '편지 하트 빼기', cur => set(cur.letters[k])).catch(e => { mjAlert('저장하지 못했어요.\n' + (e.message || e)); loadSion(true); });
    }

    /* ---------------- 오늘의 알림 (날씨 · 오하아사 · 일정 · 시온 아침 메시지) ----------------
       아침 메시지를 만들 때 GitHub Actions가 letters.json 의 briefs 에 저장. 하트 밑 종 = 알림 카드 목록 */
    const NOTI_SEEN = 'mj_brief_seen', NOTI_BANNER = 'mj_brief_banner', NOTI_REQ = 'mj_brief_req';
    const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
    const briefs = () => (sion.data && sion.data.briefs) || {};
    const seenSet = () => { try { return new Set(JSON.parse(lsGet(NOTI_SEEN, '[]'))); } catch (e) { return new Set(); } };
    // 날씨 알림이 새로 붙으면 다시 '안 봄'이 되게: 날짜 + 알림 수로 기억
    const briefKey = k => { const b = briefs()[k]; return k + ':' + ((b && b.alerts) || []).length; };
    const unreadBriefs = () => { const s = seenSet(), k = todayKey(); return briefs()[k] && !s.has(briefKey(k)) ? [k] : []; };   // 종은 오늘 것만
    function markBriefSeen(k) { const s = seenSet(); if (s.has(briefKey(k))) return; s.add(briefKey(k)); lsSet(NOTI_SEEN, JSON.stringify([...s].sort().slice(-80))); drawNoti(); }
    const WX = { '맑음': '☀︎', '구름 조금': '⛅︎', '흐림': '☁︎', '안개': '≋', '이슬비': '☂︎', '비': '☂︎', '눈': '❄︎', '소나기': '☔︎', '뇌우': 'ϟ' };
    function briefLine(b) {
        const al = (b.alerts || []).slice(-1)[0];
        if (al) return al.text;
        const w = b.weather, f = b.fortune, n = (b.schedule || []).length + (b.todos || []).length;
        return [w ? `${w.desc} ${w.now}°` : '', f ? `${f.sign} ${f.rank}위` : '', n ? `할 일·일정 ${n}` : ''].filter(Boolean).join(' · ') || '오늘의 알림';
    }
    function drawNoti() {
        const b = $('mj-noti'); if (!b) return;
        const n = unreadBriefs().length, any = Object.keys(briefs()).length;
        b.innerHTML = `<span class="mj-ico">${ICON.bell}</span>`;
        b.title = n ? '안 본 알림 ' + n + '개' : '알림';
        b.classList.toggle('unread', !!n);
        b.style.display = any ? '' : 'none';
    }
    // 아침(5시 이후) 김민정에 처음 들어왔을 때 한 번만 위에 띠로. 아직 오늘 것이 없으면 만들어 달라고 함
    function briefBanner() {
        const now = new Date(); if (now.getHours() < 5) return false;
        const k = todayKey(), b = briefs()[k];
        if (!b) {
            if (window.ghdb.hasToken() && lsGet(NOTI_REQ, '') !== k && !sion.wait.message) { lsSet(NOTI_REQ, k); sionRun('message', '', 'morning'); }
            return false;
        }
        if (lsGet(NOTI_BANNER, '') === k) return false;
        lsSet(NOTI_BANNER, k);
        sionBanner(sLines(b).length ? sLines(b).join(' ') : briefLine(b), null, { run: () => notiOpen(k) });
        return true;
    }
    /* 오늘의 알림 카드 (하트 밑 종): 작은 창. 알림이 하나뿐이면 바로 그 카드, 여럿이면 날짜별 목록 → 카드 */
    const sItem = x => typeof x === 'string' ? { text: x } : (x || { text: '' });
    const sLines = b => ((b && b.sion) || []).map(x => sItem(x).text).filter(Boolean);
    // 알림 속 할 일: 지금 투두 목록에서 끝냈는지 다시 확인 → 끝낸 건 줄 긋고 맨 아래
    function briefTodos(b, k) {
        if (todos === null && !briefTodos.tried) { briefTodos.tried = true; loadTodos(); }   // 한 번만 (실패해도 계속 부르지 않게)
        const list = (b.todos || []).map(t => typeof t === 'string' ? { text: t } : Object.assign({}, t));
        list.forEach(t => {
            const live = (todos || []).find(x => (t.id != null && x.id === t.id) || (x.content === t.text && x.target_date === k));
            if (live) t.done = !!live.is_completed;
        });
        return list.filter(t => !t.done).concat(list.filter(t => t.done));
    }
    const todoRows = (b, k, cls, done) => briefTodos(b, k).filter(t => !!t.done === done).map(t => `<p class="${cls}${t.done ? ' done' : ''}"><span>To do</span><s>${esc(t.text)}</s></p>`).join('');
    const kDate = k => { const [y, m, d] = k.split('-').map(Number); return `${m}월 ${d}일 (${KDOW[new Date(y, m - 1, d).getDay()]})`; };
    const kTime = at => { const [h, mi] = ((at || '').slice(11, 16) || '00:00').split(':').map(Number); return `${h < 12 ? '오전' : '오후'} ${h % 12 || 12}:${pad(mi)}`; };
    function notiClose() { root.querySelectorAll('.mj-noti-panel, .mj-noti-bg').forEach(x => x.remove()); }
    function notiOpen(k) {
        notiClose();
        const bg = document.createElement('div'); bg.className = 'mj-noti-bg'; bg.addEventListener('click', notiClose);
        const p = document.createElement('div'); p.className = 'mj-noti-panel';
        p.dataset.k = k || todayKey();   // 알림 카드는 오늘 것만 (지난 날은 시온 창 Daily)
        root.appendChild(bg); root.appendChild(p);
        p.addEventListener('click', e => {
            const c = e.target.closest('[data-nk]'); if (c) { p.dataset.k = c.dataset.nk; notiRender(p); return; }
            const a = e.target.closest('[data-na]'); if (!a) return;
            if (a.dataset.na === 'back') { delete p.dataset.k; notiRender(p); }
            if (a.dataset.na === 'close') notiClose();
        });
        // 카드 속 시온 말풍선: 두 번 누르기 → 수정 · 하트 · 삭제 (꾹 누르면 글자 선택해서 복사)
        onDoubleTap(p, '.nt-sion .b[data-i]', b => briefMenu(p, b));
        notiRender(p);
    }
    function notiRender(p) {
        const all = briefs(), k = p.dataset.k;
        if (!all[k]) {
            p.innerHTML = `<div class="nt-head"><span class="nt-when"><b>${kDate(k)}</b></span><button data-na="close" aria-label="닫기">${X_SVG}</button></div>
                <div class="nt-list">${empty('아직 오늘의 알림이 없어요')}</div>`;
            return;
        }
        const b = all[k];
        markBriefSeen(k);
        const w = b.weather, f = b.fortune;
        const sec = (t, h) => h ? `<div class="nt-sec">${t}</div>${h}` : '';
        const items = (b.sion || []).map(sItem);
        p.innerHTML = `<div class="nt-head"><span class="nt-when"><b>${kDate(k)}</b> ${kTime(b.at)}</span><button data-na="close" aria-label="닫기">${X_SVG}</button></div>
            <div class="nt-body">
                ${items.length ? `<div class="nt-sion">${items.map((x, i) => `<span class="b${i === items.length - 1 ? ' tail' : ''}${x.fav ? ' fav' : ''}" data-i="${i}">${esc(x.text)}${x.fav ? `<i class="sn-heart">${SN_SVG.heart(true)}</i>` : ''}</span>`).join('')}</div>` : ''}
                ${sec('Weather', w ? `<div class="nt-wx"><b class="ic">${WX[w.desc] || '·'}</b><div><b>${esc(w.desc)} ${w.now}°</b><span>${w.min}° / ${w.max}° · 비 ${w.rain}% · ${esc(w.place)}</span>
                    ${w.tomorrow ? `<span class="tm">내일 ${esc(w.tomorrow.desc)} ${w.tomorrow.min}° / ${w.tomorrow.max}° · 비 ${w.tomorrow.rain}%</span>` : ''}</div></div>` : '')}
                ${sec('Fortune', f ? `<div class="nt-fo"><div class="rk"><b>${f.rank}</b>위</div><div class="tx"><span class="sg">${esc(f.sign)} · おは朝</span>
                    ${(f.ko && f.ko.length ? f.ko : f.jp).map((t, i, a) => `<p${i === a.length - 1 && a.length > 1 ? ' class="lucky"' : ''}>${i === a.length - 1 && a.length > 1 ? '♡ 럭키 아이템 · ' : ''}${esc(t)}</p>`).join('')}</div></div>`
                    : '<p class="nt-none">오늘은 운세가 없어요 (주말엔 쉬어요)</p>')}
                ${sec('Today', (b.schedule || []).map(e => `<p class="nt-row"><span>${esc(e.time)}</span>${esc(e.title)}</p>`).join('') +
                    todoRows(b, k, 'nt-row', false) +
                    (b.ddays || []).map(d => `<p class="nt-row"><span>D-${d.left || 'DAY'}</span>${esc(d.title)}</p>`).join('') +
                    todoRows(b, k, 'nt-row', true) || '<p class="nt-none">오늘 일정이 없어요</p>')}
            </div>`;
    }
    function briefMenu(p, el) { briefMenuFor(p.dataset.k, Number(el.dataset.i), el, () => notiRender(p)); }
    function briefMenuFor(k, i, el, after) {
        const b = briefs()[k]; if (!b) return;
        const x = sItem((b.sion || [])[i]);
        if (navigator.vibrate) try { navigator.vibrate(10); } catch (e) {}
        const edit = (fn, msg) => {
            if (sionNeedToken()) return;
            const apply = d => { const bb = d.briefs && d.briefs[k]; if (!bb || !bb.sion || i >= bb.sion.length) return; const cur = sItem(bb.sion[i]); const r = fn(Object.assign({}, cur)); if (r === null) bb.sion.splice(i, 1); else bb.sion[i] = r.fav ? r : r.text; };
            apply(sion.data); after(); sionRefresh();
            sionCommit(msg, apply).catch(e => { mjAlert('저장하지 못했어요.\n' + (e.message || e)); loadSion(true); });
        };
        showPick(el, [
            { label: '수정', run: async () => { const t = await mjPrompt('수정', x.text); if (t == null || !t.trim() || t.trim() === x.text) return; edit(y => { y.text = t.trim(); return y; }, '아침 메시지 수정'); } },
            { icon: SN_SVG.heart(!x.fav), label: '', run: () => edit(y => { y.fav = !y.fav; if (!y.fav) delete y.fav; return y; }, '아침 메시지 하트') },
            { label: '삭제', run: async () => { if (!await mjConfirm('이 메시지를 지울까요?', '삭제')) return; edit(() => null, '아침 메시지 삭제'); } }
        ]);
    }

    /* ---------------- Daily: 매일 쌓이는 오늘의 알림 아카이브 (날짜별 목록 → 그날 기록, 지우기) ---------------- */
    function dailyView(st) {
        if (!sion.data) return empty('불러오는 중…');
        const all = briefs(), keys = Object.keys(all).sort().reverse();
        if (!keys.length) return empty('매일 오늘의 알림이 여기 쌓여요');
        if (st.dday && all[st.dday]) return dailyDetail(all[st.dday], st.dday);
        return `<div class="dl-list">${keys.map(d => {
            const b = all[d], al = (b.alerts || []).slice(-1)[0];
            return `<button class="dl-item" data-act="dl-open" data-v="${d}">
                <span class="mid"><span class="row"><b>${kDate(d)}</b><span class="tm">${kTime(b.at)}</span></span>
                    <span class="pv">${esc(sLines(b)[0] || (al && al.text) || '오늘의 알림')}</span><span class="sm">${esc(briefLine(Object.assign({}, b, { alerts: [] })))}</span></span>
            </button>`;
        }).join('')}</div>`;
    }
    function dailyDetail(b, k) {
        const w = b.weather, f = b.fortune, items = (b.sion || []).map(sItem);
        const card = (t, h) => `<div class="dl-card"><div class="dl-t">${t}</div>${h}</div>`;
        return `<div class="dl-head"><button data-act="dl-back" aria-label="목록">‹</button><b>${kDate(k)}</b><span class="tm">${kTime(b.at)}</span>
                <button class="dl-del" data-act="dl-del" data-v="${k}" aria-label="이 날 지우기" title="이 날 지우기">${X_SVG}</button></div>
            ${items.length ? `<div class="dl-msgs">${items.map((x, i) => `<div class="sn-row you${i === items.length - 1 ? ' tail' : ''}${x.fav ? ' fav' : ''}"><div class="sn-b" data-bi="${i}" data-bk="${k}">${esc(x.text)}${x.fav ? `<i class="sn-heart">${SN_SVG.heart(true)}</i>` : ''}</div></div>`).join('')}</div>` : ''}
            ${(b.alerts || []).map(a => `<div class="dl-alert"><span class="k">${esc(a.kind)}</span><span>${esc(a.text)}</span><span class="tm">${kTime(a.at)}</span></div>`).join('')}
            ${w ? card('Weather', `<div class="dl-wx"><span class="ic">${WX[w.desc] || '·'}</span><div><b>${esc(w.desc)} ${w.now}°</b><span>${w.min}° / ${w.max}° · 비 ${w.rain}% · ${esc(w.place)}</span>
                ${w.tomorrow ? `<span>내일 ${esc(w.tomorrow.desc)} ${w.tomorrow.min}° / ${w.tomorrow.max}° · 비 ${w.tomorrow.rain}%</span>` : ''}</div></div>`) : ''}
            ${card('Fortune', f ? `<div class="dl-fo"><span class="rk"><b>${f.rank}</b>위</span><div><span class="sg">${esc(f.sign)} · おは朝</span>
                ${(f.ko && f.ko.length ? f.ko : f.jp).map((t, i, a) => `<p${i === a.length - 1 && a.length > 1 ? ' class="lucky"' : ''}>${i === a.length - 1 && a.length > 1 ? '♡ ' : ''}${esc(t)}</p>`).join('')}</div></div>`
                : '<p class="dl-none">이 날은 운세가 없어요</p>')}
            ${card('Today', (b.schedule || []).map(e => `<p class="dl-row"><span>${esc(e.time)}</span>${esc(e.title)}</p>`).join('') +
                todoRows(b, k, 'dl-row', false) +
                (b.ddays || []).map(d => `<p class="dl-row"><span>D-${d.left || 'DAY'}</span>${esc(d.title)}</p>`).join('') +
                todoRows(b, k, 'dl-row', true) || '<p class="dl-none">일정이 없었어요</p>')}`;
    }
    async function dailyDelete(k) {
        if (!briefs()[k] || sionNeedToken()) return;
        if (!await mjConfirm(kDate(k) + ' 기록을 지울까요?', '삭제')) return;
        delete sion.data.briefs[k];
        if (wins.diary) wins.diary.st.dday = null;
        sionRefresh();
        drawNoti();
        sionCommit('Daily ' + k + ' 지우기', d => { if (d.briefs) delete d.briefs[k]; }).catch(e => { mjAlert('지우지 못했어요.\n' + (e.message || e)); loadSion(true); });
    }

    /* ---------------- BANG: 시온의 기억 ---------------- */
    const PROMPT_GROUPS = [
        ['캐릭터', [['personality', '성격'], ['relationship', '관계'], ['speech', '말투'], ['examples', '말투 예시'], ['rules', '절대 규칙']]],
        ['쓰는 법', [['writing', '메시지·편지 공통 규칙'], ['photo', '사진 보내기']]],
        ['상황별', [['morning', '아침 (오늘의 알림)'], ['proactive', '선톡 공통'], ['lunch', '점심 선톡'], ['evening', '저녁 선톡'], ['night', '밤 선톡'], ['dawn', '새벽 선톡 (가끔)'], ['trip', '여행·캠핑 중 (같이 안 있음)'], ['tripam', '여행·캠핑 날 아침 선톡'], ['chat', '내 메시지에 답장'], ['callmsg', '시온이 전화 걸기 (언제)'], ['call', '전화 통화 말투'], ['letter', '밤 편지'], ['reply', '편지 답글']]]
    ];
    const pval = (st, k) => st.pd && st.pd[k] != null ? st.pd[k] : ((sion.cfg && sion.cfg.prompt) || {})[k] || '';
    const fval = (st, k) => st.pd && st.pd['@' + k] != null ? st.pd['@' + k] : (sion.cfg || {})[k] || '';
    function bangView(st) {
        if (!sion.data || !sion.cfg) return empty('불러오는 중…');
        const dirty = st.pd && Object.keys(st.pd).length;
        const saveBar = `<div class="mj-btns bg-bar"><span class="bg-count">${dirty ? '고친 내용이 있어요' : ''}</span><span class="sp"></span>
            ${dirty ? '<button class="mj-btn ghost" data-act="bg-pcancel">Cancel</button>' : ''}<button class="mj-btn" data-act="bg-psave" ${dirty ? '' : 'disabled'}>Save</button></div>`;
        if (st.tab === 'Profile') {
            const ph = sion.cfg.photo;
            return `<div class="bg-prof">
                    <button class="bg-photo" data-act="bg-photo" title="사진 바꾸기">${ph ? imgTag(ph, 'bg-photo-img') : `<span class="ph">${ICON.profile}</span>`}</button>
                    <div class="bg-pf">
                        <label><span>이름</span><input data-bf="@name" value="${esc(fval(st, 'name'))}"></label>
                        <label><span>저장된 이름</span><input data-bf="@contact" value="${esc(fval(st, 'contact'))}"></label>
                        <label><span>처음 만난 날</span><input data-bf="@since" type="date" value="${esc(fval(st, 'since'))}"></label>
                    </div>
                </div>
                <div class="bg-phbtns"><button class="mj-link" data-act="bg-photo">${ph ? '사진 바꾸기' : '사진 넣기'}</button>${ph ? ' · <button class="mj-link" data-act="bg-photo-del">사진 지우기</button>' : ''}</div>
                <div class="mj-sec">Profile prompt</div>
                <div class="mj-form"><textarea data-bf="profile" rows="14" placeholder="기본 정보 · 외형">${esc(pval(st, 'profile'))}</textarea></div>
                ${saveBar}`;
        }
        if (st.tab === 'Prompt') {
            return PROMPT_GROUPS.map(([g, items]) => `<div class="bg-group">${g}</div>` + items.map(([k, l]) => `<div class="mj-sec">${l}</div>
                    <div class="mj-form"><textarea data-bf="${k}" rows="${k === 'examples' ? 18 : ['profile', 'personality', 'relationship', 'writing', 'rules'].includes(k) ? 12 : 6}">${esc(pval(st, k))}</textarea></div>`).join('')).join('') + saveBar;
        }
        const m = sion.data.memory || {}, every = sion.cfg.memory_every || 3;
        if (st.tab === 'Log') {
            const log = (sion.data.memory_log || []).slice().reverse();
            return log.length ? log.map(x => `<div class="bg-log"><div class="d">${x.from ? esc(x.from.slice(5).replace('-', '.')) + ' ~ ' : ''}${esc((x.upto || '').slice(5).replace('-', '.'))}${x.edited ? ' · 고침' : ''}</div><div class="tx">${nl(x.summary)}</div></div>`).join('')
                : empty('아직 지난 기억이 없어요.<br>새로 정리될 때마다 예전 기억이 여기 쌓여요.');
        }
        const left = every - Object.keys(sion.data.letters || {}).filter(k => k > (m.upto || '')).length;
        const val = st.mdraft != null ? st.mdraft : (m.summary || '');
        return `<p class="bg-info">편지 ${every}통마다 새로 정리 · 다음 정리까지 ${Math.max(0, left)}통${m.at ? ' · 마지막 ' + esc(m.at.slice(5, 16).replace('T', ' ')) : ''}${m.edited ? ' · 고친 기억' : ''}</p>
            <div class="mj-form"><textarea data-bg="mem" rows="12" placeholder="아직 정리된 기억이 없어요. 직접 적어 둬도 돼요.">${esc(val)}</textarea></div>
            <div class="mj-btns"><span class="bg-count">${val.length}자</span><span class="sp"></span>
                ${st.mdraft != null ? '<button class="mj-btn ghost" data-act="bg-reset">Cancel</button>' : ''}<button class="mj-btn" data-act="bg-save">Save</button></div>`;
    }
    // 시온 설정(minjung/sion.json) 저장: 고친 칸만 (files = 사진 올리기·지우기)
    function bangPromptSave(st, files, extra) {
        if (sionNeedToken()) return Promise.resolve();
        const pd = Object.assign({}, st.pd || {});
        const apply = c => {
            c.prompt = c.prompt || {};
            Object.keys(pd).forEach(k => { if (k[0] === '@') c[k.slice(1)] = pd[k].trim(); else c.prompt[k] = pd[k].trim(); });
            if (extra) extra(c);
            return c;
        };
        apply(sion.cfg); st.pd = null; WIN.sion.title = contact();
        renderWin('bang'); drawSionBtn();
        return repo.commit('김민정: 시온 설정', files || {}, { [SION_CFG]: { fallback: {}, mutate: apply } })
            .then(() => toast('저장했어요'), e => { mjAlert('저장하지 못했어요.\n' + (e.message || e)); loadSion(true); });
    }
    async function bangPhoto(st, del) {
        if (sionNeedToken()) return;
        const old = sion.cfg.photo;
        if (del) {
            if (!old || !await mjConfirm('프로필 사진을 지울까요?', '삭제')) return;
            const files = {}; if (old.startsWith(IMG_DIR)) files[old] = null;
            return bangPromptSave(st, files, c => { delete c.photo; });
        }
        pickFile(async f => {
            try {
                toast('uploading…');
                const { path, sha } = await uploadImage(f, 'sion', 512, 'image/jpeg');
                const files = { [path]: sha }; if (old && old.startsWith(IMG_DIR)) files[old] = null;
                bangPromptSave(st, files, c => { c.photo = path; });
            } catch (e) { mjAlert('사진을 올리지 못했어요.\n' + (e.message || e)); }
        });
    }
    function bangSave(st) {
        if (st.mdraft == null || sionNeedToken()) return;
        const text = st.mdraft.trim(), at = stamp();
        const set = d => { d.memory = Object.assign({}, d.memory || {}, { summary: text, edited: at }); };
        set(sion.data); st.mdraft = null; renderWin('bang');
        sionCommit('시온 기억 고치기', set).then(() => toast('기억을 고쳤어요'), e => { mjAlert('저장하지 못했어요.\n' + (e.message || e)); loadSion(true); });
    }

    /* ---------------- 채팅방 테마 (카톡 .ktheme · 안드로이드 .apk 통째로) ----------------
       넣은 테마는 저장소 minjung/theme/ 에 그림 + theme.json 으로 저장 → 폰·PC 어디서나 같은 테마
       theme.json: { name, kind, colors, img:{bg,profile}, bubbles:{send1,send2,recv1,recv2}, font:{path,name}, opt:{showName,showPic,font} } */
    const THEME_DIR = 'minjung/theme/', THEME_FILE = THEME_DIR + 'theme.json';
    const KT = { data: null, local: {}, opt: { showName: true, showPic: true, font: 'pretendard' } };
    try { const c = JSON.parse(localStorage.getItem('mj_kk_theme') || 'null'); if (c) { KT.data = c; Object.assign(KT.opt, c.opt || {}); } } catch (e) {}
    Object.defineProperty(KT, 'theme', { get: () => KT.data && KT.data.bubbles ? KT.data : null });
    const ktSrc = p => KT.local[p] || repo.url(p);
    const ktPaths = d => { const out = []; if (!d) return out; Object.values(d.img || {}).forEach(p => p && out.push(p)); Object.values(d.bubbles || {}).forEach(b => b && b.path && out.push(b.path)); if (d.font && d.font.path) out.push(d.font.path); return out; };
    function ktCommit(message, files, next) {
        if (sionNeedToken()) return Promise.reject(new Error('토큰이 없어요'));
        KT.data = next; Object.assign(KT.opt, (next && next.opt) || {});
        try { localStorage.setItem('mj_kk_theme', JSON.stringify(next)); } catch (e) {}
        ktApply();
        return repo.commit('김민정: ' + message, files || {}, { [THEME_FILE]: { fallback: {}, mutate: () => next } });
    }
    function ktSaveOpt() { const next = Object.assign({}, KT.data || {}, { opt: Object.assign({}, KT.opt) }); ktCommit('채팅방 설정', {}, next).catch(e => console.warn(e)); }
    async function ktLoad() {
        try {
            const d = await repo.readJSON(THEME_FILE, null);
            if (d && JSON.stringify(d) !== JSON.stringify(KT.data)) { KT.data = d; Object.assign(KT.opt, d.opt || {}); try { localStorage.setItem('mj_kk_theme', JSON.stringify(d)); } catch (e) {} ktApply(); }
        } catch (e) { console.warn('theme', e); }
    }
    let jszip = null;
    function loadZip() {
        if (window.JSZip) return Promise.resolve(window.JSZip);
        return jszip || (jszip = new Promise((ok, fail) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
            s.onload = () => ok(window.JSZip); s.onerror = () => { jszip = null; fail(new Error('압축 풀기 도구를 못 불러왔어요')); };
            document.head.appendChild(s);
        }));
    }
    const imgSize = blob => new Promise(ok => { const u = URL.createObjectURL(blob), i = new Image(); i.onload = () => { ok({ w: i.naturalWidth, h: i.naturalHeight }); URL.revokeObjectURL(u); }; i.onerror = () => ok(null); i.src = u; });

    // .ktheme (아이폰): KakaoTalkTheme.css + Images/*@3x.png
    function ktParseCss(text) {
        const out = {};
        text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/([\w-]+)\s*\{([^}]*)\}/g, (m, name, body) => {
            const o = out[name] = {};
            body.split(';').forEach(l => { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim(); });
        });
        return out;
    }
    async function ktFromKtheme(zip) {
        const cssFile = Object.keys(zip.files).find(n => /KakaoTalkTheme\.css$/i.test(n));
        const css = ktParseCss(await zip.file(cssFile).async('string'));
        const pick = async (name) => {   // 'x.png' → 가장 큰 배율 파일
            if (!name) return null;
            name = name.replace(/['"]/g, '').trim();
            const base = name.replace(/\.png$/i, '');
            for (const [suf, sc] of [['@3x', 3], ['@2x', 2], ['', 1]]) {
                const f = Object.keys(zip.files).find(n => n.toLowerCase().endsWith('/' + (base + suf + '.png').toLowerCase()) || n.toLowerCase() === (base + suf + '.png').toLowerCase());
                if (f) return { blob: new Blob([await zip.file(f).async('uint8array')], { type: 'image/png' }), scale: sc };
            }
            return null;
        };
        const g = (blk, k) => (css[blk] || {})[k];
        const col = (blk, k) => { const v = g(blk, k); return v && /^#[0-9a-f]{3,8}$/i.test(v) ? v : null; };
        const bubble = async (blk, key, insKey) => {   // 'x.png' 20px 50px  (늘어나는 점: 왼쪽, 위)
            const v = g(blk, key); if (!v) return null;
            const m = /'([^']+)'\s+(\d+)px\s+(\d+)px/.exec(v); if (!m) return null;
            const im = await pick(m[1]); if (!im) return null;
            const sz = await imgSize(im.blob); if (!sz) return null;
            const ins = (g(blk, insKey) || '10px 10px 10px 10px').match(/\d+/g).map(Number);   // top left bottom right
            return { blob: im.blob, scale: im.scale, w: sz.w, h: sz.h, L: +m[2], T: +m[3], pad: { t: ins[0], l: ins[1], b: ins[2], r: ins[3] } };
        };
        const bg = await pick(g('BackgroundStyle-ChatRoom', '-ios-background-image'));
        const prof = await pick((g('DefaultProfileStyle', '-ios-profile-images') || '').split(',')[0]);
        return {
            kind: 'ktheme', name: (g('ManifestStyle', '-kakaotalk-theme-name') || '').replace(/['"]/g, '') || '카톡 테마',
            colors: {
                bg: col('BackgroundStyle-ChatRoom', 'background-color'), head: col('HeaderStyle-Main', '-ios-text-color'),
                sendText: col('MessageCellStyle-Send', '-ios-text-color'), recvText: col('MessageCellStyle-Receive', '-ios-text-color'),
                input: col('InputBarStyle-Chat', 'background-color'), sendBtn: col('InputBarStyle-Chat', '-ios-send-normal-background-color'),
                sendBtnFg: col('InputBarStyle-Chat', '-ios-send-normal-foreground-color'), btn: col('InputBarStyle-Chat', '-ios-button-normal-background-color'),
                btnFg: col('InputBarStyle-Chat', '-ios-button-normal-foreground-color'), sub: col('MainViewStyle-Primary', '-ios-description-text-color')
            },
            img: { bg: bg && bg.blob, profile: prof && prof.blob },
            bubbles: {
                send1: await bubble('MessageCellStyle-Send', '-ios-background-image', '-ios-title-edgeinsets'),
                send2: await bubble('MessageCellStyle-Send', '-ios-group-background-image', '-ios-group-title-edgeinsets'),
                recv1: await bubble('MessageCellStyle-Receive', '-ios-background-image', '-ios-title-edgeinsets'),
                recv2: await bubble('MessageCellStyle-Receive', '-ios-group-background-image', '-ios-group-title-edgeinsets')
            }
        };
    }
    // .apk (안드로이드): res/drawable-*/ 의 그림 + 9-patch(npTc) 늘어나는 정보. 색은 그림에서 뽑음
    function ninePatch(u8) {   // 컴파일된 .9.png 의 npTc 조각 읽기
        const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
        for (let p = 8; p + 8 < u8.length;) {
            const len = dv.getUint32(p), type = String.fromCharCode(u8[p + 4], u8[p + 5], u8[p + 6], u8[p + 7]);
            if (type === 'npTc') {
                const d = p + 8, nx = u8[d + 1], ny = u8[d + 2];
                const pad = { l: dv.getInt32(d + 12), r: dv.getInt32(d + 16), t: dv.getInt32(d + 20), b: dv.getInt32(d + 24) };
                const xs = [], ys = []; let q = d + 32;
                for (let i = 0; i < nx; i++, q += 4) xs.push(dv.getInt32(q));
                for (let i = 0; i < ny; i++, q += 4) ys.push(dv.getInt32(q));
                return { x0: xs[0] || 0, x1: xs[1] || 1, y0: ys[0] || 0, y1: ys[1] || 1, pad };
            }
            p += 12 + len;
        }
        return null;
    }
    async function avgColor(blob, fx, fy) {   // 그림의 한 점(비율) 색
        const u = URL.createObjectURL(blob), i = new Image();
        await new Promise(ok => { i.onload = ok; i.onerror = ok; i.src = u; });
        const c = document.createElement('canvas'); c.width = c.height = 1;
        try { c.getContext('2d').drawImage(i, Math.floor(i.naturalWidth * fx), Math.floor(i.naturalHeight * fy), 1, 1, 0, 0, 1, 1); } catch (e) {}
        URL.revokeObjectURL(u);
        const d = c.getContext('2d').getImageData(0, 0, 1, 1).data;
        return '#' + [d[0], d[1], d[2]].map(x => x.toString(16).padStart(2, '0')).join('');
    }
    const lum = hex => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
    async function ktFromApk(zip) {
        const files = Object.keys(zip.files).filter(n => /^res\/drawable[^/]*\/.+\.png$/i.test(n));
        const rank = n => /xxxhdpi/.test(n) ? 4 : /xxhdpi/.test(n) ? 3 : /xhdpi/.test(n) ? 2 : /hdpi/.test(n) ? 1.5 : 1;
        const find = re => files.filter(n => re.test(n.split('/').pop())).sort((a, b) => rank(b) - rank(a))[0];
        const read = async n => n ? new Blob([await zip.file(n).async('uint8array')], { type: 'image/png' }) : null;
        const bubble = async re => {
            const n = find(re); if (!n) return null;
            const u8 = await zip.file(n).async('uint8array'), np = ninePatch(u8), sc = rank(n), blob = new Blob([u8], { type: 'image/png' });
            const sz = await imgSize(blob); if (!sz) return null;
            const s = np || { x0: sz.w / 2, x1: sz.w / 2 + 1, y0: sz.h / 2, y1: sz.h / 2 + 1, pad: { l: 12 * sc, r: 12 * sc, t: 8 * sc, b: 8 * sc } };
            return { blob, scale: sc, w: sz.w, h: sz.h, L: s.x0 / sc, T: s.y0 / sc, R: (sz.w - s.x1) / sc, B: (sz.h - s.y1) / sc,
                pad: { t: s.pad.t / sc, l: s.pad.l / sc, b: s.pad.b / sc, r: s.pad.r / sc } };
        };
        const b = {
            send1: await bubble(/chatroom.*bubble.*(me|send).*0?1.*\.png$/i), send2: await bubble(/chatroom.*bubble.*(me|send).*0?2.*\.png$/i),
            recv1: await bubble(/chatroom.*bubble.*(you|receive).*0?1.*\.png$/i), recv2: await bubble(/chatroom.*bubble.*(you|receive).*0?2.*\.png$/i)
        };
        const bg = await read(find(/chatroom.*background.*\.png$/i) || find(/background.*image.*\.png$/i));
        const prof = await read(find(/profile.*0?1.*\.png$/i));
        const colors = {};
        if (bg) colors.bg = await avgColor(bg, .5, .5);
        if (b.send1) { const c = await avgColor(b.send1.blob, (b.send1.L + 2) / (b.send1.w / b.send1.scale), (b.send1.T + 2) / (b.send1.h / b.send1.scale)); colors.sendText = lum(c) > .6 ? '#3a3235' : '#ffffff'; colors.sendBtn = c; }
        if (b.recv1) { const c = await avgColor(b.recv1.blob, (b.recv1.L + 2) / (b.recv1.w / b.recv1.scale), (b.recv1.T + 2) / (b.recv1.h / b.recv1.scale)); colors.recvText = lum(c) > .6 ? '#3a3235' : '#ffffff'; }
        if (colors.bg) colors.head = lum(colors.bg) > .6 ? '#3a3235' : '#ffffff';
        return { kind: 'apk', name: '안드로이드 테마', colors, img: { bg, profile: prof }, bubbles: b };
    }
    async function ktImport(file) {
        const Z = await loadZip();
        const zip = await Z.loadAsync(file);
        const names = Object.keys(zip.files);
        let th;
        if (names.some(n => /KakaoTalkTheme\.css$/i.test(n))) th = await ktFromKtheme(zip);
        else if (names.some(n => /^res\/drawable/i.test(n))) th = await ktFromApk(zip);
        else throw new Error('카톡 테마 파일(.ktheme · .apk)이 아니에요');
        // 그림을 저장소에 올리고 theme.json 엔 경로만
        const files = {}, stamp36 = Date.now().toString(36);
        const put = async (blob, name) => {
            const p = THEME_DIR + stamp36 + '-' + name + '.png';
            files[p] = await repo.putBlob(new Uint8Array(await blob.arrayBuffer()));
            KT.local[p] = URL.createObjectURL(blob);
            return p;
        };
        const next = { name: th.name, kind: th.kind, colors: th.colors, img: {}, bubbles: {}, font: KT.data && KT.data.font, opt: Object.assign({}, KT.opt) };
        for (const k of ['bg', 'profile']) if (th.img[k]) next.img[k] = await put(th.img[k], k);
        for (const k of ['send1', 'send2', 'recv1', 'recv2']) {
            const b = th.bubbles[k]; if (!b) continue;
            const o = Object.assign({}, b); delete o.blob; o.path = await put(b.blob, k);
            next.bubbles[k] = o;
        }
        ktPaths(KT.data).forEach(p => { if (!files[p] && !(next.font && next.font.path === p)) files[p] = null; });   // 예전 테마 그림 지우기
        await ktCommit('채팅방 테마 ' + th.name, files, next);
        return th;
    }
    async function ktReset() {
        const files = {}; ktPaths(KT.data).forEach(p => { if (!(KT.data.font && KT.data.font.path === p)) files[p] = null; });
        await ktCommit('채팅방 테마 기본으로', files, { font: KT.data && KT.data.font, opt: Object.assign({}, KT.opt) });
    }
    async function ktFont(f) {
        const ext = (/\.(ttf|otf|woff2?)$/i.exec(f.name) || [, 'ttf'])[1].toLowerCase();
        const p = THEME_DIR + Date.now().toString(36) + '-font.' + ext, files = {};
        files[p] = await repo.putBlob(new Uint8Array(await f.arrayBuffer()));
        KT.local[p] = URL.createObjectURL(f);
        if (KT.data && KT.data.font && KT.data.font.path) files[KT.data.font.path] = null;
        KT.opt.font = 'mine';
        await ktCommit('채팅방 글꼴', files, Object.assign({}, KT.data || {}, { font: { path: p, name: f.name }, opt: Object.assign({}, KT.opt) }));
    }
    // 테마 → CSS (말풍선은 이미지를 늘려 쓰는 border-image, 첫 말풍선은 01 · 이어지는 말풍선은 02)
    async function ktApply() {
        const url = p => ktSrc(p);
        const th = KT.theme, font = KT.data && KT.data.font;
        let css = '';
        if (font && font.path && KT.opt.font === 'mine') css += `@font-face { font-family: 'KKMine'; src: url(${url(font.path)}); font-display: swap; }\n`;
        const fam = { pretendard: "'Pretendard Variable', Pretendard", system: '-apple-system, BlinkMacSystemFont, system-ui', galmuri: "'Galmuri11'", mine: "'KKMine'" }[KT.opt.font] || "'Pretendard Variable', Pretendard";
        css += `.mj-win-sion { --kk-font: ${fam}, -apple-system, sans-serif; }\n`;
        if (th) {
            const c = th.colors || {}, S = '.mj-win-sion.kk-themed';
            css += `${S} { --mj-paper: ${c.bg || '#fbf7fa'}; --kk-bg: ${c.bg || '#fbf7fa'}; --kk-head: ${c.head || '#3a3235'}; --kk-input: ${c.input || '#ffffff'};
                --kk-send: ${c.sendBtn || '#f3b3c5'}; --kk-send-fg: ${c.sendBtnFg || '#ffffff'}; --kk-btn: ${c.btn || '#f5f5f5'}; --kk-btn-fg: ${c.btnFg || c.head || '#3a3235'};
                --kk-sub: ${c.sub || c.head || '#8f8188'}; --mj-ink: ${c.head || '#3a3235'}; --mj-sub: ${c.sub || c.head || '#8f8188'}; --mj-line: rgba(0,0,0,.08); --mj-card: #ffffff; color-scheme: light; }\n`;
            css += `${S} { background: var(--kk-bg)${th.img && th.img.bg ? ` url(${url(th.img.bg)}) top center / cover no-repeat` : ''}; }
                ${S} .kk-head, ${S} .mj-win-body, ${S} .sn-bar { background: transparent; }
                ${S} .sn-row .sn-b::before, ${S} .sn-row .sn-b::after { display: none; }\n`;
            const bub = (sel, b, color) => {
                if (!b) return '';
                const R = b.R != null ? b.R : b.w / b.scale - b.L - 1, B = b.B != null ? b.B : b.h / b.scale - b.T - 1;
                const sl = [b.T * b.scale, R * b.scale, B * b.scale, b.L * b.scale].map(Math.round).join(' ');
                return `${S} ${sel} { --bub: transparent; background: none; border-style: solid; border-width: 0; border-image: url(${url(b.path)}) ${sl} fill / ${b.T}px ${R}px ${B}px ${b.L}px stretch;
                    padding: ${b.pad.t}px ${b.pad.r}px ${b.pad.b}px ${b.pad.l}px; min-width: ${Math.ceil(b.L + R + 1)}px; min-height: ${Math.ceil(b.T + B + 1)}px; max-width: 82%; box-sizing: border-box; color: ${color}; text-shadow: none; border-radius: 0; }
                    ${S} ${sel}::before, ${S} ${sel}::after { display: none; }\n`;
            };
            const bb = th.bubbles || {};
            css += bub('.sn-row.me .sn-b:not(.sn-photo):not(.sn-callb)', bb.send2 || bb.send1, c.sendText || '#3a3235');
            css += bub('.sn-row.me.first .sn-b:not(.sn-photo):not(.sn-callb)', bb.send1, c.sendText || '#3a3235');
            css += bub('.sn-row.you .sn-b:not(.sn-photo):not(.sn-callb):not(.sn-typing)', bb.recv2 || bb.recv1, c.recvText || '#3a3235');
            css += bub('.sn-row.you.first .sn-b:not(.sn-photo):not(.sn-callb):not(.sn-typing)', bb.recv1, c.recvText || '#3a3235');
            KT.profileUrl = th.img && th.img.profile ? url(th.img.profile) : null;
        } else KT.profileUrl = null;
        let el = document.getElementById('kk-theme-css');
        if (!el) { el = document.createElement('style'); el.id = 'kk-theme-css'; document.head.appendChild(el); }
        el.textContent = css;
        if (wins.sion) renderWin('sion');
    }
    ktApply(); ktLoad();
    // 상대 프사: 전화 프로필 사진 > 테마 기본 프사 > 이모티콘
    const kkAvatar = () => sion.cfg && sion.cfg.call_photo ? imgTag(sion.cfg.call_photo, '') : KT.profileUrl ? `<img src="${KT.profileUrl}" alt="">` : `<span class="kk-emoji">${esc((sion.cfg && sion.cfg.call_emoji) || '🐱')}</span>`;
    function pickAny(accept, cb) {
        const i = document.createElement('input'); i.type = 'file'; i.accept = accept;
        i.onchange = () => { const f = i.files && i.files[0]; if (f) cb(f); };
        i.click();
    }
    function ktSettingsView() {
        const th = KT.theme, o = KT.opt;
        const sw = (k, on, label) => `<label class="kk-opt"><span>${label}</span><button class="kk-sw${on ? ' on' : ''}" data-act="kk-opt" data-v="${k}"><i></i></button></label>`;
        const fonts = [['pretendard', 'Pretendard'], ['system', '시스템'], ['galmuri', '갈무리'], ['mine', '내 글꼴']];
        return `<div class="kk-set">
            <div class="kk-sec">테마</div>
            <div class="kk-card"><b>${th ? esc(th.name) : '기본 (블랙·핑크)'}</b><small>${th ? (th.kind === 'apk' ? '안드로이드 테마' : '카톡 테마') + ' · 모든 기기에 같이 적용' : '카톡 테마 파일을 넣으면 통째로 바뀌어요'}</small>
                <div class="kk-btns"><button class="mj-btn" data-act="kk-theme">테마 파일 넣기</button>${th ? '<button class="mj-btn ghost" data-act="kk-theme-del">기본으로</button>' : ''}</div></div>
            <div class="kk-sec">글꼴</div>
            <div class="kk-card kk-fonts">${fonts.map(([k, l]) => `<button class="${o.font === k ? 'on' : ''}" data-act="kk-font" data-v="${k}">${l}</button>`).join('')}
                <small>${o.font === 'mine' ? '' : '‘내 글꼴’을 누르면 글꼴 파일(.ttf · .otf · .woff)을 넣을 수 있어요'}</small></div>
            <div class="kk-sec">대화 상대</div>
            <div class="kk-card">
                <label class="kk-opt"><span>이름</span><button class="mj-link" data-act="kk-name">${esc(contact())}</button></label>
                ${sw('showName', o.showName, '이름 보이기')}
                ${sw('showPic', o.showPic, '프사 보이기')}
                <label class="kk-opt"><span>프사 · 전화 화면</span><button class="mj-link" data-act="call-edit">편집</button></label>
            </div>
        </div>`;
    }
    // 전화 프로필 편집: 이모티콘 / 사진, 걸려 올 때 배경
    function callEditView() {
        const c = sion.cfg || {};
        return `<div class="kk-set">
            <div class="kk-contact"><div class="kk-bigav">${kkAvatar()}</div></div>
            <div class="kk-sec">프사</div>
            <div class="kk-card">
                <label class="kk-opt"><span>이모티콘</span><input class="kk-emo" data-ce="emoji" value="${esc(c.call_emoji || '🐱')}" maxlength="4"></label>
                <div class="kk-btns"><button class="mj-btn" data-act="ce-photo">${c.call_photo ? '사진 바꾸기' : '사진 넣기'}</button>${c.call_photo ? '<button class="mj-btn ghost" data-act="ce-photo-del">사진 빼기</button>' : ''}<button class="mj-btn ghost" data-act="ce-emoji">이모티콘 저장</button></div>
            </div>
            <div class="kk-sec">전화 올 때 배경</div>
            <div class="kk-card">
                <div class="kk-ringprev">${c.ring_bg ? imgTag(c.ring_bg, '') : '<span>기본 배경</span>'}</div>
                <div class="kk-btns"><button class="mj-btn" data-act="ce-ring">${c.ring_bg ? '배경 바꾸기' : '배경 넣기'}</button>${c.ring_bg ? '<button class="mj-btn ghost" data-act="ce-ring-del">배경 빼기</button>' : ''}</div>
            </div>
        </div>`;
    }
    // sion.json 의 전화 프로필 칸 저장 (사진은 minjung/images/sion/)
    async function callCfgSave(key, file) {
        if (sionNeedToken()) return;
        const old = sion.cfg[key], files = {};
        let val = null;
        if (file) { toast('uploading…'); const up = await uploadImage(file, 'sion', key === 'ring_bg' ? 1280 : 512, 'image/jpeg'); files[up.path] = up.sha; val = up.path; }
        if (old && old.startsWith(IMG_DIR) && old !== val) files[old] = null;
        const set = c => { if (val) c[key] = val; else delete c[key]; return c; };
        set(sion.cfg); sionRefresh();
        repo.commit('김민정: 시온 전화 프로필', files, { [SION_CFG]: { fallback: {}, mutate: set } }).then(() => toast('저장했어요'), e => mjAlert('저장하지 못했어요.\n' + (e.message || e)));
    }

    /* ---------------- 전화 (내 여보♡ 🐱) ----------------
       진짜 음성 통화는 못 해서: 나는 말하기(글자로 바뀜)나 키패드로, 시온은 글자로 + 스피커를 켜면 폰 목소리로 읽어 줌
       통화 한마디마다 GitHub Actions(letter.yml, mode=call)가 시온 대사를 만들어 letters.json calls 에 붙임 (보통 20초~1분) */
    const calls = () => (sion.data && sion.data.calls) || [];
    const callOf = id => calls().find(c => c.id === id);
    const callAvatar = () => kkAvatar();
    const mmss = sec => pad(Math.floor(sec / 60)) + ':' + pad(sec % 60);
    sion.callSpeaker = false; sion.callKeypad = false; sion.spoken = new Set(); sion.missing = new Set();
    function callCommit(msg, fn) { return sionCommit(msg, d => { d.calls = d.calls || []; d.chat = d.chat || []; fn(d); }); }
    function callChat(c, status, dur) {   // 대화창에 남는 통화 기록
        return { id: uid('m'), from: c.dir === 'out' ? 'me' : 'ai', kind: 'call', status, call: c.id, text: dur != null ? mmss(dur) : '', at: stamp() };
    }
    // ring: 내가 건 전화는 시온 첫마디가 만들어질 때까지 '연결 중…' (받는 시간 = 첫 응답까지 걸린 시간). 통화 시간은 받은 뒤부터
    function enterCall(id, ring) {
        openSion('Message');
        const st = wins.sion.st;
        st.view = 'call'; st.callId = id;
        clearInterval(sion.callTimer);
        sion.callRing = !!ring; sion.callStart = Date.now();
        sion.callTimer = setInterval(() => {
            if (!wins.sion || wins.sion.st.view !== 'call') { clearInterval(sion.callTimer); return; }
            const t = wins.sion.el.querySelector('.kk-tmr');
            if (t) t.textContent = sion.callRing ? '연결 중…' : mmss(Math.floor((Date.now() - sion.callStart) / 1000));
        }, 1000);
        renderWin('sion');
    }
    const callRinging = () => !!sion.callRing;
    // 첫마디가 오면 받은 걸로
    function callPickup(c) {
        if (!sion.callRing || !(c.lines || []).some(l => l.from === 'ai')) return false;
        sion.callRing = false; sion.callStart = Date.now();
        renderWin('sion'); callSpeakNew(c);
        return true;
    }
    // 실행이 실패했을 때: 받기 전이면 한 번 더 걸어 보고, 그래도 안 되면 '응답 없음'
    function callRunFailed() {
        const st = wins.sion && wins.sion.st, c = st && st.view === 'call' && callOf(st.callId);
        if (!c) return;
        if (!sion.callRing) return toast('시온 목소리가 끊겼어요 · 다시 말해 줘요');
        if (!c.retried) { c.retried = true; return sionRun('call', '', '', c.id); }
        clearInterval(sion.callTimer); sion.callRing = false;
        c.status = 'noanswer';
        const m = callChat(c, 'noanswer');
        sion.data.chat.push(m);
        callCommit('시온 전화 응답 없음', d => { const x = d.calls.find(y => y.id === c.id); if (x) x.status = 'noanswer'; if (!d.chat.some(y => y.call === c.id)) d.chat.push(m); });
        st.view = 'chat'; st.stick = true; sionRefresh();
        toast('시온이 전화를 못 받았어요 (AI 서버가 바빠요) · 잠시 뒤 다시 걸어 줘요');
    }
    function startCall() {
        if (sionNeedToken() || !sion.data) return;
        const c = { id: uid('k'), dir: 'out', status: 'live', at: stamp(), lines: [] };
        sion.data.calls = calls().concat([c]);
        callCommit('시온에게 전화', d => { if (!d.calls.some(x => x.id === c.id)) d.calls.push(c); });
        enterCall(c.id, true);
        sionRun('call', '', '', c.id);
    }
    function acceptCall(id) {
        const c = callOf(id); if (!c) return;
        c.status = 'live';
        clearTimeout(sion.ringTimer); ringStop();
        callCommit('시온 전화 받기', d => { const x = d.calls.find(y => y.id === id); if (x) x.status = 'live'; });
        enterCall(id);
        sionRun('call', '', '', id);
    }
    function missCall(id, declined) {
        const c = callOf(id); if (!c || c.status === 'missed' || c.status === 'done') return;
        c.status = 'missed';
        clearTimeout(sion.ringTimer); ringStop();
        const m = callChat(c, 'missed');
        sion.data.chat.push(m);
        callCommit(declined ? '시온 전화 거절' : '시온 부재중 전화', d => {
            const x = d.calls.find(y => y.id === id); if (x) x.status = 'missed';
            if (!d.chat.some(y => y.call === id)) d.chat.push(m);
        });
        if (wins.sion && wins.sion.st.view === 'ring') wins.sion.st.view = 'chat';
        sionRefresh(); drawSionBtn();
    }
    function endCall() {
        const st = wins.sion && wins.sion.st, c = st && callOf(st.callId);
        clearInterval(sion.callTimer); callStopListen();
        if (window.speechSynthesis) speechSynthesis.cancel();
        if (st) st.view = 'chat';
        if (!c) { sionRefresh(); return; }
        if (callRinging()) {   // 받기 전에 끊음 → 취소
            c.status = 'cancelled';
            callCommit('시온 전화 취소', d => { const x = d.calls.find(y => y.id === c.id); if (x) x.status = 'cancelled'; });
            sion.callRing = false; sionRefresh(); return;
        }
        const dur = Math.max(1, Math.floor((Date.now() - (sion.callStart || Date.now())) / 1000));
        c.status = 'done'; c.dur = dur;
        const m = callChat(c, 'done', dur);
        sion.data.chat.push(m);
        callCommit('시온 통화 끝', d => {
            const x = d.calls.find(y => y.id === c.id); if (x) { x.status = 'done'; x.dur = dur; x.end = stamp(); }
            if (!d.chat.some(y => y.call === c.id)) d.chat.push(m);
        });
        if (st) st.stick = true;
        sionRefresh();
    }
    function callSay(text) {
        const st = wins.sion && wins.sion.st, c = st && callOf(st.callId);
        text = (text || '').trim(); if (!text || !c) return;
        const line = { id: uid('l'), from: 'me', text, at: stamp() };
        (c.lines = c.lines || []).push(line);
        renderWin('sion');
        callCommit('시온과 통화', d => { const x = d.calls.find(y => y.id === c.id); if (x) { x.lines = x.lines || []; if (!x.lines.some(y => y.id === line.id)) x.lines.push(line); } });
        sionRun('call', '', '', c.id);
    }
    function callSendTyped() {
        const i = wins.sion && wins.sion.el.querySelector('[data-call=in]');
        if (!i) return; const v = i.value; i.value = ''; callSay(v);
    }
    // 말하기: 휴대폰 받아쓰기(음성 → 글자)로 한마디 듣고 보냄. 안 되는 기기면 키패드로
    function callListen() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) { sion.callKeypad = true; renderWin('sion'); return toast('이 기기에선 말하기가 안 돼요 · 키패드로 입력해요'); }
        if (sion.rec) { callStopListen(); return; }
        if (window.speechSynthesis) speechSynthesis.cancel();
        const r = new SR(); r.lang = 'ko-KR'; r.interimResults = true; r.continuous = false;
        let finalText = '';
        r.onresult = e => {
            let interim = '';
            for (let i = e.resultIndex; i < e.results.length; i++) { const t = e.results[i][0].transcript; if (e.results[i].isFinal) finalText += t; else interim += t; }
            const box = wins.sion && wins.sion.el.querySelector('.kk-hear'); if (box) box.textContent = (finalText + interim) || '듣고 있어요…';
        };
        r.onerror = () => { callStopListen(); };
        r.onend = () => { sion.rec = null; renderWin('sion'); if (finalText.trim()) callSay(finalText); };
        sion.rec = r;
        try { r.start(); } catch (e) { sion.rec = null; }
        renderWin('sion');
    }
    function callStopListen() { if (sion.rec) { try { sion.rec.stop(); } catch (e) {} } }
    // 시온 새 대사: 스피커가 켜져 있으면 폰 목소리로 읽음
    function callSpeakNew(c) {
        if (callRinging()) return;
        (c.lines || []).filter(l => l.from === 'ai' && !sion.spoken.has(l.id)).forEach(l => {
            sion.spoken.add(l.id);
            if (sion.callSpeaker && window.speechSynthesis) {
                const u = new SpeechSynthesisUtterance(l.text.replace(/…/g, ', ')); u.lang = 'ko-KR'; u.rate = 0.92; u.pitch = 0.8;
                speechSynthesis.speak(u);
            }
        });
    }
    // 불러온 뒤: 걸려 온 전화 울리기 / 오래 안 받은 전화는 부재중 / 통화 중이면 새 대사
    function callAfterLoad() {
        const st = wins.sion && wins.sion.st;
        if (st && st.view === 'call') { const c = callOf(st.callId); if (c && !callPickup(c)) callSpeakNew(c); }
        callCheckRing(false);
    }
    function callCheckRing(force) {
        const ring = calls().filter(c => c.dir === 'in' && c.status === 'ringing');
        ring.forEach(c => {
            const age = Date.now() - new Date(c.at).getTime();
            if (age > 3 * 60000) { if (!sion.missing.has(c.id)) { sion.missing.add(c.id); missCall(c.id); } return; }
            const st = wins.sion && wins.sion.st;
            if (st && (st.view === 'call' || (st.view === 'ring' && st.callId === c.id))) return;
            openSion('Message');
            Object.assign(wins.sion.st, { view: 'ring', callId: c.id });
            renderWin('sion');
            ringStart();
            clearTimeout(sion.ringTimer);
            sion.ringTimer = setTimeout(() => missCall(c.id), Math.max(15000, 60000 - age));
        });
        if (force && !ring.length) openSion('Message');
    }
    function ringStart() { if (navigator.vibrate) try { navigator.vibrate([400, 300, 400, 300, 400]); } catch (e) {} }
    function ringStop() { if (navigator.vibrate) try { navigator.vibrate(0); } catch (e) {} }

    function ringView(st) {
        const c = callOf(st.callId);
        if (!c) return empty('전화가 끊겼어요');
        const bg = sion.cfg && sion.cfg.ring_bg ? `<div class="kk-ringbg">${imgTag(sion.cfg.ring_bg, '')}</div>` : '<div class="kk-ringbg none"></div>';
        return `${bg}<div class="kk-ring">
                <div class="kk-ringtop"><b>${esc(contact())}</b><span>모바일 · 수신 중…</span></div>
                <div class="kk-ringbtns">
                    <button class="kk-rb no" data-act="call-decline" data-v="${c.id}">${KK.hang}<span>거절</span></button>
                    <button class="kk-rb yes" data-act="call-accept" data-v="${c.id}">${KK.pick}<span>수락</span></button>
                </div>
            </div>`;
    }
    function callView(st) {
        const c = callOf(st.callId);
        if (!c) return empty('통화가 끝났어요');
        const ringing = callRinging();
        const lines = ringing ? [] : (c.lines || []).slice(-6);
        const waiting = !ringing && (sion.wait.call || !lines.length || lines[lines.length - 1].from === 'me');
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        return `<div class="kk-call">
                <div class="kk-ctop"><div class="kk-cav">${callAvatar('kk-avimg')}</div><b>${esc(contact())}</b>
                    <span class="kk-tmr">${ringing ? '연결 중…' : mmss(Math.floor((Date.now() - (sion.callStart || Date.now())) / 1000))}</span></div>
                <div class="kk-lines">${lines.map(l => `<p class="${l.from === 'me' ? 'me' : 'you'}">${esc(l.text)}</p>`).join('')}
                    ${sion.rec ? '<p class="me kk-hear">듣고 있어요…</p>' : waiting ? '<p class="you kk-dots"><i></i><i></i><i></i></p>' : ''}</div>
                ${sion.callKeypad ? `<div class="kk-type"><input data-call="in" type="text" enterkeyhint="send" autocomplete="off" aria-label="할 말"><button data-act="call-send" aria-label="보내기">${KK.up}</button></div>` : ''}
                <div class="kk-ctl">
                    <button class="${sion.rec ? 'on' : ''}${SR ? '' : ' off'}" data-act="call-mic">${KK.mic}<span>${sion.rec ? '듣는 중' : '말하기'}</span></button>
                    <button class="${sion.callKeypad ? 'on' : ''}" data-act="call-keypad">${KK.keypad}<span>키패드</span></button>
                    <button class="${sion.callSpeaker ? 'on' : ''}" data-act="call-speaker">${KK.speaker}<span>스피커</span></button>
                </div>
                <button class="kk-end" data-act="call-end" aria-label="통화 종료">${KK.hang}</button>
            </div>`;
    }
    function callContactView(st) {
        if (!sion.data) return empty('불러오는 중…');
        const list = calls().slice().reverse();
        let lastDay = '';
        const rows = list.map(c => {
            const d = c.at.slice(0, 10), head = d !== lastDay ? `<div class="kk-sec">${d === todayKey() ? '오늘' : kDate(d)}</div>` : '';
            lastDay = d;
            const miss = c.status === 'missed' || c.status === 'ringing';
            const kind = miss ? '부재중' : c.status === 'cancelled' ? '취소' : c.status === 'noanswer' ? '응답 없음' : c.dir === 'out' ? '발신' : '수신';
            return head + `<button class="kk-row${miss ? ' miss' : ''}" data-act="call-log" data-v="${c.id}">
                <span class="ico">${miss ? '✕' : c.dir === 'out' ? '↗' : '↙'}</span>
                <span class="mid"><b>${esc(contact())}</b><small>${kind}${c.dur ? ' · ' + mmss(c.dur) : ''}</small></span>
                <span class="tm">${kTime(c.at)}</span></button>`;
        }).join('');
        return `<div class="kk-contact">
                <div class="kk-bigav">${callAvatar('kk-avimg')}</div>
                <b class="kk-cname">${esc(contact())}</b><span class="kk-csub">모바일</span>
                <div class="kk-cbtns"><button data-act="call-start">${KK.phone}<span>전화</span></button><button data-act="sn-back">${KK.chat}<span>메시지</span></button></div>
            </div>
            <div class="kk-sec top">통화 기록</div>${rows || empty('아직 통화 기록이 없어요')}`;
    }
    function callLogView(st) {
        const c = callOf(st.logId); if (!c) return empty('기록이 없어요');
        const miss = c.status === 'missed';
        return `<div class="kk-logh"><b>${kDate(c.at.slice(0, 10))} ${kTime(c.at)}</b><span>${miss ? '부재중' : c.status === 'noanswer' ? '응답 없음' : c.status === 'cancelled' ? '취소' : (c.dir === 'out' ? '발신' : '수신') + (c.dur ? ' · ' + mmss(c.dur) : '')}</span></div>
            <div class="kk-logbtn"><button class="mj-btn" data-act="call-start">다시 걸기</button><button class="mj-btn kk-del" data-act="call-del" data-v="${c.id}">삭제</button></div>
            <div class="sn-chat kk-log">${(c.lines || []).map((l, i, a) => `<div class="sn-row ${l.from === 'me' ? 'me' : 'you'}${!a[i + 1] || a[i + 1].from !== l.from ? ' tail' : ''}"><div class="sn-b">${esc(l.text)}</div></div>`).join('') || empty('주고받은 말이 없어요')}</div>`;
    }

    // 통화 기록 지우기 (대화창의 통화 말풍선도 같이)
    async function callDelete(id) {
        if (!callOf(id) || sionNeedToken()) return;
        if (!await mjConfirm('이 통화 기록을 지울까요?', 'Delete')) return;
        const drop = d => { d.calls = (d.calls || []).filter(x => x.id !== id); d.chat = (d.chat || []).filter(x => x.call !== id); };
        drop(sion.data);
        const st = wins.sion && wins.sion.st;
        if (st) { st.view = st.logFrom === 'chat' ? 'chat' : 'contact'; st.stick = st.view === 'chat'; }
        sionRefresh();
        callCommit('시온 통화 기록 지우기', drop).catch(e => mjAlert('지우지 못했어요.\n' + (e.message || e)));
    }

    // 내 글을 letters.json 에 커밋 (사이트에서 보낸 글끼리는 차례대로)
    function sionCommit(message, fn) {
        sion.writeAt = Date.now();
        const job = sion.last.then(() => repo.commit('김민정: ' + message, {}, {
            [SION_DATA]: { fallback: { letters: {}, chat: [] }, mutate: cur => { cur = Object.assign({ letters: {}, chat: [] }, cur); fn(cur); return cur; } }
        })).then(res => { sion.writeAt = Date.now(); return res; });
        sion.last = job.catch(() => {});
        return job;
    }
    function sionNeedToken() {
        if (window.ghdb.hasToken()) return false;
        mjAlert('보내려면 오른쪽 위 자물쇠에 GitHub 토큰을 넣어 주세요.');
        return true;
    }
    function sionSendChat(st) {
        const text = (st.draft || '').trim().slice(0, SION_MAX);
        if (!text || !sion.data || sionNeedToken()) return;
        const m = { id: uid('m'), from: 'me', text, at: stamp() };
        sion.data.chat.push(m);
        st.draft = ''; st.stick = true; st.favs = false; st.searching = false; st.q = '';
        // 여러 개를 이어 보내면 마지막 걸 보내고 잠깐 기다렸다가 한 번에 답장 받기
        clearTimeout(sion.timer);
        sion.timer = setTimeout(() => { sion.timer = null; sionRun('chat'); }, 4000);
        renderWin('sion');
        const t = wins.sion && wins.sion.el.querySelector('[data-sn=msg]'); if (t) t.focus();
        sionCommit('시온에게 메시지', cur => { if (!cur.chat.some(x => x.id === m.id)) cur.chat.push(m); }).catch(e => {
            clearTimeout(sion.timer); sion.timer = null;
            sion.data.chat = sion.data.chat.filter(x => x.id !== m.id);
            if (wins.sion) { wins.sion.st.draft = text; renderWin('sion'); }
            mjAlert('메시지를 보내지 못했어요.\n' + (e.message || e));
        });
    }
    function sionSendLetterReply(st) {
        const text = (st.ldraft || '').trim().slice(0, SION_MAX), k = st.ldate;
        if (!text || !sion.data.letters[k] || sionNeedToken()) return;
        const r = { id: uid('r'), from: 'me', text, at: stamp() };
        (sion.data.letters[k].replies = sion.data.letters[k].replies || []).push(r);
        st.ldraft = '';
        sion.wait.reply = true; sionRefresh();
        sionCommit('편지 답장', cur => { const lt = cur.letters[k]; if (lt) { lt.replies = lt.replies || []; if (!lt.replies.some(x => x.id === r.id)) lt.replies.push(r); } })
            .then(() => sionRun('reply', k), e => {
                sion.wait.reply = false; sion.data.letters[k].replies.pop();
                st.ldraft = text; sionRefresh();
                mjAlert('답장을 보내지 못했어요.\n' + (e.message || e));
            });
    }
    // GitHub Actions 실행 → 끝날 때까지 기다렸다가 새로 불러옴 (토큰에 Actions 읽기·쓰기 권한 필요)
    async function sionRun(mode, date, slot, id) {
        if (sionNeedToken()) return;
        sion.wait[mode] = true; sionRefresh();
        const done = msg => { sion.wait[mode] = false; sionRefresh(); if (msg) toast(msg); };
        try {
            await sion.last;                                    // 내 글이 먼저 저장된 뒤에 실행
            const since = Date.now() - 5000;
            await repo.api(SION_WF + '/dispatches', { method: 'POST', body: { ref: 'main', inputs: Object.assign({ mode, date: date || '' }, slot ? { slot } : {}, id ? { id } : {}) } });
            for (let i = 0; i < 36; i++) {
                await new Promise(r => setTimeout(r, i < 3 ? 6000 : 10000));
                if (!root.isConnected) return;
                let run = null;
                try { const j = await repo.api(SION_WF + '/runs?event=workflow_dispatch&per_page=5'); run = (j.workflow_runs || []).find(x => new Date(x.created_at).getTime() >= since); } catch (e) {}
                if (!run || run.status !== 'completed') continue;
                if (run.conclusion !== 'success') { if (mode === 'call') { done(''); return callRunFailed(); } return done('실패했어요. GitHub → Actions → letter 기록을 확인해 주세요'); }
                sion.wait[mode] = false;
                await loadSion(false, true);   // 시온이 쓴 새 글은 바로
                if (wins.bang) renderWin('bang');
                return done('');
            }
            done('아직 쓰는 중이에요. 잠시 뒤 다시 열어 주세요');
        } catch (e) {
            console.error(e);
            done(e.status === 403 || e.status === 404 ? '토큰에 Actions 읽기·쓰기 권한을 켜 주세요' : '시작하지 못했어요');
        }
    }

    // 웹앱 알림 켜기/끄기: 이 기기의 알림 주소를 minjung/push.json 에 저장 → GitHub Actions가 거기로 알림을 보냄
    const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    async function sionPushState() {
        sion.push = false;
        if (!pushSupported()) return;
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            const sub = reg && await reg.pushManager.getSubscription();
            sion.push = !!sub && Notification.permission === 'granted';
        } catch (e) {}
        if (wins.sion && sion.push) renderWin('sion');
    }
    const keyBytes = b64 => { const s = atob((b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
    async function sionPushToggle() {
        if (!pushSupported()) {
            const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.navigator.standalone;
            return mjAlert(ios ? '아이폰은 사파리에서 공유 → 홈 화면에 추가 한 다음, 홈 화면 앱으로 열어서 켜 주세요.' : '이 브라우저는 웹앱 알림을 지원하지 않아요.');
        }
        if (sionNeedToken()) return;
        try {
            const reg = await navigator.serviceWorker.register('sw.js');
            await navigator.serviceWorker.ready;
            const cur = await reg.pushManager.getSubscription();
            if (cur && sion.push) {
                if (!await mjConfirm('이 기기의 알림을 끌까요?', '끄기')) return;
                const ep = cur.endpoint;
                await cur.unsubscribe();
                sion.push = false; renderWin('sion');
                await repo.commit('김민정: 알림 끄기', {}, { [PUSH_FILE]: { fallback: { subs: [] }, mutate: d => { d.subs = (d.subs || []).filter(x => x.endpoint !== ep); return d; } } });
                return toast('알림을 껐어요');
            }
            if (await Notification.requestPermission() !== 'granted') return mjAlert('알림이 허용되지 않았어요. 기기 설정에서 이 앱의 알림을 허용해 주세요.');
            const sub = cur || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) });
            const j = sub.toJSON();
            const row = { endpoint: j.endpoint, keys: j.keys, device: /iPhone|iPad/.test(navigator.userAgent) ? 'iOS' : /Android/.test(navigator.userAgent) ? 'Android' : 'PC', at: stamp() };
            await repo.commit('김민정: 알림 켜기', {}, { [PUSH_FILE]: { fallback: { subs: [] }, mutate: d => { d.subs = (d.subs || []).filter(x => x.endpoint !== row.endpoint).concat([row]); return d; } } });
            sion.push = true; renderWin('sion');
            toast('알림을 켰어요 ♡');
        } catch (e) {
            console.error(e);
            mjAlert('알림을 켜지 못했어요.\n' + (e.message || e));
        }
    }
    // 화면을 보고 있는 동안 1분마다 새 메시지 확인
    const sionPoll = setInterval(() => {
        if (!root.isConnected) return clearInterval(sionPoll);
        if (document.visibilityState === 'visible' && !sion.wait.chat && !sion.wait.letter && !sion.wait.reply) loadSion();
    }, 60000);

    /* ---------------- 시작 ---------------- */
    const remembered = recallRoom();
    // 기억한 설정이 있으면 바로 보여 주고, 없으면 불러올 때까지 방을 숨겨 둠 (index.html의 mj-booting)
    const cachedDb = recallDb();
    if (cachedDb) db = normalize(cachedDb);
    else if (remembered) { db = normalize(Object.assign(db, { settings: remembered })); }
    bgSig = JSON.stringify(bgList());
    drawBgs();
    drawMenus();
    drawScreen();
    if (remembered) requestAnimationFrame(() => root.classList.remove('mj-booting'));
    load();

    // 화면 크기가 바뀌면 (모바일↔PC) 배경 그림과 배치를 다시 고름
    let lastLay = lay();
    const onResize = () => {
        if (!root.isConnected) { window.removeEventListener('resize', onResize); return; }
        if (lay() !== lastLay) { lastLay = lay(); if (edit) endEdit(false); drawBgs(); applyRoom(); }
    };
    window.addEventListener('resize', onResize);
    // 날짜는 1분마다, 다른 기기에서 바꾼 기록은 돌아올 때 다시 불러옴
    const clock = setInterval(() => { if (!root.isConnected) return clearInterval(clock); drawDate(); }, 60000);
    const onVisible = () => {
        if (!root.isConnected) { document.removeEventListener('visibilitychange', onVisible); return; }
        const typing = document.activeElement && root.contains(document.activeElement) && /INPUT|TEXTAREA/.test(document.activeElement.tagName);
        if (document.visibilityState === 'visible' && !pending && !typing) load();
    };
    document.addEventListener('visibilitychange', onVisible);
}
